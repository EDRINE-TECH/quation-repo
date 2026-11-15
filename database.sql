-- ========================================================================
-- BQ (Bill Quotation) - Supabase Database Schema & Row-Level Security
-- Mobile-First Quotation Builder for Builders, Decorators, MCs & Trades
-- ========================================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ------------------------------------------------------------------------
-- 1. PROFILES TABLE
-- ------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  business_name text not null default 'My Trade Services',
  logo_url text,
  phone text default '+256700000000',
  currency text not null default 'UGX',
  tax_rate numeric(5,2) not null default 0.00,
  payment_details jsonb not null default '{
    "mobile_money": { "provider": "MTN Mobile Money", "number": "", "name": "" },
    "bank": { "bank_name": "", "account_number": "", "account_name": "" },
    "cash_terms": "Cash on site / milestone delivery accepted"
  }'::jsonb,
  plan text not null default 'free' check (plan in ('free', 'paid')),
  plan_expires_at timestamptz,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

-- ------------------------------------------------------------------------
-- 2. CLIENTS TABLE
-- ------------------------------------------------------------------------
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  phone text not null,
  email text,
  address text,
  notes text,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

-- Index for fast user queries & search
create index if not exists idx_clients_user_id on public.clients(user_id);
create index if not exists idx_clients_name on public.clients(name);

-- ------------------------------------------------------------------------
-- 3. SAVED ITEMS (Catalog / Price list)
-- ------------------------------------------------------------------------
create table if not exists public.saved_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  unit text not null default 'pcs',
  default_price numeric(12,2) not null default 0.00,
  default_cost numeric(12,2) default 0.00,
  category text not null default 'Materials',
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists idx_saved_items_user_id on public.saved_items(user_id);
create index if not exists idx_saved_items_category on public.saved_items(category);

-- ------------------------------------------------------------------------
-- 4. QUOTES TABLE
-- ------------------------------------------------------------------------
create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  client_id uuid references public.clients(id) on delete set null,
  quote_number text not null,
  quote_type text not null default 'materials_labour' check (quote_type in ('materials_labour', 'service_package', 'mixed')),
  status text not null default 'draft' check (status in ('draft', 'sent', 'accepted', 'declined', 'lost')),
  date date not null default current_date,
  valid_until date,
  job_title text not null default 'Quotation for Services / Works',
  job_location text,
  event_date date,
  event_time text,
  event_venue text,
  subtotal numeric(14,2) not null default 0.00,
  discount_type text default 'percentage' check (discount_type in ('percentage', 'fixed')),
  discount_value numeric(10,2) default 0.00,
  discount_amount numeric(14,2) default 0.00,
  tax_rate numeric(5,2) default 0.00,
  tax_amount numeric(14,2) default 0.00,
  total numeric(14,2) not null default 0.00,
  deposit_type text default 'percentage' check (deposit_type in ('percentage', 'fixed')),
  deposit_value numeric(10,2) default 0.00,
  deposit_amount numeric(14,2) default 0.00,
  client_view_mode text not null default 'full' check (client_view_mode in ('full', 'section_totals', 'one_total')),
  notes_terms text,
  payment_stages jsonb default '[]'::jsonb,
  card_image_url text,
  card_image_created_at timestamptz,
  is_paid_plan_rendering boolean default false,
  sent_at timestamptz,
  remind_at timestamptz,
  reminder_count int not null default 0,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists idx_quotes_user_id on public.quotes(user_id);
create index if not exists idx_quotes_client_id on public.quotes(client_id);
create index if not exists idx_quotes_status on public.quotes(status);
create index if not exists idx_quotes_remind_at on public.quotes(remind_at);

