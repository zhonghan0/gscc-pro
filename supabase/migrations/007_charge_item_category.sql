ALTER TABLE charge_items
  ADD COLUMN IF NOT EXISTS category text DEFAULT 'Others'
  CHECK (category IN ('Transportation','Clinic Bills','Medicines','Groceries','Services','Others'));
