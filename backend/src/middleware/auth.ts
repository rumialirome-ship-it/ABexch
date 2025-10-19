import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../types';
import { db } from '../db';
import { ApiError } from './errorHandler';
// Force-include the global type augmentation for Express.Request
import '../types';

/**
 * Middleware to protect routes based on user roles.
 * It checks for 'x-user-id' and 'x-user-role' headers, verifies them against the database,
 * and attaches the user info to the request object.
 * @param roles An array of UserRole enums that are allowed to access the route.
 */
export const requireAuth = (roles: UserRole[]) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        const id = req.headers['x-user-id'] as string;
        const role = req.headers['x-user-role'] as UserRole;

        if (!id || !role) {
            return next(new ApiError(401, 'Authentication headers are missing.'));
        }

        if (!roles.includes(role)) {
            return next(new ApiError(403, 'Forbidden: You do not have sufficient permissions to access this resource.'));
        }

        try {
            // Verify user exists in the database to prevent header spoofing
            const { rows } = await db.query('SELECT id, role FROM users WHERE id = $1 AND role = $2', [id, role]);
            if (rows.length === 0) {
                return next(new ApiError(401, 'Invalid user credentials provided in headers.'));
            }

            // Attach authenticated user information to the request object
            req.user = { id, role };
            next();
        } catch (error) {
            console.error('Auth middleware error:', error);
            next(new ApiError(500, 'An error occurred during authentication.'));
        }
    };
};