// Import types FIRST for side-effects to enable Express.Request type augmentation.
// This allows the global types to be patched before any other module consumes them.
import './types';

// Load environment variables FIRST, before any other imports
import dotenv from 'dotenv';
dotenv.config();

// FIX: Use namespace import for express to resolve type ambiguities with other libraries (e.g., DOM).
import express, { Express } from 'express';
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
app.use(express.json());


// --- API Routes ---
// Mount the central API router
app.use('/api', apiRouter);


// --- Global Error Handler ---
// This should be the last piece of middleware.
app.use(globalErrorHandler);


// --- Server Activation ---
app.listen(PORT, () => {
    console.log(`A-BABA Exchange server is running on http://localhost:${PORT}`);
});