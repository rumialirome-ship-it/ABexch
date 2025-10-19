import React, { useState, useEffect, useMemo } from 'react';
import MainLayout, { LoadingSpinner } from '../../components/layout/MainLayout';
import { useAuth } from '../../contexts/AuthContext';
import { fetchMyTransactionHistory } from '../../services/api';
import { Transaction, TransactionType } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import TransactionTypeBadge from '../../components/common/TransactionTypeBadge';

const selectClasses = "transition-all duration-300 w-full p-2 bg-background-primary border border-border-color rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-transparent text-text-primary text-sm";

const formatTypeName = (type: TransactionType): string => {
    return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

const TransactionHistoryPage: React.FC = () => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ type: '' });
  const [sortBy, setSortBy] = useState('date_desc');

  useEffect(() => {
    const loadTransactions = async () => {
      if (user) {
        try {
          const data = await fetchMyTransactionHistory(user);
          setTransactions(data);
        } catch (error) {
          console.error("Failed to fetch transaction history", error);
        } finally {
          setLoading(false);
        }
      }
    };
    loadTransactions();
  }, [user]);
  
  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const resetFiltersAndSort = () => {
    setFilters({ type: '' });
    setSortBy('date_desc');
  };

  const filteredAndSortedTransactions = useMemo(() => {
    return [...transactions]
      .filter(t => {
        if (filters.type && t.type !== filters.type) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        const [field, order] = sortBy.split('_');
        const direction = order === 'asc' ? 1 : -1;

        if (field === 'date') {
          return (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) * direction;
        }
        if (field === 'amount') {
          return (a.amount - b.amount) * direction;
        }
        return 0;
      });
  }, [transactions, filters, sortBy]);

  return (
    <MainLayout title="Transaction History" showBackButton>
      {loading ? (
        <LoadingSpinner />
      ) : (
        <>
            <div className="bg-background-primary/50 p-4 rounded-lg border border-border-color mb-6 space-y-4 md:space-y-0 md:grid md:grid-cols-3 md:gap-4 md:items-end">
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
                            <option key={type} value={type}>{formatTypeName(type)}</option>
                        ))}
                    </select>
                </div>
                {/* Sort By */}
                <div>
                    <label htmlFor="sort-by" className="block text-text-secondary text-sm mb-1">Sort By</label>
                    <select
                        id="sort-by"
                        value={sortBy}
                        onChange={e => setSortBy(e.target.value)}
                        className={selectClasses}
                    >
                        <option value="date_desc">Date: Newest First</option>
                        <option value="date_asc">Date: Oldest First</option>
                        <option value="amount_desc">Amount: High to Low</option>
                        <option value="amount_asc">Amount: Low to High</option>
                    </select>
                </div>
                {/* Reset Button */}
                <div>
                    <button
                        onClick={resetFiltersAndSort}
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
                    <th className="py-3 px-4 text-left text-accent-primary font-semibold tracking-wider uppercase text-sm">Date</th>
                    <th className="py-3 px-4 text-left text-accent-primary font-semibold tracking-wider uppercase text-sm">Description</th>
                    <th className="py-3 px-4 text-right text-accent-primary font-semibold tracking-wider uppercase text-sm">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAndSortedTransactions.map((t) => (
                    <tr key={t.id} className="border-b border-border-color/50 last:border-b-0 hover:bg-accent-primary/5">
                      <td className="py-4 px-4 text-sm text-text-secondary whitespace-nowrap">{new Date(t.created_at).toLocaleString()}</td>
                      <td className="py-4 px-4"><TransactionTypeBadge type={t.type} /></td>
                      <td className={`py-4 px-4 text-right font-mono font-bold ${t.balance_change > 0 ? 'text-success' : 'text-danger'}`}>
                        {t.balance_change > 0 ? '+' : ''}{formatCurrency(t.amount)}
                      </td>
                    </tr>
                  ))}
                  {filteredAndSortedTransactions.length === 0 && (
                    <tr>
                      <td colSpan={3} className="text-center py-12 text-text-secondary">
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