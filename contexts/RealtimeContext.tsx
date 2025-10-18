
import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { realtimeService } from '../services/realtime';

// FIX: Added 'user-update' to allow components to subscribe to user data changes.
type EventType = 'bet-update' | 'result-update' | 'user-update';
type Callback = (data: any) => void;

interface RealtimeContextType {
    subscribe: (event: EventType, callback: Callback) => void;
    unsubscribe: (event: EventType, callback: Callback) => void;
}

const RealtimeContext = createContext<RealtimeContextType | undefined>(undefined);

export const RealtimeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    useEffect(() => {
        realtimeService.start();
        return () => {
            realtimeService.stop();
        };
    }, []);

    const value = {
        subscribe: realtimeService.subscribe.bind(realtimeService),
        unsubscribe: realtimeService.unsubscribe.bind(realtimeService),
    };

    return (
        <RealtimeContext.Provider value={value}>
            {children}
        </RealtimeContext.Provider>
    );
};

export const useRealtime = (): RealtimeContextType => {
    const context = useContext(RealtimeContext);
    if (!context) {
        throw new Error('useRealtime must be used within a RealtimeProvider');
    }
    return context;
};
