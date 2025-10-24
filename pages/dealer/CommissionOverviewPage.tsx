import React, { useState, useEffect, useMemo } from 'react';
import MainLayout, { LoadingSpinner } from '../../components/layout/MainLayout';
import { useAuth } from '../../contexts/AuthContext';
import { fetchCommissionsForDealer } from '../../services/api';
import { Commission } from '../../types';
import { formatCurrency } from '../../utils/formatters';

type Tab = 'pending' | 'history';

const CommissionOverviewPage: React.FC = () => {
    const { user } = useAuth();
    const [commissions, setCommissions] = useState<Commission[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<Tab>('pending');

    useEffect(() => {
        if (user) {
            const loadCommissions = async () => {
                setLoading(true);
                try {
                    const data = await fetchCommissionsForDealer(user);
                    setCommissions(data);
                } catch (error) {
                    console.error("Failed to fetch commissions", error);
                } finally {
                    setLoading(false);
                }
            };
            loadCommissions();
        }
    }, [user]);

    const filteredCommissions = useMemo(() => {
        if (activeTab === 'pending') {
            return commissions.filter(c => c.status === 'pending');
        }
        return commissions.filter(c => c.status === 'approved');
    }, [commissions, activeTab]);

    return (
        <MainLayout title="Commission Overview" showBackButton>
            <div className="flex border-b border-border-color mb-6">
                <button
                    onClick={() => setActiveTab('pending')}
                    className={`py-3 px-4 font-semibold transition-colors duration-300 relative ${activeTab === 'pending' ? 'text-accent-violet' : 'text-text-secondary hover:text-text-primary'}`}
                >
                    Pending
                    {activeTab === 'pending' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-accent-violet rounded-full"></div>}
                </button>
                <button
                    onClick={() => setActiveTab('history')}
                    className={`py-3 px-4 font-semibold transition-colors duration-300 relative ${activeTab === 'history' ? 'text-accent-violet' : 'text-text-secondary hover:text-text-primary'}`}
                >
                    History
                    {activeTab === 'history' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-accent-violet rounded-full"></div>}
                </button>
            </div>

            {loading ? (
                <LoadingSpinner />
            ) : (
                <div className="overflow-x-auto">
                    <table className="min-w-full bg-transparent rounded-lg">
                        <thead className="border-b-2 border-border-color">
                            <tr>
                                <th className="py-3 px-4 text-left text-accent-violet font-semibold tracking-wider uppercase text-sm">Draw</th>
                                <th className="py-3 px-4 text-right text-accent-violet font-semibold tracking-wider uppercase text-sm">Amount</th>
                                <th className="py-3 px-4 text-left text-accent-violet font-semibold tracking-wider uppercase text-sm">Date</th>
                                <th className="py-3 px-4 text-center text-accent-violet font-semibold tracking-wider uppercase text-sm">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredCommissions.map((c) => (
                                <tr key={c.id} className="border-b border-border-color/50 last:border-b-0 hover:bg-accent-violet/5 transition-colors duration-300">
                                    <td className="py-3 px-4">{c.draw_label}</td>
                                    <td className="py-3 px-4 text-right font-mono">{formatCurrency(c.amount)}</td>
                                    <td className="py-3 px-4 text-sm text-text-secondary">{new Date(c.created_at).toLocaleString()}</td>
                                    <td className="py-3 px-4 text-center">
                                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${c.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-success/20 text-success'}`}>
                                            {c.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {filteredCommissions.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="text-center py-8 text-text-secondary">
                                        No {activeTab} commissions found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </MainLayout>
    );
};

export default CommissionOverviewPage;
