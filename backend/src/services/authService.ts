import { User, UserRole } from '../types';
import { db } from '../db';
import { ApiError } from '../middleware/errorHandler';
import { stripPassword } from '../utils/helpers';

export const authService = {
    /**
     * Authenticates a user based on their role, username, and PIN.
     * Handles both custom passwords and default initial passwords.
     * @returns The authenticated user object without the password.
     * @throws ApiError if login fails.
     */
    async login(role: UserRole, username: string, pin: string): Promise<Omit<User, 'password'>> {
        const { rows } = await db.query('SELECT * FROM users WHERE role = $1 AND username = $2', [role, username]);
        const user: User = rows[0];

        if (!user) {
            throw new ApiError(401, 'Invalid credentials. User not found.');
        }

        // Check against the user's stored password
        if (user.password && pin === user.password) {
            return stripPassword(user);
        }

        // Check for default passwords if the user hasn't set one
        if (!user.password) {
            const isDefaultUserPin = role === UserRole.USER && pin === 'Pak@123';
            const isDefaultNonUserPin = (role === UserRole.DEALER || role === UserRole.ADMIN) && pin === 'Admin@123';
            
            if (isDefaultUserPin || isDefaultNonUserPin) {
                return stripPassword(user);
            }
        }
        
        // If all checks fail
        throw new ApiError(401, 'Invalid credentials. Incorrect PIN.');
    }
};
