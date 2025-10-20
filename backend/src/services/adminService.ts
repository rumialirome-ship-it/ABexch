import { db } from '../db';
import { User, UserRole, Bet, BetStatus, DrawResult, Commission, Prize, TopUpRequest, GameType, Transaction } from '../types';
import { ApiError } from '../middleware/errorHandler';
import { stripPassword, stripPasswords, generateId } from '../utils/helpers';
import { transactionService } from './transactionService';
import { bettingService } from './bettingService';
import { PoolClient } from 'pg';

// --- Helper for Commission Calculation ---
async function calculateRebatesAndDealerCommissions(client: PoolClient, drawLabel: string) {
    const { rows: bets } = await client.query(`
        SELECT b.stake, u.id as user_id, u.commission_rate, u.dealer_id, d.commission_rate as dealer_commission_rate 
        FROM bets b 
        JOIN users u ON b.user_id = u.id 
        LEFT JOIN users d ON u.dealer_id = d.id 
        WHERE b.draw_label = $1`, [drawLabel]);
    
    const userStakeTotals: Record<string, { totalStake: number, commissionRate: number }> = {};
    const dealerStakeTotals: Record<string, { totalStake: number, commissionRate: number }> = {};

    for (const bet of bets) {
        if (bet.commission_rate > 0) {
            userStakeTotals[bet.user_id] = userStakeTotals[bet.user_id] || { totalStake: 0, commissionRate: bet.commission_rate };
            userStakeTotals[bet.user_id].totalStake += parseFloat(bet.stake);
        }
        if (bet.dealer_id && bet.dealer_commission_rate > 0) {
            dealerStakeTotals[bet.dealer_id] = dealerStakeTotals[bet.dealer_id] || { totalStake: 0, commissionRate: bet.dealer_commission_rate };
            dealerStakeTotals[bet.dealer_id].totalStake += parseFloat(bet.stake);
        }
    }

    for (const [userId, data] of Object.entries(userStakeTotals)) {
        const rebateAmount = data.totalStake * (data.commissionRate / 100);
        if (rebateAmount > 0) {
            await transactionService.createSystemCreditTransaction(client, {
                toUserId: userId,
                amount: rebateAmount,
                type: 'COMMISSION_REBATE',
                relatedEntityId: drawLabel
            });
        }
    }

    for (const [dealerId, data] of Object.entries(dealerStakeTotals)) {
        const commissionAmount = data.totalStake * (data.commissionRate / 100);
        if (commissionAmount > 0) {
            await client.query(
                "INSERT INTO commissions (id, recipient_id, recipient_type, draw_label, amount, status, created_at) VALUES ($1, $2, 'dealer', $3, $4, 'pending', NOW())",
                [generateId('com'), dealerId, drawLabel, commissionAmount]
            );
        }
    }
}


