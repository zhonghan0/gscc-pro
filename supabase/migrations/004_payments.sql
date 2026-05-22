-- ============================================================
-- GSCC Pro — Payments Module
-- Migration 004
-- ============================================================

-- bank_imports: track uploaded statement files
CREATE TABLE IF NOT EXISTS bank_imports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  file_name TEXT NOT NULL,
  statement_from DATE,
  statement_to DATE,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  uploaded_by UUID REFERENCES profiles(id)
);

-- payments: individual payment records
CREATE TABLE IF NOT EXISTS payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  resident_id UUID REFERENCES residents(id) ON DELETE SET NULL,
  payment_date DATE NOT NULL,
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  payment_method TEXT NOT NULL DEFAULT 'duitnow',
  payer_name TEXT,
  reference TEXT,
  description TEXT,
  notes TEXT,
  source TEXT NOT NULL DEFAULT 'manual', -- 'manual' | 'bank_import'
  bank_import_id UUID REFERENCES bank_imports(id) ON DELETE SET NULL,
  txn_key TEXT, -- dedup key: date|amount|payer_name for imports
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS payments_txn_key_unique ON payments(txn_key) WHERE txn_key IS NOT NULL;

-- payer_mappings: remember payer name → resident for auto-matching
CREATE TABLE IF NOT EXISTS payer_mappings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  payer_key TEXT NOT NULL UNIQUE, -- uppercased payer name
  resident_id UUID NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: all authenticated users can read; admin can write
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE payer_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth read payments" ON payments FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "auth insert payments" ON payments FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "admin update payments" ON payments FOR UPDATE USING (current_user_role() = 'admin');
CREATE POLICY "admin delete payments" ON payments FOR DELETE USING (current_user_role() = 'admin');

CREATE POLICY "auth read bank_imports" ON bank_imports FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "auth insert bank_imports" ON bank_imports FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "auth read payer_mappings" ON payer_mappings FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "auth upsert payer_mappings" ON payer_mappings FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "auth update payer_mappings" ON payer_mappings FOR UPDATE USING (auth.role() = 'authenticated');
