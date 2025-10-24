import React from 'react';
import { formatCurrency } from '../../utils/formatters';

interface BetInfoPanelProps {
  prizeRate2D?: number;
  prizeRate1D?: number;
  betLimit2D?: number;
  betLimit1D?: number;
}

const BetInfoPanel: React.FC<BetInfoPanelProps> = ({ prizeRate2D, prizeRate1D, betLimit2D, betLimit1D }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-bg-primary/50 p-4 rounded-lg border border-border-color shadow-glow-inset-accent animate-fade-in mb-6">
      <div>
        <h3 className="text-accent-violet font-semibold text-sm uppercase tracking-wider mb-2">Bet Limits</h3>
        <ul className="text-xs space-y-1">
          <li className="flex justify-between items-center">
            <span className="text-text-secondary">2-Digit:</span>
            <span className="font-mono text-text-primary">{betLimit2D ? formatCurrency(betLimit2D) : 'No Limit'}</span>
          </li>
          <li className="flex justify-between items-center">
            <span className="text-text-secondary">1-Digit:</span>
            <span className="font-mono text-text-primary">{betLimit1D ? formatCurrency(betLimit1D) : 'No Limit'}</span>
          </li>
        </ul>
      </div>
      <div>
        <h3 className="text-accent-violet font-semibold text-sm uppercase tracking-wider mb-2">Prize Rates</h3>
        <ul className="text-xs space-y-1">
          <li className="flex justify-between items-center">
            <span className="text-text-secondary">2-Digit:</span>
            <span className="font-mono text-text-primary">1 : {prizeRate2D ?? 85}</span>
          </li>
          <li className="flex justify-between items-center">
            <span className="text-text-secondary">1-Digit:</span>
            <span className="font-mono text-text-primary">1 : {prizeRate1D ?? 9.5}</span>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default BetInfoPanel;