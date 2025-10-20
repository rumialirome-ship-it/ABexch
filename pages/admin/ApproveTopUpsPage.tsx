

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
        <MainLayout title="Approve Dealer Top-Ups" showBackButton titleClassName="bg-gradient-to-r from-accent-cyan via-accent-violet to-accent-yellow bg-clip-text text-transparent">
             {loading ? (
                <LoadingSpinner />
            ) : (
                <div className="overflow-x-auto">
                    <table className="min-w-full bg-transparent rounded-lg">
                        <thead className="border-b-2 border-border-color">
                            <tr>
                                <th className="py-3 px-4 text-left text-accent-yellow font-semibold tracking-wider uppercase text-sm">Dealer</th>
                                <th className="py-3 px-4 text-right text-accent-yellow font-semibold tracking-wider uppercase text-sm">Amount</th>
                                <th className="py-3 px-4 text-left text-accent-yellow font-semibold tracking-wider uppercase text-sm">Reference</th>
                                <th className="py-3 px-4 text-left text-accent-yellow font-semibold tracking-wider uppercase text-sm">Date</th>
                                <th className="py-3 px-4 text-center text-accent-yellow font-semibold tracking-wider uppercase text-sm">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {requests.map((req) => (
                                <tr key={req.id} className="border-b border-border-color/50 last:border-b-0 hover:bg-accent-yellow/5 transition-colors duration-300">
                                    <td className="py-3 px-4">
                                        {req.dealer_username}
                                        <span className="block text-xs font-mono text-text-secondary">{req.dealer_id}</span>
                                    </td>
                                    <td className="py-3 px-4 text-right font-mono">{formatCurrency(req.amount)}</td>
                                    <td className="py-3 px-4">{req.reference}</td>
                                    <td className="py-3 px-4 text-sm text-text-secondary whitespace-nowrap">{new Date(req.created_at).toLocaleString()}</td>
                                    <td className="py-3 px-4 text-center">
                                        <button
                                            onClick={() => handleApprove(req.id, req.dealer_username, req.amount)}
                                            disabled={approving.has(req.id)}
                                            className="bg-accent-violet/80 text-white font-bold py-1 px-3 rounded text-sm transition-all duration-300 hover:bg-accent-violet hover:-translate-y-0.5 active:scale-95 disabled:opacity-50 disabled:cursor-wait"
                                        >
                                            {approving.has(req.id) ? 'Approving...' : 'Approve'}
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
