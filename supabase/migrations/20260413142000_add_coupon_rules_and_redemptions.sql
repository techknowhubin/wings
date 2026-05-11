alter table public.host_coupons
  add column if not exists starts_at timestamptz null,
  add column if not exists ends_at timestamptz null,
  add column if not exists usage_limit integer null check (usage_limit is null or usage_limit > 0),
  add column if not exists used_count integer not null default 0 check (used_count >= 0),
  add column if not exists one_time_per_user boolean not null default false;

create table if not exists public.host_coupon_redemptions (
  id uuid primary key default gen_random_uuid(),
  coupon_id uuid not null references public.host_coupons(id) on delete cascade,
  host_id uuid not null references auth.users(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  booking_context jsonb null,
  created_at timestamptz not null default now(),
  unique (coupon_id, user_id)
);

alter table public.host_coupon_redemptions enable row level security;

create policy "Hosts can view own coupon redemptions"
on public.host_coupon_redemptions
for select
using (auth.uid() = host_id);

create policy "Users can view own coupon redemptions"
on public.host_coupon_redemptions
for select
using (auth.uid() = user_id);

create policy "Users can create own coupon redemptions"
on public.host_coupon_redemptions
for insert
with check (auth.uid() = user_id);
