


import React, { ReactNode, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import MainLayout, { LoadingSpinner } from '../../components/layout/MainLayout';
import { useAuth } from '../../contexts/AuthContext';
import { formatCurrency } from '../../utils/formatters';
import { fetchTransactionHistory } from '../../services/api';
import { Transaction, TransactionType } from '../../types';

const UserDashboard: React.FC = () => {
  const { user } = useAuth();
  const [todaySummary, setTodaySummary] = useState({
      deposit: 0,
      prize: 0,
      commission: 0,
      booking: 0,
      withdrawals: 0,
  });
  const [loadingSummary, setLoadingSummary] = useState(true);

  useEffect(() => {
    if (!user) return;

    const getTodaySummary = async () => {
      setLoadingSummary(true);
      try {
        const transactions = await fetchTransactionHistory(user.id);
        
        const summary = {
            deposit: 0,
            prize: 0,
            commission: 0,
            booking: 0,
            withdrawals: 0, // Not implemented in API yet
        };

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        transactions.forEach((tx: Transaction) => {
            const txDate = new Date(tx.created_at);
            if (txDate >= today) {
                switch(tx.type) {
                    case TransactionType.DEALER_CREDIT:
                    case TransactionType.ADMIN_CREDIT:
                    case TransactionType.TOP_UP_APPROVED:
                        summary.deposit += tx.amount;
                        break;
                    case TransactionType.PRIZE_WON:
                        summary.prize += tx.amount;
                        break;
                    case TransactionType.COMMISSION_PAYOUT:
                    case TransactionType.COMMISSION_REBATE:
                        summary.commission += tx.amount;
                        break;
                    case TransactionType.BET_PLACED:
                        summary.booking += tx.amount;
                        break;
                }
            }
        });
        setTodaySummary(summary);
      } catch (error) {
        console.error("Failed to fetch today's summary", error);
      } finally {
        setLoadingSummary(false);
      }
    };
    
    getTodaySummary();
  }, [user]);

  if (!user) {
    return null; // or a loading spinner, or redirect
  }
  
  const totalAdd = todaySummary.deposit + todaySummary.prize + todaySummary.commission;
  const totalLess = todaySummary.booking + todaySummary.withdrawals;

  return (
    <MainLayout title={`Welcome, ${user.username}!`}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        
        {/* Today's Wallet Card (made more prominent) */}
        <div className="lg:col-span-2 bg-background-primary/50 p-6 rounded-lg border border-border-color transition-all duration-300 hover:border-accent-primary/30 hover:-translate-y-1 hover:shadow-glow-accent hover:shadow-glow-inset-accent">
             <h3 className="text-xl font-semibold text-accent-primary mb-4 text-shadow-glow-primary">Today's Wallet Summary</h3>
             {loadingSummary ? <LoadingSpinner /> : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Add Section */}
                    <div>
                        <h4 className="text-lg text-success mb-2">Add</h4>
                        <div className="pl-4 space-y-1 border-l-2 border-success/30 text-sm">
                            <div className="flex justify-between"><span className="text-text-secondary">Deposit:</span> <span className="font-mono text-text-primary">{formatCurrency(todaySummary.deposit)}</span></div>
                            <div className="flex justify-between"><span className="text-text-secondary">Prize:</span> <span className="font-mono text-text-primary">{formatCurrency(todaySummary.prize)}</span></div>
                            <div className="flex justify-between"><span className="text-text-secondary">Commission:</span> <span className="font-mono text-text-primary">{formatCurrency(todaySummary.commission)}</span></div>
                        </div>
                        <div className="flex justify-between mt-2 pt-2 border-t border-border-color/50">
                            <span className="font-bold text-success">Total Add:</span>
                            <span className="font-bold font-mono text-success text-lg">{formatCurrency(totalAdd)}</span>
                        </div>
                    </div>
                    {/* Less Section */}
                    <div>
                        <h4 className="text-lg text-danger mb-2">Less</h4>
                        <div className="pl-4 space-y-1 border-l-2 border-danger/30 text-sm">
                            <div className="flex justify-between"><span className="text-text-secondary">Booking:</span> <span className="font-mono text-text-primary">{formatCurrency(todaySummary.booking)}</span></div>
                            <div className="flex justify-between"><span className="text-text-secondary">Withdrawals:</span> <span className="font-mono text-text-primary">{formatCurrency(todaySummary.withdrawals)}</span></div>
                        </div>
                        <div className="flex justify-between mt-2 pt-2 border-t border-border-color/50">
                            <span className="font-bold text-danger">Total Less:</span>
                            <span className="font-bold font-mono text-danger text-lg">{formatCurrency(totalLess)}</span>
                        </div>
                    </div>
                </div>
             )}
        </div>

        {/* Wallet Balance & Limits Card */}
        <div className="bg-background-primary/50 p-6 rounded-lg border border-border-color transition-all duration-300 hover:border-accent-primary/30 hover:-translate-y-1 hover:shadow-glow-accent hover:shadow-glow-inset-accent">
            <h3 className="text-xl font-semibold text-accent-primary mb-4 text-shadow-glow-primary">Wallet Details</h3>
            <div className="space-y-3">
                <div className="flex justify-between items-center text-lg">
                    <span className="text-text-secondary">Current Balance:</span>
                    <span className="text-2xl font-bold text-text-primary font-mono">{formatCurrency(user.wallet_balance)}</span>
                </div>
                <div className="flex justify-between items-center text-base pt-3 border-t border-border-color/30">
                    <span className="text-text-secondary">Bet Limit / Draw:</span>
                    <span className="font-bold text-accent-primary font-mono">
                         {user.bet_limit_per_draw != null ? formatCurrency(user.bet_limit_per_draw) : 'No Limit'}
                    </span>
                </div>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <DashboardLink 
            to="/user/betting" 
            title="Place Bet" 
            description="Place new bets on upcoming draws." 
            icon={<IconPlaceBet />} 
        />
        <DashboardLink 
            to="/user/my-bets" 
            title="My Bet History" 
            description="View your past and pending bets." 
            icon={<IconBetHistory />} 
        />
        <DashboardLink 
            to="/user/transactions" 
            title="Transaction History" 
            description="Check your wallet transaction records." 
            icon={<IconTransactions />} 
        />
      </div>
    </MainLayout>
  );
};

