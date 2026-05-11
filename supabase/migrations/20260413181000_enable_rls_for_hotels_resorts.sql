alter table public.hotels enable row level security;
alter table public.resorts enable row level security;

drop policy if exists "Anyone can view available hotels" on public.hotels;
drop policy if exists "Hosts and admins can insert hotels" on public.hotels;
drop policy if exists "Hosts and admins can update hotels" on public.hotels;
drop policy if exists "Hosts and admins can delete hotels" on public.hotels;

create policy "Anyone can view available hotels"
on public.hotels
for select
using (
  availability_status = true
  or coalesce((to_jsonb(hotels) ->> 'host_id')::uuid, (to_jsonb(hotels) ->> 'user_id')::uuid) = auth.uid()
  or public.has_role(auth.uid(), 'admin')
);

create policy "Hosts and admins can insert hotels"
on public.hotels
for insert
with check (
  auth.uid() = coalesce((to_jsonb(hotels) ->> 'host_id')::uuid, (to_jsonb(hotels) ->> 'user_id')::uuid)
  or public.has_role(auth.uid(), 'admin')
);

create policy "Hosts and admins can update hotels"
on public.hotels
for update
using (
  auth.uid() = coalesce((to_jsonb(hotels) ->> 'host_id')::uuid, (to_jsonb(hotels) ->> 'user_id')::uuid)
  or public.has_role(auth.uid(), 'admin')
);

create policy "Hosts and admins can delete hotels"
on public.hotels
for delete
using (
  auth.uid() = coalesce((to_jsonb(hotels) ->> 'host_id')::uuid, (to_jsonb(hotels) ->> 'user_id')::uuid)
  or public.has_role(auth.uid(), 'admin')
);

drop policy if exists "Anyone can view available resorts" on public.resorts;
drop policy if exists "Hosts and admins can insert resorts" on public.resorts;
drop policy if exists "Hosts and admins can update resorts" on public.resorts;
drop policy if exists "Hosts and admins can delete resorts" on public.resorts;

create policy "Anyone can view available resorts"
on public.resorts
for select
using (
  availability_status = true
  or coalesce((to_jsonb(resorts) ->> 'host_id')::uuid, (to_jsonb(resorts) ->> 'user_id')::uuid) = auth.uid()
  or public.has_role(auth.uid(), 'admin')
);

create policy "Hosts and admins can insert resorts"
on public.resorts
for insert
with check (
  auth.uid() = coalesce((to_jsonb(resorts) ->> 'host_id')::uuid, (to_jsonb(resorts) ->> 'user_id')::uuid)
  or public.has_role(auth.uid(), 'admin')
);

create policy "Hosts and admins can update resorts"
on public.resorts
for update
using (
  auth.uid() = coalesce((to_jsonb(resorts) ->> 'host_id')::uuid, (to_jsonb(resorts) ->> 'user_id')::uuid)
  or public.has_role(auth.uid(), 'admin')
);

create policy "Hosts and admins can delete resorts"
on public.resorts
for delete
using (
  auth.uid() = coalesce((to_jsonb(resorts) ->> 'host_id')::uuid, (to_jsonb(resorts) ->> 'user_id')::uuid)
  or public.has_role(auth.uid(), 'admin')
);
