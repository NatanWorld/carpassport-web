-- ─── MyCarPassport Web — Schema completo ─────────────────────────────────────
-- Rodar no SQL Editor do Supabase (novo projeto)

-- ═══════════════════════════════════════════════════════════════════════════════
-- PROFILES
-- ═══════════════════════════════════════════════════════════════════════════════
create table if not exists public.profiles (
  id            uuid        references auth.users on delete cascade primary key,
  username      text        unique,
  full_name     text,
  avatar_url    text,
  bio           text,
  is_vip        boolean     not null default false,
  created_at    timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own"
  on public.profiles for select using (auth.uid() = id);

create policy "profiles_select_authenticated"
  on public.profiles for select to authenticated using (true);

create policy "profiles_insert_own"
  on public.profiles for insert with check (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update using (auth.uid() = id);

create or replace view public.profiles_public
  with (security_invoker = true)
as
  select id, username, full_name, avatar_url, bio
  from public.profiles
  where username is not null;

grant select on public.profiles_public to anon;
grant select on public.profiles_public to authenticated;

-- ═══════════════════════════════════════════════════════════════════════════════
-- CARS
-- ═══════════════════════════════════════════════════════════════════════════════
create table if not exists public.cars (
  id          uuid        primary key default gen_random_uuid(),
  owner_id    uuid        not null references public.profiles(id) on delete cascade,
  brand       text        not null,
  model       text        not null,
  year        int         not null,
  nickname    text,
  color       text,
  car_country text        not null default 'BR',
  photo_url   text,
  is_primary  boolean     not null default false,
  is_public   boolean     not null default true,
  active      boolean     not null default true,
  trip_count  int         not null default 0,
  created_at  timestamptz not null default now()
);

alter table public.cars enable row level security;

create policy "cars_select_own"
  on public.cars for select using (auth.uid() = owner_id);

create policy "cars_select_public"
  on public.cars for select to anon
  using (is_public = true and active = true);

create policy "cars_insert_own"
  on public.cars for insert with check (auth.uid() = owner_id);

create policy "cars_update_own"
  on public.cars for update using (auth.uid() = owner_id);

create policy "cars_delete_own"
  on public.cars for delete using (auth.uid() = owner_id);

-- ═══════════════════════════════════════════════════════════════════════════════
-- TRIP_LOGS
-- ═══════════════════════════════════════════════════════════════════════════════
create table if not exists public.trip_logs (
  id          uuid        primary key default gen_random_uuid(),
  car_id      uuid        not null references public.cars(id) on delete cascade,
  owner_id    uuid        not null references public.profiles(id) on delete cascade,
  place_name  text        not null,
  city        text,
  state       text,
  country     text        not null default 'BR',
  latitude    float,
  longitude   float,
  altitude    float,
  photo_url   text,
  notes       text,
  created_at  timestamptz not null default now()
);

alter table public.trip_logs enable row level security;

create policy "trips_select_own"
  on public.trip_logs for select using (auth.uid() = owner_id);

create policy "trips_select_public"
  on public.trip_logs for select to anon
  using (
    exists (
      select 1 from public.cars
      where cars.id = trip_logs.car_id
        and cars.is_public = true
        and cars.active = true
    )
  );

create policy "trips_insert_own"
  on public.trip_logs for insert with check (auth.uid() = owner_id);

create policy "trips_update_own"
  on public.trip_logs for update using (auth.uid() = owner_id);

create policy "trips_delete_own"
  on public.trip_logs for delete using (auth.uid() = owner_id);

-- ═══════════════════════════════════════════════════════════════════════════════
-- BADGES
-- ═══════════════════════════════════════════════════════════════════════════════
create table if not exists public.master_badges (
  id              uuid    primary key default gen_random_uuid(),
  code            text    unique not null,
  emoji           text    not null default '🎖️',
  name_pt         text    not null,
  name_en         text,
  condition_type  text    not null default 'manual',
  condition_value int     not null default 0,
  is_car_badge    boolean not null default false,
  points          int     not null default 0
);

create table if not exists public.user_badges (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references public.profiles(id) on delete cascade,
  badge_id    uuid        not null references public.master_badges(id) on delete cascade,
  car_id      uuid        references public.cars(id) on delete cascade,
  earned_at   timestamptz not null default now(),
  unique (user_id, badge_id, car_id)
);

alter table public.master_badges enable row level security;
alter table public.user_badges enable row level security;

create policy "master_badges_select_all" on public.master_badges for select using (true);
create policy "user_badges_select_own" on public.user_badges for select using (auth.uid() = user_id);
create policy "user_badges_insert_own" on public.user_badges for insert with check (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════════════════════
-- TRIGGERS
-- ═══════════════════════════════════════════════════════════════════════════════
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''));
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create or replace function public.increment_trip_count()
returns trigger as $$
begin
  update public.cars set trip_count = trip_count + 1 where id = new.car_id;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_trip_log_created on public.trip_logs;
create trigger on_trip_log_created
  after insert on public.trip_logs
  for each row execute procedure public.increment_trip_count();

create or replace function public.decrement_trip_count()
returns trigger as $$
begin
  update public.cars set trip_count = greatest(trip_count - 1, 0) where id = old.car_id;
  return old;
end;
$$ language plpgsql security definer;

drop trigger if exists on_trip_log_deleted on public.trip_logs;
create trigger on_trip_log_deleted
  after delete on public.trip_logs
  for each row execute procedure public.decrement_trip_count();

-- ═══════════════════════════════════════════════════════════════════════════════
-- STORAGE
-- ═══════════════════════════════════════════════════════════════════════════════
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true) on conflict do nothing;
insert into storage.buckets (id, name, public) values ('car-photos', 'car-photos', true) on conflict do nothing;
insert into storage.buckets (id, name, public) values ('trip-photos', 'trip-photos', true) on conflict do nothing;

create policy "avatars_public_read"     on storage.objects for select using (bucket_id = 'avatars');
create policy "car_photos_public_read"  on storage.objects for select using (bucket_id = 'car-photos');
create policy "trip_photos_public_read" on storage.objects for select using (bucket_id = 'trip-photos');

create policy "avatars_auth_insert"
  on storage.objects for insert with check (bucket_id = 'avatars' and auth.role() = 'authenticated');
create policy "car_photos_auth_insert"
  on storage.objects for insert with check (bucket_id = 'car-photos' and auth.role() = 'authenticated');
create policy "trip_photos_auth_insert"
  on storage.objects for insert with check (bucket_id = 'trip-photos' and auth.role() = 'authenticated');

-- ═══════════════════════════════════════════════════════════════════════════════
-- BADGE SEEDS
-- ═══════════════════════════════════════════════════════════════════════════════
insert into public.master_badges (code, emoji, name_pt, name_en, condition_type, condition_value, is_car_badge, points) values
  ('first_trip',     '🗺️', 'Primeira Viagem',  'First Trip',     'trip_count',      1,  true,  5),
  ('trips_10',       '🔟', '10 Viagens',        '10 Trips',       'trip_count',      10, true,  10),
  ('trips_50',       '🏆', '50 Viagens',        '50 Trips',       'trip_count',      50, true,  25),
  ('cars_3',         '🚗', 'Colecionador',      'Collector',      'car_count',       3,  false, 15),
  ('states_5',       '📍', '5 Estados',         '5 States',       'state_count',     5,  false, 20),
  ('founding_member','⭐', 'Membro Fundador',   'Founding Member','founding_member', 1,  false, 30),
  ('vip',            '💎', 'VIP',               'VIP',            'is_vip',          1,  false, 50)
on conflict (code) do nothing;
