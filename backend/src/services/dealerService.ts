


import { db } from '../db';
import { User, Bet, Commission, TopUpRequest, UserRole, Transaction } from '../types';
import { ApiError } from '../middleware/errorHandler';
import { stripPassword, stripPasswords, generateId } from '../utils/helpers';
import { userService } from './userService';
import { transactionService } from './transactionService';
import { bettingService } from './bettingService';

export const dealerService = {
    /**
     * Fetches all users managed by a specific dealer.
     * @param dealerId The ID of the dealer.
     * @returns A promise resolving to an array of user objects without passwords.
     */
    async getUsersByDealer(dealerId: string): Promise<Omit<User, 'password'>[]> {
        const { rows } = await db.query('SELECT * FROM users WHERE role = $1 AND dealer_id = $2', [UserRole.USER, dealerId]);
        return stripPasswords(rows);
    },

    /**
     * Creates a new user under a specific dealer.
     * @param dealerId The ID of the dealer creating the user.
     * @param userData The data for the new user.
     * @returns The newly created user object without the password.
     * @throws ApiError if the dealer has insufficient funds or if username/phone exists.
     */
    async addUser(dealerId: string, userData: Partial<User> & { initial_deposit?: number }): Promise<Omit<User, 'password'>> {
        const client = await db.connect();
        try {
            await client.query('BEGIN');

            const { username, password, phone } = userData;
            if (!username || !phone) {
                throw new ApiError(400, "Username and phone are required.");
            }

            // Check for duplicates before attempting insert for better error feedback
            const { rows: existingUsers } = await client.query('SELECT username, phone FROM users WHERE username = $1 OR phone = $2', [username, phone]);
            if (existingUsers.length > 0) {
                if (existingUsers[0].username === username) {
                    throw new ApiError(409, "Username already exists.");
                }
                if (existingUsers[0].phone === phone) {
                    throw new ApiError(409, "Phone number already exists.");
                }
            }
            
            const { rows: dealerRows } = await client.query('SELECT wallet_balance FROM users WHERE id = $1 FOR UPDATE', [dealerId]);
            const dealer = dealerRows[0];
            if (!dealer) throw new ApiError(404, "Dealer not found.");
            
            const initialDeposit = userData.initial_deposit || 0;
            if (dealer.wallet_balance < initialDeposit) {
                throw new ApiError(400, "Dealer has insufficient funds for the initial deposit.");
            }
            
            const userId = generateId('usr');
            const finalPassword = (password && password.trim()) ? password.trim() : null;
            
            await client.query(
                `INSERT INTO users (id, username, password, phone, role, wallet_balance, dealer_id, city, prize_rate_2d, prize_rate_1d, bet_limit_2d, bet_limit_1d, bet_limit_per_draw) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
                [
                    userId, username, finalPassword, phone, UserRole.USER, 0, dealerId, // Set initial balance to 0
                    userData.city || null,
                    userData.prize_rate_2d != null ? userData.prize_rate_2d : 85,
                    userData.prize_rate_1d != null ? userData.prize_rate_1d : 9.5,
                    userData.bet_limit_2d || null,
                    userData.bet_limit_1d || null,
                    userData.bet_limit_per_draw || null,
                ]
            );
            
            if (initialDeposit > 0) {
                await transactionService.createCreditTransaction(client, {
                    fromUserId: dealerId,
                    toUserId: userId,
                    amount: initialDeposit,
                    type: 'DEALER_TO_USER'
                });
            }
            
            await client.query('COMMIT');

            const { rows: createdUser } = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
            return stripPassword(createdUser[0]);
        } catch (e) {
            await client.query('ROLLBACK');
            if (e instanceof ApiError) throw e;
            // Catch potential race conditions where unique constraint is violated
            if ((e as any).code === '23505') {
                 throw new ApiError(409, "Username or phone number already exists.");
            }
            throw e;
        } finally {
            client.release();
        }
    },

    async getManagedUserById(dealerId: string, userId: string): Promise<Omit<User, 'password'>> {
        const user = await userService.getUserById(userId);
        if (user.dealer_id !== dealerId) {
            throw new ApiError(403, 'Forbidden: This user is not managed by you.');
        }
        return user;
    },
    
    async addCreditToUser(dealerId: string, userId: string, amount: number): Promise<void> {
        const client = await db.connect();
        try {
            await client.query('BEGIN');
            
            const { rows: dealerRows } = await client.query('SELECT wallet_balance FROM users WHERE id = $1 FOR UPDATE', [dealerId]);
            if (!dealerRows[0]) throw new ApiError(404, 'Dealer not found.');
            if (dealerRows[0].wallet_balance < amount) throw new ApiError(400, 'Dealer has insufficient funds.');

            const { rows: userRows } = await client.query('SELECT id FROM users WHERE id = $1 AND dealer_id = $2 FOR UPDATE', [userId, dealerId]);
            if (!userRows[0]) throw new ApiError(404, 'User not found or not managed by this dealer.');

            await transactionService.createCreditTransaction(client, {
                fromUserId: dealerId,
                toUserId: userId,
                amount,
                type: 'DEALER_TO_USER'
            });

            await client.query('COMMIT');
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    },

    async updateUserBetLimit(dealerId: string, userId: string, limit: number | null): Promise<Omit<User, 'password'>> {
        const { rows } = await db.query(
            "UPDATE users SET bet_limit_per_draw = $1 WHERE id = $2 AND dealer_id = $3 RETURNING *", 
            [limit, userId, dealerId]
        );
        if (rows.length === 0) {
            throw new ApiError(404, "User not found or does not belong to this dealer.");
        }
        return stripPassword(rows[0]);
    },

    async getBetsByDealer(dealerId: string): Promise<Bet[]> {
        const { rows } = await db.query(
            'SELECT b.* FROM bets b JOIN users u ON b.user_id = u.id WHERE u.dealer_id = $1 ORDER BY b.created_at DESC',
            [dealerId]
        );
        return rows;
    },

    async requestTopUp(dealerId: string, amount: number, reference: string): Promise<TopUpRequest> {
        const dealer = await userService.getUserById(dealerId);
        const { rows } = await db.query(
            "INSERT INTO top_up_requests (id, dealer_id, dealer_username, amount, reference, status, created_at) VALUES ($1, $2, $3, $4, $5, 'pending', NOW()) RETURNING *",
            [generateId('tpr'), dealerId, dealer.username, amount, reference]
        );
        return rows[0];
    },

    async getPendingCommissionsForDealer(dealerId: string): Promise<Commission[]> {
        const { rows } = await db.query(
            "SELECT * FROM commissions WHERE status = 'pending' AND recipient_id = $1 AND recipient_type = 'dealer'", 
            [dealerId]
        );
        return rows;
    },

    async getCommissionsForDealer(dealerId: string): Promise<Commission[]> {
        const { rows } = await db.query(
            "SELECT * FROM commissions WHERE recipient_id = $1 AND recipient_type = 'dealer' ORDER BY created_at DESC", 
            [dealerId]
        );
        return rows;
    },

    async getBetsForManagedUser(dealerId: string, userId: string): Promise<Bet[]> {
        await this.getManagedUserById(dealerId, userId);
        return bettingService.getBetHistory(userId);
    },

    async getTransactionsForManagedUser(dealerId: string, userId: string): Promise<Transaction[]> {
        await this.getManagedUserById(dealerId, userId);
        return transactionService.getTransactionHistory(userId);
    },

    async updateUser(dealerId: string, userId: string, userData: Partial<User>): Promise<Omit<User, 'password'>> {
        const { rows: existingUserRows } = await db.query('SELECT * FROM users WHERE id = $1 AND dealer_id = $2', [userId, dealerId]);
        if (existingUserRows.length === 0) {
            throw new ApiError(404, "User not found or you don't have permission to edit this user.");
        }
        
        const allowedToUpdate = ['username', 'password', 'phone', 'city', 'prize_rate_2d', 'prize_rate_1d', 'bet_limit_2d', 'bet_limit_1d', 'bet_limit_per_draw'];
        const updates: { [key: string]: any } = {};
        
        for (const key of allowedToUpdate) {
            if (Object.prototype.hasOwnProperty.call(userData, key)) {
                const value = (userData as any)[key];
                if (key === 'password' && (!value || String(value).trim() === '')) {
                    continue; 
                }
                
                const isNumericField = ['prize_rate_2d', 'prize_rate_1d', 'bet_limit_2d', 'bet_limit_1d', 'bet_limit_per_draw'].includes(key);
                if (isNumericField && (value === '' || value === null)) {
                     updates[key] = null;
                } else {
                    updates[key] = value;
                }
            }
        }

        if (Object.keys(updates).length === 0) {
            return stripPassword(existingUserRows[0]); // Nothing to update
        }

        if (updates.username && updates.username !== existingUserRows[0].username) {
            const { rows: conflict } = await db.query('SELECT id FROM users WHERE username = $1 AND id != $2', [updates.username, userId]);
            if (conflict.length > 0) throw new ApiError(409, "Username already exists.");
        }
        if (updates.phone && updates.phone !== existingUserRows[0].phone) {
            const { rows: conflict } = await db.query('SELECT id FROM users WHERE phone = $1 AND id != $2', [updates.phone, userId]);
            if (conflict.length > 0) throw new ApiError(409, "Phone number already exists.");
        }

        const setClause = Object.keys(updates).map((key, index) => `"${key}" = $${index + 2}`).join(', ');
        const values = [userId, ...Object.values(updates)];

        const { rows: updatedUserRows } = await db.query(`UPDATE users SET ${setClause} WHERE id = $1 RETURNING *`, values);
        
        return stripPassword(updatedUserRows[0]);
    },

    async deleteUser(dealerId: string, userId: string): Promise<void> {
        const { rows } = await db.query('DELETE FROM users WHERE id = $1 AND dealer_id = $2 RETURNING id', [userId, dealerId]);
        if (rows.length === 0) {
            throw new ApiError(404, "User not found or you don't have permission to delete this user.");
        }
    },
};