-- ------------------------------------------------------------------------
-- 5. QUOTE SECTIONS
-- ------------------------------------------------------------------------
create table if not exists public.quote_sections (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid references public.quotes(id) on delete cascade not null,
  name text not null,
  position int not null default 0,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists idx_quote_sections_quote_id on public.quote_sections(quote_id);

-- ------------------------------------------------------------------------
-- 6. QUOTE LINES
-- ------------------------------------------------------------------------
create table if not exists public.quote_lines (
  id uuid primary key default gen_random_uuid(),
  section_id uuid references public.quote_sections(id) on delete cascade not null,
  line_type text not null default 'item' check (line_type in ('item', 'hours', 'fixed')),
  description text not null,
  quantity numeric(10,2) not null default 1.00,
  unit text not null default 'pcs',
  unit_price numeric(12,2) not null default 0.00,
  total_price numeric(14,2) not null default 0.00,
  unit_cost numeric(12,2) default 0.00,
  total_cost numeric(14,2) default 0.00,
  position int not null default 0,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists idx_quote_lines_section_id on public.quote_lines(section_id);

-- ------------------------------------------------------------------------
-- 7. REMINDERS TABLE
-- ------------------------------------------------------------------------
create table if not exists public.reminders (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid references public.quotes(id) on delete cascade not null,
  user_id uuid references auth.users on delete cascade not null,
  remind_at timestamptz not null,
  status text not null default 'pending' check (status in ('pending', 'sent', 'snoozed', 'dismissed', 'cancelled')),
  reminder_number int not null default 1,
  last_sent_at timestamptz,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists idx_reminders_user_id on public.reminders(user_id);
create index if not exists idx_reminders_quote_id on public.reminders(quote_id);
create index if not exists idx_reminders_remind_at on public.reminders(remind_at);

-- ------------------------------------------------------------------------
-- 8. PUSH SUBSCRIPTIONS TABLE
-- ------------------------------------------------------------------------
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade not null,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists idx_push_subs_user_id on public.push_subscriptions(user_id);

-- ========================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Strict Isolation: Each user sees and modifies only their own records.
-- ========================================================================

alter table public.profiles enable row level security;
alter table public.clients enable row level security;
alter table public.saved_items enable row level security;
alter table public.quotes enable row level security;
alter table public.quote_sections enable row level security;
alter table public.quote_lines enable row level security;
alter table public.reminders enable row level security;
alter table public.push_subscriptions enable row level security;

-- Profiles Policies
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Clients Policies
create policy "Users can operate on own clients"
  on public.clients for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Saved Items Policies
create policy "Users can operate on own saved items"
  on public.saved_items for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Quotes Policies
create policy "Users can operate on own quotes"
  on public.quotes for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Quote Sections Policies (Cascaded through Quotes ownership)
create policy "Users can operate on own quote sections"
  on public.quote_sections for all
  using (
    exists (
      select 1 from public.quotes
      where quotes.id = quote_sections.quote_id
      and quotes.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.quotes
      where quotes.id = quote_sections.quote_id
      and quotes.user_id = auth.uid()
    )
  );

-- Quote Lines Policies (Cascaded through Sections and Quotes ownership)
create policy "Users can operate on own quote lines"
  on public.quote_lines for all
  using (
    exists (
      select 1 from public.quote_sections
      join public.quotes on quotes.id = quote_sections.quote_id
      where quote_sections.id = quote_lines.section_id
      and quotes.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.quote_sections
      join public.quotes on quotes.id = quote_sections.quote_id
      where quote_sections.id = quote_lines.section_id
      and quotes.user_id = auth.uid()
    )
  );

-- Reminders Policies
create policy "Users can operate on own reminders"
  on public.reminders for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Push Subscriptions Policies
create policy "Users can operate on own push subscriptions"
  on public.push_subscriptions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ========================================================================
-- AUTOMATIC PROFILE CREATION TRIGGER
-- ========================================================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, business_name, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'business_name', 'My Trade Business'),
    coalesce(new.raw_user_meta_data->>'phone', '')
  );
  return new;
end;
$$ language plpgsql security definer;

-- Drop trigger if exists and recreate
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
