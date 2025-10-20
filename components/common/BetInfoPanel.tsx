import React from 'react';
import { formatCurrency } from '../../utils/formatters';

const BetInfoPanel: React.FC = () => {
  return (
    <div className="absolute top-0 right-0 bg-bg-primary/50 p-4 rounded-lg border border-border-color shadow-glow-inset-accent w-64 hidden lg:block animate-fade-in">
      <div className="mb-4">
        <h3 className="text-accent-violet font-semibold text-sm uppercase tracking-wider mb-2">Bet Limits</h3>
        <ul className="text-xs space-y-1">
          <li className="flex justify-between items-center">
            <span className="text-text-secondary">2-Digit:</span>
            <span className="font-mono text-text-primary">{formatCurrency(5000)}</span>
          </li>
          <li className="flex justify-between items-center">
            <span className="text-text-secondary">1-Digit:</span>
            <span className="font-mono text-text-primary">{formatCurrency(10000)}</span>
          </li>
        </ul>
      </div>
      <div>
        <h3 className="text-accent-violet font-semibold text-sm uppercase tracking-wider mb-2">Prize Rates</h3>
        <ul className="text-xs space-y-1">
          <li className="flex justify-between items-center">
            <span className="text-text-secondary">2-Digit:</span>
            <span className="font-mono text-text-primary">1 : 85</span>
          </li>
          <li className="flex justify-between items-center">
            <span className="text-text-secondary">1-Digit:</span>
            <span className="font-mono text-text-primary">1 : 9.5</span>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default BetInfoPanel;