export const adminService = {
    // ... User & Dealer Management ...
    async getAllUsersByRole(role: UserRole): Promise<Omit<User, 'password'>[]> {
        const { rows } = await db.query('SELECT * FROM users WHERE role = $1', [role]);
        return stripPasswords(rows);
    },

    async getUserById(userId: string): Promise<Omit<User, 'password'>> {
        const { rows } = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
        if (!rows[0]) throw new ApiError(404, 'User not found');
        return stripPassword(rows[0]);
    },

    async addUser(userData: Partial<User> & { username: string, dealer_id: string, initialDeposit?: number }): Promise<Omit<User, 'password'>> {
        const { rows: dealerRows } = await db.query('SELECT id FROM users WHERE id = $1 AND role = $2', [userData.dealer_id, UserRole.DEALER]);
        if (dealerRows.length === 0) throw new ApiError(404, `Dealer with ID ${userData.dealer_id} not found.`);

        // @google/genai-dev-tool: Fix: The method to get a client from the pool is `connect()`, not `getClient()`.
        const client = await db.connect();
        try {
            await client.query('BEGIN');
            const userId = generateId('usr');
            const newUser: User = { 
                id: userId, 
                username: userData.username, 
                phone: userData.phone, 
                role: UserRole.USER, 
                wallet_balance: userData.initialDeposit || 0, 
                dealer_id: userData.dealer_id
            };
            
            await client.query(
                `INSERT INTO users (id, username, phone, role, wallet_balance, dealer_id) VALUES ($1, $2, $3, $4, $5, $6)`,
                [userId, newUser.username, newUser.phone, UserRole.USER, newUser.wallet_balance, newUser.dealer_id]
            );

            if (newUser.wallet_balance > 0) {
                await transactionService.createSystemCreditTransaction(client, {
                    toUserId: userId,
                    amount: newUser.wallet_balance,
                    type: 'ADMIN_CREDIT',
                    relatedEntityId: newUser.dealer_id,
                });
            }
            
            await client.query('COMMIT');
            return stripPassword(newUser);
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    },

    async addDealer(dealerData: Partial<User> & { username: string, initial_deposit: number, commission_rate?: number }): Promise<Omit<User, 'password'>> {
        // @google/genai-dev-tool: Fix: The method to get a client from the pool is `connect()`, not `getClient()`.
        const client = await db.connect();
        try {
            await client.query('BEGIN');
            
            const dealerId = generateId('dlr');
            const { username, phone, password, city, initial_deposit, commission_rate } = dealerData;
            const newDealer: User = { id: dealerId, username, phone, role: UserRole.DEALER, wallet_balance: initial_deposit || 0, password, city, commission_rate: commission_rate };
            
            await client.query(
                'INSERT INTO users (id, username, password, phone, role, wallet_balance, city, commission_rate) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
                [dealerId, username, password, phone, UserRole.DEALER, newDealer.wallet_balance, city, commission_rate]
            );
            
            if (newDealer.wallet_balance > 0) {
                 await transactionService.createSystemCreditTransaction(client, {
                    toUserId: dealerId,
                    amount: newDealer.wallet_balance,
                    type: 'ADMIN_CREDIT'
                });
            }
            
            await client.query('COMMIT');
            return stripPassword(newDealer);
        } catch(e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    },

    // ... Financial Actions ...
    async addCreditToUser(adminId: string, userId: string, amount: number): Promise<void> {
        // @google/genai-dev-tool: Fix: The method to get a client from the pool is `connect()`, not `getClient()`.
        const client = await db.connect();
        try {
            await client.query('BEGIN');
            await transactionService.createSystemCreditTransaction(client, {
                toUserId: userId,
                amount: amount,
                type: 'ADMIN_CREDIT',
                relatedEntityId: adminId
            });
            await client.query('COMMIT');
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    },

    async addCreditToDealer(dealerId: string, amount: number): Promise<Omit<User, 'password'>> {
        // @google/genai-dev-tool: Fix: The method to get a client from the pool is `connect()`, not `getClient()`.
        const client = await db.connect();
        try {
            await client.query('BEGIN');
            
            await transactionService.createSystemCreditTransaction(client, {
                toUserId: dealerId,
                amount: amount,
                type: 'ADMIN_CREDIT'
            });

            const { rows } = await client.query('SELECT * FROM users WHERE id = $1', [dealerId]);

            await client.query('COMMIT');
            return stripPassword(rows[0]);
        } catch(e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    },

    async declareDraw(drawLabel: string, winningNumbers: { twoD?: string; oneDOpen?: string; oneDClose?: string; }): Promise<DrawResult> {
        // @google/genai-dev-tool: Fix: The method to get a client from the pool is `connect()`, not `getClient()`.
        const client = await db.connect();
        try {
            await client.query('BEGIN');
            
            const { rows: existingDrawRows } = await client.query('SELECT * FROM draw_results WHERE draw_label = $1', [drawLabel]);
            let draw: DrawResult = existingDrawRows[0];

            const isNewDraw = !draw;
            const betTypesToSettle = new Set<GameType>();

            if (isNewDraw) {
                draw = { id: generateId('drw'), draw_label: drawLabel, declared_at: new Date().toISOString() };
            }

            // ... (rest of draw logic)
            if (winningNumbers.twoD) {
                draw.two_digit = winningNumbers.twoD;
                draw.one_digit_open = winningNumbers.twoD.charAt(0);
                draw.one_digit_close = winningNumbers.twoD.charAt(1);
                draw.declared_at = new Date().toISOString();
                betTypesToSettle.add('2D'); betTypesToSettle.add('1D-Open'); betTypesToSettle.add('1D-Close');
            } else if (winningNumbers.oneDOpen) {
                draw.one_digit_open = winningNumbers.oneDOpen;
                draw.open_declared_at = new Date().toISOString();
                betTypesToSettle.add('1D-Open');
            } else if (winningNumbers.oneDClose) {
                draw.one_digit_close = winningNumbers.oneDClose;
                betTypesToSettle.add('1D-Close');
            }

            if (draw.one_digit_open && draw.one_digit_close && !draw.two_digit) {
                draw.two_digit = `${draw.one_digit_open}${draw.one_digit_close}`;
                draw.declared_at = new Date().toISOString();
                betTypesToSettle.add('2D');
            }

            if (isNewDraw) {
                await client.query('INSERT INTO draw_results (id, draw_label, two_digit, one_digit_open, one_digit_close, declared_at, open_declared_at) VALUES ($1, $2, $3, $4, $5, $6, $7)',
                    [draw.id, draw.draw_label, draw.two_digit, draw.one_digit_open, draw.one_digit_close, draw.declared_at, draw.open_declared_at]);
            } else {
                await client.query('UPDATE draw_results SET two_digit = $1, one_digit_open = $2, one_digit_close = $3, declared_at = $4, open_declared_at = $5 WHERE id = $6',
                    [draw.two_digit, draw.one_digit_open, draw.one_digit_close, draw.declared_at, draw.open_declared_at, draw.id]);
            }

            const { rows: pendingBets } = await client.query(
                `SELECT b.*, u.prize_rate_2d, u.prize_rate_1d FROM bets b JOIN users u ON b.user_id = u.id 
                 WHERE b.draw_label = $1 AND b.status = $2 AND b.game_type = ANY($3::text[])`,
                [drawLabel, BetStatus.PENDING, Array.from(betTypesToSettle)]
            );

            for (const bet of pendingBets) {
                let isWin = false;
                let prizeMultiplier = 0;
                if (bet.game_type === '2D' && draw.two_digit === bet.number) { isWin = true; prizeMultiplier = bet.prize_rate_2d ?? 85; }
                if (bet.game_type === '1D-Open' && draw.one_digit_open === bet.number) { isWin = true; prizeMultiplier = bet.prize_rate_1d ?? 9.5; }
                if (bet.game_type === '1D-Close' && draw.one_digit_close === bet.number) { isWin = true; prizeMultiplier = bet.prize_rate_1d ?? 9.5; }

                const newStatus = isWin ? BetStatus.WON : BetStatus.LOST;
                await client.query('UPDATE bets SET status = $1 WHERE id = $2', [newStatus, bet.id]);
                
                if (isWin) {
                    const prizeAmount = parseFloat(bet.stake) * prizeMultiplier;
                    await client.query(
                        'INSERT INTO prizes (id, user_id, bet_id, draw_label, amount, status, created_at) VALUES ($1, $2, $3, $4, $5, $6, NOW())',
                        [generateId('prz'), bet.user_id, bet.id, bet.draw_label, prizeAmount, 'pending']
                    );
                }
            }
            
            if (draw.two_digit) { // Full draw is settled
                const { rows: commissionRows } = await client.query('SELECT 1 FROM commissions WHERE draw_label = $1', [drawLabel]);
                if (commissionRows.length === 0) { // Only calculate once
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

    // ... Approval Services ...
    async getPendingCommissions(): Promise<Commission[]> {
        const { rows } = await db.query("SELECT * FROM commissions WHERE status = 'pending'");
        return rows;
    },
    
    async approveCommission(id: string): Promise<void> {
        // @google/genai-dev-tool: Fix: The method to get a client from the pool is `connect()`, not `getClient()`.
        const client = await db.connect();
        try {
            await client.query('BEGIN');
            const { rows } = await client.query("UPDATE commissions SET status = 'approved' WHERE id = $1 AND status = 'pending' RETURNING *", [id]);
            const commission = rows[0];
            if (commission) {
                await transactionService.createSystemCreditTransaction(client, {
                    toUserId: commission.recipient_id,
                    amount: parseFloat(commission.amount),
                    type: 'COMMISSION_PAYOUT',
                    relatedEntityId: commission.id
                });
            } else {
                throw new ApiError(404, 'Commission not found or already approved.');
            }
            await client.query('COMMIT');
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    },
    
    async getPendingPrizes(): Promise<Prize[]> {
        const { rows } = await db.query("SELECT * FROM prizes WHERE status = 'pending'");
        return rows;
    },

    async approvePrize(id: string): Promise<void> {
        // @google/genai-dev-tool: Fix: The method to get a client from the pool is `connect()`, not `getClient()`.
        const client = await db.connect();
        try {
            await client.query('BEGIN');
            const { rows } = await client.query("UPDATE prizes SET status = 'approved' WHERE id = $1 AND status = 'pending' RETURNING *", [id]);
            const prize = rows[0];
            if (prize) {
                 await transactionService.createSystemCreditTransaction(client, {
                    toUserId: prize.user_id,
                    amount: parseFloat(prize.amount),
                    type: 'PRIZE_WON',
                    relatedEntityId: prize.bet_id
                });
            } else {
                throw new ApiError(404, 'Prize not found or already approved.');
            }
            await client.query('COMMIT');
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    },

    async getPendingTopUps(): Promise<TopUpRequest[]> {
        const { rows } = await db.query("SELECT * FROM top_up_requests WHERE status = 'pending' ORDER BY created_at ASC");
        return rows;
    },
    
    async approveTopUp(requestId: string): Promise<void> {
        // @google/genai-dev-tool: Fix: The method to get a client from the pool is `connect()`, not `getClient()`.
        const client = await db.connect();
        try {
            await client.query('BEGIN');
            const { rows } = await client.query("UPDATE top_up_requests SET status = 'approved', approved_at = NOW() WHERE id = $1 AND status = 'pending' RETURNING *", [requestId]);
            const request = rows[0];
            if (!request) throw new ApiError(404, "Request not found or already processed");
            
            await transactionService.createSystemCreditTransaction(client, {
                toUserId: request.dealer_id,
                amount: parseFloat(request.amount),
                type: 'TOP_UP_APPROVED',
                relatedEntityId: request.id
            });
            
            await client.query('COMMIT');
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    },

    async debitFunds(adminId: string, targetUserId: string, amount: number): Promise<void> {
        // @google/genai-dev-tool: Fix: The method to get a client from the pool is `connect()`, not `getClient()`.
        const client = await db.connect();
        try {
            await client.query('BEGIN');

            const { rows: targetUserRows } = await client.query('SELECT wallet_balance FROM users WHERE id = $1 FOR UPDATE', [targetUserId]);
            if (!targetUserRows[0]) throw new ApiError(404, "Target user or dealer not found.");
            if (targetUserRows[0].wallet_balance < amount) throw new ApiError(400, "Target has insufficient funds.");

            await transactionService.createCreditTransaction(client, {
                fromUserId: targetUserId,
                toUserId: adminId,
                amount,
                type: 'USER_TO_ADMIN'
            });

            await client.query('COMMIT');
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    },
    
    async getBetsForUser(userId: string): Promise<Bet[]> {
        return bettingService.getBetHistory(userId);
    },

    async getTransactionsForUser(userId: string): Promise<Transaction[]> {
        return transactionService.getTransactionHistory(userId);
    },
};