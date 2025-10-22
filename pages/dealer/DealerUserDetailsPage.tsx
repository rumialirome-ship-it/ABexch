import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import MainLayout, { LoadingSpinner } from '../../components/layout/MainLayout';
import { fetchUserById, fetchBetsForUserByActor, fetchTransactionsForUserByActor, addCreditToUser, updateUserBetLimit } from '../../services/api';
import { User, Bet, Transaction, UserRole } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import BetStatusBadge from '../../components/common/BetStatusBadge';
import TransactionTypeBadge from '../../components/common/TransactionTypeBadge';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';

const DealerUserDetailsPage: React.FC = () => {
    const { userId } = useParams<{ userId: string }>();
    const { user: dealer } = useAuth();
    const [user, setUser] = useState<User | null>(null);
    const [bets, setBets] = useState<Bet[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreditModalOpen, setIsCreditModalOpen] = useState(false);
    const [isLimitModalOpen, setIsLimitModalOpen] = useState(false);


    const loadUserDetails = useCallback(async () => {
        if (!userId || !dealer) {
            setLoading(false);
            return;
        }
        try {
            setLoading(true);
            const [userData, betData, transactionData] = await Promise.all([
                fetchUserById(dealer, userId),
                fetchBetsForUserByActor(dealer, userId),
                fetchTransactionsForUserByActor(dealer, userId)
            ]);
            
            if (dealer && userData.dealer_id !== dealer.id) {
                throw new Error("User does not belong to this dealer.");
            }

            setUser(userData);
            setBets(betData.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
            setTransactions(transactionData);
        } catch (error) {
            console.error("Failed to load user details", error);
            setUser(null); // Clear user if there's an error (like wrong dealer)
        } finally {
            setLoading(false);
        }
    }, [userId, dealer]);

    useEffect(() => {
        loadUserDetails();
    }, [loadUserDetails]);
    
    if (loading) {
        return <MainLayout title="Loading User Details..."><LoadingSpinner /></MainLayout>;
    }
    
    if (!user) {
        return <MainLayout title="User Not Found" showBackButton><p className="text-center text-danger">Could not find details for this user or they are not under your dealership.</p></MainLayout>;
    }

    return (
        <MainLayout title={`Details for ${user.username}`} showBackButton>
            <div className="bg-bg-primary/50 p-6 rounded-lg border border-border-color mb-8 shadow-glow-inset-accent">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <h2 className="text-2xl font-semibold text-accent-violet">User Information</h2>
                    <div className="flex items-center gap-2 flex-wrap">
                         <button onClick={() => setIsLimitModalOpen(true)} className="border border-accent-violet/50 text-accent-violet font-bold py-2 px-6 rounded-lg transition-all duration-300 hover:bg-accent-violet hover:text-white hover:shadow-glow-accent text-sm active:scale-95">
                            Set Bet Limit
                        </button>
                        <button onClick={() => setIsCreditModalOpen(true)} className="bg-accent-violet text-white font-bold py-2 px-6 rounded-lg transition-all duration-300 hover:opacity-90 hover:-translate-y-1 hover:shadow-glow-accent active:scale-95 focus:outline-none focus:ring-2 focus:ring-accent-violet focus:ring-offset-2 focus:ring-offset-bg-primary">
                            Add Credit
                        </button>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4 text-lg mt-4">
                    <InfoItem label="User ID" value={user.id} isMono />
                    <InfoItem label="Username" value={user.username} />
                    <InfoItem label="Phone" value={user.phone || 'N/A'} />
                    <InfoItem label="Bet Limit per Draw" value={user.bet_limit_per_draw ? formatCurrency(user.bet_limit_per_draw) : 'No Limit'} isMono />
                    <div className="lg:col-span-2">
                        <InfoItem label="Wallet Balance" value={formatCurrency(user.wallet_balance)} isMono highlight />
                    </div>
                </div>
            </div>

            {/* Bet and Transaction History */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                <div>
                    <h3 className="text-xl font-semibold text-accent-violet mb-4">Bet History ({bets.length})</h3>
                    <div className="overflow-auto max-h-96 rounded-lg border border-border-color">
                        <table className="min-w-full bg-transparent text-sm">
                            <thead className="border-b-2 border-border-color sticky top-0 bg-bg-secondary/80 backdrop-blur-sm z-10">
                                <tr>
                                    <th className="py-2 px-3 text-left text-accent-violet/80 font-semibold tracking-wider uppercase">Draw</th>
                                    <th className="py-2 px-3 text-center text-accent-violet/80 font-semibold tracking-wider uppercase">#</th>
                                    <th className="py-2 px-3 text-right text-accent-violet/80 font-semibold tracking-wider uppercase">Stake</th>
                                    <th className="py-2 px-3 text-center text-accent-violet/80 font-semibold tracking-wider uppercase">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border-color/30">
                                {bets.map(bet => (
                                    <tr key={bet.id} className="hover:bg-accent-violet/5">
                                        <td className="py-3 px-3">{bet.draw_label}<br/><span className="text-xs text-text-secondary">{new Date(bet.created_at).toLocaleDateString()}</span></td>
                                        <td className="py-3 px-3 text-center font-mono text-lg font-bold">{bet.number}</td>
                                        <td className="py-3 px-3 text-right font-mono">{formatCurrency(bet.stake)}</td>
                                        <td className="py-3 px-3 text-center"><BetStatusBadge status={bet.status} /></td>
                                    </tr>
                                ))}
                                {bets.length === 0 && <tr><td colSpan={4} className="text-center py-8 text-text-secondary">No bets found.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>
                <div>
                    <h3 className="text-xl font-semibold text-accent-violet mb-4">Transaction History ({transactions.length})</h3>
                     <div className="overflow-auto max-h-96 rounded-lg border border-border-color">
                        <table className="min-w-full bg-transparent text-sm">
                             <thead className="border-b-2 border-border-color sticky top-0 bg-bg-secondary/80 backdrop-blur-sm z-10">
                                <tr>
                                    <th className="py-2 px-3 text-left text-accent-violet/80 font-semibold tracking-wider uppercase">Date</th>
                                    <th className="py-2 px-3 text-left text-accent-violet/80 font-semibold tracking-wider uppercase">Type</th>
                                    <th className="py-2 px-3 text-right text-accent-violet/80 font-semibold tracking-wider uppercase">Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border-color/30">
                                {transactions.map(t => (
                                    <tr key={t.id} className="hover:bg-accent-violet/5">
                                        <td className="py-3 px-3 whitespace-nowrap text-text-secondary">{new Date(t.created_at).toLocaleString()}</td>
                                        <td className="py-3 px-3"><TransactionTypeBadge type={t.type} /></td>
                                        <td className={`py-3 px-3 text-right font-mono font-bold ${t.balance_change > 0 ? 'text-success' : 'text-danger'}`}>
                                            {t.balance_change > 0 ? '+' : ''}{formatCurrency(Math.abs(t.amount))}
                                        </td>
                                    </tr>
                                ))}
                                {transactions.length === 0 && <tr><td colSpan={3} className="text-center py-8 text-text-secondary">No transactions found.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            {isCreditModalOpen && <AddCreditModal user={user} dealer={dealer} onClose={() => setIsCreditModalOpen(false)} onSuccess={loadUserDetails} />}
            {isLimitModalOpen && <SetLimitModal user={user} dealer={dealer} onClose={() => setIsLimitModalOpen(false)} onSuccess={loadUserDetails} />}
        </MainLayout>
    );
};

const AddCreditModal: React.FC<{user: User, dealer: User | null, onClose: () => void, onSuccess: () => void}> = ({ user, dealer, onClose, onSuccess }) => {
    const { addNotification } = useNotification();
    const [amount, setAmount] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const creditAmount = parseFloat(amount);

        if (!dealer) {
            addNotification('Dealer information not found.', 'error');
            return;
        }

        if (isNaN(creditAmount) || creditAmount <= 0) {
            addNotification('Please enter a valid, positive amount.', 'error');
            return;
        }
        
        setIsLoading(true);
        try {
            await addCreditToUser(dealer, user.id, creditAmount);
            addNotification(`Successfully sent ${formatCurrency(creditAmount)} to ${user.username}.`, 'success');
            onSuccess();
            onClose();
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to add credit.';
            addNotification(errorMessage, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-start z-50 backdrop-blur-sm animate-fade-in overflow-y-auto p-4">
            <div className="bg-bg-secondary p-8 rounded-xl shadow-glow-hard shadow-glow-inset-accent w-full max-w-md border border-border-color my-auto animate-fade-in-down">
                <h2 className="text-2xl text-accent-violet font-bold mb-2">Add Credit</h2>
                <p className="text-text-secondary mb-4">Adding credit to <span className="font-bold text-text-primary">{user.username}</span></p>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="credit-amount" className="block text-text-secondary mb-1">Amount</label>
                        <input 
                            id="credit-amount"
                            type="number" 
                            value={amount} 
                            onChange={e => setAmount(e.target.value)} 
                            className="transition-all duration-300 w-full p-2 bg-bg-primary border border-border-color rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-violet focus:border-transparent" 
                            placeholder="e.g., 1000"
                            required 
                            autoFocus
                        />
                        <p className="text-xs text-text-secondary mt-1">Your balance: {formatCurrency(dealer?.wallet_balance || 0)}</p>
                    </div>
                    <div className="flex justify-end space-x-4 pt-4 border-t border-border-color/50">
                        <button type="button" onClick={onClose} disabled={isLoading} className="border border-border-color text-text-secondary font-bold py-2 px-6 rounded-lg transition-all duration-300 hover:bg-border-color hover:text-text-primary active:scale-95 disabled:opacity-50">Cancel</button>
                        <button type="submit" disabled={isLoading} className="bg-accent-violet text-white font-bold py-2 px-6 rounded-lg transition-all duration-300 hover:opacity-90 hover:-translate-y-0.5 active:scale-95 disabled:bg-border-color disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0">
                            {isLoading ? 'Sending...' : 'Confirm'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const SetLimitModal: React.FC<{user: User, dealer: User | null, onClose: () => void, onSuccess: () => void}> = ({ user, dealer, onClose, onSuccess }) => {
    const { addNotification } = useNotification();
    const [limit, setLimit] = useState(user.bet_limit_per_draw?.toString() || '');
    const [isLoading, setIsLoading] = useState(false);

    const handleSave = async (e?: React.FormEvent) => {
        e?.preventDefault();
        const limitAmount = parseFloat(limit);

        if (!dealer) {
            addNotification('Dealer information not found.', 'error');
            return;
        }
        if (limit.trim() !== '' && (isNaN(limitAmount) || limitAmount < 0)) {
            addNotification('Please enter a valid, non-negative limit.', 'error');
            return;
        }

        setIsLoading(true);
        try {
            const newLimit = limit.trim() === '' ? null : limitAmount;
            await updateUserBetLimit(dealer, user.id, newLimit);
            addNotification(`Bet limit for ${user.username} has been updated.`, 'success');
            onSuccess();
            onClose();
        } catch (err) {
            addNotification((err as Error).message, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleRemove = async () => {
        if (!dealer) return;
        setIsLoading(true);
         try {
            await updateUserBetLimit(dealer, user.id, null);
            addNotification(`Bet limit for ${user.username} has been removed.`, 'success');
            onSuccess();
            onClose();
        } catch (err) {
            addNotification((err as Error).message, 'error');
        } finally {
            setIsLoading(false);
        }
    };


    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-start z-50 backdrop-blur-sm animate-fade-in overflow-y-auto p-4">
            <div className="bg-bg-secondary p-8 rounded-xl shadow-glow-hard shadow-glow-inset-accent w-full max-w-md border border-border-color my-auto animate-fade-in-down">
                <h2 className="text-2xl text-accent-violet font-bold mb-2">Set Bet Limit</h2>
                <p className="text-text-secondary mb-4">For user <span className="font-bold text-text-primary">{user.username}</span></p>
                <form onSubmit={handleSave} className="space-y-4">
                    <div>
                        <label htmlFor="limit-amount" className="block text-text-secondary mb-1">Limit per Draw</label>
                        <input 
                            id="limit-amount"
                            type="number" 
                            value={limit} 
                            onChange={e => setLimit(e.target.value)} 
                            className="transition-all duration-300 w-full p-2 bg-bg-primary border border-border-color rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-violet focus:border-transparent" 
                            placeholder="Leave blank for no limit"
                            autoFocus
                        />
                    </div>
                    <div className="flex justify-between items-center space-x-4 pt-4 border-t border-border-color/50">
                        <div>
                             {user.bet_limit_per_draw && (
                                <button type="button" onClick={handleRemove} disabled={isLoading} className="border border-danger/50 text-danger font-bold py-2 px-4 rounded-lg transition-all text-sm duration-300 hover:bg-danger hover:text-white active:scale-95 disabled:opacity-50">
                                    Remove Limit
                                </button>
                            )}
                        </div>
                        <div className="flex items-center gap-4">
                            <button type="button" onClick={onClose} disabled={isLoading} className="border border-border-color text-text-secondary font-bold py-2 px-6 rounded-lg transition-all duration-300 hover:bg-border-color hover:text-text-primary active:scale-95 disabled:opacity-50">Cancel</button>
                            <button type="submit" disabled={isLoading} className="bg-accent-violet text-white font-bold py-2 px-6 rounded-lg transition-all duration-300 hover:opacity-90 hover:-translate-y-0.5 active:scale-95 disabled:bg-border-color disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0">
                                {isLoading ? 'Saving...' : 'Save Limit'}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};


const InfoItem: React.FC<{label: string, value: string, isMono?: boolean, highlight?: boolean}> = ({ label, value, isMono, highlight }) => (
    <div>
        <span className="text-text-secondary">{label}:</span> 
        <span className={`${isMono ? 'font-mono' : ''} ${highlight ? 'text-accent-violet font-bold' : 'text-text-primary'}`}> {value}</span>
    </div>
);

export default DealerUserDetailsPage;