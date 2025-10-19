
import { GoogleGenAI } from '@google/genai';
import { Bet } from '../types';

if (!process.env.API_KEY) {
    // In a real app, you might want a more graceful fallback or logging.
    console.error("API_KEY environment variable is not set for Gemini.");
    throw new Error("API_KEY environment variable is not set.");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
const model = 'gemini-2.5-flash';

const getSystemInstruction = (history: Bet[]): string => {
    const historyString = history.length > 0
        ? `Here is the user's recent betting history (last ${history.length} bets):\n${history.map(b => `- Bet on ${b.number} (${b.game_type}) with stake ${b.stake}, result: ${b.status}`).join('\n')}`
        : "The user has no betting history yet.";

    return `You are a friendly and insightful AI betting assistant for a platform called "A-BABA EXCHANGE".
The games involve betting on 2-digit numbers (00-99) and 1-digit numbers (0-9 for 'Open' and 'Close').

Your role is to analyze the user's betting patterns, suggest potential strategies, or identify "hot" or "cold" numbers based on their history.
- Be encouraging and conversational.
- Keep your answers concise and easy to understand.
- You can talk about patterns, frequency, and randomness.
- **IMPORTANT**: Do NOT give financial advice or guarantee any wins. Always frame your suggestions as ideas based on past data, not certainties. Emphasize that betting involves risk.

${historyString}
`;
};

export const geminiService = {
    async generateAssistantResponseStream(prompt: string, history: Bet[]) {
        const systemInstruction = getSystemInstruction(history);
        
        const responseStream = await ai.models.generateContentStream({
            model: model,
            contents: prompt,
            config: {
                systemInstruction: systemInstruction,
            }
        });

        return responseStream;
    }
};