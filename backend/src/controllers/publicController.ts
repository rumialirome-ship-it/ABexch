

// FIX: Changed namespace import to named imports for proper type resolution.
import { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import { bettingService } from '../services/bettingService';
import { pollingService } from '../services/pollingService';

export const handleGetDrawResults = async (req: ExpressRequest, res: ExpressResponse) => {
    const results = await bettingService.getDrawResults();
    res.status(200).json(results);
};

// --- Internal Polling Handlers ---

export const handleGetAllUsers = async (req: ExpressRequest, res: ExpressResponse) => {
    const users = await pollingService.getAllUsers();
    res.status(200).json(users);
};

export const handleGetAllBets = async (req: ExpressRequest, res: ExpressResponse) => {
    const bets = await pollingService.getAllBets();
    res.status(200).json(bets);
};

export const handleGetAllDraws = async (req: ExpressRequest, res: ExpressResponse) => {
    const draws = await pollingService.getAllDraws();
    res.status(200).json(draws);
};