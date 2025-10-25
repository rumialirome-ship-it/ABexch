// Import type augmentation for Express.Request to include the 'user' property.
import '../types';
// FIX: Switched to standard ES module import for Express types.
// This resolves type errors for Request and Response objects, including `req.user`, `req.body`, and `req.params`.
import { Request, Response } from 'express';
import { UserRole } from '../types';
import { adminService } from '../services/adminService';
import { ApiError } from '../middleware/errorHandler';


// --- User & Dealer Management ---
export const handleGetAllSystemUsers = async (req: Request, res: Response) => {
    const users = await adminService.getAllUsersByRole(UserRole.USER);
    res.status(200).json(users);
};

export const handleGetAllDealers = async (req: Request, res: Response) => {
    const dealers = await adminService.getAllUsersByRole(UserRole.DEALER);
    res.status(200).json(dealers);
};

export const handleAdminAddUser = async (req: Request, res: Response) => {
    const newUser = await adminService.addUser(req.body);
    res.status(201).json(newUser);
};

export const handleAddDealer = async (req: Request, res: Response) => {
    const newDealer = await adminService.addDealer(req.body);
    res.status(201).json(newDealer);
};

export const handleGetSystemUserById = async (req: Request, res: Response) => {
    const { userId } = req.params;
    const user = await adminService.getUserById(userId);
    res.status(200).json(user);
};

export const handleGetDealerById = async (req: Request, res: Response) => {
    const { dealerId } = req.params;
    const dealer = await adminService.getDealerById(dealerId);
    res.status(200).json(dealer);
};

export const handleGetUsersForDealer = async (req: Request, res: Response) => {
    const { dealerId } = req.params;
    const users = await adminService.getUsersForDealer(dealerId);
    res.status(200).json(users);
};

export const handleUpdateUser = async (req: Request, res: Response) => {
    const { userId } = req.params;
    const updatedUser = await adminService.updateUser(userId, req.body);
    res.status(200).json(updatedUser);
};

export const handleSetUserBlockStatus = async (req: Request, res: Response) => {
    const { userId } = req.params;
    const { is_blocked } = req.body;
    const updatedUser = await adminService.setUserBlockStatus(userId, is_blocked);
    res.status(200).json(updatedUser);
};

export const handleUpdateDealer = async (req: Request, res: Response) => {
    const { dealerId } = req.params;
    const updatedDealer = await adminService.updateDealer(dealerId, req.body);
    res.status(200).json(updatedDealer);
};

export const handleDeleteDealer = async (req: Request, res: Response) => {
    const { dealerId } = req.params;
    await adminService.deleteDealer(dealerId);
    res.status(204).send();
};

// --- Financial & Betting Actions ---
export const handleAdminAddCreditToUser = async (req: Request, res: Response) => {
    const adminId = req.user?.id;
    if (!adminId) throw new ApiError(401, 'Admin not authenticated.');
    
    const { userId } = req.params;
    const { amount } = req.body;

    await adminService.addCreditToUser(adminId, userId, amount);
    res.status(200).json({ message: `Credit of ${amount} added to user ${userId}`});
};

export const handleAddCreditToDealer = async (req: Request, res: Response) => {
    const { dealerId } = req.params;
    const { amount } = req.body;
    const updatedDealer = await adminService.addCreditToDealer(dealerId, amount);
    res.status(200).json(updatedDealer);
};

export const handleDeclareDraw = async (req: Request, res: Response) => {
    const { drawLabel, winningNumbers } = req.body;
    const result = await adminService.declareDraw(drawLabel, winningNumbers);
    res.status(201).json(result);
};

export const handleGetBetsForUser = async (req: Request, res: Response) => {
    const { userId } = req.params;
    const bets = await adminService.getBetsForUser(userId);
    res.status(200).json(bets);
};

export const handleGetTransactionsForUser = async (req: Request, res: Response) => {
    const { userId } = req.params;
    const transactions = await adminService.getTransactionsForUser(userId);
    res.status(200).json(transactions);
};


// --- Approvals ---
export const handleGetPendingCommissions = async (req: Request, res: Response) => {
    const commissions = await adminService.getPendingCommissions();
    res.status(200).json(commissions);
};

export const handleApproveCommission = async (req: Request, res: Response) => {
    const { id } = req.params;
    await adminService.approveCommission(id);
    res.status(204).send();
};

export const handleGetPendingPrizes = async (req: Request, res: Response) => {
    const prizes = await adminService.getPendingPrizes();
    res.status(200).json(prizes);
};

export const handleApprovePrize = async (req: Request, res: Response) => {
    const { id } = req.params;
    await adminService.approvePrize(id);
    res.status(204).send();
};

export const handleGetPendingTopUps = async (req: Request, res: Response) => {
    const requests = await adminService.getPendingTopUps();
    res.status(200).json(requests);
};

export const handleApproveTopUp = async (req: Request, res: Response) => {
    const { id } = req.params; // It's the request ID
    await adminService.approveTopUp(id);
    res.status(204).send();
};

export const handleDebitFunds = async (req: Request, res: Response) => {
    const adminId = req.user?.id;
    if (!adminId) throw new ApiError(401, 'Admin not authenticated.');
    
    const { targetUserId, amount } = req.body;
    await adminService.debitFunds(adminId, targetUserId, amount);
    res.status(200).json({ message: 'Funds debited successfully.' });
};

export const handleGetDashboardStats = async (req: Request, res: Response) => {
    const stats = await adminService.getDashboardStats();
    res.status(200).json(stats);
};