CREATE SCHEMA IF NOT EXISTS public AUTHORIZATION postgres;
SET search_path TO public;

DROP TABLE IF EXISTS "transactions" CASCADE;
DROP TABLE IF EXISTS "prizes" CASCADE;
DROP TABLE IF EXISTS "commissions" CASCADE;
DROP TABLE IF EXISTS "top_up_requests" CASCADE;
DROP TABLE IF EXISTS "bets" CASCADE;
DROP TABLE IF EXISTS "draw_results" CASCADE;
DROP TABLE IF EXISTS "users" CASCADE;

-- USERS
CREATE TABLE "users" (
  "id" TEXT PRIMARY KEY,
  "username" TEXT NOT NULL UNIQUE,
  "password" TEXT,
  "phone" TEXT UNIQUE,
  "role" TEXT NOT NULL,
  "wallet_balance" NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
  "dealer_id" TEXT REFERENCES "users"("id") ON DELETE SET NULL,
  "bet_limit_per_draw" NUMERIC(10, 2),
  "city" TEXT,
  "commission_rate" NUMERIC(5, 2) DEFAULT 0.00,
  "prize_rate_2d" NUMERIC(5, 2) DEFAULT 85.00,
  "prize_rate_1d" NUMERIC(5, 2) DEFAULT 9.50,
  "bet_limit_2d" NUMERIC(10, 2),
  "bet_limit_1d" NUMERIC(10, 2),
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX ON "users" ("dealer_id");
CREATE INDEX ON "users" ("role");

-- DRAW RESULTS
CREATE TABLE "draw_results" (
  "id" TEXT PRIMARY KEY,
  "draw_label" TEXT NOT NULL UNIQUE,
  "two_digit" TEXT,
  "one_digit_open" TEXT,
  "one_digit_close" TEXT,
  "declared_at" TIMESTAMPTZ,
  "open_declared_at" TIMESTAMPTZ
);

-- BETS
CREATE TABLE "bets" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "draw_label" TEXT NOT NULL,
  "game_type" TEXT NOT NULL,
  "number" TEXT NOT NULL,
  "stake" NUMERIC(10, 2) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX ON "bets" ("user_id");
CREATE INDEX ON "bets" ("draw_label");

-- TOP UP REQUESTS
CREATE TABLE "top_up_requests" (
  "id" TEXT PRIMARY KEY,
  "dealer_id" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "dealer_username" TEXT NOT NULL,
  "amount" NUMERIC(12, 2) NOT NULL,
  "reference" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "approved_at" TIMESTAMPTZ
);

-- COMMISSIONS
CREATE TABLE "commissions" (
  "id" TEXT PRIMARY KEY,
  "recipient_id" TEXT NOT NULL,
  "recipient_type" TEXT NOT NULL,
  "draw_label" TEXT NOT NULL,
  "amount" NUMERIC(12, 2) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- PRIZES
CREATE TABLE "prizes" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "bet_id" TEXT NOT NULL REFERENCES "bets"("id") ON DELETE CASCADE,
  "draw_label" TEXT NOT NULL,
  "amount" NUMERIC(12, 2) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- TRANSACTIONS
CREATE TABLE "transactions" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "type" TEXT NOT NULL,
  "amount" NUMERIC(12, 2) NOT NULL,
  "balance_change" NUMERIC(12, 2) NOT NULL,
  "related_entity_id" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX ON "transactions" ("user_id");

-- DEFAULT ADMIN
INSERT INTO users (id, username, password, role, wallet_balance)
VALUES ('admin_default', 'admin', 'Admin@123', 'admin', 9999999)
ON CONFLICT (id) DO NOTHING;
