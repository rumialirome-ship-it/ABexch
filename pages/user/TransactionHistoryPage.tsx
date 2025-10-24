import React, { useState, useEffect, useMemo } from 'react';
import MainLayout, { LoadingSpinner } from '../../components/layout/MainLayout';
import { useAuth } from '../../contexts/AuthContext';
import { fetchMyTransactionHistory, fetchMyBetHistory } from '../../services/api';
import { Transaction, TransactionType, Bet } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import TransactionTypeBadge from '../../components/common/TransactionTypeBadge';

const selectClasses = "transition-all duration-300 w-full p-2 bg-bg-primary border border-border-color rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-violet focus:border-transparent text-text-primary text-sm";

const TransactionHistoryPage: React.FC = () => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [betMap, setBetMap] = useState<Map<string, Bet>>(new Map());
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ type: '' });

  useEffect(() => {
    const loadData = async () => {
      if (user) {
        setLoading(true);
        try {
            const [transactionsData, betsData] = await Promise.all([
                fetchMyTransactionHistory(user),
                fetchMyBetHistory(user)
            ]);
            setTransactions(transactionsData); // API returns newest first by default
            setBetMap(new Map(betsData.map(bet => [bet.id, bet])));
        } catch (error) {
          console.error("Failed to fetch transaction history", error);
        } finally {
          setLoading(false);
        }
      }
    };
    loadData();
  }, [user]);
  
  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const resetFilters = () => {
    setFilters({ type: '' });
  };

  const enrichedTransactions = useMemo(() => {
    if (!user) return [];

    let currentBalance = user.wallet_balance;
    const processed = transactions
        .filter(t => !filters.type || t.type === filters.type)
        .map(t => {
            const balanceAfter = currentBalance;
            // To calculate the balance for the *next* (older) transaction, we reverse the change.
            currentBalance -= t.balance_change;

            let descriptionNode: React.ReactNode;
            if (t.type === TransactionType.BET_PLACED && t.related_entity_id) {
                const bet = betMap.get(t.related_entity_id);
                if (bet) {
                    const gameName = bet.draw_label.split('-').slice(3).join('-').replace(/_/g, ' ');
                    descriptionNode = (
                        <div className="flex items-center gap-2 flex-wrap">
                            <TransactionTypeBadge type={t.type} />
                            <span className="text-text-secondary text-xs">({gameName})</span>
                        </div>
                    );
                } else {
                     descriptionNode = <TransactionTypeBadge type={t.type} />;
                }
            } else {
                 descriptionNode = <TransactionTypeBadge type={t.type} />;
            }
            
            return {
                ...t,
                balanceAfter,
                description: descriptionNode
            };
        });
    return processed;
  }, [transactions, user, betMap, filters.type]);

  return (
    <MainLayout title="Transaction History" showBackButton>
      {loading ? (
        <LoadingSpinner />
      ) : (
        <>
            <div className="bg-bg-primary/50 p-4 rounded-lg border border-border-color mb-6 space-y-4 md:space-y-0 md:grid md:grid-cols-2 md:gap-4 md:items-end">
                {/* Filter by Type */}
                <div>
                    <label htmlFor="type-filter" className="block text-text-secondary text-sm mb-1">Transaction Type</label>
                    <select
                        id="type-filter"
                        name="type"
                        value={filters.type}
                        onChange={handleFilterChange}
                        className={selectClasses}
                    >
                        <option value="">All Types</option>
                        {Object.values(TransactionType).map(type => (
                            <option key={type} value={type}>{type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>
                        ))}
                    </select>
                </div>
                {/* Reset Button */}
                <div>
                    <button
                        onClick={resetFilters}
                        className="w-full border border-border-color text-text-secondary font-bold py-2 px-4 rounded-lg transition-all duration-300 hover:bg-border-color hover:text-text-primary active:scale-95"
                    >
                        Reset
                    </button>
                </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full bg-transparent">
                <thead className="border-b-2 border-border-color">
                  <tr>
                    <th className="py-3 px-4 text-left text-accent-violet font-semibold tracking-wider uppercase text-sm">Date</th>
                    <th className="py-3 px-4 text-left text-accent-violet font-semibold tracking-wider uppercase text-sm">Description</th>
                    <th className="py-3 px-4 text-right text-accent-violet font-semibold tracking-wider uppercase text-sm">Debit</th>
                    <th className="py-3 px-4 text-right text-accent-violet font-semibold tracking-wider uppercase text-sm">Credit</th>
                    <th className="py-3 px-4 text-right text-accent-violet font-semibold tracking-wider uppercase text-sm">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {enrichedTransactions.map((t) => (
                    <tr key={t.id} className="border-b border-border-color/50 last:border-b-0 hover:bg-accent-violet/5">
                      <td className="py-4 px-4 text-sm text-text-secondary whitespace-nowrap">{new Date(t.created_at).toLocaleString()}</td>
                      <td className="py-4 px-4">{t.description}</td>
                      <td className="py-4 px-4 text-right font-mono text-danger">
                        {t.balance_change < 0 ? formatCurrency(t.amount) : '-'}
                      </td>
                       <td className="py-4 px-4 text-right font-mono text-success">
                        {t.balance_change > 0 ? formatCurrency(t.amount) : '-'}
                      </td>
                      <td className="py-4 px-4 text-right font-mono text-text-primary">
                        {formatCurrency(t.balanceAfter)}
                      </td>
                    </tr>
                  ))}
                  {enrichedTransactions.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center py-12 text-text-secondary">
                        {transactions.length > 0 ? 'No transactions match the current filters.' : "You have no transactions yet."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
        </>
      )}
    </MainLayout>
  );
};

export default TransactionHistoryPage;