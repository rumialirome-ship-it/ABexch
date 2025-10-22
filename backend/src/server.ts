// @google/genai-dev-tool: Fix: Import types FIRST for side-effects to enable Express.Request type augmentation.
// This allows the global types to be patched before any other module consumes them.
import './types';

// Load environment variables FIRST, before any other imports
import dotenv from 'dotenv';
dotenv.config();

import express, { Express, RequestHandler, ErrorRequestHandler } from 'express';
import cors from 'cors';
import { apiRouter } from './routes';
import { globalErrorHandler } from './middleware/errorHandler';

const app: Express = express();
const PORT = process.env.PORT || 3001;

// --- Core Middleware ---
// Enable CORS for specified origins by parsing a comma-separated list
const allowedOrigins = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : [];
app.use(cors({ origin: allowedOrigins, optionsSuccessStatus: 200 }));

// Parse incoming JSON requests
// @google/genai-dev-tool: Fix: Cast middleware to RequestHandler to resolve overload ambiguity.
app.use(express.json() as RequestHandler);


// --- API Routes ---
// Mount the central API router
app.use('/api', apiRouter);


// --- Global Error Handler ---
// This should be the last piece of middleware.
// NOTE: The `app.use` overload error is resolved by fixing the type definitions in the imported `globalErrorHandler`.
// @google/genai-dev-tool: Fix: Cast middleware to ErrorRequestHandler to resolve overload ambiguity.
app.use(globalErrorHandler as ErrorRequestHandler);


// --- Server Activation ---
app.listen(PORT, () => {
    console.log(`A-BABA Exchange server is running on http://localhost:${PORT}`);
});