
import express, { Express, ErrorRequestHandler } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { apiRouter } from './routes';
import { globalErrorHandler } from './middleware/errorHandler';

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
// FIX: Explicitly cast globalErrorHandler to ErrorRequestHandler to resolve type inference issue with app.use().
app.use(globalErrorHandler as ErrorRequestHandler);


// --- Server Activation ---
app.listen(PORT, () => {
    console.log(`A-BABA Exchange server is running on http://localhost:${PORT}`);
});
