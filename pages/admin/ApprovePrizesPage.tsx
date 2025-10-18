

import React, { useState, useEffect, useCallback } from 'react';
import MainLayout, { LoadingSpinner } from '../../components/layout/MainLayout';
import { fetchPendingPrizes, approvePrize } from '../../services/api';
import { Prize } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { useAuth } from '../../contexts/AuthContext';

const ApprovePrizesPage: React.FC = () => {
    const { user: admin } = useAuth();
    const [prizes, setPrizes] = useState<Prize[]>([]);
    const [loading, setLoading] = useState(true);

    const loadPrizes = useCallback(async () => {
        if (!admin) return;
        setLoading(true);
        try {
            // FIX: Pass the admin user object to the API call.
            const data = await fetchPendingPrizes(admin);
            setPrizes(data);
        } catch (error) {
            console.error("Failed to fetch prizes", error);
        } finally {
            setLoading(false);
        }
    }, [admin]);

    useEffect(() => {
        loadPrizes();
    }, [loadPrizes]);
    
    const handleApprove = async (id: string) => {
        if (!admin) return;
        // FIX: Pass the admin user object to the API call.
        await approvePrize(admin, id);
        loadPrizes();
    };
    
    const handleApproveAll = async () => {
        if (!admin) return;
        // FIX: Pass the admin user object to each API call.
        await Promise.all(prizes.map(p => approvePrize(admin, p.id)));
        loadPrizes();
    };

    return (
        <MainLayout title="Approve Prizes" showBackButton titleClassName="text-accent-tertiary text-shadow-glow-tertiary">
            <div className="flex justify-end mb-4">
                <button 
                  onClick={handleApproveAll} 
                  disabled={prizes.length === 0 || loading}
                  className="bg-success/80 text-white font-bold py-2 px-4 rounded-lg transition-all duration-300 hover:bg-success hover:-translate-y-0.5 active:scale-95 disabled:bg-border-color disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0"
                >
                    Approve All ({prizes.length})
                </button>
            </div>
             {loading ? (
                <LoadingSpinner />
            ) : (
                <div className="overflow-x-auto">
                    <table className="min-w-full bg-transparent rounded-lg">
                        <thead className="border-b-2 border-border-color">
                            <tr>
                                <th className="py-3 px-4 text-left text-accent-tertiary font-semibold tracking-wider uppercase text-sm text-shadow-glow-tertiary">User ID</th>
                                <th className="py-3 px-4 text-left text-accent-tertiary font-semibold tracking-wider uppercase text-sm text-shadow-glow-tertiary">Draw</th>
                                <th className="py-3 px-4 text-right text-accent-tertiary font-semibold tracking-wider uppercase text-sm text-shadow-glow-tertiary">Amount</th>
                                <th className="py-3 px-4 text-center text-accent-tertiary font-semibold tracking-wider uppercase text-sm text-shadow-glow-tertiary">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {prizes.map((p) => (
                                <tr key={p.id} className="border-b border-border-color/50 last:border-b-0 hover:bg-accent-tertiary/5 transition-colors duration-300">
                                    <td className="py-3 px-4 font-mono">{p.userId}</td>
                                    <td className="py-3 px-4">{p.drawLabel}</td>
                                    <td className="py-3 px-4 text-right font-mono">{formatCurrency(p.amount)}</td>
                                    <td className="py-3 px-4 text-center">
                                        <button onClick={() => handleApprove(p.id)} className="bg-accent-primary/80 text-black font-bold py-1 px-3 rounded text-sm transition-all duration-300 hover:bg-accent-primary hover:-translate-y-0.5 active:scale-95">
                                            Approve
                                        </button>
                                    </td>
                                </tr>
                            ))}
                             {prizes.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="text-center py-8 text-text-secondary">No pending prizes.</td>
                                </tr>
                             )}
                        </tbody>
                    </table>
                </div>
            )}
        </MainLayout>
    );
};

export default ApprovePrizesPage;
