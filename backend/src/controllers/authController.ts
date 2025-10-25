import '../types';
// FIX: Switched to standard ES module import for Express types.
// This resolves type errors for Request and Response objects.
import { Request, Response } from 'express';
import { authService } from '../services/authService';

export const handleLogin = async (req: Request, res: Response) => {
    const { role, username, pin } = req.body;
    const user = await authService.login(role, username, pin);
    res.status(200).json(user);
};