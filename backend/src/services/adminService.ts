



import { db } from '../db';
import { User, UserRole, Bet, BetStatus, DrawResult, Commission, Prize, TopUpRequest, GameType, Transaction, TransactionType } from '../types';
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
                type: TransactionType.COMMISSION_REBATE,
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

    async addUser(userData: Partial<User> & { username: string; dealer_id: string; initial_deposit?: number }): Promise<Omit<User, 'password'>> {
        const { rows: dealerRows } = await db.query('SELECT id FROM users WHERE id = $1 AND role = $2', [userData.dealer_id, UserRole.DEALER]);
        if (dealerRows.length === 0) throw new ApiError(404, `Dealer with ID ${userData.dealer_id} not found.`);
    
        const client = await db.connect();
        try {
            await client.query('BEGIN');
    
            const { username, phone, password } = userData;
            if (!username || !phone) {
                throw new ApiError(400, "Username and phone are required.");
            }
            const { rows: existingUsers } = await client.query('SELECT username, phone FROM users WHERE username = $1 OR phone = $2', [username, phone]);
            if (existingUsers.length > 0) {
                if (existingUsers[0].username === username) throw new ApiError(409, "Username already exists.");
                if (existingUsers[0].phone === phone) throw new ApiError(409, "Phone number already exists.");
            }
    
            const userId = generateId('usr');
            const initialDeposit = userData.initial_deposit || 0;
    
            const finalPassword = (password && password.trim()) ? password.trim() : null; // Default PIN is handled by DB default
    
            await client.query(
                `INSERT INTO users (id, username, password, phone, role, wallet_balance, dealer_id, city, prize_rate_2d, prize_rate_1d, bet_limit_2d, bet_limit_1d, bet_limit_per_draw) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
                [
                    userId, username, finalPassword, phone, UserRole.USER, initialDeposit, userData.dealer_id,
                    userData.city || null,
                    userData.prize_rate_2d != null ? userData.prize_rate_2d : 85,
                    userData.prize_rate_1d != null ? userData.prize_rate_1d : 9.5,
                    userData.bet_limit_2d || null,
                    userData.bet_limit_1d || null,
                    userData.bet_limit_per_draw || null,
                ]
            );
    
            if (initialDeposit > 0) {
                await client.query(
                    'INSERT INTO transactions (id, user_id, type, amount, balance_change, related_entity_id, created_at) VALUES ($1, $2, $3, $4, $5, $6, NOW())',
                    [generateId('txn'), userId, TransactionType.ADMIN_CREDIT, initialDeposit, initialDeposit, 'admin_setup']
                );
            }
            
            await client.query('COMMIT');
            
            const { rows: newUserRows } = await client.query('SELECT * FROM users WHERE id = $1', [userId]);
            return stripPassword(newUserRows[0]);
        } catch (e) {
            await client.query('ROLLBACK');
            if (e instanceof ApiError) throw e;
            if ((e as any).code === '23505') {
                 throw new ApiError(409, "Username or phone number already exists.");
            }
            throw e;
        } finally {
            client.release();
        }
    },
    
    async updateUser(userId: string, userData: Partial<User>): Promise<Omit<User, 'password'>> {
        const { username, password, phone, dealer_id } = userData;
        const updates: { [key: string]: any } = {};

        if (username !== undefined) updates.username = username;
        if (password) updates.password = password; // Only update if a new one is provided
        if (phone !== undefined) updates.phone = phone;
        if (dealer_id !== undefined) updates.dealer_id = dealer_id;

        if (Object.keys(updates).length === 0) {
            throw new ApiError(400, "No update data provided.");
        }
        
        if (dealer_id) {
            const { rows: dealerRows } = await db.query('SELECT id FROM users WHERE id = $1 AND role = $2', [dealer_id, UserRole.DEALER]);
            if (dealerRows.length === 0) throw new ApiError(404, `Dealer with ID ${dealer_id} not found.`);
        }

        const setClause = Object.keys(updates).map((key, index) => `"${key}" = $${index + 2}`).join(', ');
        const values = [userId, ...Object.values(updates)];

        const query = `UPDATE users SET ${setClause} WHERE id = $1 RETURNING *`;
        
        const { rows } = await db.query(query, values);

        if (rows.length === 0) {
            throw new ApiError(404, 'User not found.');
        }

        return stripPassword(rows[0]);
    },

    async addDealer(dealerData: Partial<User> & { username: string; initial_deposit?: number; }): Promise<Omit<User, 'password'>> {
        const client = await db.connect();
        try {
            await client.query('BEGIN');
    
            const {
                username,
                phone,
                password,
                city,
                initial_deposit,
                commission_rate,
                prize_rate_2d,
                prize_rate_1d,
                bet_limit_2d,
                bet_limit_1d,
                bet_limit_per_draw,
            } = dealerData;
    
            if (!username || !username.trim()) {
                throw new ApiError(400, "Username is required.");
            }
            const cleanUsername = username.trim();
            const cleanPhone = (phone && typeof phone === 'string' && phone.trim()) ? phone.trim() : null;
    
            const { rows: existingUser } = await client.query('SELECT id FROM users WHERE LOWER(username) = LOWER($1)', [cleanUsername]);
            if (existingUser.length > 0) {
                throw new ApiError(409, `Username '${cleanUsername}' is already taken.`);
            }
            if (cleanPhone) {
                const { rows: existingPhone } = await client.query('SELECT id FROM users WHERE phone = $1', [cleanPhone]);
                if (existingPhone.length > 0) {
                    throw new ApiError(409, `Phone number '${cleanPhone}' is already in use.`);
                }
            }
    
            const dealerId = generateId('dlr');
            const walletBalance = (typeof initial_deposit === 'number' && !isNaN(initial_deposit)) ? initial_deposit : 0;
            const finalPassword = (password && typeof password === 'string' && password.trim()) ? password.trim() : null;
            const finalCity = (city && typeof city === 'string' && city.trim()) ? city.trim() : null;
            const finalCommission = (typeof commission_rate === 'number' && !isNaN(commission_rate)) ? commission_rate : null;
            const finalPrizeRate2D = (typeof prize_rate_2d === 'number' && !isNaN(prize_rate_2d)) ? prize_rate_2d : null;
            const finalPrizeRate1D = (typeof prize_rate_1d === 'number' && !isNaN(prize_rate_1d)) ? prize_rate_1d : null;
            const finalBetLimit2D = (typeof bet_limit_2d === 'number' && !isNaN(bet_limit_2d)) ? bet_limit_2d : null;
            const finalBetLimit1D = (typeof bet_limit_1d === 'number' && !isNaN(bet_limit_1d)) ? bet_limit_1d : null;
            const finalBetLimit = (typeof bet_limit_per_draw === 'number' && !isNaN(bet_limit_per_draw)) ? bet_limit_per_draw : null;
    
            await client.query(
                `INSERT INTO users (id, username, password, phone, role, wallet_balance, city, commission_rate, prize_rate_2d, prize_rate_1d, bet_limit_2d, bet_limit_1d, bet_limit_per_draw) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
                [
                    dealerId, cleanUsername, finalPassword, cleanPhone, UserRole.DEALER,
                    walletBalance, finalCity, finalCommission, finalPrizeRate2D,
                    finalPrizeRate1D, finalBetLimit2D, finalBetLimit1D, finalBetLimit
                ]
            );
    
            if (walletBalance > 0) {
                await client.query(
                    'INSERT INTO transactions (id, user_id, type, amount, balance_change, related_entity_id, created_at) VALUES ($1, $2, $3, $4, $5, $6, NOW())',
                    [generateId('txn'), dealerId, TransactionType.ADMIN_CREDIT, walletBalance, walletBalance, 'admin_setup']
                );
            }
    
            const { rows: newDealerRows } = await client.query('SELECT * FROM users WHERE id = $1', [dealerId]);
            if (newDealerRows.length === 0) {
                throw new ApiError(500, "Failed to create dealer record after insertion.");
            }
    
            await client.query('COMMIT');
            return stripPassword(newDealerRows[0]);
        } catch (e: any) {
            await client.query('ROLLBACK');
    
            if (e.code === '23505') {
                if (e.constraint && e.constraint.includes('username')) {
                    throw new ApiError(409, `Username '${dealerData.username}' is already taken.`);
                }
                if (e.constraint && e.constraint.includes('phone')) {
                     throw new ApiError(409, `Phone number '${dealerData.phone}' is already in use.`);
                }
                throw new ApiError(409, "A unique value constraint was violated. Please check your input.");
            }
    
            if (e instanceof ApiError) throw e;
    
            console.error("Database error in addDealer service:", e);
            throw new ApiError(500, "A database error occurred while creating the dealer.");
        } finally {
            client.release();
        }
    },

    async updateDealer(dealerId: string, dealerData: Partial<User>): Promise<Omit<User, 'password'>> {
        // 1. Fetch the existing dealer to compare against for conflict resolution
        const { rows: existingDealerRows } = await db.query("SELECT * FROM users WHERE id = $1 AND role = 'dealer'", [dealerId]);
        if (existingDealerRows.length === 0) {
            throw new ApiError(404, 'Dealer not found.');
        }
        const existingDealer = existingDealerRows[0];
    
        // 2. Build the 'updates' object from the provided data
        const updates: { [key: string]: any } = {};
    
        // Handle string fields, special-casing password
        const stringFields: (keyof User)[] = ['username', 'password', 'phone', 'city'];
        for (const field of stringFields) {
            if (Object.prototype.hasOwnProperty.call(dealerData, field)) {
                const value = (dealerData as any)[field];
                // Only add password to the update if it's a non-empty string
                if (field === 'password' && (!value || String(value).trim() === '')) {
                    continue;
                }
                updates[field] = value;
            }
        }
    
        // Handle optional number fields, converting empty strings from the form to null
        const numericFields: (keyof User)[] = ['commission_rate', 'prize_rate_2d', 'prize_rate_1d', 'bet_limit_2d', 'bet_limit_1d', 'bet_limit_per_draw'];
        for (const field of numericFields) {
            if (Object.prototype.hasOwnProperty.call(dealerData, field)) {
                const rawValue = (dealerData as any)[field];
                const parsedValue = (rawValue === '' || rawValue === null) ? null : parseFloat(rawValue);
                if (parsedValue !== null && isNaN(parsedValue)) {
                    throw new ApiError(400, `${field.replace(/_/g, ' ')} must be a valid number.`);
                }
                updates[field] = parsedValue;
            }
        }
    
        // 3. Check for conflicts if username or phone are being changed
        if (updates.username && updates.username !== existingDealer.username) {
            const { rows: conflict } = await db.query('SELECT id FROM users WHERE username = $1 AND id != $2', [updates.username, dealerId]);
            if (conflict.length > 0) throw new ApiError(409, "Username already exists.");
        }
        if (updates.phone && updates.phone !== existingDealer.phone) {
            const { rows: conflict } = await db.query('SELECT id FROM users WHERE phone = $1 AND id != $2', [updates.phone, dealerId]);
            if (conflict.length > 0) throw new ApiError(409, "Phone number already exists.");
        }
    
        // 4. If nothing to update, just return the user to avoid an empty SQL query
        if (Object.keys(updates).length === 0) {
            return stripPassword(existingDealer);
        }
    
        // 5. Build and execute the dynamic UPDATE query
        const setClause = Object.keys(updates).map((key, index) => `"${key}" = $${index + 2}`).join(', ');
        const values = [dealerId, ...Object.values(updates)];
    
        const query = `UPDATE users SET ${setClause} WHERE id = $1 AND role = 'dealer' RETURNING *`;
        
        const { rows } = await db.query(query, values);
    
        if (rows.length === 0) {
            throw new ApiError(404, 'Dealer not found during update operation.');
        }
    
        return stripPassword(rows[0]);
    },

    // ... Financial Actions ...
    async addCreditToUser(adminId: string, userId: string, amount: number): Promise<void> {
        const client = await db.connect();
        try {
            await client.query('BEGIN');
            await transactionService.createSystemCreditTransaction(client, {
                toUserId: userId,
                amount: amount,
                type: TransactionType.ADMIN_CREDIT,
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
        const client = await db.connect();
        try {
            await client.query('BEGIN');
            
            await transactionService.createSystemCreditTransaction(client, {
                toUserId: dealerId,
                amount: amount,
                type: TransactionType.ADMIN_CREDIT
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

    async declareDraw(drawLabel: string, winningNumbers: { two_digit?: string; one_digit_open?: string; one_digit_close?: string; }): Promise<DrawResult> {
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
            if (winningNumbers.two_digit) {
                draw.two_digit = winningNumbers.two_digit;
                draw.one_digit_open = winningNumbers.two_digit.charAt(0);
                draw.one_digit_close = winningNumbers.two_digit.charAt(1);
                draw.declared_at = new Date().toISOString();
                betTypesToSettle.add('2D'); betTypesToSettle.add('1D-Open'); betTypesToSettle.add('1D-Close');
            } else if (winningNumbers.one_digit_open) {
                draw.one_digit_open = winningNumbers.one_digit_open;
                draw.open_declared_at = new Date().toISOString();
                betTypesToSettle.add('1D-Open');
            } else if (winningNumbers.one_digit_close) {
                draw.one_digit_close = winningNumbers.one_digit_close;
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
        const client = await db.connect();
        try {
            await client.query('BEGIN');
            const { rows } = await client.query("UPDATE commissions SET status = 'approved' WHERE id = $1 AND status = 'pending' RETURNING *", [id]);
            const commission = rows[0];
            if (commission) {
                await transactionService.createSystemCreditTransaction(client, {
                    toUserId: commission.recipient_id,
                    amount: parseFloat(commission.amount),
                    type: TransactionType.COMMISSION_PAYOUT,
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
        const client = await db.connect();
        try {
            await client.query('BEGIN');
            const { rows } = await client.query("UPDATE prizes SET status = 'approved' WHERE id = $1 AND status = 'pending' RETURNING *", [id]);
            const prize = rows[0];
            if (prize) {
                 await transactionService.createSystemCreditTransaction(client, {
                    toUserId: prize.user_id,
                    amount: parseFloat(prize.amount),
                    type: TransactionType.PRIZE_WON,
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
        const client = await db.connect();
        try {
            await client.query('BEGIN');
            const { rows } = await client.query("UPDATE top_up_requests SET status = 'approved', approved_at = NOW() WHERE id = $1 AND status = 'pending' RETURNING *", [requestId]);
            const request = rows[0];
            if (!request) throw new ApiError(404, "Request not found or already processed");
            
            await transactionService.createSystemCreditTransaction(client, {
                toUserId: request.dealer_id,
                amount: parseFloat(request.amount),
                type: TransactionType.TOP_UP_APPROVED,
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