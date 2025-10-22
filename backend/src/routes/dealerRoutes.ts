
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
    handleGetManagedUserById,
    handleGetBetsForManagedUser,
    handleGetTransactionsForManagedUser,
    handleUpdateManagedUser,
    handleDeleteManagedUser
} from '../controllers/dealerController';

const router = Router();

// All routes in this file require DEALER role
router.use(requireAuth([UserRole.DEALER]));

// --- User Management ---
router.get('/users', asyncHandler(handleGetManagedUsers));
router.post('/users', asyncHandler(handleAddUser));
router.get('/users/:userId', asyncHandler(handleGetManagedUserById));
router.put('/users/:userId', asyncHandler(handleUpdateManagedUser));
router.delete('/users/:userId', asyncHandler(handleDeleteManagedUser));
router.post('/users/:userId/credit', asyncHandler(handleAddCreditToUser));
router.put('/users/:userId/bet-limit', asyncHandler(handleUpdateUserBetLimit));
router.get('/users/:userId/bets', asyncHandler(handleGetBetsForManagedUser));
router.get('/users/:userId/transactions', asyncHandler(handleGetTransactionsForManagedUser));

// --- Data & Actions ---
router.get('/bets', asyncHandler(handleGetBetsByDealer));
router.post('/top-up', asyncHandler(handleRequestTopUp));
router.get('/commissions/pending', asyncHandler(handleGetPendingCommissions));

export { router as dealerRouter };
