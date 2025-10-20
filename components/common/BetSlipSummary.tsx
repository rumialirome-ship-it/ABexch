import React from 'react';
import { formatCurrency } from '../../utils/formatters';

interface BetSlipSummaryProps {
  betCount: number;
  totalStake: number;
  onConfirm: () => void;
  onClear: () => void;
  isConfirmDisabled?: boolean;
}

const BetSlipSummary: React.FC<BetSlipSummaryProps> = ({ betCount, totalStake, onConfirm, onClear, isConfirmDisabled = false }) => {
  if (betCount === 0) {
    return null; // Don't render if the slip is empty
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 p-4 animate-fade-in-up">
      <div className="container mx-auto max-w-4xl">
        <div className="bg-bg-secondary/90 backdrop-blur-lg rounded-xl shadow-glow-hard shadow-glow-inset-accent border border-border-highlight p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 md:gap-6">
            <div className="text-center">
              <span className="block text-2xl md:text-3xl font-bold text-accent-violet">{betCount}</span>
              <span className="block text-xs text-text-secondary uppercase tracking-wider">Bet{betCount > 1 ? 's' : ''}</span>
            </div>
            <div className="w-px h-10 bg-border-color"></div>
            <div className="text-left">
              <span className="block text-text-secondary text-xs uppercase tracking-wider">Total Stake</span>
              <span className="block text-xl md:text-2xl font-bold text-accent-violet font-mono">{formatCurrency(totalStake)}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 md:gap-4">
            <button
              onClick={onClear}
              className="border border-danger/50 text-danger font-bold py-2 px-4 rounded-lg transition-all duration-300 hover:bg-danger hover:text-white text-sm active:scale-95"
            >
              Clear
            </button>
            <button
              onClick={onConfirm}
              disabled={isConfirmDisabled}
              className="bg-gradient-to-r from-accent-blue via-accent-violet to-accent-orange text-white font-bold py-2 px-4 md:px-6 rounded-lg transition-all duration-300 hover:saturate-150 hover:-translate-y-0.5 hover:shadow-glow-accent active:scale-95 focus:outline-none focus:ring-2 focus:ring-accent-violet focus:ring-offset-2 focus:ring-offset-bg-secondary disabled:bg-border-color disabled:from-border-color disabled:to-border-color disabled:text-text-secondary disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0"
            >
              Review & Place
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BetSlipSummary;