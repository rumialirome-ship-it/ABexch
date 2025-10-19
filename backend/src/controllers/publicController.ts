
import { Request, Response } from 'express';
import { bettingService } from '../services/bettingService';
import { pollingService } from '../services/pollingService';

export const handleGetDrawResults = async (req: Request, res: Response) => {
    const results = await bettingService.getDrawResults();
    res.status(200).json(results);
};

// --- Internal Polling Handlers ---

export const handleGetAllUsers = async (req: Request, res: Response) => {
    const users = await pollingService.getAllUsers();
    res.status(200).json(users);
};

export const handleGetAllBets = async (req: Request, res: Response) => {
    const bets = await pollingService.getAllBets();
    res.status(200).json(bets);
};

export const handleGetAllDraws = async (req: Request, res: Response) => {
    const draws = await pollingService.getAllDraws();
    res.status(200).json(draws);
};
