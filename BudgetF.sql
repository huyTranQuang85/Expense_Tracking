
-- 0) EXTENSIONS
-- =============================================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;   -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS citext;     -- case-insensitive email
CREATE EXTENSION IF NOT EXISTS pg_trgm;    -- trigram text search

-- =============================================================================
-- 1) ENUM TYPES
-- =============================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'money_type') THEN
    CREATE TYPE money_type AS ENUM ('income', 'expense');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'wallet_type') THEN
    CREATE TYPE wallet_type AS ENUM ('standard', 'savings', 'other');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'reminder_channel') THEN
    CREATE TYPE reminder_channel AS ENUM ('email', 'in_app');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'reset_status') THEN
    CREATE TYPE reset_status AS ENUM ('pending', 'used', 'expired');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'chat_sender') THEN
    CREATE TYPE chat_sender AS ENUM ('user', 'assistant', 'system');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_type') THEN
    CREATE TYPE notification_type AS ENUM ('budget', 'system', 'transaction', 'reminder', 'group');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'email_status') THEN
    CREATE TYPE email_status AS ENUM ('sent', 'failed');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'export_status') THEN
    CREATE TYPE export_status AS ENUM ('success', 'failed');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'group_role') THEN
    CREATE TYPE group_role AS ENUM ('owner', 'member');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'group_invitation_status') THEN
    CREATE TYPE group_invitation_status AS ENUM ('pending', 'accepted', 'declined', 'expired', 'cancelled');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'group_message_type') THEN
    CREATE TYPE group_message_type AS ENUM ('text', 'system');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'contribution_plan_status') THEN
    CREATE TYPE contribution_plan_status AS ENUM ('open', 'closed', 'cancelled');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'contribution_assignment_status') THEN
    CREATE TYPE contribution_assignment_status AS ENUM ('unpaid', 'partial', 'paid');
  END IF;
END $$;

-- =============================================================================
-- 2) SHARED UTILITY FUNCTION
-- =============================================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 3) CORE PERSONAL TABLES
-- =============================================================================

