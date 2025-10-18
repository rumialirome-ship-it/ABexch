import React from 'react';
import { TransactionType } from '../../types';

interface BadgeStyle {
    bg: string;
    text: string;
    border: string;
}

const badgeStyles: Record<TransactionType, BadgeStyle> = {
    [TransactionType.BET_PLACED]: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/20' },
    [TransactionType.PRIZE_WON]: { bg: 'bg-success/10', text: 'text-success', border: 'border-success/20' },
    [TransactionType.DEALER_CREDIT]: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' },
    [TransactionType.ADMIN_CREDIT]: { bg: 'bg-indigo-500/10', text: 'text-indigo-400', border: 'border-indigo-500/20' },
    [TransactionType.COMMISSION_PAYOUT]: { bg: 'bg-teal-500/10', text: 'text-teal-400', border: 'border-teal-500/20' },
    [TransactionType.TOP_UP_APPROVED]: { bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/20' },
    [TransactionType.DEALER_DEBIT_TO_USER]: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20' },
    [TransactionType.ADMIN_DEBIT_FROM_USER]: { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/20' },
    [TransactionType.ADMIN_CREDIT_FROM_USER]: { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20' },
    [TransactionType.COMMISSION_REBATE]: { bg: 'bg-fuchsia-500/10', text: 'text-fuchsia-400', border: 'border-fuchsia-500/20' },
};

const formatTypeName = (type: TransactionType): string => {
    return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

const TransactionTypeBadge: React.FC<{ type: TransactionType }> = ({ type }) => {
    const style = badgeStyles[type] || { bg: 'bg-gray-500/10', text: 'text-gray-400', border: 'border-gray-500/20' };

    return (
        <span className={`px-2 py-1 text-xs font-medium rounded-full inline-block border ${style.bg} ${style.text} ${style.border}`}>
            {formatTypeName(type)}
        </span>
    );
};

export default TransactionTypeBadge;