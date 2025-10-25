import '../types';
// FIX: Use namespace import for express to resolve type ambiguities.
import { Request, Response } from 'express';
import { authService } from '../services/authService';

export const handleLogin = async (req: Request, res: Response) => {
    const { role, username, pin } = req.body;
    const user = await authService.login(role, username, pin);
    res.status(200).json(user);
};