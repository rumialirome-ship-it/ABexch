import { db } from '../db';
import { User } from '../types';
import { ApiError } from '../middleware/errorHandler';
import { stripPassword } from '../utils/helpers';

export const userService = {
    /**
     * Fetches a single user by their ID.
     * @param userId The ID of the user to fetch.
     * @returns The user object without the password.
     * @throws ApiError if the user is not found.
     */
    async getUserById(userId: string): Promise<Omit<User, 'password'>> {
        const { rows } = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
        const user: User | undefined = rows[0];

        if (!user) {
            throw new ApiError(404, 'User not found.');
        }

        return stripPassword(user);
    }
};
