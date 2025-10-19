


// FIX: Replaced AuthenticatedRequest with the standard Express Request type, which is now augmented via module augmentation.
import { Request, Response } from 'express';
import { dealerService } from '../services/dealerService';
import { ApiError } from '../middleware/errorHandler';

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