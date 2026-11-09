-- TaraTrip DB schema (PostgreSQL / Supabase)
-- One row per place a route can stop at: restaurants, markets, small shops and attractions.
-- Columns map 1:1 to the UST data template (docs/data-template/), so the import script
-- can load the spreadsheet without guessing.
--
-- Run in Supabase: SQL Editor > paste this file > Run. Safe to re-run.

create table if not exists places (
    place_id          text primary key,                 -- e.g. 'MNL-0001', assigned in the template
    name              text not null,
    category          text not null
                      check (category in ('restaurant', 'market', 'shop', 'attraction')),
    is_small_business boolean not null default false,   -- locally owned, not a chain or mall
    local_score       smallint check (local_score between 1 and 10),  -- how strongly locals recommend it

    -- Location (WGS84). Required: map markers and route ordering depend on them.
    lat               double precision not null check (lat between -90 and 90),
    lng               double precision not null check (lng between -180 and 180),
    address           text not null,
    district          text,                             -- e.g. 'Binondo', 'Intramuros'

    -- Costs in PHP, per person.
    price_min         integer check (price_min >= 0),   -- typical spend, low end
    price_max         integer check (price_max >= 0),   -- typical spend, high end
    entry_fee         integer not null default 0 check (entry_fee >= 0),
    check (price_min is null or price_max is null or price_min <= price_max),

    signature_menu    text,                             -- dish/product the place is known for
    signature_price   integer check (signature_price >= 0),  -- PHP, one signature_menu item
    cash_only         boolean not null default false,   -- no card / GCash / Maya

    avg_stay_minutes  integer check (avg_stay_minutes > 0),

    -- Opening hours per weekday: {"mon": "08:00-20:00", ..., "sun": "closed"}.
    -- The API returns a single string for now (see docs/API.md); keeping per-day data
    -- lets the AI skip places that are closed on the travel day.
    opening_hours     jsonb not null default '{}'::jsonb,

    tags              text[] not null default '{}',     -- matched against request foods/attractions
    description       text,
    photos            text[] not null default '{}',     -- image URLs
    contact           text,                             -- phone, Facebook page, etc.

    -- Data provenance, for UST validation in week 4.
    source            text,                             -- who collected it / where it came from
    last_checked      date,

    created_at        timestamptz not null default now(),
    updated_at        timestamptz not null default now()
);

-- Columns added after the first version: bring an existing table up to date.
alter table places add column if not exists local_score smallint check (local_score between 1 and 10);
alter table places add column if not exists signature_menu text;
alter table places add column if not exists signature_price integer check (signature_price >= 0);
alter table places add column if not exists cash_only boolean not null default false;

create index if not exists places_category_idx on places (category);
create index if not exists places_tags_idx on places using gin (tags);

-- Keep updated_at current on every update.
create or replace function set_updated_at() returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

drop trigger if exists places_set_updated_at on places;
create trigger places_set_updated_at
    before update on places
    for each row execute function set_updated_at();

-- The FastAPI server connects directly with the DB URL, so the public Supabase API
-- must not expose this table. RLS on with no policies = no access via the anon key.
alter table places enable row level security;
