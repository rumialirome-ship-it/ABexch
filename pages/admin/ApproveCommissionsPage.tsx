import React, { useState, useEffect, useCallback } from 'react';
import MainLayout, { LoadingSpinner } from '../../components/layout/MainLayout';
import { fetchPendingCommissions, approveCommission } from '../../services/api';
import { Commission } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { useAuth } from '../../contexts/AuthContext';

const ApproveCommissionsPage: React.FC = () => {
    const { user: admin } = useAuth();
    const [commissions, setCommissions] = useState<Commission[]>([]);
    const [loading, setLoading] = useState(true);

    const loadCommissions = useCallback(async () => {
        if (!admin) return;
        setLoading(true);
        try {
            const data = await fetchPendingCommissions(admin);
            setCommissions(data);
        } catch (error) {
            console.error("Failed to fetch commissions", error);
        } finally {
            setLoading(false);
        }
    }, [admin]);

    useEffect(() => {
        loadCommissions();
    }, [loadCommissions]);
    
    const handleApprove = async (id: string) => {
        if (!admin) return;
        await approveCommission(admin, id);
        loadCommissions();
    };
    
    const handleApproveAll = async () => {
        if (!admin) return;
        await Promise.all(commissions.map(c => approveCommission(admin, c.id)));
        loadCommissions();
    };

    return (
        <MainLayout title="Approve Commissions" showBackButton>
            <div className="flex justify-end mb-4">
                <button 
                  onClick={handleApproveAll} 
                  disabled={commissions.length === 0 || loading}
                  className="bg-success/80 text-white font-bold py-2 px-4 rounded-lg transition-all duration-300 hover:bg-success hover:-translate-y-0.5 active:scale-95 disabled:bg-border-color disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0"
                >
                    Approve All ({commissions.length})
                </button>
            </div>
             {loading ? (
                <LoadingSpinner />
            ) : (
                <div className="overflow-x-auto">
                    <table className="min-w-full bg-transparent rounded-lg">
                        <thead className="border-b-2 border-border-color">
                            <tr>
                                <th className="py-3 px-4 text-left text-accent-violet font-semibold tracking-wider uppercase text-sm">Recipient ID</th>
                                <th className="py-3 px-4 text-left text-accent-violet font-semibold tracking-wider uppercase text-sm">Type</th>
                                <th className="py-3 px-4 text-left text-accent-violet font-semibold tracking-wider uppercase text-sm">Draw</th>
                                <th className="py-3 px-4 text-right text-accent-violet font-semibold tracking-wider uppercase text-sm">Amount</th>
                                <th className="py-3 px-4 text-center text-accent-violet font-semibold tracking-wider uppercase text-sm">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {commissions.map((c) => (
                                <tr key={c.id} className="border-b border-border-color/50 last:border-b-0 hover:bg-accent-violet/5 transition-colors duration-300">
                                    <td className="py-3 px-4 font-mono">{c.recipient_id}</td>
                                    <td className="py-3 px-4 capitalize">{c.recipient_type}</td>
                                    <td className="py-3 px-4">{c.draw_label}</td>
                                    <td className="py-3 px-4 text-right font-mono">{formatCurrency(c.amount)}</td>
                                    <td className="py-3 px-4 text-center">
                                        <button onClick={() => handleApprove(c.id)} className="bg-accent-violet/80 text-white font-bold py-1 px-3 rounded text-sm transition-all duration-300 hover:bg-accent-violet hover:-translate-y-0.5 active:scale-95">
                                            Approve
                                        </button>
                                    </td>
                                </tr>
                            ))}
                             {commissions.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="text-center py-8 text-text-secondary">No pending commissions.</td>
                                </tr>
                             )}
                        </tbody>
                    </table>
                </div>
            )}
        </MainLayout>
    );
};

export default ApproveCommissionsPage;