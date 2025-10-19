-- A-BABA EXCHANGE DATABASE SCHEMA
-- This script creates all necessary tables, types, and relationships.
-- It is designed to be idempotent; it will not fail if run multiple times.

-- Ensure the uuid-ossp extension is available for generating unique IDs.
-- NOTE: This command often requires superuser privileges to run for the first time on a database.
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing types and tables in reverse order of dependency to ensure a clean slate.
-- This is useful for development and resetting the database.
DROP TABLE IF EXISTS top_up_requests CASCADE;
DROP TABLE IF EXISTS prizes CASCADE;
DROP TABLE IF EXISTS commissions CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS bets CASCADE;
DROP TABLE IF EXISTS draw_results CASCADE;
DROP TABLE IF EXISTS users CASCADE;

DROP TYPE IF EXISTS user_role;
DROP TYPE IF EXISTS bet_status;
DROP TYPE IF EXISTS game_type;
DROP TYPE IF EXISTS transaction_type;
DROP TYPE IF EXISTS commission_status;
DROP TYPE IF EXISTS top_up_status;

-- Define custom ENUM types to enforce data integrity at the database level.
CREATE TYPE user_role AS ENUM ('user', 'dealer', 'admin');
CREATE TYPE bet_status AS ENUM ('pending', 'won', 'lost');
CREATE TYPE game_type AS ENUM ('2D', '1D-Open', '1D-Close');
CREATE TYPE commission_status AS ENUM ('pending', 'approved');
CREATE TYPE top_up_status AS ENUM ('pending', 'approved', 'rejected');

CREATE TYPE transaction_type AS ENUM (
    'bet_placed',
    'prize_won',
    'dealer_credit', -- User receives from dealer
    'admin_credit', -- User or Dealer receives from admin
    'commission_payout',
    'top_up_approved',
    'dealer_debit_to_user', -- Dealer sends credit to user
    'admin_debit_from_user', -- Admin debits from any user/dealer
    'admin_credit_from_user', -- Admin receives credit from any user/dealer
    'commission_rebate' -- For users with personal commission rates
);


-- Main USERS table to store all accounts: users, dealers, and admins.
CREATE TABLE users (
    id VARCHAR(255) PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    password VARCHAR(255), -- Can be NULL to use default password
    phone VARCHAR(255) UNIQUE,
    role user_role NOT NULL,
    wallet_balance NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    dealer_id VARCHAR(255) REFERENCES users(id),
    bet_limit_per_draw NUMERIC(15, 2), -- A global limit, can be overridden by specific limits
    
    -- New detailed fields
    city VARCHAR(255),
    commission_rate NUMERIC(5, 2) DEFAULT 0.00, -- e.g., 5.00 for 5%
    prize_rate_2d NUMERIC(10, 2) DEFAULT 85.00, -- Multiplier, e.g., 1 gets 85
    prize_rate_1d NUMERIC(10, 2) DEFAULT 9.50,  -- Multiplier, e.g., 1 gets 9.5
    bet_limit_2d NUMERIC(15, 2), -- Max stake amount for a 2D bet
    bet_limit_1d NUMERIC(15, 2), -- Max stake amount for a 1D bet

    -- Constraints to ensure data validity
    CONSTRAINT unique_username_per_role UNIQUE (username, role),
    CONSTRAINT check_wallet_balance_non_negative CHECK (wallet_balance >= 0)
);

-- Index for faster lookups on commonly queried columns
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_dealer_id ON users(dealer_id);


-- Table to store results of each draw.
CREATE TABLE draw_results (
    id VARCHAR(255) PRIMARY KEY,
    draw_label VARCHAR(255) UNIQUE NOT NULL,
    two_digit CHAR(2),
    one_digit_open CHAR(1),
    one_digit_close CHAR(1),
    declared_at TIMESTAMPTZ, -- Final declaration time for the full result (2D, 1D Open, 1D Close)
    open_declared_at TIMESTAMPTZ -- For games where 'Open' is declared at a different time
);
CREATE INDEX idx_draw_results_label ON draw_results(draw_label);
CREATE INDEX idx_draw_results_declared_at ON draw_results(declared_at DESC);


-- Table to store every bet placed by users.
CREATE TABLE bets (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL REFERENCES users(id),
    draw_label VARCHAR(255) NOT NULL REFERENCES draw_results(draw_label),
    game_type game_type NOT NULL,
    number VARCHAR(2) NOT NULL,
    stake NUMERIC(15, 2) NOT NULL,
    status bet_status NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT check_stake_positive CHECK (stake > 0)
);
CREATE INDEX idx_bets_user_id ON bets(user_id);
CREATE INDEX idx_bets_draw_label ON bets(draw_label);
CREATE INDEX idx_bets_status ON bets(status);


-- Table to log all financial transactions for auditing.
CREATE TABLE transactions (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL REFERENCES users(id),
    type transaction_type NOT NULL,
    amount NUMERIC(15, 2) NOT NULL,
    balance_change NUMERIC(15, 2) NOT NULL, -- can be positive or negative
    related_entity_id VARCHAR(255), -- e.g., bet_id, commission_id, user_id of other party
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_type ON transactions(type);


-- Table for commissions earned by dealers and potentially admins.
CREATE TABLE commissions (
    id VARCHAR(255) PRIMARY KEY,
    recipient_id VARCHAR(255) NOT NULL REFERENCES users(id),
    recipient_type VARCHAR(50) NOT NULL, -- 'dealer' or 'admin'
    draw_label VARCHAR(255) NOT NULL REFERENCES draw_results(draw_label),
    amount NUMERIC(15, 2) NOT NULL,
    status commission_status NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_commissions_recipient_id ON commissions(recipient_id);
CREATE INDEX idx_commissions_status ON commissions(status);


-- Table for prizes won by users, awaiting admin approval.
CREATE TABLE prizes (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL REFERENCES users(id),
    bet_id VARCHAR(255) NOT NULL REFERENCES bets(id),
    draw_label VARCHAR(255) NOT NULL,
    amount NUMERIC(15, 2) NOT NULL,
    status commission_status NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_prizes_user_id ON prizes(user_id);
CREATE INDEX idx_prizes_status ON prizes(status);


-- Table for dealer top-up requests.
CREATE TABLE top_up_requests (
    id VARCHAR(255) PRIMARY KEY,
    dealer_id VARCHAR(255) NOT NULL REFERENCES users(id),
    dealer_username VARCHAR(255) NOT NULL,
    amount NUMERIC(15, 2) NOT NULL,
    reference TEXT,
    status top_up_status NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    approved_at TIMESTAMPTZ
);
CREATE INDEX idx_top_up_requests_status ON top_up_requests(status);
CREATE INDEX idx_top_up_requests_dealer_id ON top_up_requests(dealer_id);


-- Seed a default admin user to ensure the system is accessible after setup.
-- Username: admin
-- PIN: Admin@123
INSERT INTO users (id, username, password, role, wallet_balance)
VALUES ('admin_default', 'admin', 'Admin@123', 'admin', 9999999.00)
ON CONFLICT (id) DO NOTHING;