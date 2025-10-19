





import express, { Request, Response, NextFunction } from 'express';
// FIX: Changed to type-only imports for Express types to resolve widespread type errors.
import cors from 'cors';
import dotenv from 'dotenv';
import { db } from './db';
import { UserRole } from './types';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: process.env.CORS_ORIGIN, optionsSuccessStatus: 200 }));
app.use(express.json());

const auth = (roles: UserRole[]) => (req: Request, res: Response, next: NextFunction) => {
    const role = req.headers['x-user-role'] as UserRole;
    if (role && roles.includes(role)) return next();
    return res.status(403).json({ message: 'Forbidden' });
};

const router = express.Router();

const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => 
    (req: Request, res: Response, next: NextFunction) => {
        Promise.resolve(fn(req, res, next)).catch(err => {
            console.error(err);
            res.status(500).json({ message: err.message || 'An internal server error occurred.' });
        });
    };

// Public Routes
router.post('/login', asyncHandler(async (req, res) => {
    const { role, username, pin } = req.body;
    const user = await db.findUserForLogin(role, username, pin);
    if (user) res.json(user);
    else res.status(401).json({ message: 'Invalid credentials' });
}));
router.get('/results', asyncHandler(async (req, res) => res.json(await db.getDrawResults())));

// User Routes
router.get('/users/:userId/bets', asyncHandler(async (req, res) => res.json(await db.getBetHistory(req.params.userId))));
router.get('/users/:userId/transactions', asyncHandler(async (req, res) => res.json(await db.getTransactionHistory(req.params.userId))));
router.post('/bets', asyncHandler(async (req, res) => {
    const placedBets = await db.placeBets(req.body);
    res.status(201).json(placedBets);
}));

// Dealer Routes
router.get('/dealer/users', auth([UserRole.DEALER]), asyncHandler(async (req, res) => {
    res.json(await db.getUsersByDealer(req.headers['x-user-id'] as string));
}));
router.post('/dealer/users', auth([UserRole.DEALER]), asyncHandler(async (req, res) => {
    const newUser = await db.addUser(req.headers['x-user-id'] as string, req.body);
    res.status(201).json(newUser);
}));
router.post('/dealer/users/:userId/credit', auth([UserRole.DEALER]), asyncHandler(async (req, res) => {
    await db.addCreditToUser(req.headers['x-user-id'] as string, req.params.userId, req.body.amount, UserRole.DEALER);
    res.status(200).json({ message: 'Credit added successfully' });
}));
router.get('/dealer/bets', auth([UserRole.DEALER]), asyncHandler(async (req, res) => {
    res.json(await db.getBetsByDealer(req.headers['x-user-id'] as string));
}));
router.post('/dealer/top-up', auth([UserRole.DEALER]), asyncHandler(async (req, res) => {
    const request = await db.requestTopUp(req.headers['x-user-id'] as string, req.body.amount, req.body.reference);
    res.status(201).json(request);
}));
router.get('/dealer/commissions/pending', auth([UserRole.DEALER]), asyncHandler(async (req, res) => {
    res.json(await db.getPendingCommissionsForDealer(req.headers['x-user-id'] as string));
}));
router.put('/dealer/users/:userId/bet-limit', auth([UserRole.DEALER]), asyncHandler(async (req, res) => {
    const user = await db.updateUserBetLimit(req.headers['x-user-id'] as string, req.params.userId, req.body.limit);
    res.json(user);
}));

// Admin Routes
router.get('/admin/users', auth([UserRole.ADMIN]), asyncHandler(async (req, res) => res.json(await db.getUsersByRole(UserRole.USER))));
router.post('/admin/users', auth([UserRole.ADMIN]), asyncHandler(async (req, res) => {
    const newUser = await db.addUser(req.body.dealerId, req.body);
    res.status(201).json(newUser);
}));
router.get('/admin/dealers', auth([UserRole.ADMIN]), asyncHandler(async (req, res) => res.json(await db.getUsersByRole(UserRole.DEALER))));
router.post('/admin/dealers', auth([UserRole.ADMIN]), asyncHandler(async (req, res) => {
    const newDealer = await db.addDealer(req.body);
    res.status(201).json(newDealer);
}));
router.post('/admin/users/:userId/credit', auth([UserRole.ADMIN]), asyncHandler(async (req, res) => {
    await db.addCreditToUser(req.headers['x-user-id'] as string, req.params.userId, req.body.amount, UserRole.ADMIN);
    res.status(200).json({ message: 'Credit added successfully' });
}));
router.post('/admin/dealers/:dealerId/credit', auth([UserRole.ADMIN]), asyncHandler(async (req, res) => {
    const dealer = await db.addCreditToDealer(req.params.dealerId, req.body.amount);
    res.json(dealer);
}));
router.post('/admin/draws', auth([UserRole.ADMIN]), asyncHandler(async (req, res) => {
    const result = await db.declareDraw(req.body.drawLabel, req.body.winningNumbers);
    res.status(201).json(result);
}));
router.get('/admin/commissions/pending', auth([UserRole.ADMIN]), asyncHandler(async (req, res) => res.json(await db.getPendingCommissions())));
router.post('/admin/commissions/:id/approve', auth([UserRole.ADMIN]), asyncHandler(async (req, res) => {
    await db.approveCommission(req.params.id);
    res.status(200).json({ message: 'Commission approved' });
}));
router.get('/admin/prizes/pending', auth([UserRole.ADMIN]), asyncHandler(async (req, res) => res.json(await db.getPendingPrizes())));
router.post('/admin/prizes/:id/approve', auth([UserRole.ADMIN]), asyncHandler(async (req, res) => {
    await db.approvePrize(req.params.id);
    res.status(200).json({ message: 'Prize approved' });
}));
router.get('/admin/top-ups/pending', auth([UserRole.ADMIN]), asyncHandler(async (req, res) => res.json(await db.getPendingTopUps())));
router.post('/admin/top-ups/:id/approve', auth([UserRole.ADMIN]), asyncHandler(async (req, res) => {
    await db.approveTopUp(req.params.id);
    res.status(200).json({ message: 'Top-up approved' });
}));
router.post('/admin/debit', auth([UserRole.ADMIN]), asyncHandler(async (req, res) => {
    await db.debitFunds(req.body.targetUserId, req.body.amount, req.headers['x-user-id'] as string);
    res.status(200).json({ message: 'Funds debited successfully' });
}));

// Universal Routes
router.get('/users/:userId', auth([UserRole.ADMIN, UserRole.DEALER]), asyncHandler(async (req, res) => {
    const user = await db.getUserById(req.params.userId);
    if (user) res.json(user);
    else res.status(404).json({ message: 'User not found' });
}));

// Internal polling routes
router.get('/internal/state/users', asyncHandler(async (req, res) => res.json(await db.getAllUsers())));
router.get('/internal/state/bets', asyncHandler(async (req, res) => res.json(await db.getAllBets())));
router.get('/internal/state/draws', asyncHandler(async (req, res) => res.json(await db.getAllDraws())));

app.use('/api', router);

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});