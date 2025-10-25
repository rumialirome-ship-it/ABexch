// Import type augmentation for Express.Request to include the 'user' property.
import '../types';
import { Request, Response } from 'express';
import { ApiError } from '../middleware/errorHandler';
import { bettingService } from '../services/bettingService';
import { geminiService } from '../services/geminiService';

export const handleAssistantQuery = async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) throw new ApiError(401, 'User not authenticated.');

    const { prompt } = req.body;
    if (!prompt || typeof prompt !== 'string') {
        throw new ApiError(400, 'A valid text prompt is required.');
    }

    try {
        // Fetch recent bet history for context
        const betHistory = await bettingService.getBetHistory(userId);
        const recentHistory = betHistory.slice(0, 20); // Limit context size

        const stream = await geminiService.generateAssistantResponseStream(prompt, recentHistory);

        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Transfer-Encoding', 'chunked');

        for await (const chunk of stream) {
            res.write(chunk.text);
        }
        
        res.end();

    } catch (error) {
        console.error('Error streaming Gemini response:', error);
        if (!res.headersSent) {
             res.status(500).json({ message: 'Failed to get response from AI assistant.' });
        } else {
             res.end(); // End the stream if headers were already sent
        }
    }
};
