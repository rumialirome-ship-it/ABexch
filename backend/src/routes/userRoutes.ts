import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { requireAuth } from '../middleware/auth';
import { UserRole } from '../types';
import { handleGetBetHistory, handleGetTransactionHistory, handlePlaceBets, handleGetUserById } from '../controllers/userController';

const router = Router();

// This middleware will apply to all routes in this file
router.use(requireAuth([UserRole.USER, UserRole.DEALER, UserRole.ADMIN]));

// --- Betting ---
router.post('/bets', asyncHandler(handlePlaceBets));

// --- Data Fetching ---
// Note: Changed from /users/:userId/bets to a more RESTful approach where the user ID is implicit from auth
router.get('/bets', asyncHandler(handleGetBetHistory));
router.get('/transactions', asyncHandler(handleGetTransactionHistory));
router.get('/profile', asyncHandler(handleGetUserById)); // Fetch own profile


export { router as userRouter };