interface DashboardLinkProps {
  to: string;
  title: string;
  description: string;
  icon: ReactNode;
}

const DashboardLink: React.FC<DashboardLinkProps> = ({ to, title, description, icon }) => (
    <Link to={to} className="group block bg-background-primary/50 p-6 rounded-lg border border-border-color transition-all duration-300 hover:border-accent-primary/50 hover:shadow-glow-accent hover:shadow-glow-inset-accent hover:-translate-y-1.5">
        <div className="flex items-start gap-4">
            <div className="text-accent-secondary transition-colors duration-300 group-hover:text-accent-primary">{icon}</div>
            <div>
                <h3 className="text-xl font-semibold text-text-primary transition-colors duration-300 group-hover:text-accent-primary group-hover:text-shadow-glow-primary">{title}</h3>
                <p className="text-text-secondary mt-1">{description}</p>
            </div>
        </div>
  </Link>
);

const IconPlaceBet = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.835 2.126a.5.5 0 01.63.63l-1.5 6a.5.5 0 01-.63-.63l1.5-6zm-3.5 1.5a.5.5 0 01.63.63l-1.5 6a.5.5 0 01-.63-.63l1.5-6z" /></svg>;
const IconBetHistory = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>;
const IconTransactions = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h5M7 9l-3 3m13-3v5h-5m2-5l3 3M4 15v5h5m-2-5l-3 3m13 3v-5h-5m2 5l3-3" /></svg>;

export default UserDashboard;