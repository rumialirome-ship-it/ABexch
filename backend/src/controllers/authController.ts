

// FIX: Add explicit imports for Express types to resolve property access errors.
import { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import { authService } from '../services/authService';

export const handleLogin = async (req: ExpressRequest, res: ExpressResponse) => {
    const { role, username, pin } = req.body;
    const user = await authService.login(role, username, pin);
    res.status(200).json(user);
};