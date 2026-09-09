-- ═══════════════════════════════════════════════════════════════════
-- NFL BETS — SUPABASE SCHEMA  (run in the TENNIS-BETTING project)
-- ═══════════════════════════════════════════════════════════════════
-- Paste this entire file into the tennis-betting project's SQL Editor
-- and click Run. It:
--   1) creates the new nfl_bets table + nfl_bets_with_calc view
--      (auto-computes potential payout + P/L),
--   2) creates nfl_staged_bets, with RLS policies that let the
--      anon/publishable key read & write (matches the tennis setup).
--
-- Safe to re-run: every CREATE uses "if not exists" or "or replace".
-- ═══════════════════════════════════════════════════════════════════

-- ── 1. The bets table ────────────────────────────────────────────
create table if not exists public.nfl_bets (
  id                bigserial primary key,
  date              date         not null,
  competition       text,
  competition_type  text,
  region            text,
  matchday          text,
  match_name        text         not null,
  pick              text         not null,
  bet_type          text         not null,
  tipster           text,
  odds              numeric(10,3) not null check (odds > 0),
  units             numeric(10,3),
  stake_cop         numeric(14,2) not null check (stake_cop >= 0),
  notes             text,
  result            smallint     check (result in (0, 1)),  -- 1 won · 0 lost · null pending
  leg_results       jsonb,       -- for parlays: array of 1/0/null per leg (tracks individual legs for win-rate)
  created_at        timestamptz  not null default now(),
  updated_at        timestamptz  not null default now()
);

-- Safe migration: add leg_results column if an older table is missing it
alter table public.nfl_bets
  add column if not exists leg_results jsonb;

create index if not exists nfl_bets_date_idx     on public.nfl_bets (date desc);
create index if not exists nfl_bets_result_idx   on public.nfl_bets (result);
create index if not exists nfl_bets_tipster_idx  on public.nfl_bets (tipster);
create index if not exists nfl_bets_region_idx   on public.nfl_bets (region);

-- Auto-update updated_at on every UPDATE
create or replace function public.nfl_set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;

drop trigger if exists nfl_bets_updated_at on public.nfl_bets;
create trigger nfl_bets_updated_at
  before update on public.nfl_bets
  for each row execute function public.nfl_set_updated_at();

-- ── 2. The calculated view ───────────────────────────────────────
-- Adds two computed columns so the front-end never has to do the math:
--   • potential_cop = stake_cop * odds  (0 for tracking-only bets)
--   • pl_cop        = +profit if won, -stake if lost, null if pending
-- We DROP + CREATE (instead of CREATE OR REPLACE) because re-running this
-- file after adding a new column would otherwise hit "cannot change name of
-- view column" — the b.* expansion shifts column positions when the table
-- gains a column.
drop view if exists public.nfl_bets_with_calc;
create view public.nfl_bets_with_calc as
select
  b.*,
  case when b.bet_type = 'Tracking (Win %)' then 0
       else round(b.stake_cop * b.odds, 2)
  end as potential_cop,
  case
    when b.bet_type = 'Tracking (Win %)' then 0
    when b.result = 1 then round(b.stake_cop * b.odds - b.stake_cop, 2)
    when b.result = 0 then -b.stake_cop
    else null
  end as pl_cop
from public.nfl_bets b;

-- ── 3. Row-level security: allow anon/public key to read+write ───
alter table public.nfl_bets enable row level security;

-- Drop any existing policy so we can re-run cleanly
drop policy if exists "nfl_anon_all" on public.nfl_bets;

create policy "nfl_anon_all"
  on public.nfl_bets
  for all
  using (true)
  with check (true);

-- Also expose the view to the anon role
grant select on public.nfl_bets_with_calc to anon, authenticated;
grant all    on public.nfl_bets             to anon, authenticated;
grant usage, select on sequence nfl_bets_id_seq to anon, authenticated;

-- ── 4. (optional) Quick sanity row — uncomment to seed one test bet ──
-- insert into public.nfl_bets
--   (date, competition, competition_type, region, matchday, match_name,
--    pick, bet_type, tipster, odds, units, stake_cop, notes)
-- values
--   (current_date, 'NFL Regular Season', 'Regular Season', 'AFC',
--    'Week 1', 'Kansas City Chiefs vs Buffalo Bills', 'Chiefs -3.5',
--    'Point Spread', 'Durden', 1.85, 1, 5000,
--    'Test bet — delete me');

-- Done. You can verify with:
--   select * from public.nfl_bets_with_calc;


-- ═══════════════════════════════════════════════════════════════════
-- 5. STAGED BETS — queue of bets extracted from images / text
-- ═══════════════════════════════════════════════════════════════════
-- Lives between the Import page (OCR / paste) and nfl_bets. Each row
-- holds the raw extraction plus editable "current" odds / stake fields the
-- user fills in AFTER they actually place the bet at their bookmaker, then
-- promotes the row via "Confirm & Save" — which inserts into nfl_bets
-- and deletes the staged row.
-- Safe to re-run.
create table if not exists public.nfl_staged_bets (
  id                bigserial primary key,
  source            text         not null check (source in ('image', 'text', 'manual')),
  date              date,
  competition       text,
  competition_type  text,
  region            text,
  matchday          text,
  match_name        text,
  pick              text,
  bet_type          text,
  tipster           text,
  original_odds     numeric(10,3),
  original_stake    numeric(14,2),
  odds              numeric(10,3),
  stake_cop         numeric(14,2),
  units             numeric(10,3),
  bookmaker         text,
  date_placed       date,
  notes             text,
  tracking_only     boolean      not null default false,
  imported_snapshot jsonb,       -- full snapshot of originally-imported fields (used by "Reset")
  created_at        timestamptz  not null default now(),
  updated_at        timestamptz  not null default now()
);

-- ── Safe migrations for older deploys ────────────────────────────
-- Add imported_snapshot jsonb column (used by the per-card Reset feature).
alter table public.nfl_staged_bets
  add column if not exists imported_snapshot jsonb;

-- Widen the source CHECK to accept 'manual' (for bets sent to staging
-- directly from the + Add Bet form). Drop/recreate — CHECK constraints
-- can't be altered in place. We use a stable name so this block is
-- idempotent against re-runs.
do $$
declare
  cname text;
begin
  select conname into cname
  from pg_constraint
  where conrelid = 'public.nfl_staged_bets'::regclass
    and contype  = 'c'
    and pg_get_constraintdef(oid) ilike '%source = ANY%image%text%';
  if cname is not null then
    execute format('alter table public.nfl_staged_bets drop constraint %I', cname);
  end if;
end $$;

alter table public.nfl_staged_bets
  drop constraint if exists nfl_staged_bets_source_check;

alter table public.nfl_staged_bets
  add  constraint nfl_staged_bets_source_check
  check (source in ('image', 'text', 'manual'));

create index if not exists nfl_staged_bets_created_idx on public.nfl_staged_bets (created_at desc);
create index if not exists nfl_staged_bets_source_idx  on public.nfl_staged_bets (source);

drop trigger if exists nfl_staged_bets_updated_at on public.nfl_staged_bets;
create trigger nfl_staged_bets_updated_at
  before update on public.nfl_staged_bets
  for each row execute function public.nfl_set_updated_at();

alter table public.nfl_staged_bets enable row level security;
drop policy if exists "nfl_staged_anon_all" on public.nfl_staged_bets;
create policy "nfl_staged_anon_all"
  on public.nfl_staged_bets
  for all
  using (true)
  with check (true);

grant all on public.nfl_staged_bets to anon, authenticated;
grant usage, select on sequence nfl_staged_bets_id_seq to anon, authenticated;
