import '../types';
// FIX: Use namespace import for express to resolve type ambiguities.
import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../types';
import { db } from '../db';
import { ApiError, asyncHandler } from './errorHandler';

/**
 * Middleware to protect routes based on user roles.
 * It checks for 'x-user-id' and 'x-user-role' headers, verifies them against the database,
 * and attaches the user info to the request object.
 * @param roles An array of UserRole enums that are allowed to access the route.
 */
export const requireAuth = (roles: UserRole[]) => asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.headers['x-user-id'] as string;
    const userRole = req.headers['x-user-role'] as UserRole;

    if (!userId || !userRole) {
        throw new ApiError(401, 'Authentication headers are missing.');
    }

    if (!roles.includes(userRole)) {
        throw new ApiError(403, 'Forbidden: You do not have permission to access this resource.');
    }

    const { rows } = await db.query('SELECT id, role, is_blocked FROM users WHERE id = $1 AND role = $2', [userId, userRole]);
    const user = rows[0];

    if (!user) {
        throw new ApiError(401, 'Invalid credentials. User not found or role mismatch.');
    }
    
    if (user.is_blocked) {
        throw new ApiError(403, 'This account has been blocked.');
    }

    // Attach user information to the request object for use in subsequent handlers
    req.user = { id: user.id, role: user.role };
    
    next();
});