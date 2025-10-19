
// FIX: Changed type-only import to a regular import to ensure AuthenticatedRequest inherits properties from Express.Request correctly.
import { Request } from 'express';

export enum UserRole {
  USER = 'user',
  DEALER = 'dealer',
  ADMIN = 'admin',
}

export interface User {
  id: string;
  username: string;
  password?: string;
  phone?: string;
  role: UserRole;
  wallet_balance: number;
  dealer_id?: string;
  bet_limit_per_draw?: number;
  city?: string;
  commission_rate?: number; 
  prize_rate_2d?: number;
  prize_rate_1d?: number;
  bet_limit_2d?: number;
  bet_limit_1d?: number;
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
  created_at: string;
}

export interface DrawResult {
    id: string;
    draw_label: string;
    two_digit?: string;
    one_digit_open?: string;
    one_digit_close?: string;
    declared_at: string;
    open_declared_at?: string;
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
    user_id: string;
    type: TransactionType;
    amount: number;
    balance_change: number;
    related_entity_id?: string;
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

// For Express request augmentation in middleware
export interface AuthenticatedRequest extends Request {
    user?: {
        id: string;
        role: UserRole;
    };
}