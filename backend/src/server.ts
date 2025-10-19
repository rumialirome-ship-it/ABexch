
import express, { Express } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { apiRouter } from './routes';
import { globalErrorHandler } from './middleware/errorHandler';

// Import types for side-effects to enable Express.Request type augmentation
import './types';

// Load environment variables
dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 3001;

// --- Core Middleware ---
// Enable CORS for the specified origin
app.use(cors({ origin: process.env.CORS_ORIGIN, optionsSuccessStatus: 200 }));
// Parse incoming JSON requests
app.use(express.json());


// --- API Routes ---
// Mount the central API router
app.use('/api', apiRouter);


// --- Global Error Handler ---
// This should be the last piece of middleware
app.use(globalErrorHandler);


// --- Server Activation ---
app.listen(PORT, () => {
    console.log(`A-BABA Exchange server is running on http://localhost:${PORT}`);
});