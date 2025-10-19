import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { handleLogin } from '../controllers/authController';
import { handleGetDrawResults, handleGetAllBets, handleGetAllDraws, handleGetAllUsers } from '../controllers/publicController';

const router = Router();

// --- Authentication ---
router.post('/login', asyncHandler(handleLogin));

// --- Public Data ---
router.get('/results', asyncHandler(handleGetDrawResults));

// --- Internal Polling Routes ---
// These are used by the frontend for real-time updates.
router.get('/internal/state/users', asyncHandler(handleGetAllUsers));
router.get('/internal/state/bets', asyncHandler(handleGetAllBets));
router.get('/internal/state/draws', asyncHandler(handleGetAllDraws));


export { router as publicRouter };
