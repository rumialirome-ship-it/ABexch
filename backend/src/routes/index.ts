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
router.use('/user', userRouter); // Note: Renamed from '/users' for consistency

export { router as apiRouter };
