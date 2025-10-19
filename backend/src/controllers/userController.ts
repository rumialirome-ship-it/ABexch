


// FIX: Replaced AuthenticatedRequest with the standard Express Request type, which is now augmented via module augmentation.
import { Request, Response } from 'express';
import { bettingService } from '../services/bettingService';
import { transactionService } from '../services/transactionService';
import { userService } from '../services/userService';
import { ApiError } from '../middleware/errorHandler';

export const handlePlaceBets = async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) throw new ApiError(401, 'User not authenticated.');
    
    const betsToPlace = req.body.map((bet: any) => ({ ...bet, user_id: userId }));
    const placedBets = await bettingService.placeBets(betsToPlace);
    res.status(201).json(placedBets);
};

export const handleGetBetHistory = async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) throw new ApiError(401, 'User not authenticated.');
    
    const bets = await bettingService.getBetHistory(userId);
    res.status(200).json(bets);
};

export const handleGetTransactionHistory = async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) throw new ApiError(401, 'User not authenticated.');

    const transactions = await transactionService.getTransactionHistory(userId);
    res.status(200).json(transactions);
};

export const handleGetUserById = async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) throw new ApiError(401, 'User not authenticated.');

    const user = await userService.getUserById(userId);
    res.status(200).json(user);
};