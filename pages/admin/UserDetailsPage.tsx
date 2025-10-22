import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import MainLayout, { LoadingSpinner } from '../../components/layout/MainLayout';
import { fetchUserById, fetchBetsForUserByActor, fetchTransactionsForUserByActor, addCreditToUserByAdmin, debitFundsByAdmin, fetchAllDealers, updateUserByAdmin, updateUserBlockStatus } from '../../services/api';
import { User, Bet, Transaction, UserRole } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import BetStatusBadge from '../../components/common/BetStatusBadge';
import TransactionTypeBadge from '../../components/common/TransactionTypeBadge';
import { useNotification } from '../../contexts/NotificationContext';
import { useAuth } from '../../contexts/AuthContext';

const UserDetailsPage: React.FC = () => {
    const { userId } = useParams<{ userId: string }>();
    const { user: admin } = useAuth();
    const [user, setUser] = useState<User | null>(null);
    const [dealers, setDealers] = useState<User[]>([]);
    const [dealerName, setDealerName] = useState<string | null>(null);
    const [bets, setBets] = useState<Bet[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreditModalOpen, setIsCreditModalOpen] = useState(false);
    const [isDebitModalOpen, setIsDebitModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);


    const loadUserDetails = useCallback(async () => {
        if (!userId || !admin) {
            setLoading(false);
            return;
        }
        try {
            setLoading(true);
            const [userData, betData, transactionData, dealersData] = await Promise.all([
                fetchUserById(admin, userId),
                fetchBetsForUserByActor(admin, userId),
                fetchTransactionsForUserByActor(admin, userId),
                fetchAllDealers(admin)
            ]);
            setUser(userData);
            setBets(betData.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
            setTransactions(transactionData); // Already sorted by API
            setDealers(dealersData);

            if (userData.dealer_id) {
                const userDealer = dealersData.find(d => d.id === userData.dealer_id);
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
        <MainLayout title={`Details for ${user.username}`} showBackButton>
            {/* User Info Card */}
            <div className="bg-background-primary/50 p-6 rounded-lg border border-border-color mb-8 shadow-glow-inset-accent">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <h2 className="text-2xl font-semibold text-accent-violet">User Information</h2>
                     <div className="flex items-center gap-2 flex-wrap">
                        <button onClick={() => setIsEditModalOpen(true)} className="border border-accent-violet/50 text-accent-violet font-bold py-2 px-4 rounded-lg transition-all duration-300 hover:bg-accent-violet hover:text-white hover:shadow-glow-accent text-sm active:scale-95">
                            Edit User
                        </button>
                         <button 
                            onClick={() => setIsBlockModalOpen(true)}
                            className={`border ${user.is_blocked 
                                ? 'border-success/50 text-success hover:bg-success hover:text-white hover:shadow-glow-success' 
                                : 'border-danger/50 text-danger hover:bg-danger hover:text-white hover:shadow-glow-danger'} font-bold py-2 px-4 rounded-lg transition-all duration-300 text-sm active:scale-95`}
                        >
                            {user.is_blocked ? 'Unblock User' : 'Block User'}
                        </button>
                        <button onClick={() => setIsDebitModalOpen(true)} className="border border-danger/50 text-danger font-bold py-2 px-4 rounded-lg transition-all duration-300 hover:bg-danger hover:text-white hover:shadow-glow-danger text-sm active:scale-95">
                            Debit Funds
                        </button>
                        <button onClick={() => setIsCreditModalOpen(true)} className="bg-accent-violet text-white font-bold py-2 px-4 rounded-lg transition-all duration-300 hover:opacity-90 hover:-translate-y-1 hover:shadow-glow-accent active:scale-95 focus:outline-none focus:ring-2 focus:ring-accent-violet focus:ring-offset-2 focus:ring-offset-background-primary">
                            Add Credit
                        </button>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4 text-lg mt-4">
                    <InfoItem label="User ID" value={user.id} isMono />
                    <InfoItem label="Username" value={user.username} />
                    <InfoItem label="Phone" value={user.phone || 'N/A'} />
                    <InfoItem label="Dealer ID" value={user.dealer_id || 'N/A'} isMono />
                    <InfoItem label="Dealer Username" value={dealerName || (user.dealer_id ? 'Loading...' : 'N/A')} />
                    <div className="lg:col-span-3 flex items-center gap-4">
                        <InfoItem label="Wallet Balance" value={formatCurrency(user.wallet_balance)} isMono highlight />
                        {user.is_blocked && (
                            <span className="inline-block bg-danger/20 text-danger border border-danger/30 px-3 py-1 text-sm font-semibold rounded-full">
                                ACCOUNT BLOCKED
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Bet and Transaction History */}
            <div className="space-y-8">
                <div>
                    <h3 className="text-xl font-semibold text-accent-violet mb-4">Recent Bet History</h3>
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
                                {bets.slice(0, 10).map(bet => (
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
            {isEditModalOpen && <EditUserModal user={user} dealers={dealers} onClose={() => setIsEditModalOpen(false)} onSuccess={loadUserDetails} />}
            {isCreditModalOpen && <AddCreditModal user={user} onClose={() => setIsCreditModalOpen(false)} onSuccess={loadUserDetails} />}
            {isDebitModalOpen && <DebitFundsModal user={user} onClose={() => setIsDebitModalOpen(false)} onSuccess={loadUserDetails} />}
            {isBlockModalOpen && <BlockUserModal user={user} onClose={() => setIsBlockModalOpen(false)} onSuccess={loadUserDetails} />}
        </MainLayout>
    );
};


const InfoItem: React.FC<{label: string, value: string, isMono?: boolean, highlight?: boolean}> = ({ label, value, isMono, highlight }) => (
    <div>
        <span className="text-text-secondary">{label}:</span> 
        <span className={`${isMono ? 'font-mono' : ''} ${highlight ? 'text-accent-violet font-bold' : 'text-text-primary'}`}> {value}</span>
    </div>
);

const EditUserModal: React.FC<{user: User, dealers: User[], onClose: () => void, onSuccess: () => void}> = ({ user, dealers, onClose, onSuccess }) => {
    const { addNotification } = useNotification();
    const { user: admin } = useAuth();
    const [formData, setFormData] = useState({
        username: user.username,
        phone: user.phone || '',
        password: '',
        dealer_id: user.dealer_id || '',
    });
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!admin) return;

        const updateData: Partial<User> = {
            username: formData.username,
            phone: formData.phone,
            dealer_id: formData.dealer_id,
        };
        if (formData.password) {
            updateData.password = formData.password;
        }

        setIsLoading(true);
        try {
            await updateUserByAdmin(admin, user.id, updateData);
            addNotification(`User ${formData.username} updated successfully.`, 'success');
            onSuccess();
            onClose();
        } catch (err) {
            addNotification(err instanceof Error ? err.message : 'Failed to update user.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const inputClasses = "transition-all duration-300 w-full p-2 bg-bg-primary border border-border-color rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-violet focus:border-transparent";

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-start z-50 backdrop-blur-sm animate-fade-in overflow-y-auto p-4">
            <div className="bg-bg-secondary p-8 rounded-xl shadow-glow-hard shadow-glow-inset-accent w-full max-w-md border border-border-color my-auto animate-fade-in-down">
                <h2 className="text-2xl text-accent-violet font-bold mb-6">Edit User: {user.username}</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-text-secondary mb-1">Username</label>
                        <input type="text" name="username" value={formData.username} onChange={handleChange} className={inputClasses} required />
                    </div>
                    <div>
                        <label className="block text-text-secondary mb-1">Phone</label>
                        <input type="tel" name="phone" value={formData.phone} onChange={handleChange} className={inputClasses} />
                    </div>
                    <div>
                        <label className="block text-text-secondary mb-1">New Password</label>
                        <div className="relative">
                            <input type={showPassword ? 'text' : 'password'} name="password" value={formData.password} onChange={handleChange} className={`${inputClasses} pr-10`} placeholder="Leave blank to keep unchanged"/>
                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 flex items-center px-3 text-text-secondary hover:text-accent-violet transition-colors duration-300" aria-label={showPassword ? 'Hide password' : 'Show password'}>
                                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                            </button>
                        </div>
                    </div>
                    <div>
                        <label className="block text-text-secondary mb-1">Assign to Dealer</label>
                        <select name="dealer_id" value={formData.dealer_id} onChange={handleChange} className={inputClasses} required>
                            <option value="" disabled>Select a dealer</option>
                            {dealers.map(d => <option key={d.id} value={d.id}>{d.username} ({d.id})</option>)}
                        </select>
                    </div>
                    <div className="flex justify-end space-x-4 pt-4 border-t border-border-color/50">
                        <button type="button" onClick={onClose} disabled={isLoading} className="border border-border-color text-text-secondary font-bold py-2 px-6 rounded-lg transition-all duration-300 hover:bg-border-color hover:text-text-primary active:scale-95 disabled:opacity-50">Cancel</button>
                        <button type="submit" disabled={isLoading} className="bg-accent-violet text-white font-bold py-2 px-6 rounded-lg transition-all duration-300 hover:opacity-90 hover:-translate-y-0.5 active:scale-95 disabled:bg-border-color disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0">
                            {isLoading ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

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
                            className="transition-all duration-300 w-full p-2 bg-background-primary border border-border-color rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-violet focus:border-transparent" 
                            placeholder="e.g., 1000"
                            required 
                            autoFocus
                        />
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
        if (debitAmount > user.wallet_balance) {
            addNotification('Debit amount cannot exceed user balance.', 'error');
            return;
        }
        
        setIsLoading(true);
        try {
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
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-start z-50 backdrop-blur-sm animate-fade-in overflow-y-auto p-4">
            <div className="bg-bg-secondary p-8 rounded-xl shadow-glow-hard shadow-glow-inset-accent w-full max-w-md border border-danger/30 my-auto animate-fade-in-down">
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
                         <p className="text-xs text-text-secondary mt-1">User balance: {formatCurrency(user.wallet_balance)}</p>
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

const BlockUserModal: React.FC<{ user: User; onClose: () => void; onSuccess: () => void }> = ({ user, onClose, onSuccess }) => {
    const { user: admin } = useAuth();
    const { addNotification } = useNotification();
    const [isLoading, setIsLoading] = useState(false);
    const isBlocking = !user.is_blocked;

    const handleSubmit = async () => {
        if (!admin) {
            addNotification('Admin not logged in.', 'error');
            return;
        }

        setIsLoading(true);
        try {
            await updateUserBlockStatus(admin, user.id, isBlocking);
            addNotification(`Successfully ${isBlocking ? 'blocked' : 'unblocked'} ${user.username}.`, 'success');
            onSuccess();
            onClose();
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : `Failed to ${isBlocking ? 'block' : 'unblock'} user.`;
            addNotification(errorMessage, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-start z-50 backdrop-blur-sm animate-fade-in overflow-y-auto p-4">
            <div className={`bg-bg-secondary p-8 rounded-xl shadow-glow-hard shadow-glow-inset-accent w-full max-w-md border ${isBlocking ? 'border-danger/30' : 'border-success/30'} my-auto animate-fade-in-down`}>
                <h2 className={`text-2xl font-bold mb-4 ${isBlocking ? 'text-danger text-shadow-glow-danger' : 'text-success'}`}>{isBlocking ? 'Block User' : 'Unblock User'}</h2>
                <p className="text-text-secondary mb-6">
                    Are you sure you want to {isBlocking ? 'block' : 'unblock'} the user <strong className="text-text-primary">{user.username}</strong>?
                    {isBlocking 
                        ? " They will not be able to log in or place bets." 
                        : " They will regain full access to their account."}
                </p>
                <div className="flex justify-end space-x-4 pt-4 border-t border-border-color/50">
                    <button type="button" onClick={onClose} disabled={isLoading} className="border border-border-color text-text-secondary font-bold py-2 px-6 rounded-lg transition-all duration-300 hover:bg-border-color hover:text-text-primary active:scale-95 disabled:opacity-50">Cancel</button>
                    <button type="button" onClick={handleSubmit} disabled={isLoading} className={`${isBlocking ? 'bg-danger hover:shadow-glow-danger' : 'bg-success hover:shadow-glow-success'} text-white font-bold py-2 px-6 rounded-lg transition-all duration-300 hover:opacity-90 hover:-translate-y-0.5 active:scale-95 disabled:opacity-50`}>
                        {isLoading ? (isBlocking ? 'Blocking...' : 'Unblocking...') : `Confirm ${isBlocking ? 'Block' : 'Unblock'}`}
                    </button>
                </div>
            </div>
        </div>
    );
};

const EyeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>;
const EyeOffIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7 .527-1.666 1.415-3.165 2.584-4.416M9 12a3 3 0 11-6 0 3 3 0 016 0zm-1.148-.949a3.001 3.001 0 00-4.002 4.002l5.15-5.15a3.001 3.001 0 00-1.148-1.148zM12 5c.675 0 1.339.098 1.98.281m5.562 2.158a10.003 10.003 0 013.002 4.561C20.268 16.057 16.477 19 12 19c-1.11 0-2.193-.17-3.21-.498m2.148-13.455A10.002 10.002 0 0112 5c4.478 0 8.268 2.943 9.542 7a10.004 10.004 0 01-2.458 4.416M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3l18 18" /></svg>;

export default UserDetailsPage;