-- 3.1 users -------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  user_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_name     TEXT   NOT NULL CHECK (length(btrim(user_name)) > 0),
  email         CITEXT NOT NULL UNIQUE,
  password_hash TEXT   NOT NULL,
  phone         TEXT,
  bio           TEXT,
  avatar_url    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3.2 settings ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS settings (
  setting_id BIGSERIAL PRIMARY KEY,
  user_id    UUID NOT NULL UNIQUE REFERENCES users(user_id) ON DELETE CASCADE,
  dark_mode  BOOLEAN NOT NULL DEFAULT false,
  locale     TEXT    NOT NULL DEFAULT 'vi-VN',
  timezone   TEXT    NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3.3 categories --------------------------------------------------------------
-- user_id NULL means global category.
CREATE TABLE IF NOT EXISTS categories (
  category_id        BIGSERIAL PRIMARY KEY,
  user_id            UUID REFERENCES users(user_id) ON DELETE CASCADE,
  category_name      TEXT NOT NULL CHECK (length(btrim(category_name)) > 0),
  type               money_type NOT NULL,
  icon               TEXT,
  color              TEXT CHECK (color IS NULL OR color ~* '^#[0-9A-F]{6}$'),
  parent_category_id BIGINT REFERENCES categories(category_id) ON DELETE RESTRICT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3.4 wallets -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS wallets (
  wallet_id   BIGSERIAL PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  wallet_name TEXT NOT NULL CHECK (length(btrim(wallet_name)) > 0),
  description TEXT,
  icon        TEXT,
  color       TEXT CHECK (color IS NULL OR color ~* '^#[0-9A-F]{6}$'),
  type        wallet_type NOT NULL DEFAULT 'standard',
  balance     NUMERIC(14,2) NOT NULL DEFAULT 0,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3.5 transactions ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS transactions (
  transaction_id BIGSERIAL PRIMARY KEY,
  user_id        UUID   NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  category_id    BIGINT NOT NULL REFERENCES categories(category_id) ON DELETE RESTRICT,
  wallet_id      BIGINT NOT NULL REFERENCES wallets(wallet_id) ON DELETE RESTRICT,
  amount         NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  description    TEXT,
  tx_date        DATE NOT NULL DEFAULT CURRENT_DATE,
  deleted_at     TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3.6 reminders ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reminders (
  reminder_id   BIGSERIAL PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  title         TEXT NOT NULL CHECK (length(btrim(title)) > 0),
  message       TEXT,
  remind_at     TIMESTAMPTZ NOT NULL,
  channel       reminder_channel NOT NULL DEFAULT 'in_app',
  is_active     BOOLEAN NOT NULL DEFAULT true,
  is_recurring  BOOLEAN NOT NULL DEFAULT false,
  frequency     TEXT CHECK (frequency IS NULL OR frequency IN ('daily', 'weekly', 'monthly')),
  interval      SMALLINT CHECK (interval IS NULL OR interval >= 1),
  by_weekday    SMALLINT[],
  by_monthday   SMALLINT CHECK (by_monthday IS NULL OR by_monthday BETWEEN 1 AND 31),
  until_date     DATE,
  timezone      TEXT DEFAULT 'Asia/Ho_Chi_Minh',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT ck_reminders_by_weekday CHECK (
    by_weekday IS NULL
    OR (
      by_weekday <@ ARRAY[0,1,2,3,4,5,6]::SMALLINT[]
      AND array_length(by_weekday, 1) BETWEEN 1 AND 7
    )
  )
);

-- 3.7 reminder_logs -----------------------------------------------------------
-- Log by reminder_id to avoid blocking multiple reminders from same user/day/channel.
CREATE TABLE IF NOT EXISTS reminder_logs (
  reminder_log_id BIGSERIAL PRIMARY KEY,
  reminder_id     BIGINT NOT NULL REFERENCES reminders(reminder_id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  channel         reminder_channel NOT NULL,
  sent_on         DATE NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(reminder_id, channel, sent_on)
);

-- 3.8 budgets -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS budgets (
  budget_id       BIGSERIAL PRIMARY KEY,
  user_id         UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  category_id     BIGINT REFERENCES categories(category_id) ON DELETE RESTRICT,
  wallet_id       BIGINT REFERENCES wallets(wallet_id) ON DELETE RESTRICT,
  month           DATE NOT NULL,
  limit_amount    NUMERIC(14,2) NOT NULL CHECK (limit_amount > 0),
  alert_threshold SMALLINT NOT NULL DEFAULT 80 CHECK (alert_threshold IN (70,80,90,100)),
  notify_in_app   BOOLEAN NOT NULL DEFAULT false,
  notify_email    BOOLEAN NOT NULL DEFAULT false,
  category_key    BIGINT GENERATED ALWAYS AS (COALESCE(category_id, 0)) STORED,
  wallet_key      BIGINT GENERATED ALWAYS AS (COALESCE(wallet_id, 0)) STORED,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, category_key, wallet_key, month)
);

-- 3.9 password resets ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_password_resets (
  reset_id    BIGSERIAL PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  token_hash  TEXT NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ NOT NULL,
  status      reset_status NOT NULL DEFAULT 'pending',
  used_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3.10 notifications ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
  notification_id BIGSERIAL PRIMARY KEY,
  user_id         UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  type            notification_type NOT NULL DEFAULT 'system',
  title           TEXT,
  message         TEXT NOT NULL,
  metadata        JSONB,
  is_read         BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3.11 email logs -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS email_logs (
  email_log_id BIGSERIAL PRIMARY KEY,
  user_id      UUID REFERENCES users(user_id) ON DELETE SET NULL,
  subject      TEXT NOT NULL,
  content      TEXT NOT NULL,
  status       email_status NOT NULL DEFAULT 'sent',
  error_detail TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3.12 report exports ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS report_exports (
  report_export_id BIGSERIAL PRIMARY KEY,
  user_id          UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  criteria         JSONB,
  file_path        TEXT,
  status           export_status NOT NULL DEFAULT 'success',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3.13 auth sessions ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS auth_sessions (
  session_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  refresh_token_hash TEXT UNIQUE,
  user_agent         TEXT,
  ip_addr            INET,
  expires_at         TIMESTAMPTZ NOT NULL,
  revoked            BOOLEAN NOT NULL DEFAULT false,
  revoked_at         TIMESTAMPTZ,
  last_used_at       TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3.14 budget alert logs ------------------------------------------------------
CREATE TABLE IF NOT EXISTS budget_alert_logs (
  budget_alert_log_id BIGSERIAL PRIMARY KEY,
  user_id             UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  budget_id           BIGINT NOT NULL REFERENCES budgets(budget_id) ON DELETE CASCADE,
  threshold           SMALLINT NOT NULL CHECK (threshold IN (70,80,90,100,101)),
  sent_on             DATE NOT NULL,
  channel             reminder_channel NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, budget_id, threshold, sent_on, channel)
);

-- 3.15 chatbot personal sessions --------------------------------------------
CREATE TABLE IF NOT EXISTS chat_sessions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  title      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  sender     chat_sender NOT NULL,
  content    TEXT NOT NULL CHECK (length(btrim(content)) > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- 4) FAMILY / GROUP FINANCE TABLES
-- =============================================================================

-- 4.1 family_groups -----------------------------------------------------------
-- Represents a family, room, trip group, or small shared finance group.
CREATE TABLE IF NOT EXISTS family_groups (
  group_id    BIGSERIAL PRIMARY KEY,
  owner_id    UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  group_name  TEXT NOT NULL CHECK (length(btrim(group_name)) > 0),
  description TEXT,
  avatar_url  TEXT,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4.2 group_members -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS group_members (
  group_member_id BIGSERIAL PRIMARY KEY,
  group_id        BIGINT NOT NULL REFERENCES family_groups(group_id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  nickname        TEXT,
  role            group_role NOT NULL DEFAULT 'member',
  joined_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(group_id, user_id)
);

-- 4.3 group invitations -------------------------------------------------------
CREATE TABLE IF NOT EXISTS group_invitations (
  invitation_id BIGSERIAL PRIMARY KEY,
  group_id      BIGINT NOT NULL REFERENCES family_groups(group_id) ON DELETE CASCADE,
  invited_email CITEXT NOT NULL,
  invited_user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
  invited_by    UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  status        group_invitation_status NOT NULL DEFAULT 'pending',
  token_hash    TEXT UNIQUE,
  expires_at    TIMESTAMPTZ,
  accepted_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4.4 group_categories --------------------------------------------------------
CREATE TABLE IF NOT EXISTS group_categories (
  group_category_id        BIGSERIAL PRIMARY KEY,
  group_id                 BIGINT NOT NULL REFERENCES family_groups(group_id) ON DELETE CASCADE,
  category_name            TEXT NOT NULL CHECK (length(btrim(category_name)) > 0),
  type                     money_type NOT NULL,
  icon                     TEXT,
  color                    TEXT CHECK (color IS NULL OR color ~* '^#[0-9A-F]{6}$'),
  parent_group_category_id BIGINT REFERENCES group_categories(group_category_id) ON DELETE RESTRICT,
  created_by               UUID REFERENCES users(user_id) ON DELETE SET NULL,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4.5 group_wallets -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS group_wallets (
  group_wallet_id BIGSERIAL PRIMARY KEY,
  group_id        BIGINT NOT NULL REFERENCES family_groups(group_id) ON DELETE CASCADE,
  wallet_name     TEXT NOT NULL CHECK (length(btrim(wallet_name)) > 0),
  description     TEXT,
  icon            TEXT,
  color           TEXT CHECK (color IS NULL OR color ~* '^#[0-9A-F]{6}$'),
  type            wallet_type NOT NULL DEFAULT 'standard',
  balance         NUMERIC(14,2) NOT NULL DEFAULT 0,
  is_archived     BOOLEAN NOT NULL DEFAULT false,
  created_by      UUID REFERENCES users(user_id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4.6 group_transactions ------------------------------------------------------
-- Shared income/expense transactions of the group wallet.
CREATE TABLE IF NOT EXISTS group_transactions (
  group_transaction_id BIGSERIAL PRIMARY KEY,
  group_id             BIGINT NOT NULL REFERENCES family_groups(group_id) ON DELETE CASCADE,
  group_wallet_id      BIGINT NOT NULL REFERENCES group_wallets(group_wallet_id) ON DELETE RESTRICT,
  group_category_id    BIGINT NOT NULL REFERENCES group_categories(group_category_id) ON DELETE RESTRICT,
  amount               NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  description          TEXT,
  tx_date              DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by           UUID REFERENCES users(user_id) ON DELETE SET NULL,
  deleted_at           TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4.7 group contribution plans ------------------------------------------------
-- Optional target/collection campaign, e.g. "Electricity May", "Family fund May".
CREATE TABLE IF NOT EXISTS group_contribution_plans (
  contribution_plan_id BIGSERIAL PRIMARY KEY,
  group_id             BIGINT NOT NULL REFERENCES family_groups(group_id) ON DELETE CASCADE,
  group_wallet_id      BIGINT NOT NULL REFERENCES group_wallets(group_wallet_id) ON DELETE RESTRICT,
  title                TEXT NOT NULL CHECK (length(btrim(title)) > 0),
  description          TEXT,
  target_amount        NUMERIC(14,2) CHECK (target_amount IS NULL OR target_amount > 0),
  due_date             DATE,
  status               contribution_plan_status NOT NULL DEFAULT 'open',
  created_by           UUID REFERENCES users(user_id) ON DELETE SET NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4.8 group contribution assignments -----------------------------------------
-- Expected contribution by each member for a plan.
CREATE TABLE IF NOT EXISTS group_contribution_assignments (
  assignment_id        BIGSERIAL PRIMARY KEY,
  contribution_plan_id BIGINT NOT NULL REFERENCES group_contribution_plans(contribution_plan_id) ON DELETE CASCADE,
  user_id              UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  expected_amount      NUMERIC(14,2) NOT NULL CHECK (expected_amount > 0),
  paid_amount          NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (paid_amount >= 0),
  status               contribution_assignment_status NOT NULL DEFAULT 'unpaid',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(contribution_plan_id, user_id)
);

-- 4.9 group contributions -----------------------------------------------------
-- Actual contribution history. This increases the selected group wallet balance.
CREATE TABLE IF NOT EXISTS group_contributions (
  contribution_id      BIGSERIAL PRIMARY KEY,
  group_id             BIGINT NOT NULL REFERENCES family_groups(group_id) ON DELETE CASCADE,
  group_wallet_id      BIGINT NOT NULL REFERENCES group_wallets(group_wallet_id) ON DELETE RESTRICT,
  contribution_plan_id BIGINT REFERENCES group_contribution_plans(contribution_plan_id) ON DELETE SET NULL,
  assignment_id        BIGINT REFERENCES group_contribution_assignments(assignment_id) ON DELETE SET NULL,
  user_id              UUID REFERENCES users(user_id) ON DELETE SET NULL, -- member who contributed
  recorded_by          UUID REFERENCES users(user_id) ON DELETE SET NULL, -- member who recorded the contribution
  amount               NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  note                 TEXT,
  contributed_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4.10 group budgets ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS group_budgets (
  group_budget_id  BIGSERIAL PRIMARY KEY,
  group_id         BIGINT NOT NULL REFERENCES family_groups(group_id) ON DELETE CASCADE,
  group_category_id BIGINT REFERENCES group_categories(group_category_id) ON DELETE RESTRICT,
  group_wallet_id BIGINT REFERENCES group_wallets(group_wallet_id) ON DELETE RESTRICT,
  month            DATE NOT NULL,
  limit_amount     NUMERIC(14,2) NOT NULL CHECK (limit_amount > 0),
  alert_threshold  SMALLINT NOT NULL DEFAULT 80 CHECK (alert_threshold IN (70,80,90,100)),
  notify_in_app    BOOLEAN NOT NULL DEFAULT true,
  notify_email     BOOLEAN NOT NULL DEFAULT false,
  created_by       UUID REFERENCES users(user_id) ON DELETE SET NULL,
  category_key     BIGINT GENERATED ALWAYS AS (COALESCE(group_category_id, 0)) STORED,
  wallet_key       BIGINT GENERATED ALWAYS AS (COALESCE(group_wallet_id, 0)) STORED,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(group_id, category_key, wallet_key, month)
);

-- 4.11 group budget alert logs ------------------------------------------------
CREATE TABLE IF NOT EXISTS group_budget_alert_logs (
  group_budget_alert_log_id BIGSERIAL PRIMARY KEY,
  group_id                  BIGINT NOT NULL REFERENCES family_groups(group_id) ON DELETE CASCADE,
  group_budget_id           BIGINT NOT NULL REFERENCES group_budgets(group_budget_id) ON DELETE CASCADE,
  threshold                 SMALLINT NOT NULL CHECK (threshold IN (70,80,90,100,101)),
  sent_on                   DATE NOT NULL,
  channel                   reminder_channel NOT NULL,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(group_id, group_budget_id, threshold, sent_on, channel)
);

-- 4.12 group reminders --------------------------------------------------------
CREATE TABLE IF NOT EXISTS group_reminders (
  group_reminder_id BIGSERIAL PRIMARY KEY,
  group_id          BIGINT NOT NULL REFERENCES family_groups(group_id) ON DELETE CASCADE,
  title             TEXT NOT NULL CHECK (length(btrim(title)) > 0),
  message           TEXT,
  remind_at         TIMESTAMPTZ NOT NULL,
  channel           reminder_channel NOT NULL DEFAULT 'in_app',
  is_active         BOOLEAN NOT NULL DEFAULT true,
  is_recurring      BOOLEAN NOT NULL DEFAULT false,
  frequency         TEXT CHECK (frequency IS NULL OR frequency IN ('daily', 'weekly', 'monthly')),
  interval          SMALLINT CHECK (interval IS NULL OR interval >= 1),
  by_weekday        SMALLINT[],
  by_monthday       SMALLINT CHECK (by_monthday IS NULL OR by_monthday BETWEEN 1 AND 31),
  until_date        DATE,
  timezone          TEXT DEFAULT 'Asia/Ho_Chi_Minh',
  created_by        UUID REFERENCES users(user_id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT ck_group_reminders_by_weekday CHECK (
    by_weekday IS NULL
    OR (
      by_weekday <@ ARRAY[0,1,2,3,4,5,6]::SMALLINT[]
      AND array_length(by_weekday, 1) BETWEEN 1 AND 7
    )
  )
);

-- 4.13 group reminder logs ----------------------------------------------------
CREATE TABLE IF NOT EXISTS group_reminder_logs (
  group_reminder_log_id BIGSERIAL PRIMARY KEY,
  group_reminder_id     BIGINT NOT NULL REFERENCES group_reminders(group_reminder_id) ON DELETE CASCADE,
  group_id              BIGINT NOT NULL REFERENCES family_groups(group_id) ON DELETE CASCADE,
  user_id               UUID REFERENCES users(user_id) ON DELETE SET NULL,
  channel               reminder_channel NOT NULL,
  sent_on               DATE NOT NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(group_reminder_id, user_id, channel, sent_on)
);

-- 4.14 group messages ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS group_messages (
  group_message_id BIGSERIAL PRIMARY KEY,
  group_id         BIGINT NOT NULL REFERENCES family_groups(group_id) ON DELETE CASCADE,
  sender_id        UUID REFERENCES users(user_id) ON DELETE SET NULL,
  message_type     group_message_type NOT NULL DEFAULT 'text',
  content          TEXT NOT NULL CHECK (length(btrim(content)) > 0),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- 5) INDEXES
-- =============================================================================

-- 5.1 personal indexes --------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS ux_categories_owner_parent_name_type
ON categories (
  COALESCE(user_id, '00000000-0000-0000-0000-000000000000'::UUID),
  COALESCE(parent_category_id, 0),
  lower(category_name),
  type
);

CREATE INDEX IF NOT EXISTS ix_categories_user ON categories(user_id);
CREATE INDEX IF NOT EXISTS ix_categories_parent ON categories(parent_category_id);
CREATE INDEX IF NOT EXISTS ix_categories_name_trgm ON categories USING GIN (category_name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS ix_wallets_user ON wallets(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS ux_wallets_user_name_ci ON wallets(user_id, lower(wallet_name));
CREATE INDEX IF NOT EXISTS ix_wallets_name_trgm ON wallets USING GIN (wallet_name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS ix_tx_user_date_active ON transactions(user_id, tx_date DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS ix_tx_wallet_date_active ON transactions(wallet_id, tx_date DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS ix_tx_user_cat_date ON transactions(user_id, category_id, tx_date DESC);
CREATE INDEX IF NOT EXISTS ix_tx_user_deleted ON transactions(user_id, deleted_at);
CREATE INDEX IF NOT EXISTS ix_tx_desc_trgm ON transactions USING GIN (description gin_trgm_ops);

CREATE INDEX IF NOT EXISTS ix_reminders_due ON reminders(user_id, is_active, remind_at);
CREATE INDEX IF NOT EXISTS ix_reminder_logs_user_date ON reminder_logs(user_id, sent_on DESC);

CREATE INDEX IF NOT EXISTS ix_budgets_user_month ON budgets(user_id, month);
CREATE INDEX IF NOT EXISTS ix_notifications_user ON notifications(user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS ix_email_logs_user ON email_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ix_report_exports_user ON report_exports(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ix_auth_sessions_user ON auth_sessions(user_id, revoked, expires_at DESC);
CREATE INDEX IF NOT EXISTS ix_budget_alert_logs_user_date ON budget_alert_logs(user_id, sent_on DESC);
CREATE INDEX IF NOT EXISTS ix_budget_alert_logs_budget_date ON budget_alert_logs(budget_id, sent_on DESC);
CREATE INDEX IF NOT EXISTS ix_chat_sessions_user ON chat_sessions(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS ix_chat_messages_session ON chat_messages(session_id, created_at ASC);

-- 5.2 group indexes -----------------------------------------------------------
CREATE INDEX IF NOT EXISTS ix_family_groups_owner ON family_groups(owner_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS ux_family_groups_owner_name_ci ON family_groups(owner_id, lower(group_name));
CREATE INDEX IF NOT EXISTS ix_group_members_user ON group_members(user_id, joined_at DESC);
CREATE INDEX IF NOT EXISTS ix_group_members_group ON group_members(group_id, role);
CREATE UNIQUE INDEX IF NOT EXISTS ux_group_members_one_owner ON group_members(group_id) WHERE role = 'owner';

CREATE INDEX IF NOT EXISTS ix_group_invitations_group ON group_invitations(group_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS ix_group_invitations_email ON group_invitations(invited_email, status, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS ux_group_invitations_one_pending_email
ON group_invitations(group_id, invited_email)
WHERE status = 'pending';
CREATE UNIQUE INDEX IF NOT EXISTS ux_group_invitations_one_pending_user
ON group_invitations(group_id, invited_user_id)
WHERE status = 'pending' AND invited_user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_group_categories_parent_name_type
ON group_categories (
  group_id,
  COALESCE(parent_group_category_id, 0),
  lower(category_name),
  type
);
CREATE INDEX IF NOT EXISTS ix_group_categories_group ON group_categories(group_id, type);
CREATE INDEX IF NOT EXISTS ix_group_categories_parent ON group_categories(parent_group_category_id);

CREATE INDEX IF NOT EXISTS ix_group_wallets_group ON group_wallets(group_id, is_archived);
CREATE UNIQUE INDEX IF NOT EXISTS ux_group_wallets_group_name_ci ON group_wallets(group_id, lower(wallet_name));
CREATE INDEX IF NOT EXISTS ix_group_wallets_name_trgm ON group_wallets USING GIN (wallet_name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS ix_group_tx_group_date_active ON group_transactions(group_id, tx_date DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS ix_group_tx_wallet_date_active ON group_transactions(group_wallet_id, tx_date DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS ix_group_tx_category_date ON group_transactions(group_category_id, tx_date DESC);
CREATE INDEX IF NOT EXISTS ix_group_tx_desc_trgm ON group_transactions USING GIN (description gin_trgm_ops);

CREATE INDEX IF NOT EXISTS ix_group_contribution_plans_group ON group_contribution_plans(group_id, status, due_date);
CREATE INDEX IF NOT EXISTS ix_group_assignments_plan ON group_contribution_assignments(contribution_plan_id, status);
CREATE INDEX IF NOT EXISTS ix_group_assignments_user ON group_contribution_assignments(user_id, status);
CREATE INDEX IF NOT EXISTS ix_group_contributions_group_date ON group_contributions(group_id, contributed_at DESC);
CREATE INDEX IF NOT EXISTS ix_group_contributions_user_date ON group_contributions(user_id, contributed_at DESC);
CREATE INDEX IF NOT EXISTS ix_group_contributions_recorded_by_date ON group_contributions(recorded_by, contributed_at DESC);
CREATE INDEX IF NOT EXISTS ix_group_contributions_wallet_date ON group_contributions(group_wallet_id, contributed_at DESC);

CREATE INDEX IF NOT EXISTS ix_group_budgets_group_month ON group_budgets(group_id, month);
CREATE INDEX IF NOT EXISTS ix_group_budget_alert_logs_group_date ON group_budget_alert_logs(group_id, sent_on DESC);
CREATE INDEX IF NOT EXISTS ix_group_reminders_due ON group_reminders(group_id, is_active, remind_at);
CREATE INDEX IF NOT EXISTS ix_group_reminder_logs_group_date ON group_reminder_logs(group_id, sent_on DESC);
CREATE INDEX IF NOT EXISTS ix_group_messages_group_created ON group_messages(group_id, created_at DESC);

-- =============================================================================
-- 6) VALIDATION FUNCTIONS - PERSONAL FINANCE
-- =============================================================================

CREATE OR REPLACE FUNCTION validate_category_parent()
RETURNS TRIGGER AS $$
DECLARE
  p RECORD;
BEGIN
  IF NEW.parent_category_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.parent_category_id = NEW.category_id THEN
    RAISE EXCEPTION 'A category cannot be its own parent';
  END IF;

  SELECT user_id, type INTO p
  FROM categories
  WHERE category_id = NEW.parent_category_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Parent category % not found', NEW.parent_category_id;
  END IF;

  IF p.type <> NEW.type THEN
    RAISE EXCEPTION 'Sub-category type (%) must match parent type (%)', NEW.type, p.type;
  END IF;

  IF (p.user_id IS DISTINCT FROM NEW.user_id) THEN
    RAISE EXCEPTION 'Sub-category must share the same ownership scope with parent';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION validate_tx_category_scope()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM 1
  FROM categories c
  WHERE c.category_id = NEW.category_id
    AND (c.user_id IS NULL OR c.user_id = NEW.user_id);

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Category % is not accessible for user %', NEW.category_id, NEW.user_id
      USING ERRCODE = '23514';
  END IF;

  PERFORM 1
  FROM wallets w
  WHERE w.wallet_id = NEW.wallet_id
    AND w.user_id = NEW.user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Wallet % is not owned by user %', NEW.wallet_id, NEW.user_id
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION normalize_budget_month()
RETURNS TRIGGER AS $$
BEGIN
  NEW.month := date_trunc('month', NEW.month)::DATE;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION validate_budget_category_expense()
RETURNS TRIGGER AS $$
DECLARE
  v_type money_type;
BEGIN
  IF NEW.category_id IS NOT NULL THEN
    SELECT type INTO v_type
    FROM categories
    WHERE category_id = NEW.category_id;

    IF v_type <> 'expense' THEN
      RAISE EXCEPTION 'Budget can only be set for expense categories';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION validate_budget_scope()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.category_id IS NOT NULL THEN
    PERFORM 1
    FROM categories c
    WHERE c.category_id = NEW.category_id
      AND (c.user_id IS NULL OR c.user_id = NEW.user_id);

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Category % is not accessible for user %', NEW.category_id, NEW.user_id;
    END IF;
  END IF;

  IF NEW.wallet_id IS NOT NULL THEN
    PERFORM 1
    FROM wallets w
    WHERE w.wallet_id = NEW.wallet_id
      AND w.user_id = NEW.user_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Wallet % is not owned by user %', NEW.wallet_id, NEW.user_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION prevent_category_type_change_if_used()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.type <> NEW.type AND EXISTS (
    SELECT 1 FROM transactions t WHERE t.category_id = OLD.category_id
  ) THEN
    RAISE EXCEPTION 'Cannot change category type because it is already used by transactions';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION tx_effect(p_category_id BIGINT, p_amount NUMERIC)
RETURNS NUMERIC AS $$
DECLARE
  v_type money_type;
BEGIN
  SELECT type INTO v_type
  FROM categories
  WHERE category_id = p_category_id;

  IF v_type = 'income' THEN
    RETURN COALESCE(p_amount, 0);
  END IF;

  RETURN -COALESCE(p_amount, 0);
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION apply_wallet_delta(p_wallet_id BIGINT, p_delta NUMERIC)
RETURNS VOID AS $$
BEGIN
  IF p_wallet_id IS NOT NULL AND p_delta IS NOT NULL AND p_delta <> 0 THEN
    UPDATE wallets
    SET balance = balance + p_delta,
        updated_at = now()
    WHERE wallet_id = p_wallet_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION trgfn_tx_wallet_balance()
RETURNS TRIGGER AS $$
DECLARE
  v_old_effect NUMERIC := 0;
  v_new_effect NUMERIC := 0;
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    IF OLD.deleted_at IS NULL THEN
      v_old_effect := tx_effect(OLD.category_id, OLD.amount);
      PERFORM apply_wallet_delta(OLD.wallet_id, -v_old_effect);
    END IF;
  END IF;

  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    IF NEW.deleted_at IS NULL THEN
      v_new_effect := tx_effect(NEW.category_id, NEW.amount);
      PERFORM apply_wallet_delta(NEW.wallet_id, v_new_effect);
    END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 7) VALIDATION FUNCTIONS - GROUP FINANCE
-- =============================================================================

CREATE OR REPLACE FUNCTION is_group_member(p_group_id BIGINT, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  IF p_user_id IS NULL THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM group_members gm
    WHERE gm.group_id = p_group_id
      AND gm.user_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION validate_group_member_role()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role = 'owner' THEN
    UPDATE family_groups
    SET owner_id = NEW.user_id,
        updated_at = now()
    WHERE group_id = NEW.group_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION validate_group_invitation()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT is_group_member(NEW.group_id, NEW.invited_by) THEN
    RAISE EXCEPTION 'Inviter % must be a member of group %', NEW.invited_by, NEW.group_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION validate_group_category_parent()
RETURNS TRIGGER AS $$
DECLARE
  p RECORD;
BEGIN
  IF NEW.created_by IS NOT NULL AND NOT is_group_member(NEW.group_id, NEW.created_by) THEN
    RAISE EXCEPTION 'User % is not a member of group %', NEW.created_by, NEW.group_id;
  END IF;

  IF NEW.parent_group_category_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.parent_group_category_id = NEW.group_category_id THEN
    RAISE EXCEPTION 'A group category cannot be its own parent';
  END IF;

  SELECT group_id, type INTO p
  FROM group_categories
  WHERE group_category_id = NEW.parent_group_category_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Parent group category % not found', NEW.parent_group_category_id;
  END IF;

  IF p.group_id <> NEW.group_id THEN
    RAISE EXCEPTION 'Sub-category must belong to the same group as parent';
  END IF;

  IF p.type <> NEW.type THEN
    RAISE EXCEPTION 'Sub-category type (%) must match parent type (%)', NEW.type, p.type;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION validate_group_wallet_member()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.created_by IS NOT NULL AND NOT is_group_member(NEW.group_id, NEW.created_by) THEN
    RAISE EXCEPTION 'User % is not a member of group %', NEW.created_by, NEW.group_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION validate_group_tx_scope()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM 1
  FROM group_wallets gw
  WHERE gw.group_wallet_id = NEW.group_wallet_id
    AND gw.group_id = NEW.group_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Group wallet % does not belong to group %', NEW.group_wallet_id, NEW.group_id;
  END IF;

  PERFORM 1
  FROM group_categories gc
  WHERE gc.group_category_id = NEW.group_category_id
    AND gc.group_id = NEW.group_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Group category % does not belong to group %', NEW.group_category_id, NEW.group_id;
  END IF;

  IF NEW.created_by IS NOT NULL AND NOT is_group_member(NEW.group_id, NEW.created_by) THEN
    RAISE EXCEPTION 'User % is not a member of group %', NEW.created_by, NEW.group_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION prevent_group_category_type_change_if_used()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.type <> NEW.type AND EXISTS (
    SELECT 1 FROM group_transactions gt WHERE gt.group_category_id = OLD.group_category_id
  ) THEN
    RAISE EXCEPTION 'Cannot change group category type because it is already used by group transactions';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION group_tx_effect(p_group_category_id BIGINT, p_amount NUMERIC)
RETURNS NUMERIC AS $$
DECLARE
  v_type money_type;
BEGIN
  SELECT type INTO v_type
  FROM group_categories
  WHERE group_category_id = p_group_category_id;

  IF v_type = 'income' THEN
    RETURN COALESCE(p_amount, 0);
  END IF;

  RETURN -COALESCE(p_amount, 0);
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION apply_group_wallet_delta(p_group_wallet_id BIGINT, p_delta NUMERIC)
RETURNS VOID AS $$
BEGIN
  IF p_group_wallet_id IS NOT NULL AND p_delta IS NOT NULL AND p_delta <> 0 THEN
    UPDATE group_wallets
    SET balance = balance + p_delta,
        updated_at = now()
    WHERE group_wallet_id = p_group_wallet_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION trgfn_group_tx_wallet_balance()
RETURNS TRIGGER AS $$
DECLARE
  v_old_effect NUMERIC := 0;
  v_new_effect NUMERIC := 0;
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    IF OLD.deleted_at IS NULL THEN
      v_old_effect := group_tx_effect(OLD.group_category_id, OLD.amount);
      PERFORM apply_group_wallet_delta(OLD.group_wallet_id, -v_old_effect);
    END IF;
  END IF;

  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    IF NEW.deleted_at IS NULL THEN
      v_new_effect := group_tx_effect(NEW.group_category_id, NEW.amount);
      PERFORM apply_group_wallet_delta(NEW.group_wallet_id, v_new_effect);
    END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION validate_group_contribution_scope()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM 1
  FROM group_wallets gw
  WHERE gw.group_wallet_id = NEW.group_wallet_id
    AND gw.group_id = NEW.group_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Group wallet % does not belong to group %', NEW.group_wallet_id, NEW.group_id;
  END IF;

  IF NEW.user_id IS NOT NULL AND NOT is_group_member(NEW.group_id, NEW.user_id) THEN
    RAISE EXCEPTION 'Contributor % is not a member of group %', NEW.user_id, NEW.group_id;
  END IF;

  IF NEW.recorded_by IS NOT NULL AND NOT is_group_member(NEW.group_id, NEW.recorded_by) THEN
    RAISE EXCEPTION 'Recorder % is not a member of group %', NEW.recorded_by, NEW.group_id;
  END IF;

  IF NEW.contribution_plan_id IS NOT NULL THEN
    PERFORM 1
    FROM group_contribution_plans gcp
    WHERE gcp.contribution_plan_id = NEW.contribution_plan_id
      AND gcp.group_id = NEW.group_id
      AND gcp.group_wallet_id = NEW.group_wallet_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Contribution plan % does not match group/wallet scope', NEW.contribution_plan_id;
    END IF;
  END IF;

  IF NEW.assignment_id IS NOT NULL THEN
    PERFORM 1
    FROM group_contribution_assignments gca
    JOIN group_contribution_plans gcp
      ON gcp.contribution_plan_id = gca.contribution_plan_id
    WHERE gca.assignment_id = NEW.assignment_id
      AND gcp.group_id = NEW.group_id
      AND gcp.group_wallet_id = NEW.group_wallet_id
      AND (NEW.user_id IS NULL OR gca.user_id = NEW.user_id)
      AND (
        NEW.contribution_plan_id IS NULL
        OR gca.contribution_plan_id = NEW.contribution_plan_id
      );

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Contribution assignment % does not match contribution scope', NEW.assignment_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION trgfn_group_contribution_wallet_balance()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM apply_group_wallet_delta(NEW.group_wallet_id, NEW.amount);
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    PERFORM apply_group_wallet_delta(OLD.group_wallet_id, -OLD.amount);
    PERFORM apply_group_wallet_delta(NEW.group_wallet_id, NEW.amount);
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    PERFORM apply_group_wallet_delta(OLD.group_wallet_id, -OLD.amount);
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION recompute_contribution_assignment(p_assignment_id BIGINT)
RETURNS VOID AS $$
DECLARE
  v_expected NUMERIC(14,2);
  v_paid     NUMERIC(14,2);
  v_status   contribution_assignment_status;
BEGIN
  IF p_assignment_id IS NULL THEN
    RETURN;
  END IF;

  SELECT expected_amount INTO v_expected
  FROM group_contribution_assignments
  WHERE assignment_id = p_assignment_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  SELECT COALESCE(SUM(amount), 0) INTO v_paid
  FROM group_contributions
  WHERE assignment_id = p_assignment_id;

  IF v_paid >= v_expected THEN
    v_status := 'paid';
  ELSIF v_paid > 0 THEN
    v_status := 'partial';
  ELSE
    v_status := 'unpaid';
  END IF;

  UPDATE group_contribution_assignments
  SET paid_amount = v_paid,
      status = v_status,
      updated_at = now()
  WHERE assignment_id = p_assignment_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION trgfn_recompute_assignment_after_contribution()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    PERFORM recompute_contribution_assignment(OLD.assignment_id);
  END IF;

  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    PERFORM recompute_contribution_assignment(NEW.assignment_id);
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION trgfn_recompute_assignment_after_assignment_update()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM recompute_contribution_assignment(NEW.assignment_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION validate_group_contribution_plan_scope()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM 1
  FROM group_wallets gw
  WHERE gw.group_wallet_id = NEW.group_wallet_id
    AND gw.group_id = NEW.group_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Group wallet % does not belong to group %', NEW.group_wallet_id, NEW.group_id;
  END IF;

  IF NEW.created_by IS NOT NULL AND NOT is_group_member(NEW.group_id, NEW.created_by) THEN
    RAISE EXCEPTION 'User % is not a member of group %', NEW.created_by, NEW.group_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION validate_group_assignment_member()
RETURNS TRIGGER AS $$
DECLARE
  v_group_id BIGINT;
BEGIN
  SELECT group_id INTO v_group_id
  FROM group_contribution_plans
  WHERE contribution_plan_id = NEW.contribution_plan_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Contribution plan % not found', NEW.contribution_plan_id;
  END IF;

  IF NOT is_group_member(v_group_id, NEW.user_id) THEN
    RAISE EXCEPTION 'Assigned user % is not a member of group %', NEW.user_id, v_group_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION normalize_group_budget_month()
RETURNS TRIGGER AS $$
BEGIN
  NEW.month := date_trunc('month', NEW.month)::DATE;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION validate_group_budget_scope()
RETURNS TRIGGER AS $$
DECLARE
  v_type money_type;
BEGIN
  IF NEW.created_by IS NOT NULL AND NOT is_group_member(NEW.group_id, NEW.created_by) THEN
    RAISE EXCEPTION 'User % is not a member of group %', NEW.created_by, NEW.group_id;
  END IF;

  IF NEW.group_wallet_id IS NOT NULL THEN
    PERFORM 1
    FROM group_wallets gw
    WHERE gw.group_wallet_id = NEW.group_wallet_id
      AND gw.group_id = NEW.group_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Group wallet % does not belong to group %', NEW.group_wallet_id, NEW.group_id;
    END IF;
  END IF;

  IF NEW.group_category_id IS NOT NULL THEN
    SELECT type INTO v_type
    FROM group_categories gc
    WHERE gc.group_category_id = NEW.group_category_id
      AND gc.group_id = NEW.group_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Group category % does not belong to group %', NEW.group_category_id, NEW.group_id;
    END IF;

    IF v_type <> 'expense' THEN
      RAISE EXCEPTION 'Group budget can only be set for expense categories';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION validate_group_reminder_member()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.created_by IS NOT NULL AND NOT is_group_member(NEW.group_id, NEW.created_by) THEN
    RAISE EXCEPTION 'User % is not a member of group %', NEW.created_by, NEW.group_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION validate_group_message_sender()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.sender_id IS NOT NULL AND NOT is_group_member(NEW.group_id, NEW.sender_id) THEN
    RAISE EXCEPTION 'Sender % is not a member of group %', NEW.sender_id, NEW.group_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 8) TRIGGERS
-- =============================================================================

-- 8.1 updated_at triggers -----------------------------------------------------
DROP TRIGGER IF EXISTS trg_users_updated ON users;
CREATE TRIGGER trg_users_updated BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_settings_updated ON settings;
CREATE TRIGGER trg_settings_updated BEFORE UPDATE ON settings FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_categories_updated ON categories;
CREATE TRIGGER trg_categories_updated BEFORE UPDATE ON categories FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_wallets_updated ON wallets;
CREATE TRIGGER trg_wallets_updated BEFORE UPDATE ON wallets FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_tx_updated ON transactions;
CREATE TRIGGER trg_tx_updated BEFORE UPDATE ON transactions FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_reminders_updated ON reminders;
CREATE TRIGGER trg_reminders_updated BEFORE UPDATE ON reminders FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_budgets_updated ON budgets;
CREATE TRIGGER trg_budgets_updated BEFORE UPDATE ON budgets FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_chat_sessions_updated ON chat_sessions;
CREATE TRIGGER trg_chat_sessions_updated BEFORE UPDATE ON chat_sessions FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_family_groups_updated ON family_groups;
CREATE TRIGGER trg_family_groups_updated BEFORE UPDATE ON family_groups FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_group_members_updated ON group_members;
CREATE TRIGGER trg_group_members_updated BEFORE UPDATE ON group_members FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_group_invitations_updated ON group_invitations;
CREATE TRIGGER trg_group_invitations_updated BEFORE UPDATE ON group_invitations FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_group_categories_updated ON group_categories;
CREATE TRIGGER trg_group_categories_updated BEFORE UPDATE ON group_categories FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_group_wallets_updated ON group_wallets;
CREATE TRIGGER trg_group_wallets_updated BEFORE UPDATE ON group_wallets FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_group_tx_updated ON group_transactions;
CREATE TRIGGER trg_group_tx_updated BEFORE UPDATE ON group_transactions FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_group_contribution_plans_updated ON group_contribution_plans;
CREATE TRIGGER trg_group_contribution_plans_updated BEFORE UPDATE ON group_contribution_plans FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_group_assignments_updated ON group_contribution_assignments;
CREATE TRIGGER trg_group_assignments_updated BEFORE UPDATE ON group_contribution_assignments FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_group_contributions_updated ON group_contributions;
CREATE TRIGGER trg_group_contributions_updated BEFORE UPDATE ON group_contributions FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_group_budgets_updated ON group_budgets;
CREATE TRIGGER trg_group_budgets_updated BEFORE UPDATE ON group_budgets FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_group_reminders_updated ON group_reminders;
CREATE TRIGGER trg_group_reminders_updated BEFORE UPDATE ON group_reminders FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 8.2 personal validation and balance triggers --------------------------------
DROP TRIGGER IF EXISTS trg_categories_validate_parent ON categories;
CREATE TRIGGER trg_categories_validate_parent
BEFORE INSERT OR UPDATE OF parent_category_id, user_id, type
ON categories
FOR EACH ROW EXECUTE FUNCTION validate_category_parent();

DROP TRIGGER IF EXISTS trg_prevent_category_type_change_if_used ON categories;
CREATE TRIGGER trg_prevent_category_type_change_if_used
BEFORE UPDATE OF type
ON categories
FOR EACH ROW EXECUTE FUNCTION prevent_category_type_change_if_used();

DROP TRIGGER IF EXISTS trg_tx_validate_scope ON transactions;
CREATE TRIGGER trg_tx_validate_scope
BEFORE INSERT OR UPDATE OF user_id, category_id, wallet_id
ON transactions
FOR EACH ROW EXECUTE FUNCTION validate_tx_category_scope();

DROP TRIGGER IF EXISTS trg_budgets_normalize_month ON budgets;
CREATE TRIGGER trg_budgets_normalize_month
BEFORE INSERT OR UPDATE OF month
ON budgets
FOR EACH ROW EXECUTE FUNCTION normalize_budget_month();

DROP TRIGGER IF EXISTS trg_budget_only_expense ON budgets;
CREATE TRIGGER trg_budget_only_expense
BEFORE INSERT OR UPDATE OF category_id
ON budgets
FOR EACH ROW EXECUTE FUNCTION validate_budget_category_expense();

DROP TRIGGER IF EXISTS trg_budget_scope ON budgets;
CREATE TRIGGER trg_budget_scope
BEFORE INSERT OR UPDATE OF category_id, wallet_id, user_id
ON budgets
FOR EACH ROW EXECUTE FUNCTION validate_budget_scope();

DROP TRIGGER IF EXISTS trg_tx_wallet_balance ON transactions;
CREATE TRIGGER trg_tx_wallet_balance
AFTER INSERT OR UPDATE OF amount, category_id, wallet_id, deleted_at OR DELETE
ON transactions
FOR EACH ROW EXECUTE FUNCTION trgfn_tx_wallet_balance();

-- 8.3 group validation and balance triggers -----------------------------------
DROP TRIGGER IF EXISTS trg_group_member_role ON group_members;
CREATE TRIGGER trg_group_member_role
AFTER INSERT OR UPDATE OF role, user_id
ON group_members
FOR EACH ROW EXECUTE FUNCTION validate_group_member_role();

DROP TRIGGER IF EXISTS trg_group_invitation_validate ON group_invitations;
CREATE TRIGGER trg_group_invitation_validate
BEFORE INSERT OR UPDATE OF group_id, invited_by
ON group_invitations
FOR EACH ROW EXECUTE FUNCTION validate_group_invitation();

DROP TRIGGER IF EXISTS trg_group_categories_validate_parent ON group_categories;
CREATE TRIGGER trg_group_categories_validate_parent
BEFORE INSERT OR UPDATE OF group_id, parent_group_category_id, type, created_by
ON group_categories
FOR EACH ROW EXECUTE FUNCTION validate_group_category_parent();

DROP TRIGGER IF EXISTS trg_prevent_group_category_type_change_if_used ON group_categories;
CREATE TRIGGER trg_prevent_group_category_type_change_if_used
BEFORE UPDATE OF type
ON group_categories
FOR EACH ROW EXECUTE FUNCTION prevent_group_category_type_change_if_used();

DROP TRIGGER IF EXISTS trg_group_wallet_validate_member ON group_wallets;
CREATE TRIGGER trg_group_wallet_validate_member
BEFORE INSERT OR UPDATE OF group_id, created_by
ON group_wallets
FOR EACH ROW EXECUTE FUNCTION validate_group_wallet_member();

DROP TRIGGER IF EXISTS trg_group_tx_validate_scope ON group_transactions;
CREATE TRIGGER trg_group_tx_validate_scope
BEFORE INSERT OR UPDATE OF group_id, group_wallet_id, group_category_id, created_by
ON group_transactions
FOR EACH ROW EXECUTE FUNCTION validate_group_tx_scope();

DROP TRIGGER IF EXISTS trg_group_tx_wallet_balance ON group_transactions;
CREATE TRIGGER trg_group_tx_wallet_balance
AFTER INSERT OR UPDATE OF amount, group_category_id, group_wallet_id, deleted_at OR DELETE
ON group_transactions
FOR EACH ROW EXECUTE FUNCTION trgfn_group_tx_wallet_balance();

DROP TRIGGER IF EXISTS trg_group_contribution_plan_scope ON group_contribution_plans;
CREATE TRIGGER trg_group_contribution_plan_scope
BEFORE INSERT OR UPDATE OF group_id, group_wallet_id, created_by
ON group_contribution_plans
FOR EACH ROW EXECUTE FUNCTION validate_group_contribution_plan_scope();

DROP TRIGGER IF EXISTS trg_group_assignment_member ON group_contribution_assignments;
CREATE TRIGGER trg_group_assignment_member
BEFORE INSERT OR UPDATE OF contribution_plan_id, user_id
ON group_contribution_assignments
FOR EACH ROW EXECUTE FUNCTION validate_group_assignment_member();

DROP TRIGGER IF EXISTS trg_group_contribution_scope ON group_contributions;
CREATE TRIGGER trg_group_contribution_scope
BEFORE INSERT OR UPDATE OF group_id, group_wallet_id, contribution_plan_id, assignment_id, user_id, recorded_by
ON group_contributions
FOR EACH ROW EXECUTE FUNCTION validate_group_contribution_scope();

DROP TRIGGER IF EXISTS trg_group_contribution_wallet_balance ON group_contributions;
CREATE TRIGGER trg_group_contribution_wallet_balance
AFTER INSERT OR UPDATE OF amount, group_wallet_id OR DELETE
ON group_contributions
FOR EACH ROW EXECUTE FUNCTION trgfn_group_contribution_wallet_balance();

DROP TRIGGER IF EXISTS trg_group_contribution_assignment_recompute ON group_contributions;
CREATE TRIGGER trg_group_contribution_assignment_recompute
AFTER INSERT OR UPDATE OF amount, assignment_id OR DELETE
ON group_contributions
FOR EACH ROW EXECUTE FUNCTION trgfn_recompute_assignment_after_contribution();

DROP TRIGGER IF EXISTS trg_assignment_recompute_after_expected_update ON group_contribution_assignments;
CREATE TRIGGER trg_assignment_recompute_after_expected_update
AFTER UPDATE OF expected_amount
ON group_contribution_assignments
FOR EACH ROW EXECUTE FUNCTION trgfn_recompute_assignment_after_assignment_update();

DROP TRIGGER IF EXISTS trg_group_budgets_normalize_month ON group_budgets;
CREATE TRIGGER trg_group_budgets_normalize_month
BEFORE INSERT OR UPDATE OF month
ON group_budgets
FOR EACH ROW EXECUTE FUNCTION normalize_group_budget_month();

DROP TRIGGER IF EXISTS trg_group_budget_scope ON group_budgets;
CREATE TRIGGER trg_group_budget_scope
BEFORE INSERT OR UPDATE OF group_id, group_category_id, group_wallet_id, created_by
ON group_budgets
FOR EACH ROW EXECUTE FUNCTION validate_group_budget_scope();

DROP TRIGGER IF EXISTS trg_group_reminder_member ON group_reminders;
CREATE TRIGGER trg_group_reminder_member
BEFORE INSERT OR UPDATE OF group_id, created_by
ON group_reminders
FOR EACH ROW EXECUTE FUNCTION validate_group_reminder_member();

DROP TRIGGER IF EXISTS trg_group_message_sender ON group_messages;
CREATE TRIGGER trg_group_message_sender
BEFORE INSERT OR UPDATE OF group_id, sender_id
ON group_messages
FOR EACH ROW EXECUTE FUNCTION validate_group_message_sender();

-- =============================================================================
-- 9) DASHBOARD / REPORTING SUPPORT VIEWS
-- =============================================================================
-- These views do not store duplicated dashboard data. They aggregate from source
-- tables so the API can implement dashboard/report endpoints with simpler SQL.

CREATE OR REPLACE VIEW v_group_wallet_balances AS
SELECT
  gw.group_id,
  gw.group_wallet_id,
  gw.wallet_name,
  gw.type,
  gw.balance,
  gw.is_archived,
  gw.updated_at
FROM group_wallets gw;

CREATE OR REPLACE VIEW v_group_monthly_summary AS
SELECT
  fg.group_id,
  date_trunc('month', gt.tx_date)::DATE AS month,
  COALESCE(SUM(CASE WHEN gc.type = 'income' THEN gt.amount ELSE 0 END), 0) AS total_income,
  COALESCE(SUM(CASE WHEN gc.type = 'expense' THEN gt.amount ELSE 0 END), 0) AS total_expense,
  COALESCE(SUM(CASE WHEN gc.type = 'income' THEN gt.amount ELSE -gt.amount END), 0) AS net_amount,
  COUNT(gt.group_transaction_id) AS transaction_count
FROM family_groups fg
LEFT JOIN group_transactions gt
  ON gt.group_id = fg.group_id
 AND gt.deleted_at IS NULL
LEFT JOIN group_categories gc
  ON gc.group_category_id = gt.group_category_id
GROUP BY fg.group_id, date_trunc('month', gt.tx_date)::DATE;

CREATE OR REPLACE VIEW v_group_budget_usage AS
SELECT
  gb.group_budget_id,
  gb.group_id,
  gb.month,
  gb.group_category_id,
  gb.group_wallet_id,
  gb.limit_amount,
  gb.alert_threshold,
  COALESCE(SUM(CASE WHEN gc.type = 'expense' THEN gt.amount ELSE 0 END), 0) AS spent_amount,
  ROUND((COALESCE(SUM(CASE WHEN gc.type = 'expense' THEN gt.amount ELSE 0 END), 0) / gb.limit_amount) * 100, 2) AS usage_percent,
  CASE
    WHEN COALESCE(SUM(CASE WHEN gc.type = 'expense' THEN gt.amount ELSE 0 END), 0) > gb.limit_amount THEN 'exceeded'
    WHEN (COALESCE(SUM(CASE WHEN gc.type = 'expense' THEN gt.amount ELSE 0 END), 0) / gb.limit_amount) * 100 >= 90 THEN 'danger'
    WHEN (COALESCE(SUM(CASE WHEN gc.type = 'expense' THEN gt.amount ELSE 0 END), 0) / gb.limit_amount) * 100 >= gb.alert_threshold THEN 'warning'
    ELSE 'safe'
  END AS status
FROM group_budgets gb
LEFT JOIN group_transactions gt
  ON gt.group_id = gb.group_id
 AND gt.deleted_at IS NULL
 AND date_trunc('month', gt.tx_date)::DATE = gb.month
 AND (gb.group_category_id IS NULL OR gt.group_category_id = gb.group_category_id)
 AND (gb.group_wallet_id IS NULL OR gt.group_wallet_id = gb.group_wallet_id)
LEFT JOIN group_categories gc
  ON gc.group_category_id = gt.group_category_id
GROUP BY gb.group_budget_id;

CREATE OR REPLACE VIEW v_group_contribution_progress AS
SELECT
  gcp.contribution_plan_id,
  gcp.group_id,
  gcp.group_wallet_id,
  gcp.title,
  gcp.target_amount,
  gcp.due_date,
  gcp.status AS plan_status,
  COALESCE(SUM(gca.expected_amount), 0) AS total_expected_amount,
  COALESCE(SUM(gca.paid_amount), 0) AS total_paid_amount,
  GREATEST(COALESCE(SUM(gca.expected_amount), 0) - COALESCE(SUM(gca.paid_amount), 0), 0) AS remaining_amount,
  CASE
    WHEN COALESCE(SUM(gca.expected_amount), 0) = 0 THEN 0
    ELSE ROUND((COALESCE(SUM(gca.paid_amount), 0) / COALESCE(SUM(gca.expected_amount), 0)) * 100, 2)
  END AS progress_percent,
  COUNT(gca.assignment_id) AS member_count,
  COUNT(gca.assignment_id) FILTER (WHERE gca.status = 'paid') AS paid_member_count,
  COUNT(gca.assignment_id) FILTER (WHERE gca.status = 'partial') AS partial_member_count,
  COUNT(gca.assignment_id) FILTER (WHERE gca.status = 'unpaid') AS unpaid_member_count
FROM group_contribution_plans gcp
LEFT JOIN group_contribution_assignments gca
  ON gca.contribution_plan_id = gcp.contribution_plan_id
GROUP BY gcp.contribution_plan_id;

CREATE OR REPLACE VIEW v_personal_monthly_summary AS
SELECT
  u.user_id,
  date_trunc('month', t.tx_date)::DATE AS month,
  COALESCE(SUM(CASE WHEN c.type = 'income' THEN t.amount ELSE 0 END), 0) AS total_income,
  COALESCE(SUM(CASE WHEN c.type = 'expense' THEN t.amount ELSE 0 END), 0) AS total_expense,
  COALESCE(SUM(CASE WHEN c.type = 'income' THEN t.amount ELSE -t.amount END), 0) AS net_amount,
  COUNT(t.transaction_id) AS transaction_count
FROM users u
LEFT JOIN transactions t
  ON t.user_id = u.user_id
 AND t.deleted_at IS NULL
LEFT JOIN categories c
  ON c.category_id = t.category_id
GROUP BY u.user_id, date_trunc('month', t.tx_date)::DATE;

-- =============================================================================
-- 10) OPTIONAL SEED DATA - GLOBAL DEFAULT CATEGORIES
-- =============================================================================
-- These categories are global because user_id is NULL.
-- You may remove this section if your application creates default categories in code.

INSERT INTO categories (user_id, category_name, type, icon, color)
VALUES
  (NULL, 'Lương', 'income', 'briefcase', '#22C55E'),
  (NULL, 'Thưởng', 'income', 'gift', '#10B981'),
  (NULL, 'Thu nhập khác', 'income', 'wallet', '#14B8A6'),
  (NULL, 'Ăn uống', 'expense', 'utensils', '#F97316'),
  (NULL, 'Di chuyển', 'expense', 'car', '#3B82F6'),
  (NULL, 'Mua sắm', 'expense', 'shopping-bag', '#EC4899'),
  (NULL, 'Nhà ở', 'expense', 'home', '#8B5CF6'),
  (NULL, 'Hóa đơn', 'expense', 'receipt', '#EF4444'),
  (NULL, 'Giải trí', 'expense', 'ticket', '#F59E0B'),
  (NULL, 'Sức khỏe', 'expense', 'heart-pulse', '#06B6D4'),
  (NULL, 'Giáo dục', 'expense', 'book-open', '#6366F1'),
  (NULL, 'Chi phí khác', 'expense', 'circle-ellipsis', '#64748B')
ON CONFLICT DO NOTHING;

-- =============================================================================
-- 11) OPTIONAL MAINTENANCE QUERIES
-- =============================================================================
-- Rebuild personal wallet balances after importing/restoring old data:
-- UPDATE wallets w
-- SET balance = COALESCE((
--   SELECT SUM(CASE WHEN c.type = 'income' THEN t.amount ELSE -t.amount END)
--   FROM transactions t
--   JOIN categories c ON c.category_id = t.category_id
--   WHERE t.wallet_id = w.wallet_id
--     AND t.deleted_at IS NULL
-- ), 0),
-- updated_at = now();

-- Rebuild group wallet balances after importing/restoring old data:
-- UPDATE group_wallets gw
-- SET balance = COALESCE((
--   SELECT SUM(CASE WHEN gc.type = 'income' THEN gt.amount ELSE -gt.amount END)
--   FROM group_transactions gt
--   JOIN group_categories gc ON gc.group_category_id = gt.group_category_id
--   WHERE gt.group_wallet_id = gw.group_wallet_id
--     AND gt.deleted_at IS NULL
-- ), 0)
-- + COALESCE((
--   SELECT SUM(gco.amount)
--   FROM group_contributions gco
--   WHERE gco.group_wallet_id = gw.group_wallet_id
-- ), 0),
-- updated_at = now();

-- Notes for application service layer:
-- 1. When creating a family_group, insert the creator into group_members with role='owner'
--    in the same transaction.
-- 2. Do not allow the only owner to leave/delete themselves unless ownership is transferred.
-- 3. Dashboard endpoints should query the views above plus recent transaction/message rows.
-- =============================================================================
-- END OF FILE
-- =============================================================================
