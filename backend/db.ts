import { Pool } from 'pg';
import { User, UserRole, Bet, BetStatus, DrawResult, Transaction, TransactionType, Commission, Prize, TopUpRequest, GameType } from './types';

// --- Database Connection ---
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

// --- Helper Functions ---
const generateId = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
const stripPassword = (user: User | undefined): User | undefined => {
    if (!user) return undefined;
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
};

// --- Data Access Functions ---
export const db = {
    // Read-only access for polling
    getAllUsers: async () => {
        const res = await pool.query('SELECT * FROM users');
        return res.rows.map(stripPassword);
    },
    getAllBets: async () => {
        const res = await pool.query('SELECT * FROM bets');
        return res.rows;
    },
    getAllDraws: async () => {
        const res = await pool.query('SELECT * FROM draw_results ORDER BY declared_at DESC');
        return res.rows;
    },

    findUserForLogin: async (role: UserRole, username: string, pin: string): Promise<User | undefined> => {
        const res = await pool.query('SELECT * FROM users WHERE role = $1 AND username = $2', [role, username]);
        const user = res.rows[0];
        if (!user) return undefined;

        if (pin === user.password) {
            return stripPassword(user);
        }

        const isDefaultUserPin = role === UserRole.USER && pin === 'Pak@123' && !user.password;
        const isDefaultNonUserPin = role !== UserRole.USER && pin === 'Admin@123' && !user.password;
        
        if (isDefaultUserPin || isDefaultNonUserPin) {
            return stripPassword(user);
        }
        
        return undefined;
    },

    getDrawResults: async () => {
        const res = await pool.query('SELECT * FROM draw_results ORDER BY declared_at DESC');
        return res.rows;
    },
    
    getBetHistory: async (userId: string) => {
        const res = await pool.query('SELECT * FROM bets WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
        return res.rows;
    },
    
    getTransactionHistory: async (userId: string) => {
        const res = await pool.query('SELECT * FROM transactions WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
        return res.rows;
    },

    placeBets: async (betsToPlace: Omit<Bet, 'id' | 'createdAt' | 'status'>[]): Promise<Bet[]> => {
        if (betsToPlace.length === 0) return [];
        
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            
            const userId = betsToPlace[0].userId;
            const userRes = await client.query('SELECT wallet_balance FROM users WHERE id = $1 FOR UPDATE', [userId]);
            const user = userRes.rows[0];
            if (!user) throw new Error("User not found");
            
            const totalStake = betsToPlace.reduce((acc, bet) => acc + bet.stake, 0);
            if (user.wallet_balance < totalStake) throw new Error("Insufficient wallet balance.");
            
            const placedBets: Bet[] = [];
            for (const b of betsToPlace) {
                const betId = generateId('bet');
                const newBet: Bet = { ...b, id: betId, createdAt: new Date().toISOString(), status: BetStatus.PENDING };
                await client.query(
                    'INSERT INTO bets (id, user_id, draw_label, game_type, number, stake, status, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
                    [betId, b.userId, b.drawLabel, b.gameType, b.number, b.stake, BetStatus.PENDING, newBet.createdAt]
                );
                placedBets.push(newBet);
                
                await client.query(
                    'INSERT INTO transactions (id, user_id, type, amount, balance_change, related_entity_id, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7)',
                    [generateId('txn'), b.userId, TransactionType.BET_PLACED, b.stake, -b.stake, betId, newBet.createdAt]
                );
            }
            
            await client.query('UPDATE users SET wallet_balance = wallet_balance - $1 WHERE id = $2', [totalStake, userId]);
            
            await client.query('COMMIT');
            return placedBets;
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    },

    getUsersByRole: async (role: UserRole) => {
        const res = await pool.query('SELECT * FROM users WHERE role = $1', [role]);
        return res.rows.map(stripPassword);
    },
    
    getUsersByDealer: async (dealerId: string) => {
        const res = await pool.query('SELECT * FROM users WHERE role = $1 AND dealer_id = $2', [UserRole.USER, dealerId]);
        return res.rows.map(stripPassword);
    },

    getUserById: async (userId: string) => {
        const res = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
        return stripPassword(res.rows[0]);
    },

    addUser: async (dealerId: string, userData: Partial<User> & { username: string, initialDeposit: number }): Promise<User> => {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            
            const actor = await client.query('SELECT * FROM users WHERE id = $1 FOR UPDATE', [dealerId]);
            if (actor.rows.length === 0) throw new Error("Actor (Dealer or Admin) not found.");
            
            if (actor.rows[0].role === UserRole.DEALER && actor.rows[0].wallet_balance < userData.initialDeposit) {
                throw new Error("Dealer has insufficient funds.");
            }
            
            if (userData.phone) {
                const existingPhone = await client.query('SELECT id FROM users WHERE phone = $1', [userData.phone]);
                if (existingPhone.rows.length > 0) throw new Error("Phone number already in use.");
            }
            
            const userId = generateId('usr');
            const newUser: User = { id: userId, username: userData.username, phone: userData.phone, role: UserRole.USER, walletBalance: userData.initialDeposit, dealerId, password: userData.password, city: userData.city, commissionRate: userData.commissionRate, prizeRate2D: userData.prizeRate2D, prizeRate1D: userData.prizeRate1D, betLimit2D: userData.betLimit2D, betLimit1D: userData.betLimit1D };
            
            await client.query(
                `INSERT INTO users (id, username, password, phone, role, wallet_balance, dealer_id, city, commission_rate, prize_rate_2d, prize_rate_1d, bet_limit_2d, bet_limit_1d) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
                [userId, newUser.username, newUser.password, newUser.phone, UserRole.USER, newUser.walletBalance, newUser.dealerId, newUser.city, newUser.commissionRate, newUser.prizeRate2D, newUser.prizeRate1D, newUser.betLimit2D, newUser.betLimit1D]
            );
            
            if (userData.initialDeposit > 0) {
                 if (actor.rows[0].role === UserRole.DEALER) {
                    await client.query('UPDATE users SET wallet_balance = wallet_balance - $1 WHERE id = $2', [userData.initialDeposit, dealerId]);
                    await client.query('INSERT INTO transactions (id, user_id, type, amount, balance_change, related_entity_id, created_at) VALUES ($1, $2, $3, $4, $5, $6, NOW())', [generateId('txn'), dealerId, TransactionType.DEALER_DEBIT_TO_USER, userData.initialDeposit, -userData.initialDeposit, userId]);
                    await client.query('INSERT INTO transactions (id, user_id, type, amount, balance_change, related_entity_id, created_at) VALUES ($1, $2, $3, $4, $5, $6, NOW())', [generateId('txn'), userId, TransactionType.DEALER_CREDIT, userData.initialDeposit, userData.initialDeposit, dealerId]);
                 } else { // Admin created user for a dealer
                     await client.query('INSERT INTO transactions (id, user_id, type, amount, balance_change, related_entity_id, created_at) VALUES ($1, $2, $3, $4, $5, $6, NOW())', [generateId('txn'), userId, TransactionType.ADMIN_CREDIT, userData.initialDeposit, userData.initialDeposit, dealerId]);
                 }
            }
            
            await client.query('COMMIT');
            return stripPassword(newUser)!;
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    },
      
    addDealer: async (dealerData: Partial<User> & { username: string, initialDeposit: number }): Promise<User> => {
        const { username, phone, password, city, initialDeposit, commissionRate } = dealerData;
        
        if (phone) {
            const existing = await pool.query('SELECT id FROM users WHERE phone = $1', [phone]);
            if (existing.rows.length > 0) throw new Error("Phone number already in use.");
        }
        
        const dealerId = generateId('dlr');
        const newDealer: User = { id: dealerId, username, phone, role: UserRole.DEALER, walletBalance: initialDeposit, password, city, commissionRate };
        
        await pool.query(
            'INSERT INTO users (id, username, password, phone, role, wallet_balance, city, commission_rate) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
            [dealerId, username, password, phone, UserRole.DEALER, initialDeposit, city, commissionRate]
        );
        
        if (initialDeposit > 0) {
            await pool.query(
                'INSERT INTO transactions (id, user_id, type, amount, balance_change, created_at) VALUES ($1, $2, $3, $4, $5, NOW())',
                [generateId('txn'), dealerId, TransactionType.ADMIN_CREDIT, initialDeposit, initialDeposit]
            );
        }
        
        return stripPassword(newDealer)!;
    },

    addCreditToUser: async (actorId: string, targetUserId: string, amount: number, actorRole: UserRole) => {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            
            const targetUserRes = await client.query('SELECT * FROM users WHERE id = $1 FOR UPDATE', [targetUserId]);
            if (targetUserRes.rows.length === 0) throw new Error("Target user not found.");
            
            if (actorRole === UserRole.DEALER) {
                const dealerRes = await client.query('SELECT * FROM users WHERE id = $1 FOR UPDATE', [actorId]);
                const dealer = dealerRes.rows[0];
                if (!dealer) throw new Error("Dealer not found.");
                if (dealer.wallet_balance < amount) throw new Error("Dealer has insufficient funds.");
                
                await client.query('UPDATE users SET wallet_balance = wallet_balance - $1 WHERE id = $2', [amount, actorId]);
                await client.query('UPDATE users SET wallet_balance = wallet_balance + $1 WHERE id = $2', [amount, targetUserId]);
                
                await client.query('INSERT INTO transactions (id, user_id, type, amount, balance_change, related_entity_id, created_at) VALUES ($1, $2, $3, $4, $5, $6, NOW())', [generateId('txn'), actorId, TransactionType.DEALER_DEBIT_TO_USER, amount, -amount, targetUserId]);
                await client.query('INSERT INTO transactions (id, user_id, type, amount, balance_change, related_entity_id, created_at) VALUES ($1, $2, $3, $4, $5, $6, NOW())', [generateId('txn'), targetUserId, TransactionType.DEALER_CREDIT, amount, amount, actorId]);
            
            } else if (actorRole === UserRole.ADMIN) {
                 await client.query('UPDATE users SET wallet_balance = wallet_balance + $1 WHERE id = $2', [amount, targetUserId]);
                 await client.query('INSERT INTO transactions (id, user_id, type, amount, balance_change, related_entity_id, created_at) VALUES ($1, $2, $3, $4, $5, $6, NOW())', [generateId('txn'), targetUserId, TransactionType.ADMIN_CREDIT, amount, amount, actorId]);
            }
            
            await client.query('COMMIT');
        } catch(e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    },

    addCreditToDealer: async (dealerId: string, amount: number) => {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const res = await client.query('UPDATE users SET wallet_balance = wallet_balance + $1 WHERE id = $2 AND role = $3 RETURNING *', [amount, dealerId, UserRole.DEALER]);
            if (res.rows.length === 0) throw new Error("Dealer not found");
            
            await client.query('INSERT INTO transactions (id, user_id, type, amount, balance_change, created_at) VALUES ($1, $2, $3, $4, $5, NOW())', [generateId('txn'), dealerId, TransactionType.ADMIN_CREDIT, amount, amount]);
            
            await client.query('COMMIT');
            return stripPassword(res.rows[0]);
        } catch(e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    },

    declareDraw: async (drawLabel: string, winningNumbers: { twoD?: string; oneDOpen?: string; oneDClose?: string; }): Promise<DrawResult> => {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            
            const existingDraw = await client.query('SELECT * FROM draw_results WHERE draw_label = $1', [drawLabel]);
            let draw: DrawResult = existingDraw.rows[0];

            const isNewDraw = !draw;
            const betTypesToSettle = new Set<GameType>();

            if (isNewDraw) {
                draw = { id: generateId('drw'), drawLabel, declaredAt: new Date().toISOString() };
            }

            if (winningNumbers.twoD) {
                draw.twoDigit = winningNumbers.twoD;
                draw.oneDigitOpen = winningNumbers.twoD.charAt(0);
                draw.oneDigitClose = winningNumbers.twoD.charAt(1);
                draw.declaredAt = new Date().toISOString();
                betTypesToSettle.add('2D'); betTypesToSettle.add('1D-Open'); betTypesToSettle.add('1D-Close');
            } else if (winningNumbers.oneDOpen) {
                draw.oneDigitOpen = winningNumbers.oneDOpen;
                draw.openDeclaredAt = new Date().toISOString();
                betTypesToSettle.add('1D-Open');
            } else if (winningNumbers.oneDClose) {
                draw.oneDigitClose = winningNumbers.oneDClose;
                betTypesToSettle.add('1D-Close');
            }

            if (draw.oneDigitOpen && draw.oneDigitClose && !draw.twoDigit) {
                draw.twoDigit = `${draw.oneDigitOpen}${draw.oneDigitClose}`;
                draw.declaredAt = new Date().toISOString();
                betTypesToSettle.add('2D');
            }

            if (isNewDraw) {
                await client.query('INSERT INTO draw_results (id, draw_label, two_digit, one_digit_open, one_digit_close, declared_at, open_declared_at) VALUES ($1, $2, $3, $4, $5, $6, $7)',
                    [draw.id, draw.drawLabel, draw.twoDigit, draw.oneDigitOpen, draw.oneDigitClose, draw.declaredAt, draw.openDeclaredAt]);
            } else {
                await client.query('UPDATE draw_results SET two_digit = $1, one_digit_open = $2, one_digit_close = $3, declared_at = $4, open_declared_at = $5 WHERE id = $6',
                    [draw.twoDigit, draw.oneDigitOpen, draw.oneDigitClose, draw.declaredAt, draw.openDeclaredAt, draw.id]);
            }

            const pendingBetsRes = await client.query('SELECT b.*, u.prize_rate_2d, u.prize_rate_1d FROM bets b JOIN users u ON b.user_id = u.id WHERE b.draw_label = $1 AND b.status = $2 AND b.game_type = ANY($3::text[])',
                [drawLabel, BetStatus.PENDING, Array.from(betTypesToSettle)]);

            for (const bet of pendingBetsRes.rows) {
                let isWin = false;
                let prizeMultiplier = 0;
                if (bet.game_type === '2D' && draw.twoDigit === bet.number) { isWin = true; prizeMultiplier = bet.prize_rate_2d ?? 85; }
                if (bet.game_type === '1D-Open' && draw.oneDigitOpen === bet.number) { isWin = true; prizeMultiplier = bet.prize_rate_1d ?? 9.5; }
                if (bet.game_type === '1D-Close' && draw.oneDigitClose === bet.number) { isWin = true; prizeMultiplier = bet.prize_rate_1d ?? 9.5; }

                if (isWin) {
                    await client.query('UPDATE bets SET status = $1 WHERE id = $2', [BetStatus.WON, bet.id]);
                    const prizeAmount = bet.stake * prizeMultiplier;
                    await client.query('INSERT INTO prizes (id, user_id, bet_id, draw_label, amount, status, created_at) VALUES ($1, $2, $3, $4, $5, $6, NOW())',
                        [generateId('prz'), bet.user_id, bet.id, bet.draw_label, prizeAmount, 'pending']);
                } else {
                    await client.query('UPDATE bets SET status = $1 WHERE id = $2', [BetStatus.LOST, bet.id]);
                }
            }
            
            if (draw.twoDigit) {
                const commissionRes = await client.query('SELECT 1 FROM commissions WHERE draw_label = $1', [drawLabel]);
                if (commissionRes.rows.length === 0) {
                     await calculateRebatesAndDealerCommissions(client, drawLabel);
                }
            }

            await client.query('COMMIT');
            return draw;
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    },

    getPendingCommissions: async () => {
        const res = await pool.query("SELECT * FROM commissions WHERE status = 'pending'");
        return res.rows;
    },
    
    getPendingCommissionsForDealer: async (dealerId: string) => {
        const res = await pool.query("SELECT * FROM commissions WHERE status = 'pending' AND recipient_id = $1", [dealerId]);
        return res.rows;
    },

    approveCommission: async (id: string) => {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const res = await client.query("UPDATE commissions SET status = 'approved' WHERE id = $1 AND status = 'pending' RETURNING *", [id]);
            const commission = res.rows[0];
            if (commission) {
                await client.query('UPDATE users SET wallet_balance = wallet_balance + $1 WHERE id = $2', [commission.amount, commission.recipient_id]);
                await client.query('INSERT INTO transactions (id, user_id, type, amount, balance_change, related_entity_id, created_at) VALUES ($1, $2, $3, $4, $5, $6, NOW())',
                    [generateId('txn'), commission.recipient_id, TransactionType.COMMISSION_PAYOUT, commission.amount, commission.amount, commission.id]);
            }
            await client.query('COMMIT');
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    },

    getPendingPrizes: async () => {
        const res = await pool.query("SELECT * FROM prizes WHERE status = 'pending'");
        return res.rows;
    },

    approvePrize: async (id: string) => {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const res = await client.query("UPDATE prizes SET status = 'approved' WHERE id = $1 AND status = 'pending' RETURNING *", [id]);
            const prize = res.rows[0];
            if (prize) {
                await client.query('UPDATE users SET wallet_balance = wallet_balance + $1 WHERE id = $2', [prize.amount, prize.user_id]);
                await client.query('INSERT INTO transactions (id, user_id, type, amount, balance_change, related_entity_id, created_at) VALUES ($1, $2, $3, $4, $5, $6, NOW())',
                    [generateId('txn'), prize.user_id, TransactionType.PRIZE_WON, prize.amount, prize.amount, prize.bet_id]);
            }
            await client.query('COMMIT');
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    },

    getBetsByDealer: async (dealerId: string) => {
        const res = await pool.query('SELECT b.* FROM bets b JOIN users u ON b.user_id = u.id WHERE u.dealer_id = $1 ORDER BY b.created_at DESC', [dealerId]);
        return res.rows;
    },

    requestTopUp: async (dealerId: string, amount: number, reference: string) => {
        const dealer = await db.getUserById(dealerId);
        if (!dealer) throw new Error("Dealer not found");
        const res = await pool.query(
            "INSERT INTO top_up_requests (id, dealer_id, dealer_username, amount, reference, status, created_at) VALUES ($1, $2, $3, $4, $5, 'pending', NOW()) RETURNING *",
            [generateId('tpr'), dealerId, dealer.username, amount, reference]
        );
        return res.rows[0];
    },

    getPendingTopUps: async () => {
        const res = await pool.query("SELECT * FROM top_up_requests WHERE status = 'pending' ORDER BY created_at ASC");
        return res.rows;
    },
    
    approveTopUp: async (requestId: string) => {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const res = await client.query("UPDATE top_up_requests SET status = 'approved', approved_at = NOW() WHERE id = $1 AND status = 'pending' RETURNING *", [requestId]);
            const request = res.rows[0];
            if (!request) throw new Error("Request not found or already processed");
            
            await client.query('UPDATE users SET wallet_balance = wallet_balance + $1 WHERE id = $2', [request.amount, request.dealer_id]);
            await client.query('INSERT INTO transactions (id, user_id, type, amount, balance_change, related_entity_id, created_at) VALUES ($1, $2, $3, $4, $5, $6, NOW())',
                [generateId('txn'), request.dealer_id, TransactionType.TOP_UP_APPROVED, request.amount, request.amount, request.id]);
            
            await client.query('COMMIT');
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    },
    
    updateUserBetLimit: async (dealerId: string, userId: string, limit: number | null) => {
        const res = await pool.query("UPDATE users SET bet_limit_per_draw = $1 WHERE id = $2 AND dealer_id = $3 RETURNING *", [limit, userId, dealerId]);
        if (res.rows.length === 0) throw new Error("User not found or does not belong to this dealer.");
        return stripPassword(res.rows[0]);
    },

    debitFunds: async (targetUserId: string, amount: number, adminId: string) => {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const targetUserRes = await client.query('SELECT * FROM users WHERE id = $1 FOR UPDATE', [targetUserId]);
            const targetUser = targetUserRes.rows[0];
            if (!targetUser) throw new Error("Target user or dealer not found.");
            if (targetUser.wallet_balance < amount) throw new Error("Insufficient funds.");

            await client.query('UPDATE users SET wallet_balance = wallet_balance - $1 WHERE id = $2', [amount, targetUserId]);
            await client.query('UPDATE users SET wallet_balance = wallet_balance + $1 WHERE id = $2', [amount, adminId]);

            await client.query('INSERT INTO transactions (id, user_id, type, amount, balance_change, related_entity_id, created_at) VALUES ($1, $2, $3, $4, $5, $6, NOW())', [generateId('txn'), targetUserId, TransactionType.ADMIN_DEBIT_FROM_USER, amount, -amount, adminId]);
            await client.query('INSERT INTO transactions (id, user_id, type, amount, balance_change, related_entity_id, created_at) VALUES ($1, $2, $3, $4, $5, $6, NOW())', [generateId('txn'), adminId, TransactionType.ADMIN_CREDIT_FROM_USER, amount, amount, targetUserId]);

            await client.query('COMMIT');
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    }
};

async function calculateRebatesAndDealerCommissions(client: any, drawLabel: string) {
    const betsRes = await client.query('SELECT b.*, u.commission_rate, u.dealer_id, d.commission_rate as dealer_commission_rate FROM bets b JOIN users u ON b.user_id = u.id LEFT JOIN users d ON u.dealer_id = d.id WHERE b.draw_label = $1', [drawLabel]);
    
    const userStakeTotals: Record<string, { totalStake: number, commissionRate: number }> = {};
    const dealerStakeTotals: Record<string, { totalStake: number, commissionRate: number }> = {};

    for (const bet of betsRes.rows) {
        // User rebates
        if (bet.commission_rate > 0) {
            userStakeTotals[bet.user_id] = userStakeTotals[bet.user_id] || { totalStake: 0, commissionRate: bet.commission_rate };
            userStakeTotals[bet.user_id].totalStake += bet.stake;
        }
        // Dealer commissions
        if (bet.dealer_id && bet.dealer_commission_rate > 0) {
            dealerStakeTotals[bet.dealer_id] = dealerStakeTotals[bet.dealer_id] || { totalStake: 0, commissionRate: bet.dealer_commission_rate };
            dealerStakeTotals[bet.dealer_id].totalStake += bet.stake;
        }
    }

    for (const userId in userStakeTotals) {
        const { totalStake, commissionRate } = userStakeTotals[userId];
        const rebateAmount = totalStake * (commissionRate / 100);
        if (rebateAmount > 0) {
            await client.query('UPDATE users SET wallet_balance = wallet_balance + $1 WHERE id = $2', [rebateAmount, userId]);
            await client.query('INSERT INTO transactions (id, user_id, type, amount, balance_change, related_entity_id, created_at) VALUES ($1, $2, $3, $4, $5, $6, NOW())', [generateId('txn'), userId, TransactionType.COMMISSION_REBATE, rebateAmount, rebateAmount, drawLabel]);
        }
    }

    for (const dealerId in dealerStakeTotals) {
        const { totalStake, commissionRate } = dealerStakeTotals[dealerId];
        const commissionAmount = totalStake * (commissionRate / 100);
        if (commissionAmount > 0) {
            await client.query("INSERT INTO commissions (id, recipient_id, recipient_type, draw_label, amount, status, created_at) VALUES ($1, $2, 'dealer', $3, $4, 'pending', NOW())", [generateId('com'), dealerId, drawLabel, commissionAmount]);
        }
    }
}
