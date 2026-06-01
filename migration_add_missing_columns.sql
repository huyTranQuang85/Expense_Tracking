-- Migration: Add missing columns and tables to support new features
-- This script adds columns that were missing from the BudgetF.sql migration

-- ============================================================================
-- 1) Add missing columns to categories table
-- ============================================================================
ALTER TABLE categories
ADD COLUMN IF NOT EXISTS group_key TEXT,
ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_system BOOLEAN NOT NULL DEFAULT false;

-- ============================================================================
-- 2) Add missing columns to transactions table
-- ============================================================================
-- First create the supporting tables if they don't exist
CREATE TABLE IF NOT EXISTS wallet_transfers (
  transfer_id     BIGSERIAL PRIMARY KEY,
  user_id         UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  from_wallet_id  BIGINT NOT NULL REFERENCES wallets(wallet_id) ON DELETE RESTRICT,
  to_wallet_id    BIGINT NOT NULL REFERENCES wallets(wallet_id) ON DELETE RESTRICT,
  amount          NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  description     TEXT,
  tx_date         DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS recurring_transactions (
  recurring_id     BIGSERIAL PRIMARY KEY,
  user_id          UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  category_id      BIGINT NOT NULL REFERENCES categories(category_id) ON DELETE RESTRICT,
  wallet_id        BIGINT NOT NULL REFERENCES wallets(wallet_id) ON DELETE RESTRICT,
  amount           NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  description      TEXT,
  interval_unit    TEXT NOT NULL CHECK (interval_unit IN ('daily','weekly','monthly','yearly')),
  interval_count   SMALLINT NOT NULL DEFAULT 1 CHECK (interval_count >= 1),
  start_date       DATE NOT NULL DEFAULT CURRENT_DATE,
  next_run_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date         DATE,
  is_active        BOOLEAN NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Now add the foreign key columns to transactions
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS transfer_id BIGINT REFERENCES wallet_transfers(transfer_id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS recurring_id BIGINT REFERENCES recurring_transactions(recurring_id) ON DELETE SET NULL;

-- ============================================================================
-- 3) Add missing columns to wallets table
-- ============================================================================
ALTER TABLE wallets
ADD COLUMN IF NOT EXISTS currency_code TEXT NOT NULL DEFAULT 'VND',
ADD COLUMN IF NOT EXISTS is_frozen BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

-- ============================================================================
-- 4) Create indexes for new tables if not already exists
-- ============================================================================
CREATE INDEX IF NOT EXISTS ix_wallet_transfers_user ON wallet_transfers(user_id);
CREATE INDEX IF NOT EXISTS ix_wallet_transfers_from_wallet ON wallet_transfers(from_wallet_id);
CREATE INDEX IF NOT EXISTS ix_wallet_transfers_to_wallet ON wallet_transfers(to_wallet_id);

CREATE INDEX IF NOT EXISTS ix_recurring_transactions_user ON recurring_transactions(user_id);
CREATE INDEX IF NOT EXISTS ix_recurring_transactions_category ON recurring_transactions(category_id);
CREATE INDEX IF NOT EXISTS ix_recurring_transactions_wallet ON recurring_transactions(wallet_id);
CREATE INDEX IF NOT EXISTS ix_recurring_transactions_next_run ON recurring_transactions(user_id, next_run_date) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS ix_transactions_transfer ON transactions(transfer_id) WHERE transfer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS ix_transactions_recurring ON transactions(recurring_id) WHERE recurring_id IS NOT NULL;

-- ============================================================================
-- 5) Seed default categories if they don't already exist
-- ============================================================================
INSERT INTO categories (user_id, category_name, type, icon, color, is_system)
VALUES
  (NULL, 'Lương', 'income', 'briefcase', '#22C55E', true),
  (NULL, 'Thưởng', 'income', 'gift', '#10B981', true),
  (NULL, 'Thu nhập khác', 'income', 'wallet', '#14B8A6', true),
  (NULL, 'Ăn uống', 'expense', 'utensils', '#F97316', true),
  (NULL, 'Di chuyển', 'expense', 'car', '#3B82F6', true),
  (NULL, 'Mua sắm', 'expense', 'shopping-bag', '#EC4899', true),
  (NULL, 'Nhà ở', 'expense', 'home', '#8B5CF6', true),
  (NULL, 'Hóa đơn', 'expense', 'receipt', '#EF4444', true),
  (NULL, 'Giải trí', 'expense', 'ticket', '#F59E0B', true),
  (NULL, 'Sức khỏe', 'expense', 'heart-pulse', '#06B6D4', true),
  (NULL, 'Giáo dục', 'expense', 'book-open', '#6366F1', true),
  (NULL, 'Chi phí khác', 'expense', 'circle-ellipsis', '#64748B', true),
  (NULL, 'Chuyển tiền', 'expense', 'arrow-right-left', '#9333EA', true)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 6) Create trigger for wallet_transfers updated_at
-- ============================================================================
DROP TRIGGER IF EXISTS trg_wallet_transfers_updated ON wallet_transfers;
CREATE TRIGGER trg_wallet_transfers_updated
BEFORE UPDATE ON wallet_transfers
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_recurring_transactions_updated ON recurring_transactions;
CREATE TRIGGER trg_recurring_transactions_updated
BEFORE UPDATE ON recurring_transactions
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- ============================================================================
-- 7) Add missing columns to wallets table (if not present already)
-- ============================================================================
ALTER TABLE wallets
ADD COLUMN IF NOT EXISTS icon TEXT,
ADD COLUMN IF NOT EXISTS color TEXT CHECK (color IS NULL OR color ~* '^#[0-9A-F]{6}$');
