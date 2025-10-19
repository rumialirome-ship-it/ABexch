import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { requireAuth } from '../middleware/auth';
import { UserRole } from '../types';
import {
    handleGetAllSystemUsers,
    handleAdminAddUser,
    handleGetSystemUserById,
    handleAdminAddCreditToUser,
    handleGetAllDealers,
    handleAddDealer,
    handleAddCreditToDealer,
    handleDeclareDraw,
    handleGetPendingCommissions,
    handleApproveCommission,
    handleGetPendingPrizes,
    handleApprovePrize,
    handleGetPendingTopUps,
    handleApproveTopUp,
    handleDebitFunds,
} from '../controllers/adminController';

const router = Router();

// All routes in this file require ADMIN role
router.use(requireAuth([UserRole.ADMIN]));

// --- User Management ---
router.get('/users', asyncHandler(handleGetAllSystemUsers));
router.post('/users', asyncHandler(handleAdminAddUser));
router.get('/users/:userId', asyncHandler(handleGetSystemUserById));
router.post('/users/:userId/credit', asyncHandler(handleAdminAddCreditToUser));

// --- Dealer Management ---
router.get('/dealers', asyncHandler(handleGetAllDealers));
router.post('/dealers', asyncHandler(handleAddDealer));
router.post('/dealers/:dealerId/credit', asyncHandler(handleAddCreditToDealer));

// --- Draw & Bet Management ---
router.post('/draws', asyncHandler(handleDeclareDraw));

// --- Approvals ---
router.get('/commissions/pending', asyncHandler(handleGetPendingCommissions));
router.post('/commissions/:id/approve', asyncHandler(handleApproveCommission));
router.get('/prizes/pending', asyncHandler(handleGetPendingPrizes));
router.post('/prizes/:id/approve', asyncHandler(handleApprovePrize));
router.get('/top-ups/pending', asyncHandler(handleGetPendingTopUps));
router.post('/top-ups/:id/approve', asyncHandler(handleApproveTopUp));

// --- Financial Actions ---
router.post('/debit', asyncHandler(handleDebitFunds));


export { router as adminRouter };
