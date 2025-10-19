// FIX: Add explicit imports for Express types to resolve property access errors.
// FIX: Aliased Request and Response to avoid name collisions with global types.
import { Request as ExpressRequest, Response as ExpressResponse, NextFunction, ErrorRequestHandler } from 'express';

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
export const asyncHandler = (fn: (req: ExpressRequest, res: ExpressResponse, next: NextFunction) => Promise<any>) => 
    (req: ExpressRequest, res: ExpressResponse, next: NextFunction) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };

/**
 * Global error handling middleware. This should be the last middleware added to the Express app.
 * It catches errors from anywhere in the application and sends a formatted JSON response.
 */
export const globalErrorHandler: ErrorRequestHandler = (err, req, res, next) => {
    // Log the error for debugging purposes. In a production environment, you'd use a more robust logger.
    console.error(`[ERROR] ${new Date().toISOString()} - ${req.method} ${req.originalUrl}`);
    console.error(err.stack || err);

    // Default to a 500 Internal Server Error
    let statusCode = 500;
    let message = 'An unexpected error occurred on the server.';

    // If it's an instance of our custom ApiError, use its properties
    if (err instanceof ApiError) {
        statusCode = err.statusCode;
        message = err.message;
    }
    
    // In development, you might want to send the full error stack
    const responseBody: { message: string; stack?: string } = { message };
    if (process.env.NODE_ENV === 'development' && err.stack) {
        responseBody.stack = err.stack;
    }

    // Send the JSON response
    // Ensure that headers haven't already been sent
    if (res.headersSent) {
        return next(err);
    }
    
    res.status(statusCode).json(responseBody);
};
