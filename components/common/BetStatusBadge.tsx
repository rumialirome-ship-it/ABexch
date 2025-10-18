import React from 'react';
import { BetStatus } from '../../types';

const BetStatusBadge: React.FC<{ status: BetStatus, animationClassName?: string }> = ({ status, animationClassName }) => {
  const baseClasses = 'px-3 py-1 text-sm font-semibold rounded-full inline-block whitespace-nowrap';
  let specificClasses = '';

  switch (status) {
    case BetStatus.WON:
      specificClasses = 'bg-success/20 text-success border border-success/30';
      break;
    case BetStatus.LOST:
      specificClasses = 'bg-danger/20 text-danger border border-danger/30';
      break;
    case BetStatus.PENDING:
    default:
      specificClasses = 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30';
      break;
  }
  return <span className={`${baseClasses} ${specificClasses} ${animationClassName || ''}`}>{status}</span>;
};

export default BetStatusBadge;