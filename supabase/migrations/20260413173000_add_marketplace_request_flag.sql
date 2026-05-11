alter table public.stays add column if not exists marketplace_requested boolean not null default false;
alter table public.hotels add column if not exists marketplace_requested boolean not null default false;
alter table public.resorts add column if not exists marketplace_requested boolean not null default false;
alter table public.cars add column if not exists marketplace_requested boolean not null default false;
alter table public.bikes add column if not exists marketplace_requested boolean not null default false;
alter table public.experiences add column if not exists marketplace_requested boolean not null default false;
