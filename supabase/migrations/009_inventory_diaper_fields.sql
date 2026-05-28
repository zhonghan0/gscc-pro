-- Add diaper-specific fields to inventory_items
alter table inventory_items
  add column if not exists brand          text,
  add column if not exists diaper_type    text check (diaper_type in ('tape', 'pant')),
  add column if not exists size           text,
  add column if not exists bags_per_carton int,
  add column if not exists pcs_per_bag    int;
