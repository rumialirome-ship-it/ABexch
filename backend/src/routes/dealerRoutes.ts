import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { requireAuth } from '../middleware/auth';
import { UserRole } from '../types';
import { 
    handleGetManagedUsers, 
    handleAddUser,
    handleAddCreditToUser, 
    handleGetBetsByDealer,
    handleRequestTopUp,
    handleGetPendingCommissions,
    handleUpdateUserBetLimit,
    handleGetManagedUserById
} from '../controllers/dealerController';

const router = Router();

// All routes in this file require DEALER role
router.use(requireAuth([UserRole.DEALER]));

// --- User Management ---
router.get('/users', asyncHandler(handleGetManagedUsers));
router.post('/users', asyncHandler(handleAddUser));
router.get('/users/:userId', asyncHandler(handleGetManagedUserById));
router.post('/users/:userId/credit', asyncHandler(handleAddCreditToUser));
router.put('/users/:userId/bet-limit', asyncHandler(handleUpdateUserBetLimit));

// --- Data & Actions ---
router.get('/bets', asyncHandler(handleGetBetsByDealer));
router.post('/top-up', asyncHandler(handleRequestTopUp));
router.get('/commissions/pending', asyncHandler(handleGetPendingCommissions));

export { router as dealerRouter };
