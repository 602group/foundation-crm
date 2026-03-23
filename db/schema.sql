-- ============================================================
-- Epic Foundation CRM — Supabase Schema
-- Run this in: Supabase Dashboard → SQL Editor
-- Run once on EACH project (production + staging)
-- ============================================================

-- Enable pgcrypto for UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Helper: auto-updated updated_at ──────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ── USERS ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id              TEXT PRIMARY KEY,
  first_name      TEXT,
  last_name       TEXT,
  email           TEXT,
  phone           TEXT,
  city            TEXT,
  state           TEXT,
  company         TEXT,
  address         TEXT,
  status          TEXT DEFAULT 'Active',
  user_types      JSONB DEFAULT '[]',
  tags            JSONB DEFAULT '[]',
  notes           TEXT,
  activity_log    JSONB DEFAULT '[]',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  created_by      TEXT,
  updated_by      TEXT
);
CREATE TRIGGER users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── AUCTIONS ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS auctions (
  id                    TEXT PRIMARY KEY,
  title                 TEXT,
  short_name            TEXT,
  type                  TEXT,
  status                TEXT DEFAULT 'New',
  visibility            TEXT DEFAULT 'Public',
  category              TEXT,
  round_type            TEXT,
  players               INTEGER,
  donor_id              TEXT REFERENCES users(id) ON DELETE SET NULL,
  buyer_id              TEXT REFERENCES users(id) ON DELETE SET NULL,
  course_id             TEXT,
  reserve_price         NUMERIC,
  starting_bid          NUMERIC,
  final_price           NUMERIC,
  sell_price            NUMERIC,
  buy_now_price         NUMERIC,
  fmv                   NUMERIC,
  quantity              INTEGER DEFAULT 1,
  city                  TEXT,
  state                 TEXT,
  givesmart_url         TEXT,
  event_code            TEXT,
  item_token            TEXT,
  item_number           TEXT,
  completion_notes      TEXT,
  launch_date           DATE,
  end_date              DATE,
  confirmed_play_date   DATE,
  scheduling_status     TEXT,
  manual_status         BOOLEAN DEFAULT FALSE,
  notes                 TEXT,
  activity_log          JSONB DEFAULT '[]',
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW(),
  created_by            TEXT,
  updated_by            TEXT
);
CREATE TRIGGER auctions_updated_at BEFORE UPDATE ON auctions FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── OPPORTUNITIES ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS opportunities (
  id                  TEXT PRIMARY KEY,
  title               TEXT,
  short_name          TEXT,
  type                TEXT,
  status              TEXT DEFAULT 'New',
  donor_id            TEXT REFERENCES users(id) ON DELETE SET NULL,
  interested_user_id  TEXT REFERENCES users(id) ON DELETE SET NULL,
  value               NUMERIC,
  sell_price          NUMERIC,
  fmv                 NUMERIC,
  confirmed_play_date DATE,
  scheduling_status   TEXT,
  notes               TEXT,
  activity_log        JSONB DEFAULT '[]',
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  created_by          TEXT,
  updated_by          TEXT
);
CREATE TRIGGER opportunities_updated_at BEFORE UPDATE ON opportunities FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── COURSES ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS courses (
  id          TEXT PRIMARY KEY,
  name        TEXT,
  city        TEXT,
  state       TEXT,
  region      TEXT,
  type        TEXT,
  tier        TEXT,
  status      TEXT DEFAULT 'Active',
  website     TEXT,
  phone       TEXT,
  contact     TEXT,
  notes       TEXT,
  activity_log JSONB DEFAULT '[]',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  created_by  TEXT,
  updated_by  TEXT
);
CREATE TRIGGER courses_updated_at BEFORE UPDATE ON courses FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── DONATIONS ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS donations (
  id              TEXT PRIMARY KEY,
  description     TEXT,
  type            TEXT,
  status          TEXT DEFAULT 'New',
  donor_id        TEXT REFERENCES users(id) ON DELETE SET NULL,
  assigned_to     TEXT,
  assigned_to_id  TEXT,
  value           NUMERIC,
  estimated_value NUMERIC,
  notes           TEXT,
  activity_log    JSONB DEFAULT '[]',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  created_by      TEXT,
  updated_by      TEXT
);
CREATE TRIGGER donations_updated_at BEFORE UPDATE ON donations FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── TASKS ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tasks (
  id              TEXT PRIMARY KEY,
  title           TEXT,
  description     TEXT,
  status          TEXT DEFAULT 'Open',
  priority        TEXT DEFAULT 'Medium',
  task_type       TEXT,
  due_date        DATE,
  completed_date  DATE,
  assigned_to_id  TEXT,
  related_user_id TEXT,
  auction_id      TEXT,
  opportunity_id  TEXT,
  notes           TEXT,
  activity_log    JSONB DEFAULT '[]',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  created_by      TEXT,
  updated_by      TEXT
);
CREATE TRIGGER tasks_updated_at BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── FINANCIALS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS financials (
  id                TEXT PRIMARY KEY,
  record_type       TEXT,
  status            TEXT DEFAULT 'Estimated',
  revenue_status    TEXT,
  linked_record_id  TEXT,
  linked_record_type TEXT,
  estimated_revenue NUMERIC,
  actual_revenue    NUMERIC,
  notes             TEXT,
  activity_log      JSONB DEFAULT '[]',
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  created_by        TEXT,
  updated_by        TEXT
);
CREATE TRIGGER financials_updated_at BEFORE UPDATE ON financials FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── RECEIPTS ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS receipts (
  id              TEXT PRIMARY KEY,
  status          TEXT DEFAULT 'Pending',
  category        TEXT,
  subcategory     TEXT,
  amount          NUMERIC,
  payment_method  TEXT,
  department      TEXT,
  vendor          TEXT,
  receipt_date    DATE,
  submitted_by    TEXT,
  reimbursable    BOOLEAN DEFAULT FALSE,
  notes           TEXT,
  activity_log    JSONB DEFAULT '[]',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  created_by      TEXT,
  updated_by      TEXT
);
CREATE TRIGGER receipts_updated_at BEFORE UPDATE ON receipts FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── MESSAGES ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
  id              TEXT PRIMARY KEY,
  status          TEXT DEFAULT 'Open',
  from_name       TEXT,
  from_email      TEXT,
  from_phone      TEXT,
  subject         TEXT,
  body            TEXT,
  linked_user_id  TEXT REFERENCES users(id) ON DELETE SET NULL,
  replied_at      TIMESTAMPTZ,
  activity_log    JSONB DEFAULT '[]',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  created_by      TEXT,
  updated_by      TEXT
);
CREATE TRIGGER messages_updated_at BEFORE UPDATE ON messages FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── EVENTS ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS events (
  id                  TEXT PRIMARY KEY,
  name                TEXT,
  type                TEXT,
  status              TEXT DEFAULT 'Upcoming',
  date                DATE,
  start_date          DATE,
  end_date            DATE,
  location            TEXT,
  capacity            INTEGER,
  entry_fee           NUMERIC,
  sponsorship_revenue NUMERIC,
  discounts           NUMERIC,
  refunds             NUMERIC,
  course_id           TEXT,
  user_ids            JSONB DEFAULT '[]',
  attendees           JSONB DEFAULT '[]',
  spots_registered    INTEGER DEFAULT 0,
  notes               TEXT,
  activity_log        JSONB DEFAULT '[]',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  created_by  TEXT,
  updated_by  TEXT
);
CREATE TRIGGER events_updated_at BEFORE UPDATE ON events FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── ADMINS ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admins (
  id            TEXT PRIMARY KEY,
  name          TEXT,
  email         TEXT UNIQUE,
  role          TEXT DEFAULT 'Admin',
  status        TEXT DEFAULT 'Active',
  password_hash TEXT,
  permissions   JSONB,
  last_login    TIMESTAMPTZ,
  activity_log  JSONB DEFAULT '[]',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  created_by    TEXT,
  updated_by    TEXT
);
CREATE TRIGGER admins_updated_at BEFORE UPDATE ON admins FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── QUALIFIED BUYERS ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS qualified_buyers (
  id              TEXT PRIMARY KEY,
  user_id         TEXT REFERENCES users(id) ON DELETE CASCADE,
  status          TEXT DEFAULT 'Active',
  tier            TEXT,
  interest_level  TEXT,
  budget_tier     TEXT,
  travel          TEXT,
  notes           TEXT,
  activity_log    JSONB DEFAULT '[]',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  created_by      TEXT,
  updated_by      TEXT
);
CREATE TRIGGER qualified_buyers_updated_at BEFORE UPDATE ON qualified_buyers FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── WAITLISTS ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS waitlists (
  id          TEXT PRIMARY KEY,
  user_id     TEXT REFERENCES users(id) ON DELETE CASCADE,
  auction_id  TEXT,
  status      TEXT DEFAULT 'Active',
  notes       TEXT,
  activity_log JSONB DEFAULT '[]',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  created_by  TEXT,
  updated_by  TEXT
);
CREATE TRIGGER waitlists_updated_at BEFORE UPDATE ON waitlists FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── LOST DEMAND ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lost_demand (
  id          TEXT PRIMARY KEY,
  user_id     TEXT REFERENCES users(id) ON DELETE CASCADE,
  auction_id  TEXT,
  status      TEXT DEFAULT 'New',
  reason      TEXT,
  notes       TEXT,
  activity_log JSONB DEFAULT '[]',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  created_by  TEXT,
  updated_by  TEXT
);
CREATE TRIGGER lost_demand_updated_at BEFORE UPDATE ON lost_demand FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── SETTINGS ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value JSONB
);

