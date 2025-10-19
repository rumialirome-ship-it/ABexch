


import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { apiRouter } from './src/routes';
import { globalErrorHandler } from './src/middleware/errorHandler';

// Import types for side-effects to enable Express.Request type augmentation
import './src/types';

// Load environment variables from the correct path for running from project root
dotenv.config({ path: './backend/.env' });


const app = express();
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