import * as express from 'express';
import { UserRole } from '../types';
import { adminService } from '../services/adminService';
import { ApiError } from '../middleware/errorHandler';
// Import type augmentation for Express.Request to include the 'user' property.
import '../types';

// --- User Management ---
export const handleGetAllSystemUsers = async (req: express.Request, res: express.Response) => {
    const users = await adminService.getAllUsersByRole(UserRole.USER);
    res.status(200).json(users);
};

export const handleAdminAddUser = async (req: express.Request, res: express.Response) => {
    const newUser = await adminService.addUser(req.body);
    res.status(201).json(newUser);
};

export const handleGetSystemUserById = async (req: express.Request, res: express.Response) => {
    const { userId } = req.params;
    const user = await adminService.getUserById(userId);
    res.status(200).json(user);
};

export const handleAdminAddCreditToUser = async (req: express.Request, res: express.Response) => {
    const adminId = req.user?.id;
    const { userId } = req.params;
    const { amount } = req.body;
    if (!adminId) throw new ApiError(401, 'Admin not authenticated.');

    await adminService.addCreditToUser(adminId, userId, amount);
    res.status(200).json({ message: 'Credit added to user successfully.' });
};

export const handleGetBetsForUser = async (req: express.Request, res: express.Response) => {
    const { userId } = req.params;
    const bets = await adminService.getBetsForUser(userId);
    res.status(200).json(bets);
};

export const handleGetTransactionsForUser = async (req: express.Request, res: express.Response) => {
    const { userId } = req.params;
    const transactions = await adminService.getTransactionsForUser(userId);
    res.status(200).json(transactions);
};

// --- Dealer Management ---
export const handleGetAllDealers = async (req: express.Request, res: express.Response) => {
    const dealers = await adminService.getAllUsersByRole(UserRole.DEALER);
    res.status(200).json(dealers);
};

export const handleAddDealer = async (req: express.Request, res: express.Response) => {
    const newDealer = await adminService.addDealer(req.body);
    res.status(201).json(newDealer);
};

export const handleAddCreditToDealer = async (req: express.Request, res: express.Response) => {
    const { dealerId } = req.params;
    const { amount } = req.body;
    const updatedDealer = await adminService.addCreditToDealer(dealerId, amount);
    res.status(200).json(updatedDealer);
};

// --- Draw & Bet Management ---
export const handleDeclareDraw = async (req: express.Request, res: express.Response) => {
    const { drawLabel, winningNumbers } = req.body;
    const result = await adminService.declareDraw(drawLabel, winningNumbers);
    res.status(201).json(result);
};

// --- Approvals ---
export const handleGetPendingCommissions = async (req: express.Request, res: express.Response) => {
    const commissions = await adminService.getPendingCommissions();
    res.status(200).json(commissions);
};

export const handleApproveCommission = async (req: express.Request, res: express.Response) => {
    const { id } = req.params;
    await adminService.approveCommission(id);
    res.status(200).json({ message: 'Commission approved successfully.' });
};

export const handleGetPendingPrizes = async (req: express.Request, res: express.Response) => {
    const prizes = await adminService.getPendingPrizes();
    res.status(200).json(prizes);
};

export const handleApprovePrize = async (req: express.Request, res: express.Response) => {
    const { id } = req.params;
    await adminService.approvePrize(id);
    res.status(200).json({ message: 'Prize approved successfully.' });
};

export const handleGetPendingTopUps = async (req: express.Request, res: express.Response) => {
    const topUps = await adminService.getPendingTopUps();
    res.status(200).json(topUps);
};

export const handleApproveTopUp = async (req: express.Request, res: express.Response) => {
    const { id } = req.params;
    await adminService.approveTopUp(id);
    res.status(200).json({ message: 'Top-up approved successfully.' });
};

// --- Financial Actions ---
export const handleDebitFunds = async (req: express.Request, res: express.Response) => {
    const adminId = req.user?.id;
    const { targetUserId, amount } = req.body;
    if (!adminId) throw new ApiError(401, 'Admin not authenticated.');

    await adminService.debitFunds(adminId, targetUserId, amount);
    res.status(200).json({ message: 'Funds debited successfully.' });
};