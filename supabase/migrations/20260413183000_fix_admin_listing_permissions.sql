-- Migration: Fix Admin Listing Permissions & Ensure Marketplace Columns
-- Created: 2026-04-13

-- 1. Ensure marketplace columns exist for all listing types
alter table public.stays add column if not exists marketplace_visible boolean not null default false;
alter table public.hotels add column if not exists marketplace_visible boolean not null default false;
alter table public.resorts add column if not exists marketplace_visible boolean not null default false;
alter table public.cars add column if not exists marketplace_visible boolean not null default false;
alter table public.bikes add column if not exists marketplace_visible boolean not null default false;
alter table public.experiences add column if not exists marketplace_visible boolean not null default false;

alter table public.stays add column if not exists marketplace_requested boolean not null default false;
alter table public.hotels add column if not exists marketplace_requested boolean not null default false;
alter table public.resorts add column if not exists marketplace_requested boolean not null default false;
alter table public.cars add column if not exists marketplace_requested boolean not null default false;
alter table public.bikes add column if not exists marketplace_requested boolean not null default false;
alter table public.experiences add column if not exists marketplace_requested boolean not null default false;

-- Stays
drop policy if exists "Hosts can update their own stays" on public.stays;
drop policy if exists "Hosts and admins can update stays" on public.stays;
create policy "Hosts and admins can update stays"
on public.stays for update
using (auth.uid() = host_id or public.has_role(auth.uid(), 'admin'));

-- Cars
drop policy if exists "Hosts can update their own cars" on public.cars;
drop policy if exists "Hosts and admins can update cars" on public.cars;
create policy "Hosts and admins can update cars"
on public.cars for update
using (auth.uid() = host_id or public.has_role(auth.uid(), 'admin'));

-- Bikes
drop policy if exists "Hosts can update their own bikes" on public.bikes;
drop policy if exists "Hosts and admins can update bikes" on public.bikes;
create policy "Hosts and admins can update bikes"
on public.bikes for update
using (auth.uid() = host_id or public.has_role(auth.uid(), 'admin'));

-- Experiences
drop policy if exists "Hosts can update their own experiences" on public.experiences;
drop policy if exists "Hosts and admins can update experiences" on public.experiences;
create policy "Hosts and admins can update experiences"
on public.experiences for update
using (auth.uid() = host_id or public.has_role(auth.uid(), 'admin'));

-- 3. Also allow Admins to delete listings for moderation
drop policy if exists "Hosts can delete their own stays" on public.stays;
drop policy if exists "Hosts and admins can delete stays" on public.stays;
create policy "Hosts and admins can delete stays"
on public.stays for delete
using (auth.uid() = host_id or public.has_role(auth.uid(), 'admin'));

drop policy if exists "Hosts can delete their own cars" on public.cars;
drop policy if exists "Hosts and admins can delete cars" on public.cars;
create policy "Hosts and admins can delete cars"
on public.cars for delete
using (auth.uid() = host_id or public.has_role(auth.uid(), 'admin'));

drop policy if exists "Hosts can delete their own bikes" on public.bikes;
drop policy if exists "Hosts and admins can delete bikes" on public.bikes;
create policy "Hosts and admins can delete bikes"
on public.bikes for delete
using (auth.uid() = host_id or public.has_role(auth.uid(), 'admin'));

drop policy if exists "Hosts can delete their own experiences" on public.experiences;
drop policy if exists "Hosts and admins can delete experiences" on public.experiences;
create policy "Hosts and admins can delete experiences"
on public.experiences for delete
using (auth.uid() = host_id or public.has_role(auth.uid(), 'admin'));
