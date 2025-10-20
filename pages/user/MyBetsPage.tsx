import React, { useState, useEffect, useCallback, useMemo } from 'react';
import MainLayout, { LoadingSpinner } from '../../components/layout/MainLayout';
import { useAuth } from '../../contexts/AuthContext';
import { fetchMyBetHistory } from '../../services/api';
import { Bet, BetStatus } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { useRealtime } from '../../contexts/RealtimeContext';
import BetStatusBadge from '../../components/common/BetStatusBadge';
import FilterControls from '../../components/common/FilterControls';

const initialFilters = {
    status: '',
    gameType: '',
    startDate: '',
    endDate: '',
};

const MyBetsPage: React.FC = () => {
  const { user } = useAuth();
  const [bets, setBets] = useState<Bet[]>([]);
  const [loading, setLoading] = useState(true);
  const [highlightedRows, setHighlightedRows] = useState<Set<string>>(new Set());
  const [animatedBadges, setAnimatedBadges] = useState<Map<string, BetStatus>>(new Map());
  const { subscribe, unsubscribe } = useRealtime();
  const [filters, setFilters] = useState(initialFilters);
  const [sortBy, setSortBy] = useState('createdAt_desc');

  const loadBets = useCallback(async () => {
    if (user) {
      try {
        const data = await fetchMyBetHistory(user);
        setBets(data.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
      } catch (error) {
        console.error("Failed to fetch bet history", error);
      } finally {
        setLoading(false);
      }
    }
  }, [user]);

  useEffect(() => {
    loadBets();
  }, [loadBets]);
  
  const handleBetUpdate = useCallback((updatedBet: Bet) => {
    if (updatedBet.user_id !== user?.id) return;

    setBets(currentBets => {
        const index = currentBets.findIndex(b => b.id === updatedBet.id);

        if (index !== -1) { // Bet is being updated
            const oldBet = currentBets[index];
            if (oldBet.status === BetStatus.PENDING && (updatedBet.status === BetStatus.WON || updatedBet.status === BetStatus.LOST)) {
                setAnimatedBadges(prev => new Map(prev).set(updatedBet.id, updatedBet.status));
                setTimeout(() => {
                    setAnimatedBadges(prev => {
                        const next = new Map(prev);
                        next.delete(updatedBet.id);
                        return next;
                    });
                }, 2500);
            }
            const newBets = [...currentBets];
            newBets[index] = updatedBet;
            return newBets;
        } else { // Bet is new
            setHighlightedRows(prev => new Set(prev).add(updatedBet.id));
            setTimeout(() => {
                setHighlightedRows(prev => {
                    const next = new Set(prev);
                    next.delete(updatedBet.id);
                    return next;
                });
            }, 2500);
            return [updatedBet, ...currentBets].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        }
    });
  }, [user?.id]);

  useEffect(() => {
      subscribe('bet-update', handleBetUpdate);
      return () => {
          unsubscribe('bet-update', handleBetUpdate);
      };
  }, [subscribe, unsubscribe, handleBetUpdate]);

  const handleFilterChange = (name: string, value: string) => {
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const resetFilters = () => {
      setFilters(initialFilters);
      setSortBy('createdAt_desc');
  };

  const filteredAndSortedBets = useMemo(() => {
    return [...bets]
        .filter(bet => {
            if (filters.status && bet.status !== filters.status) return false;
            if (filters.gameType && bet.game_type !== filters.gameType) return false;
            
            const betDate = new Date(bet.created_at);
            if (filters.startDate) {
                const startDate = new Date(filters.startDate);
                startDate.setHours(0, 0, 0, 0);
                if (betDate < startDate) return false;
            }
            if (filters.endDate) {
                const endDate = new Date(filters.endDate);
                endDate.setHours(23, 59, 59, 999);
                if (betDate > endDate) return false;
            }
            return true;
        })
        .sort((a, b) => {
            const [sortField, sortOrder] = sortBy.split('_');
            const order = sortOrder === 'asc' ? 1 : -1;

            if (sortField === 'createdAt') {
                return (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) * -order;
            }
            if (sortField === 'stake') {
                return (a.stake - b.stake) * order;
            }
            return 0;
        });
  }, [bets, filters, sortBy]);

  return (
    <MainLayout title="My Bet History" showBackButton>
      <FilterControls
        filters={filters}
        onFilterChange={handleFilterChange}
        sortBy={sortBy}
        onSortChange={setSortBy}
        onResetFilters={resetFilters}
      />
      {loading ? (
        <LoadingSpinner />
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-transparent">
            <thead className="border-b-2 border-border-color">
              <tr>
                <th className="py-3 px-4 text-left text-accent-violet font-semibold tracking-wider uppercase text-sm">Draw</th>
                <th className="py-3 px-4 text-left text-accent-violet font-semibold tracking-wider uppercase text-sm">Game</th>
                <th className="py-3 px-4 text-center text-accent-violet font-semibold tracking-wider uppercase text-sm">Number</th>
                <th className="py-3 px-4 text-right text-accent-violet font-semibold tracking-wider uppercase text-sm">Stake</th>
                <th className="py-3 px-4 text-center text-accent-violet font-semibold tracking-wider uppercase text-sm">Status</th>
                <th className="py-3 px-4 text-left text-accent-violet font-semibold tracking-wider uppercase text-sm">Date</th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedBets.map((bet) => {
                const badgeAnimationStatus = animatedBadges.get(bet.id);
                let badgeAnimationClass = '';
                if (badgeAnimationStatus === BetStatus.WON) {
                    badgeAnimationClass = 'animate-pulse-glow-success';
                } else if (badgeAnimationStatus === BetStatus.LOST) {
                    badgeAnimationClass = 'animate-pulse-glow-danger';
                }

                return (
                    <tr key={bet.id} className={`border-b border-border-color/50 last:border-b-0 hover:bg-accent-violet/5 transition-colors duration-300 ${highlightedRows.has(bet.id) ? 'animate-highlight' : ''}`}>
                      <td className="py-4 px-4">{bet.draw_label}</td>
                      <td className="py-4 px-4">{bet.game_type}</td>
                      <td className="py-4 px-4 text-center font-bold text-xl text-text-primary font-mono">{bet.number}</td>
                      <td className="py-4 px-4 text-right font-mono">{formatCurrency(bet.stake)}</td>
                      <td className="py-4 px-4 text-center"><BetStatusBadge status={bet.status} animationClassName={badgeAnimationClass} /></td>
                      <td className="py-4 px-4 text-sm text-text-secondary">{new Date(bet.created_at).toLocaleString()}</td>
                    </tr>
                );
              })}
               {filteredAndSortedBets.length === 0 && (
                <tr>
                    <td colSpan={6} className="text-center py-12 text-text-secondary">
                      {bets.length > 0 ? 'No bets match the current filters.' : "You haven't placed any bets yet."}
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

export default MyBetsPage;