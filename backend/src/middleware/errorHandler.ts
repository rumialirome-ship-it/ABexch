import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';

/**
 * Custom error class for API-specific errors, containing a status code.
 */
export class ApiError extends Error {
    statusCode: number;
    constructor(statusCode: number, message: string) {
        super(message);
        this.statusCode = statusCode;
    }
}

/**
 * A wrapper for async route handlers to catch errors and pass them to the global error handler.
 * This prevents unhandled promise rejections from crashing the server.
 * @param fn The async route handler function.
 */
export const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => {
    return (req: Request, res: Response, next: NextFunction) => {
        fn(req, res, next).catch(next);
    };
};

/**
 * Global error handling middleware. This should be the last middleware added to the Express app.
 * It catches all errors passed via `next(error)` and sends a formatted JSON response.
 */
// FIX: Explicitly type the handler as ErrorRequestHandler to resolve type inference issues.
export const globalErrorHandler: ErrorRequestHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
    // Log the full error for debugging purposes, especially for non-ApiError types
    console.error(err);

    // Default to a 500 server error if the error is not an instance of our custom ApiError
    let statusCode = 500;
    let message = 'An unexpected error occurred on the server.';

    if (err instanceof ApiError) {
        statusCode = err.statusCode;
        message = err.message;
    }
    
    // Send a structured JSON error response to the client
    res.status(statusCode).json({
        status: 'error',
        statusCode,
        message,
    });
};
