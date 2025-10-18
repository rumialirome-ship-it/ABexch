
export enum UserRole {
  USER = 'user',
  DEALER = 'dealer',
  ADMIN = 'admin',
}

export interface User {
  id: string;
  username: string;
  phone?: string;
  role: UserRole;
  walletBalance: number;
  dealerId?: string;
  betLimitPerDraw?: number;
  password?: string;
  city?: string;
  commissionRate?: number; 
  prizeRate2D?: number;
  prizeRate1D?: number;
  betLimit2D?: number;
  betLimit1D?: number;
}

export enum BetStatus {
    PENDING = 'pending',
    WON = 'won',
    LOST = 'lost',
}

export type GameType = '2D' | '1D-Open' | '1D-Close';

export interface Bet {
  id: string;
  userId: string;
  drawLabel: string;
  gameType: GameType;
  number: string;
  stake: number;
  status: BetStatus;
  createdAt: string;
}

export interface DrawResult {
    id: string;
    drawLabel: string;
    twoDigit?: string;
    oneDigitOpen?: string;
    oneDigitClose?: string;
    declaredAt: string;
    openDeclaredAt?: string;
}

export interface Commission {
    id: string;
    recipientId: string;
    recipientType: 'dealer' | 'admin';
    drawLabel: string;
    amount: number;
    status: 'pending' | 'approved';
    createdAt: string;
}

export interface Prize {
    id: string;
    userId: string;
    betId: string;
    drawLabel: string;
    amount: number;
    status: 'pending' | 'approved';
    createdAt: string;
}

export enum TransactionType {
    BET_PLACED = 'bet_placed',
    PRIZE_WON = 'prize_won',
    DEALER_CREDIT = 'dealer_credit',
    ADMIN_CREDIT = 'admin_credit',
    COMMISSION_PAYOUT = 'commission_payout',
    TOP_UP_APPROVED = 'top_up_approved',
    DEALER_DEBIT_TO_USER = 'dealer_debit_to_user',
    ADMIN_DEBIT_FROM_USER = 'admin_debit_from_user',
    ADMIN_CREDIT_FROM_USER = 'admin_credit_from_user',
    COMMISSION_REBATE = 'commission_rebate',
}

export interface Transaction {
    id: string;
    userId: string;
    type: TransactionType;
    amount: number;
    balanceChange: number;
    relatedEntityId?: string;
    createdAt: string;
}

export interface TopUpRequest {
  id: string;
  dealerId: string;
  dealerUsername: string;
  amount: number;
  reference: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  approvedAt?: string;
}
