import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { requireAuth } from '../middleware/auth';
import { UserRole } from '../types';
import { handleGetBetHistory, handleGetTransactionHistory, handlePlaceBets, handleGetUserById } from '../controllers/userController';
import { handleAssistantQuery } from '../controllers/assistantController';

const router = Router();

// Define different auth middleware for clarity
const userOnlyAuth = requireAuth([UserRole.USER]);
const userAndDealerAuth = requireAuth([UserRole.USER, UserRole.DEALER]);


// --- AI Assistant ---
router.post('/assistant', userOnlyAuth, asyncHandler(handleAssistantQuery));

// --- Betting ---
router.post('/bets', userOnlyAuth, asyncHandler(handlePlaceBets));
router.get('/bets', userOnlyAuth, asyncHandler(handleGetBetHistory));

// --- Data Fetching (for self) ---
router.get('/transactions', userAndDealerAuth, asyncHandler(handleGetTransactionHistory));
router.get('/profile', userAndDealerAuth, asyncHandler(handleGetUserById)); // Fetch own profile


export { router as userRouter };