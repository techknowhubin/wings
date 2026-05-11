create table if not exists public.host_coupons (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references auth.users(id) on delete cascade,
  code text not null,
  discount_percent integer not null check (discount_percent between 1 and 90),
  listing_types text[] not null default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (host_id, code)
);

alter table public.host_coupons enable row level security;

create policy "Hosts can view own coupons"
on public.host_coupons
for select
using (auth.uid() = host_id);

create policy "Hosts can create own coupons"
on public.host_coupons
for insert
with check (auth.uid() = host_id);

create policy "Hosts can update own coupons"
on public.host_coupons
for update
using (auth.uid() = host_id)
with check (auth.uid() = host_id);

create policy "Hosts can delete own coupons"
on public.host_coupons
for delete
using (auth.uid() = host_id);

drop trigger if exists update_host_coupons_updated_at on public.host_coupons;
create trigger update_host_coupons_updated_at
before update on public.host_coupons
for each row
execute function public.update_updated_at_column();
