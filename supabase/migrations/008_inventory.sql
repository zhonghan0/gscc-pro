-- ── Inventory Module ─────────────────────────────────────────────────────────

-- Suppliers
create table if not exists inventory_suppliers (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  contact_person text,
  phone       text,
  notes       text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

-- Product catalog
create type inventory_category as enum ('diaper', 'underpad', 'wet_wipes', 'others');

create table if not exists inventory_items (
  id          uuid primary key default gen_random_uuid(),
  category    inventory_category not null,
  name        text not null,
  unit        text not null default 'pcs',  -- e.g. pcs, pack, carton
  notes       text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

-- Price list per supplier per item
create table if not exists inventory_prices (
  id              uuid primary key default gen_random_uuid(),
  item_id         uuid not null references inventory_items(id) on delete cascade,
  supplier_id     uuid not null references inventory_suppliers(id) on delete cascade,
  price           numeric(10,2) not null,
  effective_date  date not null default current_date,
  notes           text,
  created_at      timestamptz not null default now(),
  unique (item_id, supplier_id)
);

-- Order headers
create type inventory_order_status as enum ('pending', 'received', 'cancelled');

create table if not exists inventory_orders (
  id           uuid primary key default gen_random_uuid(),
  order_date   date not null default current_date,
  supplier_id  uuid not null references inventory_suppliers(id),
  status       inventory_order_status not null default 'pending',
  notes        text,
  created_by   uuid references auth.users(id),
  created_at   timestamptz not null default now()
);

-- Order line items
create table if not exists inventory_order_items (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid not null references inventory_orders(id) on delete cascade,
  item_id      uuid not null references inventory_items(id),
  quantity     int not null check (quantity > 0),
  unit_price   numeric(10,2) not null,
  created_at   timestamptz not null default now()
);

-- ── RLS ───────────────────────────────────────────────────────────────────────
alter table inventory_suppliers   enable row level security;
alter table inventory_items       enable row level security;
alter table inventory_prices      enable row level security;
alter table inventory_orders      enable row level security;
alter table inventory_order_items enable row level security;

-- Authenticated users can read everything
create policy "auth read suppliers"   on inventory_suppliers   for select to authenticated using (true);
create policy "auth read items"       on inventory_items       for select to authenticated using (true);
create policy "auth read prices"      on inventory_prices      for select to authenticated using (true);
create policy "auth read orders"      on inventory_orders      for select to authenticated using (true);
create policy "auth read order_items" on inventory_order_items for select to authenticated using (true);

-- Only elevated roles (owner/manager) can write
create policy "elevated write suppliers"   on inventory_suppliers   for all to authenticated using (current_user_role() in ('owner','manager'));
create policy "elevated write items"       on inventory_items       for all to authenticated using (current_user_role() in ('owner','manager'));
create policy "elevated write prices"      on inventory_prices      for all to authenticated using (current_user_role() in ('owner','manager'));
create policy "elevated write orders"      on inventory_orders      for all to authenticated using (current_user_role() in ('owner','manager'));
create policy "elevated write order_items" on inventory_order_items for all to authenticated using (current_user_role() in ('owner','manager'));
