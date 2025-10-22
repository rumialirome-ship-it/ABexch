// @google/genai-dev-tool: Fix: Add missing Express type imports.
import { Request, Response } from 'express';
import { dealerService } from '../services/dealerService';
import { ApiError } from '../middleware/errorHandler';
// Import type augmentation for Express.Request to include the 'user' property.
import '../types';

export const handleGetManagedUsers = async (req: Request, res: Response) => {
    const dealerId = req.user?.id;
    if (!dealerId) throw new ApiError(401, 'Dealer not authenticated.');
    
    const users = await dealerService.getUsersByDealer(dealerId);
    res.status(200).json(users);
};

export const handleAddUser = async (req: Request, res: Response) => {
    const dealerId = req.user?.id;
    if (!dealerId) throw new ApiError(401, 'Dealer not authenticated.');

    const newUser = await dealerService.addUser(dealerId, req.body);
    res.status(201).json(newUser);
};

export const handleGetManagedUserById = async (req: Request, res: Response) => {
    const dealerId = req.user?.id;
    const { userId } = req.params;
    if (!dealerId) throw new ApiError(401, 'Dealer not authenticated.');

    const user = await dealerService.getManagedUserById(dealerId, userId);
    res.status(200).json(user);
};

export const handleAddCreditToUser = async (req: Request, res: Response) => {
    const dealerId = req.user?.id;
    const { userId } = req.params;
    const { amount } = req.body;
    if (!dealerId) throw new ApiError(401, 'Dealer not authenticated.');

    await dealerService.addCreditToUser(dealerId, userId, amount);
    res.status(200).json({ message: 'Credit added successfully.' });
};

export const handleUpdateUserBetLimit = async (req: Request, res: Response) => {
    const dealerId = req.user?.id;
    const { userId } = req.params;
    const { limit } = req.body;
    if (!dealerId) throw new ApiError(401, 'Dealer not authenticated.');

    const updatedUser = await dealerService.updateUserBetLimit(dealerId, userId, limit);
    res.status(200).json(updatedUser);
};

export const handleGetBetsByDealer = async (req: Request, res: Response) => {
    const dealerId = req.user?.id;
    if (!dealerId) throw new ApiError(401, 'Dealer not authenticated.');

    const bets = await dealerService.getBetsByDealer(dealerId);
    res.status(200).json(bets);
};

export const handleRequestTopUp = async (req: Request, res: Response) => {
    const dealerId = req.user?.id;
    const { amount, reference } = req.body;
    if (!dealerId) throw new ApiError(401, 'Dealer not authenticated.');
    
    const topUpRequest = await dealerService.requestTopUp(dealerId, amount, reference);
    res.status(201).json(topUpRequest);
};

export const handleGetPendingCommissions = async (req: Request, res: Response) => {
    const dealerId = req.user?.id;
    if (!dealerId) throw new ApiError(401, 'Dealer not authenticated.');

    const commissions = await dealerService.getPendingCommissionsForDealer(dealerId);
    res.status(200).json(commissions);
};

export const handleGetBetsForManagedUser = async (req: Request, res: Response) => {
    const dealerId = req.user?.id;
    const { userId } = req.params;
    if (!dealerId) throw new ApiError(401, 'Dealer not authenticated.');
    const bets = await dealerService.getBetsForManagedUser(dealerId, userId);
    res.status(200).json(bets);
};

export const handleGetTransactionsForManagedUser = async (req: Request, res: Response) => {
    const dealerId = req.user?.id;
    const { userId } = req.params;
    if (!dealerId) throw new ApiError(401, 'Dealer not authenticated.');
    const transactions = await dealerService.getTransactionsForManagedUser(dealerId, userId);
    res.status(200).json(transactions);
};

export const handleUpdateManagedUser = async (req: Request, res: Response) => {
    const dealerId = req.user?.id;
    const { userId } = req.params;
    if (!dealerId) throw new ApiError(401, 'Dealer not authenticated.');

    const updatedUser = await dealerService.updateUser(dealerId, userId, req.body);
    res.status(200).json(updatedUser);
};

export const handleDeleteManagedUser = async (req: Request, res: Response) => {
    const dealerId = req.user?.id;
    const { userId } = req.params;
    if (!dealerId) throw new ApiError(401, 'Dealer not authenticated.');

    await dealerService.deleteUser(dealerId, userId);
    res.status(204).send();
};
