import { db } from '../db';
import { Bet, BetStatus, DrawResult, TransactionType, User } from '../types';
import { ApiError } from '../middleware/errorHandler';
import { generateId } from '../utils/helpers';

export const bettingService = {
    /**
     * Places multiple bets for a user in a single atomic transaction.
     * It validates the user's balance and bet limit per draw, creates bet records, 
     * and creates corresponding 'bet_placed' transactions.
     * @param betsToPlace An array of bet objects to be placed.
     * @returns A promise that resolves to an array of the newly created Bet objects.
     * @throws ApiError if the user is not found, has an insufficient balance, or exceeds their bet limit.
     */
    async placeBets(betsToPlace: Omit<Bet, 'id' | 'created_at' | 'status'>[]): Promise<Bet[]> {
        if (betsToPlace.length === 0) return [];
        
        const client = await db.connect();
        try {
            await client.query('BEGIN');
            
            const userId = betsToPlace[0].user_id;
            const drawLabel = betsToPlace[0].draw_label;
            
            // Fetch user details, including the bet limit
            const { rows: userRows } = await client.query('SELECT wallet_balance, is_blocked, bet_limit_per_draw FROM users WHERE id = $1 FOR UPDATE', [userId]);
            const user: User = userRows[0];
            
            if (!user) {
                throw new ApiError(404, "User not found");
            }
            
            if (user.is_blocked) {
                throw new ApiError(403, "Your account is blocked and you cannot place bets.");
            }

            const totalStakeForThisRequest = betsToPlace.reduce((acc, bet) => acc + bet.stake, 0);
            
            // 1. Check wallet balance
            if (user.wallet_balance < totalStakeForThisRequest) {
                throw new ApiError(400, "Insufficient wallet balance.");
            }

            // 2. Check bet limit per draw
            if (user.bet_limit_per_draw !== null && user.bet_limit_per_draw > 0) {
                const { rows: stakeRows } = await client.query(
                    'SELECT COALESCE(SUM(stake), 0)::numeric as total_staked FROM bets WHERE user_id = $1 AND draw_label = $2',
                    [userId, drawLabel]
                );
                const alreadyStaked = parseFloat(stakeRows[0].total_staked);

                const newTotalStakedForDraw = alreadyStaked + totalStakeForThisRequest;

                if (newTotalStakedForDraw > user.bet_limit_per_draw) {
                    const remainingAmount = user.bet_limit_per_draw - alreadyStaked;
                    throw new ApiError(400, `Bet exceeds draw limit of ${user.bet_limit_per_draw.toFixed(2)}. You can bet up to ${remainingAmount.toFixed(2)} more on this draw.`);
                }
            }
            
            const placedBets: Bet[] = [];
            for (const bet of betsToPlace) {
                const betId = generateId('bet');
                const createdAt = new Date().toISOString();
                const newBet: Bet = { ...bet, id: betId, created_at: createdAt, status: BetStatus.PENDING };
                
                await client.query(
                    'INSERT INTO bets (id, user_id, draw_label, game_type, number, stake, status, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
                    [betId, bet.user_id, bet.draw_label, bet.game_type, bet.number, bet.stake, BetStatus.PENDING, createdAt]
                );
                placedBets.push(newBet);
                
                await client.query(
                    'INSERT INTO transactions (id, user_id, type, amount, balance_change, related_entity_id, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7)',
                    [generateId('txn'), bet.user_id, TransactionType.BET_PLACED, bet.stake, -bet.stake, betId, createdAt]
                );
            }
            
            await client.query('UPDATE users SET wallet_balance = wallet_balance - $1 WHERE id = $2', [totalStakeForThisRequest, userId]);
            
            await client.query('COMMIT');
            return placedBets;
        } catch (e) {
            await client.query('ROLLBACK');
            // Re-throw the original error to be handled by the global error handler
            throw e;
        } finally {
            client.release();
        }
    },

    /**
     * Retrieves the betting history for a specific user.
     * @param userId The ID of the user.
     * @returns A promise that resolves to an array of Bet objects.
     */
    async getBetHistory(userId: string): Promise<Bet[]> {
        const { rows } = await db.query(
            'SELECT * FROM bets WHERE user_id = $1 ORDER BY created_at DESC',
            [userId]
        );
        return rows;
    },

    /**
     * Retrieves all draw results, sorted by declaration date.
     * @returns A promise that resolves to an array of DrawResult objects.
     */
    async getDrawResults(): Promise<DrawResult[]> {
        const { rows } = await db.query(
            'SELECT * FROM draw_results ORDER BY declared_at DESC NULLS LAST, open_declared_at DESC NULLS LAST'
        );
        return rows;
    }
};