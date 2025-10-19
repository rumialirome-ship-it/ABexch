import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { requireAuth } from '../middleware/auth';
import { UserRole } from '../types';
import { handleGetBetHistory, handleGetTransactionHistory, handlePlaceBets, handleGetUserById } from '../controllers/userController';
import { handleAssistantQuery } from '../controllers/assistantController';

const router = Router();

// This middleware will apply to all routes in this file,
// protecting them and making user info available on req.user
const userAuth = requireAuth([UserRole.USER]);

// --- AI Assistant ---
router.post('/assistant', userAuth, asyncHandler(handleAssistantQuery));

// --- Betting ---
router.post('/bets', userAuth, asyncHandler(handlePlaceBets));

// --- Data Fetching ---
router.get('/bets', userAuth, asyncHandler(handleGetBetHistory));
router.get('/transactions', userAuth, asyncHandler(handleGetTransactionHistory));
router.get('/profile', userAuth, asyncHandler(handleGetUserById)); // Fetch own profile


export { router as userRouter };