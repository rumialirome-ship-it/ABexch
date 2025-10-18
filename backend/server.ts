
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { db } from './db';
import { UserRole } from './types';

const app = express();
const PORT = process.env.PORT || 3001;

// --- Middleware ---
app.use(cors());
app.use(bodyParser.json());

// Simple Auth Middleware
const auth = (roles: UserRole[]) => (req: Request, res: Response, next: NextFunction) => {
    const role = req.headers['x-user-role'] as UserRole;
    if (role && roles.includes(role)) {
        return next();
    }
    return res.status(403).json({ message: 'Forbidden' });
};


// --- API Routes ---
const router = express.Router();

// Public Routes
router.post('/login', (req, res) => {
    const { role, username, pin } = req.body;
    const user = db.findUserForLogin(role, username, pin);
    if (user) {
        res.json(user);
    } else {
        res.status(401).json({ message: 'Invalid credentials' });
    }
});
router.get('/results', (req, res) => res.json(db.getDrawResults()));


// User Routes
router.get('/users/:userId/bets', (req, res) => res.json(db.getBetHistory(req.params.userId)));
router.get('/users/:userId/transactions', (req, res) => res.json(db.getTransactionHistory(req.params.userId)));
router.post('/bets', (req, res) => {
    try {
        const placedBets = db.placeBets(req.body);
        res.status(201).json(placedBets);
    } catch (e) {
        res.status(400).json({ message: (e as Error).message });
    }
});


// Dealer Routes
router.get('/dealer/users', auth([UserRole.DEALER]), (req, res) => {
    const dealerId = req.headers['x-user-id'] as string;
    res.json(db.getUsersByDealer(dealerId));
});
router.post('/dealer/users', auth([UserRole.DEALER]), (req, res) => {
    const dealerId = req.headers['x-user-id'] as string;
    try {
        const newUser = db.addUser(dealerId, req.body);
        res.status(201).json(newUser);
    } catch (e) {
        res.status(400).json({ message: (e as Error).message });
    }
});
router.post('/dealer/users/:userId/credit', auth([UserRole.DEALER]), (req, res) => {
    const dealerId = req.headers['x-user-id'] as string;
    try {
        db.addCreditToUser(dealerId, req.params.userId, req.body.amount, UserRole.DEALER);
        res.status(200).json({ message: 'Credit added successfully' });
    } catch (e) {
        res.status(400).json({ message: (e as Error).message });
    }
});
router.get('/dealer/bets', auth([UserRole.DEALER]), (req, res) => {
    const dealerId = req.headers['x-user-id'] as string;
    res.json(db.getBetsByDealer(dealerId));
});
router.post('/dealer/top-up', auth([UserRole.DEALER]), (req, res) => {
    const dealerId = req.headers['x-user-id'] as string;
    const { amount, reference } = req.body;
    try {
        const request = db.requestTopUp(dealerId, amount, reference);
        res.status(201).json(request);
    } catch (e) {
        res.status(400).json({ message: (e as Error).message });
    }
});
router.get('/dealer/commissions/pending', auth([UserRole.DEALER]), (req, res) => {
    const dealerId = req.headers['x-user-id'] as string;
    res.json(db.getPendingCommissionsForDealer(dealerId));
});


// Admin Routes
router.get('/admin/users', auth([UserRole.ADMIN]), (req, res) => res.json(db.getUsersByRole(UserRole.USER)));
router.get('/admin/dealers', auth([UserRole.ADMIN]), (req, res) => res.json(db.getUsersByRole(UserRole.DEALER)));
router.post('/admin/dealers', auth([UserRole.ADMIN]), (req, res) => {
    try {
        const newDealer = db.addDealer(req.body);
        res.status(201).json(newDealer);
    } catch (e) {
        res.status(400).json({ message: (e as Error).message });
    }
});
router.post('/admin/users/:userId/credit', auth([UserRole.ADMIN]), (req, res) => {
    const adminId = req.headers['x-user-id'] as string;
    try {
        db.addCreditToUser(adminId, req.params.userId, req.body.amount, UserRole.ADMIN);
        res.status(200).json({ message: 'Credit added successfully' });
    } catch (e) {
        res.status(400).json({ message: (e as Error).message });
    }
});
router.post('/admin/dealers/:dealerId/credit', auth([UserRole.ADMIN]), (req, res) => {
    try {
        const dealer = db.addCreditToDealer(req.params.dealerId, req.body.amount);
        res.json(dealer);
    } catch (e) {
        res.status(404).json({ message: (e as Error).message });
    }
});
router.post('/admin/draws', auth([UserRole.ADMIN]), (req, res) => {
    try {
        const { drawLabel, winningNumbers } = req.body;
        const result = db.declareDraw(drawLabel, winningNumbers);
        res.status(201).json(result);
    } catch (e) {
        res.status(400).json({ message: (e as Error).message });
    }
});
router.get('/admin/commissions/pending', auth([UserRole.ADMIN]), (req, res) => res.json(db.getPendingCommissions()));
router.post('/admin/commissions/:id/approve', auth([UserRole.ADMIN]), (req, res) => {
    db.approveCommission(req.params.id);
    res.status(200).json({ message: 'Commission approved' });
});
router.get('/admin/prizes/pending', auth([UserRole.ADMIN]), (req, res) => res.json(db.getPendingPrizes()));
router.post('/admin/prizes/:id/approve', auth([UserRole.ADMIN]), (req, res) => {
    db.approvePrize(req.params.id);
    res.status(200).json({ message: 'Prize approved' });
});
router.get('/admin/top-ups/pending', auth([UserRole.ADMIN]), (req, res) => res.json(db.getPendingTopUps()));
router.post('/admin/top-ups/:id/approve', auth([UserRole.ADMIN]), (req, res) => {
    try {
        db.approveTopUp(req.params.id);
        res.status(200).json({ message: 'Top-up approved' });
    } catch (e) {
        res.status(400).json({ message: (e as Error).message });
    }
});
router.post('/admin/debit', auth([UserRole.ADMIN]), (req, res) => {
    const adminId = req.headers['x-user-id'] as string;
    const { targetUserId, amount } = req.body;
    try {
        db.debitFunds(targetUserId, amount, adminId);
        res.status(200).json({ message: 'Funds debited successfully' });
    } catch (e) {
        res.status(400).json({ message: (e as Error).message });
    }
});


// Universal Routes (Must be authenticated)
router.get('/users/:userId', auth([UserRole.ADMIN, UserRole.DEALER]), (req, res) => {
    const user = db.getUserById(req.params.userId);
    if (user) {
        res.json(user);
    } else {
        res.status(404).json({ message: 'User not found' });
    }
});

// Internal polling routes for frontend "realtime" service
router.get('/internal/state/users', (req, res) => res.json(db.getAllUsers()));
router.get('/internal/state/bets', (req, res) => res.json(db.getAllBets()));
router.get('/internal/state/draws', (req, res) => res.json(db.getAllDraws()));


app.use('/api', router);

// --- Server Start ---
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
