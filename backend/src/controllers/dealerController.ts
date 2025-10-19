

// FIX: Changed namespace import to named imports for proper type resolution.
import { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import { dealerService } from '../services/dealerService';
import { ApiError } from '../middleware/errorHandler';
// Import type augmentation for Express.Request to include the 'user' property.
import '../types';

export const handleGetManagedUsers = async (req: ExpressRequest, res: ExpressResponse) => {
    const dealerId = req.user?.id;
    if (!dealerId) throw new ApiError(401, 'Dealer not authenticated.');
    
    const users = await dealerService.getUsersByDealer(dealerId);
    res.status(200).json(users);
};

export const handleAddUser = async (req: ExpressRequest, res: ExpressResponse) => {
    const dealerId = req.user?.id;
    if (!dealerId) throw new ApiError(401, 'Dealer not authenticated.');

    const newUser = await dealerService.addUser(dealerId, req.body);
    res.status(201).json(newUser);
};

export const handleGetManagedUserById = async (req: ExpressRequest, res: ExpressResponse) => {
    const dealerId = req.user?.id;
    const { userId } = req.params;
    if (!dealerId) throw new ApiError(401, 'Dealer not authenticated.');

    const user = await dealerService.getManagedUserById(dealerId, userId);
    res.status(200).json(user);
};

export const handleAddCreditToUser = async (req: ExpressRequest, res: ExpressResponse) => {
    const dealerId = req.user?.id;
    const { userId } = req.params;
    const { amount } = req.body;
    if (!dealerId) throw new ApiError(401, 'Dealer not authenticated.');

    await dealerService.addCreditToUser(dealerId, userId, amount);
    res.status(200).json({ message: 'Credit added successfully.' });
};

export const handleUpdateUserBetLimit = async (req: ExpressRequest, res: ExpressResponse) => {
    const dealerId = req.user?.id;
    const { userId } = req.params;
    const { limit } = req.body;
    if (!dealerId) throw new ApiError(401, 'Dealer not authenticated.');

    const updatedUser = await dealerService.updateUserBetLimit(dealerId, userId, limit);
    res.status(200).json(updatedUser);
};

export const handleGetBetsByDealer = async (req: ExpressRequest, res: ExpressResponse) => {
    const dealerId = req.user?.id;
    if (!dealerId) throw new ApiError(401, 'Dealer not authenticated.');

    const bets = await dealerService.getBetsByDealer(dealerId);
    res.status(200).json(bets);
};

export const handleRequestTopUp = async (req: ExpressRequest, res: ExpressResponse) => {
    const dealerId = req.user?.id;
    const { amount, reference } = req.body;
    if (!dealerId) throw new ApiError(401, 'Dealer not authenticated.');
    
    const topUpRequest = await dealerService.requestTopUp(dealerId, amount, reference);
    res.status(201).json(topUpRequest);
};

export const handleGetPendingCommissions = async (req: ExpressRequest, res: ExpressResponse) => {
    const dealerId = req.user?.id;
    if (!dealerId) throw new ApiError(401, 'Dealer not authenticated.');

    const commissions = await dealerService.getPendingCommissionsForDealer(dealerId);
    res.status(200).json(commissions);
};

export const handleGetBetsForManagedUser = async (req: ExpressRequest, res: ExpressResponse) => {
    const dealerId = req.user?.id;
    const { userId } = req.params;
    if (!dealerId) throw new ApiError(401, 'Dealer not authenticated.');
    const bets = await dealerService.getBetsForManagedUser(dealerId, userId);
    res.status(200).json(bets);
};

export const handleGetTransactionsForManagedUser = async (req: ExpressRequest, res: ExpressResponse) => {
    const dealerId = req.user?.id;
    const { userId } = req.params;
    if (!dealerId) throw new ApiError(401, 'Dealer not authenticated.');
    const transactions = await dealerService.getTransactionsForManagedUser(dealerId, userId);
    res.status(200).json(transactions);
};