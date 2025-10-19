
// FIX: Added type-only import for express types.
import type { Request, Response, NextFunction } from 'express';

/**
 * Custom error class for handling API-specific errors with status codes.
 */
export class ApiError extends Error {
    statusCode: number;
    constructor(statusCode: number, message: string) {
        super(message);
        this.statusCode = statusCode;
        Object.setPrototypeOf(this, ApiError.prototype);
    }
}

/**
 * A wrapper for async route handlers to catch errors and pass them to the global error handler.
 * This avoids the need for try-catch blocks in every controller.
 * @param fn The async controller function.
 */
export const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => 
    (req: Request, res: Response, next: NextFunction) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };

/**
 * Global error handling middleware. It catches all errors passed via `next(err)`
 * and formats them into a consistent JSON response.
 */
export const globalErrorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error(`[ERROR] ${new Date().toISOString()} - ${req.method} ${req.originalUrl}:`, err);

    if (err instanceof ApiError) {
        return res.status(err.statusCode).json({ message: err.message });
    }

    // Handle pg-promise unique constraint violation (code 23505)
    if (err.message.includes('duplicate key value violates unique constraint')) {
        return res.status(409).json({ message: 'A record with the given details already exists. Please use a unique value.' });
    }
    
    // Default to a 500 server error for any unhandled errors
    return res.status(500).json({ message: 'An internal server error occurred.' });
};
