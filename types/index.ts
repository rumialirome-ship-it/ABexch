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
  betLimitPerDraw?: number; // Kept for compatibility, but new logic uses specific limits
  // New fields from form
  password?: string;
  city?: string;
  commissionRate?: number; // In percentage
  prizeRate2D?: number; // Multiplier, e.g., 85
  prizeRate1D?: number; // Multiplier, e.g., 9.5
  betLimit2D?: number; // Max stake amount
  betLimit1D?: number; // Max stake amount
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
  createdAt: string; // ISO date string
}

export interface DrawResult {
    id: string;
    drawLabel: string;
    twoDigit?: string;
    oneDigitOpen?: string;
    oneDigitClose?: string;
    declaredAt: string; // Represents final declaration time
    openDeclaredAt?: string; // For split-time games
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
    DEALER_CREDIT = 'dealer_credit', // User receives from dealer
    ADMIN_CREDIT = 'admin_credit', // User or Dealer receives from admin
    COMMISSION_PAYOUT = 'commission_payout',
    TOP_UP_APPROVED = 'top_up_approved',
    DEALER_DEBIT_TO_USER = 'dealer_debit_to_user', // Dealer sends credit to user
    ADMIN_DEBIT_FROM_USER = 'admin_debit_from_user',
    ADMIN_CREDIT_FROM_USER = 'admin_credit_from_user',
    COMMISSION_REBATE = 'commission_rebate',
}

export interface Transaction {
    id: string;
    userId: string;
    type: TransactionType;
    amount: number;
    balanceChange: number; // can be positive or negative
    relatedEntityId?: string; // e.g., betId, commissionId
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

export interface Game {
  name: string;
  time: string;
  icon: string;
  baseDrawName?: string;
  betType?: 'open' | 'close';
}

export const TIMING_GAMES: Game[] = [
  { name: 'Ali Baba', time: '18:15', icon: '🕕' },
  { name: 'GSM', time: '18:45', icon: '📱' },
  { name: 'OYO Tv', time: '20:15', icon: '📺' },
  { name: 'Ls1', time: '20:45', icon: '🎮' },
  { name: 'OLA Tv', time: '21:15', icon: '📺' },
  { name: 'AK', time: '21:55', icon: '🎯', baseDrawName: 'AK-SPECIAL', betType: 'open' },
  { name: 'Ls2', time: '23:45', icon: '🎮' },
  { name: 'Akc', time: '12:55', icon: '🎲', baseDrawName: 'AK-SPECIAL', betType: 'close' },
  { name: 'Ls3', time: '14:10', icon: '🕑' }, 
];