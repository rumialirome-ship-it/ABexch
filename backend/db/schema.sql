-- A-BABA Exchange --
-- Database Schema --
-- This script is idempotent and can be run multiple times safely.

-- Set the search path to 'public' to ensure objects are created in the correct schema.
SET search_path TO public;

-- Drop existing objects in reverse order of dependency to avoid errors.
DROP TABLE IF EXISTS top_up_requests CASCADE;
DROP TABLE IF EXISTS prizes CASCADE;
DROP TABLE IF EXISTS commissions CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS draw_results CASCADE;
DROP TABLE IF EXISTS bets CASCADE;
DROP TABLE IF EXISTS users CASCADE;

DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS bet_status CASCADE;
DROP TYPE IF EXISTS game_type CASCADE;
DROP TYPE IF EXISTS transaction_type CASCADE;
DROP TYPE IF EXISTS commission_recipient_type CASCADE;
DROP TYPE IF EXISTS approval_status CASCADE;


-- Create Extensions
-- The 'uuid-ossp' extension is required for generating UUIDs, which can be used for primary keys.
-- This must be enabled by a superuser on the database first.
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- Create Custom Data Types (ENUMs)
CREATE TYPE user_role AS ENUM ('user', 'dealer', 'admin');
CREATE TYPE bet_status AS ENUM ('pending', 'won', 'lost');
CREATE TYPE game_type AS ENUM ('2D', '1D-Open', '1D-Close');
CREATE TYPE transaction_type AS ENUM (
    'bet_placed',
    'prize_won',
    'dealer_credit',
    'admin_credit',
    'commission_payout',
    'top_up_approved',
    'dealer_debit_to_user',
    'admin_debit_from_user',
    'admin_credit_from_user',
    'commission_rebate'
);
CREATE TYPE commission_recipient_type AS ENUM ('dealer', 'admin');
CREATE TYPE approval_status AS ENUM ('pending', 'approved', 'rejected');


-- Create Tables

-- 1. Users Table
-- Stores all users, dealers, and admins.
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password TEXT,
    phone TEXT UNIQUE,
    role user_role NOT NULL,
    wallet_balance NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    dealer_id TEXT REFERENCES users(id) ON DELETE SET NULL, -- A user's dealer
    city TEXT,
    commission_rate NUMERIC(5, 2) DEFAULT 0.00, -- Commission rate for the user/dealer
    prize_rate_2d NUMERIC(10, 2) DEFAULT 85.00,
    prize_rate_1d NUMERIC(10, 2) DEFAULT 9.50,
    bet_limit_2d NUMERIC(12, 2),
    bet_limit_1d NUMERIC(12, 2),
    bet_limit_per_draw NUMERIC(12, 2), -- General limit if specific ones aren't set
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_users_dealer_id ON users(dealer_id);
CREATE INDEX idx_users_role ON users(role);

-- 2. Bets Table
-- Stores all bets placed by users.
CREATE TABLE bets (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    draw_label TEXT NOT NULL,
    game_type game_type NOT NULL,
    number TEXT NOT NULL,
    stake NUMERIC(10, 2) NOT NULL,
    status bet_status NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_bets_user_id ON bets(user_id);
CREATE INDEX idx_bets_draw_label ON bets(draw_label);
CREATE INDEX idx_bets_status ON bets(status);

-- 3. Draw Results Table
-- Stores the winning numbers for each draw.
CREATE TABLE draw_results (
    id TEXT PRIMARY KEY,
    draw_label TEXT NOT NULL UNIQUE,
    two_digit CHAR(2),
    one_digit_open CHAR(1),
    one_digit_close CHAR(1),
    declared_at TIMESTAMPTZ, -- Final declaration time
    open_declared_at TIMESTAMPTZ -- For games with split timings
);
CREATE INDEX idx_draw_results_declared_at ON draw_results(declared_at DESC);

-- 4. Transactions Table
-- Logs every change to a user's wallet balance.
CREATE TABLE transactions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type transaction_type NOT NULL,
    amount NUMERIC(15, 2) NOT NULL,
    balance_change NUMERIC(15, 2) NOT NULL,
    related_entity_id TEXT, -- e.g., bet_id, commission_id, user_id of the other party
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_transactions_created_at ON transactions(created_at DESC);

-- 5. Commissions Table
-- Stores commissions earned by dealers and admins.
CREATE TABLE commissions (
    id TEXT PRIMARY KEY,
    recipient_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipient_type commission_recipient_type NOT NULL,
    draw_label TEXT NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    status approval_status NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_commissions_recipient_id ON commissions(recipient_id);
CREATE INDEX idx_commissions_status ON commissions(status);

-- 6. Prizes Table
-- Stores winnings from bets before they are approved and paid out.
CREATE TABLE prizes (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    bet_id TEXT NOT NULL REFERENCES bets(id) ON DELETE CASCADE,
    draw_label TEXT NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    status approval_status NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_prizes_user_id ON prizes(user_id);
CREATE INDEX idx_prizes_status ON prizes(status);

-- 7. Top-Up Requests Table
-- Stores requests from dealers for wallet top-ups.
CREATE TABLE top_up_requests (
    id TEXT PRIMARY KEY,
    dealer_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    dealer_username TEXT NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    reference TEXT,
    status approval_status NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    approved_at TIMESTAMPTZ
);
CREATE INDEX idx_top_up_requests_dealer_id ON top_up_requests(dealer_id);
CREATE INDEX idx_top_up_requests_status ON top_up_requests(status);


-- Insert Default Admin User
-- This ensures the system is accessible immediately after setup.
-- ID is predictable for initial access.
INSERT INTO users (id, username, password, role, wallet_balance)
VALUES ('admin_default', 'admin', 'Admin@123', 'admin', 9999999.00)
ON CONFLICT (id) DO NOTHING;

-- --- End of Schema ---