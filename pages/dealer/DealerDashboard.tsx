
import React, { useState, ReactNode, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import MainLayout, { LoadingSpinner } from '../../components/layout/MainLayout';
import { useAuth } from '../../contexts/AuthContext';
import { formatCurrency } from '../../utils/formatters';
import { apiRequestTopUp, fetchMyTransactionHistory, fetchUsersByDealer, fetchPendingCommissionsForDealer, fetchBetsByDealer, addCreditToUser } from '../../services/api';
import { useNotification } from '../../contexts/NotificationContext';
import { Transaction, TransactionType, User, UserRole } from '../../types';

const RequestTopUpModal: React.FC<{
    onClose: () => void;
    onSuccess: () => void;
}> = ({ onClose, onSuccess }) => {
    const { user } = useAuth();
    const { addNotification } = useNotification();
    const [amount, setAmount] = useState('');
    const [reference, setReference] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const topUpAmount = parseFloat(amount);
        if (isNaN(topUpAmount) || topUpAmount <= 0) {
            addNotification('Please enter a valid, positive amount.', 'error');
            return;
        }
        if (!reference.trim()) {
            addNotification('Please enter a reference for your top-up request.', 'error');
            return;
        }
        if (!user) {
            addNotification('User not found. Please log in again.', 'error');
            return;
        }

        setIsLoading(true);
        try {
            await apiRequestTopUp(user, topUpAmount, reference);
            onSuccess();
        } catch (err) {
            addNotification(err instanceof Error ? err.message : 'Failed to submit request.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const inputClasses = "transition-all duration-300 w-full p-2 bg-background-primary border border-border-color rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-secondary focus:border-transparent";

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 backdrop-blur-sm animate-fade-in">
            <div className="bg-background-secondary p-8 rounded-xl shadow-glow-hard shadow-glow-inset-accent w-full max-w-md border border-border-color animate-fade-in-down">
                <h2 className="text-2xl text-accent-secondary font-bold mb-4 text-shadow-glow-secondary">Request Wallet Top-Up</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                     <div>
                        <label className="block text-text-secondary mb-1">Amount</label>
                        <input type="number" value={amount} onChange={e => setAmount(e.target.value)} className={inputClasses} required autoFocus placeholder="e.g., 10000" />
                    </div>
                     <div>
                        <label className="block text-text-secondary mb-1">Reference</label>
                        <input type="text" value={reference} onChange={e => setReference(e.target.value)} className={inputClasses} required placeholder="e.g., Bank transaction ID, note"/>
                    </div>
                    <div className="flex justify-end space-x-4 pt-4 border-t border-border-color/50">
                        <button type="button" onClick={onClose} disabled={isLoading} className="border border-border-color text-text-secondary font-bold py-2 px-6 rounded-lg transition-all duration-300 hover:bg-border-color hover:text-text-primary active:scale-95 disabled:opacity-50">Cancel</button>
                        <button type="submit" disabled={isLoading} className="bg-accent-secondary text-white font-bold py-2 px-6 rounded-lg transition-all duration-300 hover:opacity-90 hover:-translate-y-0.5 hover:shadow-glow-secondary active:scale-95 disabled:bg-border-color disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0">{isLoading ? 'Submitting...' : 'Submit Request'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const AddCreditModal: React.FC<{targetUser: User, dealer: User | null, onClose: () => void, onSuccess: () => void}> = ({ targetUser, dealer, onClose, onSuccess }) => {
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
            await addCreditToUser(dealer, targetUser.id, creditAmount);
            addNotification(`Successfully sent ${formatCurrency(creditAmount)} to ${targetUser.username}.`, 'success');
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
                <h2 className="text-2xl text-accent-secondary font-bold mb-2 text-shadow-glow-secondary">Add Credit</h2>
                <p className="text-text-secondary mb-4">Adding credit to <span className="font-bold text-text-primary">{targetUser.username}</span></p>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="credit-amount" className="block text-text-secondary mb-1">Amount</label>
                        <input 
                            id="credit-amount"
                            type="number" 
                            value={amount} 
                            onChange={e => setAmount(e.target.value)} 
                            className="transition-all duration-300 w-full p-2 bg-background-primary border border-border-color rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-secondary focus:border-transparent" 
                            placeholder="e.g., 1000"
                            required 
                            autoFocus
                        />
                        <p className="text-xs text-text-secondary mt-1">Your balance: {formatCurrency(dealer?.wallet_balance || 0)}</p>
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


const DealerDashboard: React.FC = () => {
  const { user } = useAuth();
  const { addNotification } = useNotification();
  const [isTopUpModalOpen, setIsTopUpModalOpen] = useState(false);
  const [isCreditModalOpen, setIsCreditModalOpen] = useState(false);
  const [selectedUserForCredit, setSelectedUserForCredit] = useState<User | null>(null);

  const [pendingCommission, setPendingCommission] = useState(0);
  const [managedUsers, setManagedUsers] = useState<User[]>([]);
  const [dailyBetTotal, setDailyBetTotal] = useState(0);
  const [weeklyBetTotal, setWeeklyBetTotal] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [usersMap, setUsersMap] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);

  const loadDashboardData = useCallback(async () => {
    if (!user || user.role !== UserRole.DEALER) return;
        setLoading(true);
        try {
            const [transactionsData, usersData, commissionsData, betsData] = await Promise.all([
                fetchMyTransactionHistory(user),
                fetchUsersByDealer(user),
                fetchPendingCommissionsForDealer(user),
                fetchBetsByDealer(user),
            ]);

            setTransactions(transactionsData.slice(0, 5));
            setManagedUsers(usersData);

            const usersIdToNameMap = new Map<string, string>();
            usersData.forEach(u => usersIdToNameMap.set(u.id, u.username));
            setUsersMap(usersIdToNameMap);
            
            const totalPending = commissionsData.reduce((acc, c) => acc + c.amount, 0);
            setPendingCommission(totalPending);

            // Calculate betting summaries
            const now = new Date();
            const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const weekStart = new Date(todayStart);
            weekStart.setDate(todayStart.getDate() - 6); // Today + 6 previous days

            let dailyTotal = 0;
            let weeklyTotal = 0;
            betsData.forEach(bet => {
                const betDate = new Date(bet.created_at);
                if (betDate >= weekStart) {
                    weeklyTotal += bet.stake;
                    if (betDate >= todayStart) {
                        dailyTotal += bet.stake;
                    }
                }
            });
            setDailyBetTotal(dailyTotal);
            setWeeklyBetTotal(weeklyTotal);

        } catch (error) {
            console.error("Failed to load dashboard data", error);
            addNotification("Could not load dashboard data.", "error");
        } finally {
            setLoading(false);
        }
  }, [user, addNotification]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);


  if (!user) {
    return null; 
  }

  const handleTopUpSuccess = () => {
    setIsTopUpModalOpen(false);
    addNotification('Your top-up request has been submitted successfully.', 'success');
  };

   const handleOpenCreditModal = (targetUser: User) => {
    setSelectedUserForCredit(targetUser);
    setIsCreditModalOpen(true);
  };
  
  const handleCreditSuccess = () => {
      setIsCreditModalOpen(false);
      setSelectedUserForCredit(null);
      // Reload all data to reflect changes in wallet balances
      loadDashboardData();
  };
  
  const getTransactionDescription = (tx: Transaction): string => {
    switch (tx.type) {
        case TransactionType.DEALER_DEBIT_TO_USER:
            const username = usersMap.get(tx.related_entity_id || '');
            return `Credit sent to user: ${username || tx.related_entity_id}`;
        case TransactionType.ADMIN_CREDIT:
            return `Credit received from Admin`;
        case TransactionType.TOP_UP_APPROVED:
            return `Wallet Top-Up Approved`;
        case TransactionType.COMMISSION_PAYOUT:
            return `Commission paid out`;
        default:
            return tx.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
};


  return (
    <MainLayout title={`Dealer Dashboard: ${user.username}`} titleClassName="text-accent-secondary text-shadow-glow-secondary">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <StatCard label="Available Wallet Balance" value={formatCurrency(user.wallet_balance)} />
        <StatCard label="Pending Commission" value={formatCurrency(pendingCommission)} isLoading={loading} />
        <StatCard label="Managed Users" value={managedUsers.length.toString()} isLoading={loading} />
      </div>
       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <StatCard label="Today's Bet Volume" value={formatCurrency(dailyBetTotal)} isLoading={loading} />
        <StatCard label="This Week's Bet Volume" value={formatCurrency(weeklyBetTotal)} isLoading={loading} />
      </div>
      
       <div className="mb-8">
            <button 
                onClick={() => setIsTopUpModalOpen(true)}
                className="w-full sm:w-auto bg-accent-secondary text-white font-bold py-3 px-6 rounded-lg transition-all duration-300 hover:opacity-90 hover:-translate-y-1 hover:shadow-glow-secondary active:scale-95 focus:outline-none focus:ring-2 focus:ring-accent-secondary focus:ring-offset-2 focus:ring-offset-background-primary"
            >
                Request Wallet Top-Up
            </button>
        </div>

        <div className="mt-8 animate-fade-in" style={{animationDelay: '100ms'}}>
            <h3 className="text-xl font-semibold text-accent-secondary mb-4 text-shadow-glow-secondary">Managed Users ({managedUsers.length})</h3>
            <div className="bg-background-primary/50 rounded-lg border border-border-color shadow-glow-inset-accent overflow-x-auto">
                {loading ? <LoadingSpinner /> : (
                    <table className="min-w-full bg-transparent text-sm">
                        <thead className="border-b-2 border-border-color">
                            <tr>
                                <th className="py-2 px-3 text-left text-accent-secondary/80 font-semibold tracking-wider uppercase">Username</th>
                                <th className="py-2 px-3 text-right text-accent-secondary/80 font-semibold tracking-wider uppercase">Balance</th>
                                <th className="py-2 px-3 text-center text-accent-secondary/80 font-semibold tracking-wider uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border-color/30">
                            {managedUsers.map(u => (
                                <tr key={u.id} className="hover:bg-accent-secondary/5">
                                    <td className="py-3 px-3">{u.username} <span className="text-xs text-text-secondary font-mono">({u.id})</span></td>
                                    <td className="py-3 px-3 text-right font-mono">{formatCurrency(u.wallet_balance)}</td>
                                    <td className="py-3 px-3 text-center space-x-2 whitespace-nowrap">
                                        <button onClick={() => handleOpenCreditModal(u)} className="bg-accent-primary/80 text-black font-bold py-1 px-3 rounded text-xs transition-all duration-300 hover:bg-accent-primary hover:-translate-y-0.5 active:scale-95">
                                            Add Credit
                                        </button>
                                         <Link to={`/dealer/users/${u.id}`} className="text-accent-secondary hover:underline text-xs font-semibold">
                                            Details
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                            {managedUsers.length === 0 && (
                                <tr><td colSpan={3} className="text-center py-8 text-text-secondary">You have not added any users yet.</td></tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>
        </div>

        <div className="mt-8 animate-fade-in" style={{animationDelay: '200ms'}}>
            <h3 className="text-xl font-semibold text-accent-secondary mb-4 text-shadow-glow-secondary">Recent Activity Logs</h3>
            <div className="bg-background-primary/50 p-4 sm:p-6 rounded-lg border border-border-color shadow-glow-inset-accent">
                {loading ? <LoadingSpinner /> : (
                    transactions.length > 0 ? (
                        <ul className="divide-y divide-border-color/30">
                            {transactions.map(tx => (
                                <li key={tx.id} className="py-3 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                                    <div>
                                        <p className="font-semibold text-text-primary">{getTransactionDescription(tx)}</p>
                                        <p className="text-xs text-text-secondary mt-1">{new Date(tx.created_at).toLocaleString()}</p>
                                    </div>
                                    <div className={`text-right font-mono font-bold text-lg whitespace-nowrap ${tx.balance_change > 0 ? 'text-success' : 'text-danger'}`}>
                                        {tx.balance_change > 0 ? '+' : ''}{formatCurrency(tx.amount)}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-text-secondary text-center py-4">No recent activity found.</p>
                    )
                )}
            </div>
        </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
        <DashboardLink to="/dealer/manage-users" title="Manage Users" description="View, create, or manage your users." icon={<IconAddUser />} />
        <DashboardLink to="/dealer/bet-overview" title="Bet Overview" description="See bets placed by your users." icon={<IconBetOverview />} />
        <DashboardLink to="#" title="Commission Overview" description="View pending and approved commissions." icon={<IconCommission />} />
      </div>
       {isTopUpModalOpen && <RequestTopUpModal onClose={() => setIsTopUpModalOpen(false)} onSuccess={handleTopUpSuccess} />}
       {isCreditModalOpen && selectedUserForCredit && <AddCreditModal targetUser={selectedUserForCredit} dealer={user} onClose={() => setIsCreditModalOpen(false)} onSuccess={handleCreditSuccess} />}

    </MainLayout>
  );
};

const StatCard: React.FC<{label: string, value: string, isLoading?: boolean}> = ({label, value, isLoading}) => (
    <div className="bg-background-primary/50 p-6 rounded-lg border border-border-color transition-all duration-300 hover:border-accent-secondary/30 hover:-translate-y-1 hover:shadow-glow-secondary hover:shadow-glow-inset-accent">
        <h3 className="text-text-secondary text-lg mb-1">{label}</h3>
        {isLoading 
            ? <div className="h-10 mt-1 flex items-center"><div className="loader !w-6 !h-6 !border-2 !border-accent-secondary/50 !border-t-accent-secondary"></div></div> 
            : <p className="text-4xl font-bold text-accent-secondary text-shadow-glow-secondary">{value}</p>
        }
    </div>
);


interface DashboardLinkProps {
  to: string;
  title: string;
  description: string;
  icon: ReactNode;
}

const DashboardLink: React.FC<DashboardLinkProps> = ({ to, title, description, icon }) => (
    <Link to={to} className="group block bg-background-primary/50 p-6 rounded-lg border border-border-color transition-all duration-300 hover:border-accent-secondary/50 hover:shadow-glow-secondary hover:shadow-glow-inset-accent hover:-translate-y-1.5">
        <div className="flex items-start gap-4">
            <div className="text-accent-primary transition-colors duration-300 group-hover:text-accent-secondary">{icon}</div>
            <div>
                <h3 className="text-xl font-semibold text-text-primary transition-colors duration-300 group-hover:text-accent-secondary group-hover:text-shadow-glow-secondary">{title}</h3>
                <p className="text-text-secondary mt-1">{description}</p>
            </div>
        </div>
  </Link>
);

const IconAddUser = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>;
const IconBetOverview = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>;
const IconCommission = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>;


export default DealerDashboard;