import { Router } from 'express';
import { publicRouter } from './publicRoutes';
import { adminRouter } from './adminRoutes';
import { dealerRouter } from './dealerRoutes';
import { userRouter } from './userRoutes';

const router = Router();

// --- Public Routes --- (No auth required)
router.use('/', publicRouter);

// --- Authenticated & Role-Specific Routes ---
router.use('/admin', adminRouter);
router.use('/dealer', dealerRouter);
router.use('/', userRouter); // User routes are now at the root, e.g., /api/bets, /api/transactions

export { router as apiRouter };
