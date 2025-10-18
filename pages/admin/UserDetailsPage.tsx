
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import MainLayout, { LoadingSpinner } from '../../components/layout/MainLayout';
import { fetchUserById, fetchBetHistory, fetchTransactionHistory, addCreditToUserByAdmin, debitFundsByAdmin, fetchAllDealers } from '../../services/api';
import { User, Bet, Transaction } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import BetStatusBadge from '../../components/common/BetStatusBadge';
import TransactionTypeBadge from '../../components/common/TransactionTypeBadge';
import { useNotification } from '../../contexts/NotificationContext';
import { useAuth } from '../../contexts/AuthContext';

const UserDetailsPage: React.FC = () => {
    const { userId } = useParams<{ userId: string }>();
    const { user: admin } = useAuth();
    const [user, setUser] = useState<User | null>(null);
    const [dealerName, setDealerName] = useState<string | null>(null);
    const [bets, setBets] = useState<Bet[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreditModalOpen, setIsCreditModalOpen] = useState(false);
    const [isDebitModalOpen, setIsDebitModalOpen] = useState(false);

    const loadUserDetails = useCallback(async () => {
        if (!userId || !admin) {
            setLoading(false);
            return;
        }
        try {
            setLoading(true);
            // FIX: Pass the admin user object to the API calls.
            const [userData, betData, transactionData] = await Promise.all([
                fetchUserById(admin, userId),
                fetchBetHistory(userId),
                fetchTransactionHistory(userId)
            ]);
            setUser(userData);
            setBets(betData.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
            setTransactions(transactionData); // Already sorted by API

            if (userData.dealerId) {
                // FIX: Pass the admin user object to the API call.
                const dealers = await fetchAllDealers(admin);
                const userDealer = dealers.find(d => d.id === userData.dealerId);
                if (userDealer) {
                    setDealerName(userDealer.username);
                }
            }
        } catch (error) {
            console.error("Failed to load user details", error);
        } finally {
            setLoading(false);
        }
    }, [userId, admin]);

    useEffect(() => {
        loadUserDetails();
    }, [loadUserDetails]);

    if (loading) {
        return <MainLayout title="Loading User Details..."><LoadingSpinner /></MainLayout>;
    }
    
    if (!user) {
        return <MainLayout title="User Not Found" showBackButton><p className="text-center text-danger">Could not find details for the specified user.</p></MainLayout>;
    }

    return (
        <MainLayout title={`Details for ${user.username}`} showBackButton titleClassName="text-accent-tertiary text-shadow-glow-tertiary">
            {/* User Info Card */}
            <div className="bg-background-primary/50 p-6 rounded-lg border border-border-color mb-8 shadow-glow-inset-accent">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <h2 className="text-2xl font-semibold text-accent-tertiary text-shadow-glow-tertiary">User Information</h2>
                     <div className="flex items-center gap-2 flex-wrap">
                        <button onClick={() => setIsDebitModalOpen(true)} className="border border-danger/50 text-danger font-bold py-2 px-6 rounded-lg transition-all duration-300 hover:bg-danger hover:text-white hover:shadow-glow-danger text-sm active:scale-95">
                            Debit Funds
                        </button>
                        <button onClick={() => setIsCreditModalOpen(true)} className="bg-accent-primary text-black font-bold py-2 px-6 rounded-lg transition-all duration-300 hover:opacity-90 hover:-translate-y-1 hover:shadow-glow-accent active:scale-95 focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-2 focus:ring-offset-background-primary">
                            Add Credit
                        </button>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4 text-lg mt-4">
                    <InfoItem label="User ID" value={user.id} isMono />
                    <InfoItem label="Username" value={user.username} />
                    <InfoItem label="Phone" value={user.phone || 'N/A'} />
                    <InfoItem label="Dealer ID" value={user.dealerId || 'N/A'} isMono />
                    <InfoItem label="Dealer Username" value={dealerName || (user.dealerId ? 'Loading...' : 'N/A')} />
                    <div>
                        <InfoItem label="Wallet Balance" value={formatCurrency(user.walletBalance)} isMono highlight />
                    </div>
                </div>
            </div>

            {/* Bet and Transaction History */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                <div>
                    <h3 className="text-xl font-semibold text-accent-tertiary mb-4 text-shadow-glow-tertiary">Bet History ({bets.length})</h3>
                    <div className="overflow-auto max-h-96 rounded-lg border border-border-color">
                        <table className="min-w-full bg-transparent text-sm">
                            <thead className="border-b-2 border-border-color sticky top-0 bg-background-secondary/80 backdrop-blur-sm z-10">
                                <tr>
                                    <th className="py-2 px-3 text-left text-accent-tertiary/80 font-semibold tracking-wider uppercase text-shadow-glow-tertiary">Draw</th>
                                    <th className="py-2 px-3 text-center text-accent-tertiary/80 font-semibold tracking-wider uppercase text-shadow-glow-tertiary">#</th>
                                    <th className="py-2 px-3 text-right text-accent-tertiary/80 font-semibold tracking-wider uppercase text-shadow-glow-tertiary">Stake</th>
                                    <th className="py-2 px-3 text-center text-accent-tertiary/80 font-semibold tracking-wider uppercase text-shadow-glow-tertiary">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border-color/30">
                                {bets.map(bet => (
                                    <tr key={bet.id} className="hover:bg-accent-tertiary/5">
                                        <td className="py-3 px-3">{bet.drawLabel}<br/><span className="text-xs text-text-secondary">{new Date(bet.createdAt).toLocaleDateString()}</span></td>
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
                    <h3 className="text-xl font-semibold text-accent-tertiary mb-4 text-shadow-glow-tertiary">Transaction History ({transactions.length})</h3>
                     <div className="overflow-auto max-h-96 rounded-lg border border-border-color">
                        <table className="min-w-full bg-transparent text-sm">
                             <thead className="border-b-2 border-border-color sticky top-0 bg-background-secondary/80 backdrop-blur-sm z-10">
                                <tr>
                                    <th className="py-2 px-3 text-left text-accent-tertiary/80 font-semibold tracking-wider uppercase text-shadow-glow-tertiary">Date</th>
                                    <th className="py-2 px-3 text-left text-accent-tertiary/80 font-semibold tracking-wider uppercase text-shadow-glow-tertiary">Type</th>
                                    <th className="py-2 px-3 text-right text-accent-tertiary/80 font-semibold tracking-wider uppercase text-shadow-glow-tertiary">Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border-color/30">
                                {transactions.map(t => (
                                    <tr key={t.id} className="hover:bg-accent-tertiary/5">
                                        <td className="py-3 px-3 whitespace-nowrap text-text-secondary">{new Date(t.createdAt).toLocaleString()}</td>
                                        <td className="py-3 px-3"><TransactionTypeBadge type={t.type} /></td>
                                        <td className={`py-3 px-3 text-right font-mono font-bold ${t.balanceChange > 0 ? 'text-success' : 'text-danger'}`}>
                                            {t.balanceChange > 0 ? '+' : ''}{formatCurrency(Math.abs(t.amount))}
                                        </td>
                                    </tr>
                                ))}
                                {transactions.length === 0 && <tr><td colSpan={3} className="text-center py-8 text-text-secondary">No transactions found.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            {isCreditModalOpen && <AddCreditModal user={user} onClose={() => setIsCreditModalOpen(false)} onSuccess={loadUserDetails} />}
            {isDebitModalOpen && <DebitFundsModal user={user} onClose={() => setIsDebitModalOpen(false)} onSuccess={loadUserDetails} />}
        </MainLayout>
    );
};


const InfoItem: React.FC<{label: string, value: string, isMono?: boolean, highlight?: boolean}> = ({ label, value, isMono, highlight }) => (
    <div>
        <span className="text-text-secondary">{label}:</span> 
        <span className={`${isMono ? 'font-mono' : ''} ${highlight ? 'text-accent-tertiary font-bold' : 'text-text-primary'}`}> {value}</span>
    </div>
);

const AddCreditModal: React.FC<{user: User, onClose: () => void, onSuccess: () => void}> = ({ user, onClose, onSuccess }) => {
    const { addNotification } = useNotification();
    const { user: admin } = useAuth();
    const [amount, setAmount] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const creditAmount = parseFloat(amount);

        if (!admin) {
            addNotification('Admin user not found. Please log in again.', 'error');
            return;
        }

        if (isNaN(creditAmount) || creditAmount <= 0) {
            addNotification('Please enter a valid, positive amount.', 'error');
            return;
        }
        
        setIsLoading(true);
        try {
            // FIX: Pass the admin user object to the API call.
            await addCreditToUserByAdmin(admin, user.id, creditAmount);
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
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 backdrop-blur-sm animate-fade-in">
            <div className="bg-background-secondary p-8 rounded-xl shadow-glow-hard shadow-glow-inset-accent w-full max-w-md border border-border-color animate-fade-in-down">
                <h2 className="text-2xl text-accent-tertiary font-bold mb-2 text-shadow-glow-tertiary">Add Credit</h2>
                <p className="text-text-secondary mb-4">Adding credit to <span className="font-bold text-text-primary">{user.username}</span></p>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="credit-amount" className="block text-text-secondary mb-1">Amount</label>
                        <input 
                            id="credit-amount"
                            type="number" 
                            value={amount} 
                            onChange={e => setAmount(e.target.value)} 
                            className="transition-all duration-300 w-full p-2 bg-background-primary border border-border-color rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-tertiary focus:border-transparent" 
                            placeholder="e.g., 1000"
                            required 
                            autoFocus
                        />
                    </div>
                    <div className="flex justify-end space-x-4 pt-4 border-t border-border-color/50">
                        <button type="button" onClick={onClose} disabled={isLoading} className="border border-border-color text-text-secondary font-bold py-2 px-6 rounded-lg transition-all duration-300 hover:bg-border-color hover:text-text-primary active:scale-95 disabled:opacity-50">Cancel</button>
                        <button type="submit" disabled={isLoading} className="bg-accent-primary text-black font-bold py-2 px-6 rounded-lg transition-all duration-300 hover:opacity-90 hover:-translate-y-0.5 active:scale-95 disabled:bg-border-color disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0">
                            {isLoading ? 'Sending...' : 'Confirm'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const DebitFundsModal: React.FC<{user: User, onClose: () => void, onSuccess: () => void}> = ({ user, onClose, onSuccess }) => {
    const { user: admin } = useAuth();
    const { addNotification } = useNotification();
    const [amount, setAmount] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const debitAmount = parseFloat(amount);

        if (!admin) {
            addNotification('Admin not logged in.', 'error');
            return;
        }
        if (isNaN(debitAmount) || debitAmount <= 0) {
            addNotification('Please enter a valid, positive amount.', 'error');
            return;
        }
        if (debitAmount > user.walletBalance) {
            addNotification('Debit amount cannot exceed user balance.', 'error');
            return;
        }
        
        setIsLoading(true);
        try {
            // FIX: Pass the admin object and correct the argument order.
            await debitFundsByAdmin(admin, user.id, debitAmount);
            addNotification(`Successfully debited ${formatCurrency(debitAmount)} from ${user.username}.`, 'success');
            onSuccess();
            onClose();
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to debit funds.';
            addNotification(errorMessage, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 backdrop-blur-sm animate-fade-in">
            <div className="bg-background-secondary p-8 rounded-xl shadow-glow-hard shadow-glow-inset-accent w-full max-w-md border border-danger/30 animate-fade-in-down">
                <h2 className="text-2xl text-danger font-bold mb-2 text-shadow-glow-danger">Debit Funds</h2>
                <p className="text-text-secondary mb-4">Transferring funds from <span className="font-bold text-text-primary">{user.username}</span></p>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="debit-amount" className="block text-text-secondary mb-1">Amount</label>
                        <input 
                            id="debit-amount"
                            type="number" 
                            value={amount} 
                            onChange={e => setAmount(e.target.value)} 
                            className="transition-all duration-300 w-full p-2 bg-background-primary border border-border-color rounded-lg focus:outline-none focus:ring-2 focus:ring-danger focus:border-transparent" 
                            placeholder="e.g., 500"
                            required 
                            autoFocus
                        />
                         <p className="text-xs text-text-secondary mt-1">User balance: {formatCurrency(user.walletBalance)}</p>
                    </div>
                    <div className="flex justify-end space-x-4 pt-4 border-t border-border-color/50">
                        <button type="button" onClick={onClose} disabled={isLoading} className="border border-border-color text-text-secondary font-bold py-2 px-6 rounded-lg transition-all duration-300 hover:bg-border-color hover:text-text-primary active:scale-95 disabled:opacity-50">Cancel</button>
                        <button type="submit" disabled={isLoading} className="bg-danger text-white font-bold py-2 px-6 rounded-lg transition-all duration-300 hover:opacity-90 hover:-translate-y-0.5 hover:shadow-glow-danger active:scale-95 disabled:bg-border-color disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0">
                            {isLoading ? 'Transferring...' : 'Confirm Debit'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};


export default UserDetailsPage;
