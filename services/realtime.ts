import { fetchAllBetsState, fetchAllDrawsState, fetchAllUsersState } from './api';
import { Bet, DrawResult, User } from '../types';

type EventType = 'bet-update' | 'result-update' | 'user-update';
type Callback = (data: any) => void;

class RealtimeService {
    private subscribers: Map<EventType, Set<Callback>> = new Map();
    private intervalId: number | null = null;
    private lastBetsState: string = '[]';
    private lastDrawsState: string = '[]';
    private lastUsersState: string = '[]';

    constructor() {
        this.subscribers.set('bet-update', new Set());
        this.subscribers.set('result-update', new Set());
        this.subscribers.set('user-update', new Set());
    }
    
    start() {
        if (this.intervalId) return;
        
        // Initial fetch to set baseline
        this.checkForUpdates(); 
        
        this.intervalId = window.setInterval(() => {
            this.checkForUpdates();
        }, 3000); // Check every 3 seconds
    }

    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }

    subscribe(event: EventType, callback: Callback) {
        this.subscribers.get(event)?.add(callback);
    }

    unsubscribe(event: EventType, callback: Callback) {
        this.subscribers.get(event)?.delete(callback);
    }

    private notify(event: EventType, data: any) {
        this.subscribers.get(event)?.forEach(callback => callback(data));
    }

    private async checkForUpdates() {
        try {
            // Check for bet updates
            const currentBets = await fetchAllBetsState();
            const currentBetsState = JSON.stringify(currentBets);
            if (currentBetsState !== this.lastBetsState) {
                const lastBets: Bet[] = JSON.parse(this.lastBetsState);
                const updatedBets = currentBets.filter(currentBet => {
                     const oldBet = lastBets.find(b => b.id === currentBet.id);
                     return !oldBet || JSON.stringify(oldBet) !== JSON.stringify(currentBet);
                });
                if (updatedBets.length > 0) {
                     updatedBets.forEach(bet => this.notify('bet-update', bet));
                }
                this.lastBetsState = currentBetsState;
            }

            // Check for new or updated draws
            const currentDraws = await fetchAllDrawsState();
            const currentDrawsState = JSON.stringify(currentDraws);
            if (currentDrawsState !== this.lastDrawsState) {
                const lastDraws: DrawResult[] = JSON.parse(this.lastDrawsState);
                const changedDraws = currentDraws.filter(currentDraw => {
                    const oldDraw = lastDraws.find(d => d.id === currentDraw.id);
                    return !oldDraw || JSON.stringify(oldDraw) !== JSON.stringify(currentDraw);
                });
                changedDraws.forEach(draw => this.notify('result-update', draw));
                this.lastDrawsState = currentDrawsState;
            }

            // Check for user updates
            const currentUsers = await fetchAllUsersState();
            const currentUsersState = JSON.stringify(currentUsers);
            if (currentUsersState !== this.lastUsersState) {
                const lastUsers: User[] = JSON.parse(this.lastUsersState);
                currentUsers.forEach(currentUser => {
                    const oldUser = lastUsers.find(u => u.id === currentUser.id);
                    if (!oldUser || JSON.stringify(oldUser) !== JSON.stringify(currentUser)) {
                        this.notify('user-update', currentUser);
                    }
                });
                this.lastUsersState = currentUsersState;
            }
        } catch (error) {
            console.error("Realtime polling failed:", error);
            // Optionally stop polling on repeated failures
        }
    }
}

export const realtimeService = new RealtimeService();