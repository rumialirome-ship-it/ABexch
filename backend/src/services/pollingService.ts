import { db } from '../db';
import { Bet, DrawResult } from '../types';
import { stripPasswords } from '../utils/helpers';

/**
 * This service provides simple, read-only access to the full state of
 * key tables, intended for the frontend's polling mechanism to detect changes.
 */
export const pollingService = {
    /**
     * Retrieves all users from the database, with passwords stripped.
     */
    async getAllUsers() {
        const { rows } = await db.query('SELECT * FROM users');
        return stripPasswords(rows);
    },

    /**
     * Retrieves all bets from the database.
     */
    async getAllBets(): Promise<Bet[]> {
        const { rows } = await db.query('SELECT * FROM bets');
        return rows;
    },

    /**
     * Retrieves all draw results, sorted by date.
     */
    async getAllDraws(): Promise<DrawResult[]> {
        const { rows } = await db.query('SELECT * FROM draw_results ORDER BY declared_at DESC NULLS LAST, open_declared_at DESC NULLS LAST');
        return rows;
    },
};
