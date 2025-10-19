


import React, { useState, useEffect, useCallback } from 'react';
import MainLayout, { LoadingSpinner } from '../../components/layout/MainLayout';
import { fetchPendingTopUps, approveTopUp } from '../../services/api';
import { TopUpRequest } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { useNotification } from '../../contexts/NotificationContext';
import { useAuth } from '../../contexts/AuthContext';

const ApproveTopUpsPage: React.FC = () => {
    const [requests, setRequests] = useState<TopUpRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const { addNotification } = useNotification();
    const { user: admin } = useAuth();
    const [approving, setApproving] = useState<Set<string>>(new Set());

    const loadRequests = useCallback(async () => {
        if (!admin) return;
        setLoading(true);
        try {
            const data = await fetchPendingTopUps(admin);
            setRequests(data.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()));
        } catch (error) {
            console.error("Failed to fetch top-up requests", error);
            addNotification('Failed to load requests.', 'error');
        } finally {
            setLoading(false);
        }
    }, [addNotification, admin]);

    useEffect(() => {
        loadRequests();
    }, [loadRequests]);
    
    const handleApprove = async (id: string, dealerUsername: string, amount: number) => {
        if (!admin) return;
        setApproving(prev => new Set(prev).add(id));
        try {
            await approveTopUp(admin, id);
            addNotification(`Approved ${formatCurrency(amount)} for ${dealerUsername}.`, 'success');
            loadRequests();
        } catch(err) {
            addNotification('Failed to approve request.', 'error');
        } finally {
            setApproving(prev => {
                const next = new Set(prev);
                next.delete(id);
                return next;
            });
        }
    };
    
    return (
        <MainLayout title="Approve Dealer Top-Ups" showBackButton titleClassName="text-accent-tertiary text-shadow-glow-tertiary">
             {loading ? (
                <LoadingSpinner />
            ) : (
                <div className="overflow-x-auto">
                    <table className="min-w-full bg-transparent rounded-lg">
                        <thead className="border-b-2 border-border-color">
                            <tr>
                                <th className="py-3 px-4 text-left text-accent-tertiary font-semibold tracking-wider uppercase text-sm text-shadow-glow-tertiary">Dealer</th>
                                <th className="py-3 px-4 text-right text-accent-tertiary font-semibold tracking-wider uppercase text-sm text-shadow-glow-tertiary">Amount</th>
                                <th className="py-3 px-4 text-left text-accent-tertiary font-semibold tracking-wider uppercase text-sm text-shadow-glow-tertiary">Reference</th>
                                <th className="py-3 px-4 text-left text-accent-tertiary font-semibold tracking-wider uppercase text-sm text-shadow-glow-tertiary">Date</th>
                                <th className="py-3 px-4 text-center text-accent-tertiary font-semibold tracking-wider uppercase text-sm text-shadow-glow-tertiary">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {requests.map((r) => (
                                <tr key={r.id} className="border-b border-border-color/50 last:border-b-0 hover:bg-accent-tertiary/5 transition-colors duration-300">
                                    <td className="py-3 px-4">
                                        {r.dealer_username} <span className="text-text-secondary font-mono text-xs">({r.dealer_id})</span>
                                    </td>
                                    <td className="py-3 px-4 text-right font-mono">{formatCurrency(r.amount)}</td>
                                    <td className="py-3 px-4">{r.reference}</td>
                                    <td className="py-3 px-4 text-sm text-text-secondary">{new Date(r.created_at).toLocaleString()}</td>
                                    <td className="py-3 px-4 text-center">
                                        <button 
                                            onClick={() => handleApprove(r.id, r.dealer_username, r.amount)} 
                                            disabled={approving.has(r.id)}
                                            className="bg-accent-primary/80 text-black font-bold py-1 px-3 rounded text-sm transition-all duration-300 hover:bg-accent-primary hover:-translate-y-0.5 active:scale-95 disabled:bg-border-color disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0">
                                            {approving.has(r.id) ? 'Approving...' : 'Approve'}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                             {requests.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="text-center py-8 text-text-secondary">No pending top-up requests.</td>
                                </tr>
                             )}
                        </tbody>
                    </table>
                </div>
            )}
        </MainLayout>
    );
};

export default ApproveTopUpsPage;