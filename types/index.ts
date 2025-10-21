
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
  wallet_balance: number;
  dealer_id?: string;
  bet_limit_per_draw?: number; // Kept for compatibility, but new logic uses specific limits
  // New fields from form
  password?: string;
  city?: string;
  commission_rate?: number; // In percentage
  prize_rate_2d?: number; // Multiplier, e.g., 85
  prize_rate_1d?: number; // Multiplier, e.g., 9.5
  bet_limit_2d?: number; // Max stake amount
  bet_limit_1d?: number; // Max stake amount
}

export enum BetStatus {
    PENDING = 'pending',
    WON = 'won',
    LOST = 'lost',
}

export type GameType = '2D' | '1D-Open' | '1D-Close';

export interface Bet {
  id: string;
  user_id: string;
  draw_label: string;
  game_type: GameType;
  number: string;
  stake: number;
  status: BetStatus;
  created_at: string; // ISO date string
}

export interface DrawResult {
    id: string;
    draw_label: string;
    two_digit?: string;
    one_digit_open?: string;
    one_digit_close?: string;
    declared_at: string; // Represents final declaration time
    open_declared_at?: string; // For split-time games
}

export interface Commission {
    id: string;
    recipient_id: string;
    recipient_type: 'dealer' | 'admin';
    draw_label: string;
    amount: number;
    status: 'pending' | 'approved';
    created_at: string;
}

export interface Prize {
    id: string;
    user_id: string;
    bet_id: string;
    draw_label: string;
    amount: number;
    status: 'pending' | 'approved';
    created_at: string;
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
    user_id: string;
    type: TransactionType;
    amount: number;
    balance_change: number; // can be positive or negative
    related_entity_id?: string; // e.g., betId, commissionId
    created_at: string;
}

export interface TopUpRequest {
  id: string;
  dealer_id: string;
  dealer_username: string;
  amount: number;
  reference: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  approved_at?: string;
}

export interface Game {
  name: string;
  time: string;
  icon: string;
  base_draw_name?: string;
  bet_type?: 'open' | 'close';
}

export const TIMING_GAMES: Game[] = [
  { name: 'Ali Baba', time: '18:15', icon: '🕕' },
  { name: 'GSM', time: '18:45', icon: '📱' },
  { name: 'OYO Tv', time: '20:15', icon: '📺' },
  { name: 'Ls1', time: '20:45', icon: '🎮' },
  { name: 'OLA Tv', time: '21:15', icon: '📺' },
  { name: 'AK', time: '21:55', icon: '🎯', base_draw_name: 'AK-SPECIAL', bet_type: 'open' },
  { name: 'Ls2', time: '23:45', icon: '🎮' },
  { name: 'Akc', time: '12:55', icon: '🎲', base_draw_name: 'AK-SPECIAL', bet_type: 'close' },
  { name: 'Ls3', time: '14:10', icon: '🕑' }, 
];