-- ── ID COUNTERS ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS id_counters (
  table_name TEXT PRIMARY KEY,
  counter    INTEGER DEFAULT 0
);

-- Insert default counter rows
INSERT INTO id_counters (table_name, counter) VALUES
  ('users', 0), ('auctions', 0), ('opportunities', 0), ('courses', 0),
  ('donations', 0), ('tasks', 0), ('financials', 0), ('receipts', 0),
  ('messages', 0), ('events', 0), ('admins', 0), ('qualifiedBuyers', 0),
  ('waitlists', 0), ('lostDemand', 0)
ON CONFLICT DO NOTHING;

-- ── AUDIT LOG ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_log (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  action      TEXT,
  table_name  TEXT,
  record_id   TEXT,
  actor       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Row-Level Security (RLS) ──────────────────────────────────
-- Enable RLS on all tables. The server uses service_role key which bypasses RLS.
-- This ensures the browser (anon key) can NEVER directly read/write.
ALTER TABLE users            ENABLE ROW LEVEL SECURITY;
ALTER TABLE auctions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunities    ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses          ENABLE ROW LEVEL SECURITY;
ALTER TABLE donations        ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks            ENABLE ROW LEVEL SECURITY;
ALTER TABLE financials       ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipts         ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages         ENABLE ROW LEVEL SECURITY;
ALTER TABLE events           ENABLE ROW LEVEL SECURITY;
ALTER TABLE admins           ENABLE ROW LEVEL SECURITY;
ALTER TABLE qualified_buyers ENABLE ROW LEVEL SECURITY;
ALTER TABLE waitlists        ENABLE ROW LEVEL SECURITY;
ALTER TABLE lost_demand      ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings         ENABLE ROW LEVEL SECURITY;
ALTER TABLE id_counters      ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log        ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- MIGRATION SCRIPT: Run this directly in Supabase SQL Editor
-- to patch existing staging/production databases with the new fields
-- ============================================================
/*
ALTER TABLE auctions ADD COLUMN IF NOT EXISTS buy_now_price NUMERIC;
ALTER TABLE auctions ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 1;
ALTER TABLE auctions ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE auctions ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE auctions ADD COLUMN IF NOT EXISTS givesmart_url TEXT;
ALTER TABLE auctions ADD COLUMN IF NOT EXISTS event_code TEXT;
ALTER TABLE auctions ADD COLUMN IF NOT EXISTS item_token TEXT;
ALTER TABLE auctions ADD COLUMN IF NOT EXISTS item_number TEXT;
ALTER TABLE auctions ADD COLUMN IF NOT EXISTS completion_notes TEXT;

ALTER TABLE events ADD COLUMN IF NOT EXISTS date DATE;
ALTER TABLE events ADD COLUMN IF NOT EXISTS capacity INTEGER;
ALTER TABLE events ADD COLUMN IF NOT EXISTS entry_fee NUMERIC;
ALTER TABLE events ADD COLUMN IF NOT EXISTS sponsorship_revenue NUMERIC;
ALTER TABLE events ADD COLUMN IF NOT EXISTS discounts NUMERIC;
ALTER TABLE events ADD COLUMN IF NOT EXISTS refunds NUMERIC;
ALTER TABLE events ADD COLUMN IF NOT EXISTS course_id TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS attendees JSONB DEFAULT '[]';
ALTER TABLE events ADD COLUMN IF NOT EXISTS spots_registered INTEGER DEFAULT 0;
*/
