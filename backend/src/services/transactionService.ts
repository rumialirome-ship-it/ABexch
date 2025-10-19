
import { db } from '../db';
import { Transaction, TransactionType } from '../types';
// FIX: Import PoolClient for type safety in transaction methods.
import { PoolClient } from 'pg';
import { generateId } from '../utils/helpers';

// FIX: Define types for transaction parameters for clarity and safety.
type CreditTxnParams = {
    fromUserId: string;
    toUserId: string;
    amount: number;
    type: 'DEALER_TO_USER' | 'USER_TO_ADMIN';
};

type SystemCreditTxnParams = {
    toUserId: string;
    amount: number;
    type: 'ADMIN_CREDIT' | 'COMMISSION_PAYOUT' | 'PRIZE_WON' | 'TOP_UP_APPROVED' | 'COMMISSION_REBATE';
    relatedEntityId?: string;
};


export const transactionService = {
    /**
     * Retrieves the complete transaction history for a specific user.
     * @param userId The ID of the user.
     * @returns A promise that resolves to an array of Transaction objects.
     */
    async getTransactionHistory(userId: string): Promise<Transaction[]> {
        const { rows } = await db.query(
            'SELECT * FROM transactions WHERE user_id = $1 ORDER BY created_at DESC',
            [userId]
        );
        return rows;
    },

    // FIX: Added missing `createCreditTransaction` method used by dealer and admin services.
    /**
     * Creates a credit transfer between two users within a single transaction.
     * This function expects to be called within an existing DB transaction client.
     * @param client The postgres client from an active transaction.
     * @param params The parameters for the credit transaction.
     */
    async createCreditTransaction(client: PoolClient, params: CreditTxnParams) {
        const { fromUserId, toUserId, amount, type } = params;

        const debitType = type === 'DEALER_TO_USER' ? TransactionType.DEALER_DEBIT_TO_USER : TransactionType.ADMIN_DEBIT_FROM_USER;
        const creditType = type === 'DEALER_TO_USER' ? TransactionType.DEALER_CREDIT : TransactionType.ADMIN_CREDIT_FROM_USER;
        
        // Debit from source
        await client.query('UPDATE users SET wallet_balance = wallet_balance - $1 WHERE id = $2', [amount, fromUserId]);
        await client.query(
            'INSERT INTO transactions (id, user_id, type, amount, balance_change, related_entity_id, created_at) VALUES ($1, $2, $3, $4, $5, $6, NOW())',
            [generateId('txn'), fromUserId, debitType, amount, -amount, toUserId]
        );

        // Credit to destination
        await client.query('UPDATE users SET wallet_balance = wallet_balance + $1 WHERE id = $2', [amount, toUserId]);
        await client.query(
            'INSERT INTO transactions (id, user_id, type, amount, balance_change, related_entity_id, created_at) VALUES ($1, $2, $3, $4, $5, $6, NOW())',
            [generateId('txn'), toUserId, creditType, amount, amount, fromUserId]
        );
    },

    // FIX: Added missing `createSystemCreditTransaction` method used by admin services.
    /**
     * Creates a system-generated credit transaction (e.g., prize, commission).
     * This function expects to be called within an existing DB transaction client.
     * @param client The postgres client from an active transaction.
     * @param params The parameters for the system credit transaction.
     */
    async createSystemCreditTransaction(client: PoolClient, params: SystemCreditTxnParams) {
        const { toUserId, amount, type, relatedEntityId } = params;

        await client.query('UPDATE users SET wallet_balance = wallet_balance + $1 WHERE id = $2', [amount, toUserId]);
        await client.query(
            'INSERT INTO transactions (id, user_id, type, amount, balance_change, related_entity_id, created_at) VALUES ($1, $2, $3, $4, $5, $6, NOW())',
            [generateId('txn'), toUserId, type, amount, amount, relatedEntityId]
        );
    }
};
