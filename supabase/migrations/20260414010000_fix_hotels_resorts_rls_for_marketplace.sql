-- Fix Hotels & Resorts RLS SELECT policy to include marketplace_visible listings
-- Uses coalesce(host_id, user_id) since hotels/resorts may use either column name

drop policy if exists "Anyone can view available hotels" on public.hotels;
create policy "Anyone can view available hotels"
on public.hotels
for select
using (
  availability_status = true
  or marketplace_visible = true
  or coalesce((to_jsonb(hotels) ->> 'host_id')::uuid, (to_jsonb(hotels) ->> 'user_id')::uuid) = auth.uid()
  or public.has_role(auth.uid(), 'admin')
);

drop policy if exists "Anyone can view available resorts" on public.resorts;
create policy "Anyone can view available resorts"
on public.resorts
for select
using (
  availability_status = true
  or marketplace_visible = true
  or coalesce((to_jsonb(resorts) ->> 'host_id')::uuid, (to_jsonb(resorts) ->> 'user_id')::uuid) = auth.uid()
  or public.has_role(auth.uid(), 'admin')
);

-- Keep update/delete/insert policies using the safe coalesce approach
drop policy if exists "Hosts and admins can update hotels" on public.hotels;
create policy "Hosts and admins can update hotels"
on public.hotels
for update
using (
  coalesce((to_jsonb(hotels) ->> 'host_id')::uuid, (to_jsonb(hotels) ->> 'user_id')::uuid) = auth.uid()
  or public.has_role(auth.uid(), 'admin')
);

drop policy if exists "Hosts and admins can delete hotels" on public.hotels;
create policy "Hosts and admins can delete hotels"
on public.hotels
for delete
using (
  coalesce((to_jsonb(hotels) ->> 'host_id')::uuid, (to_jsonb(hotels) ->> 'user_id')::uuid) = auth.uid()
  or public.has_role(auth.uid(), 'admin')
);

drop policy if exists "Hosts and admins can insert hotels" on public.hotels;
create policy "Hosts and admins can insert hotels"
on public.hotels
for insert
with check (
  coalesce((to_jsonb(hotels) ->> 'host_id')::uuid, (to_jsonb(hotels) ->> 'user_id')::uuid) = auth.uid()
  or public.has_role(auth.uid(), 'admin')
);

drop policy if exists "Hosts and admins can update resorts" on public.resorts;
create policy "Hosts and admins can update resorts"
on public.resorts
for update
using (
  coalesce((to_jsonb(resorts) ->> 'host_id')::uuid, (to_jsonb(resorts) ->> 'user_id')::uuid) = auth.uid()
  or public.has_role(auth.uid(), 'admin')
);

drop policy if exists "Hosts and admins can delete resorts" on public.resorts;
create policy "Hosts and admins can delete resorts"
on public.resorts
for delete
using (
  coalesce((to_jsonb(resorts) ->> 'host_id')::uuid, (to_jsonb(resorts) ->> 'user_id')::uuid) = auth.uid()
  or public.has_role(auth.uid(), 'admin')
);

drop policy if exists "Hosts and admins can insert resorts" on public.resorts;
create policy "Hosts and admins can insert resorts"
on public.resorts
for insert
with check (
  coalesce((to_jsonb(resorts) ->> 'host_id')::uuid, (to_jsonb(resorts) ->> 'user_id')::uuid) = auth.uid()
  or public.has_role(auth.uid(), 'admin')
);
