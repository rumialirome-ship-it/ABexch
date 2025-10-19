import { db } from '../db';
import { User, Bet, Commission, TopUpRequest, UserRole } from '../types';
import { ApiError } from '../middleware/errorHandler';
import { stripPassword, stripPasswords, generateId } from '../utils/helpers';
import { userService } from './userService';
import { transactionService } from './transactionService';

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
     * @throws ApiError if the dealer has insufficient funds for the initial deposit.
     */
    async addUser(dealerId: string, userData: Partial<User> & { username: string, initialDeposit: number }): Promise<Omit<User, 'password'>> {
        const client = await db.getClient();
        try {
            await client.query('BEGIN');
            
            const { rows: dealerRows } = await client.query('SELECT wallet_balance FROM users WHERE id = $1 FOR UPDATE', [dealerId]);
            const dealer = dealerRows[0];
            if (!dealer) throw new ApiError(404, "Dealer not found.");
            
            const initialDeposit = userData.initialDeposit || 0;
            if (dealer.wallet_balance < initialDeposit) {
                throw new ApiError(400, "Dealer has insufficient funds for the initial deposit.");
            }
            
            const userId = generateId('usr');
            const newUser: User = { 
                id: userId, 
                username: userData.username, 
                phone: userData.phone, 
                role: UserRole.USER, 
                wallet_balance: initialDeposit, 
                dealer_id: dealerId, 
                password: userData.password, 
                city: userData.city, 
                commission_rate: userData.commission_rate, 
                prize_rate_2d: userData.prize_rate_2d, 
                prize_rate_1d: userData.prize_rate_1d, 
                bet_limit_2d: userData.bet_limit_2d, 
                bet_limit_1d: userData.bet_limit_1d 
            };
            
            await client.query(
                `INSERT INTO users (id, username, password, phone, role, wallet_balance, dealer_id, city, commission_rate, prize_rate_2d, prize_rate_1d, bet_limit_2d, bet_limit_1d) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
                [userId, newUser.username, newUser.password, newUser.phone, UserRole.USER, newUser.wallet_balance, newUser.dealer_id, newUser.city, newUser.commission_rate, newUser.prize_rate_2d, newUser.prize_rate_1d, newUser.bet_limit_2d, newUser.bet_limit_1d]
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
            return stripPassword(newUser);
        } catch (e) {
            await client.query('ROLLBACK');
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
        const client = await db.getClient();
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
    }
};
