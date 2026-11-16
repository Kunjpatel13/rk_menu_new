-- RESTAURANT MENU + SINGLE ADMIN SETUP
-- Run this entire script in Supabase Dashboard > SQL Editor.
-- Create the first admin account in Authentication > Users first.
-- Then replace YOUR_AUTH_USER_UUID below and run the final INSERT statement.

create extension if not exists pgcrypto;

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.menu_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category_id uuid not null references public.categories(id) on delete restrict,
  description text not null default '',
  price numeric(10,2) not null check (price >= 0),
  image_url text,
  food_type text not null default 'Veg' check (food_type in ('Veg','Non-Veg')),
  is_available boolean not null default true,
  is_bestseller boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.restaurant_settings (
  id integer primary key default 1 check (id = 1),
  restaurant_name text not null default 'The Good Table',
  whatsapp_number text not null default '',
  contact_phone text not null default '',
  address text not null default '',
  opening_hours text not null default '',
  delivery_charge numeric(10,2) not null default 0 check (delivery_charge >= 0),
  minimum_order_amount numeric(10,2) not null default 0 check (minimum_order_amount >= 0),
  updated_at timestamptz not null default now()
);

-- Security helper: only users explicitly listed in admin_users are admins.
create or replace function public.is_restaurant_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admin_users
    where user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_restaurant_admin() from public;
grant execute on function public.is_restaurant_admin() to anon, authenticated;

alter table public.admin_users enable row level security;
alter table public.categories enable row level security;
alter table public.menu_items enable row level security;
alter table public.restaurant_settings enable row level security;

drop policy if exists "Admin can read own admin record" on public.admin_users;
create policy "Admin can read own admin record" on public.admin_users
for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists "Public reads active categories" on public.categories;
create policy "Public reads active categories" on public.categories
for select to anon, authenticated using (is_active = true or public.is_restaurant_admin());

drop policy if exists "Admin manages categories" on public.categories;
create policy "Admin manages categories" on public.categories
for all to authenticated using (public.is_restaurant_admin())
with check (public.is_restaurant_admin());

drop policy if exists "Public reads available menu" on public.menu_items;
create policy "Public reads available menu" on public.menu_items
for select to anon, authenticated using (is_available = true or public.is_restaurant_admin());

drop policy if exists "Admin manages menu" on public.menu_items;
create policy "Admin manages menu" on public.menu_items
for all to authenticated using (public.is_restaurant_admin())
with check (public.is_restaurant_admin());

drop policy if exists "Public reads restaurant settings" on public.restaurant_settings;
create policy "Public reads restaurant settings" on public.restaurant_settings
for select to anon, authenticated using (true);

drop policy if exists "Admin manages restaurant settings" on public.restaurant_settings;
create policy "Admin manages restaurant settings" on public.restaurant_settings
for all to authenticated using (public.is_restaurant_admin())
with check (public.is_restaurant_admin());

-- Create a public image bucket. Upload/manage files only as admin.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('menu-images', 'menu-images', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = true, file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg','image/png','image/webp'];

drop policy if exists "Public can view menu images" on storage.objects;
create policy "Public can view menu images" on storage.objects
for select to anon, authenticated using (bucket_id = 'menu-images');

drop policy if exists "Admins upload menu images" on storage.objects;
create policy "Admins upload menu images" on storage.objects
for insert to authenticated with check (bucket_id = 'menu-images' and public.is_restaurant_admin());

drop policy if exists "Admins update menu images" on storage.objects;
create policy "Admins update menu images" on storage.objects
for update to authenticated using (bucket_id = 'menu-images' and public.is_restaurant_admin())
with check (bucket_id = 'menu-images' and public.is_restaurant_admin());

drop policy if exists "Admins delete menu images" on storage.objects;
create policy "Admins delete menu images" on storage.objects
for delete to authenticated using (bucket_id = 'menu-images' and public.is_restaurant_admin());

-- Enable realtime events for customer menu/settings refresh.
do $$
begin
  alter publication supabase_realtime add table public.menu_items;
exception when duplicate_object then null;
when undefined_object then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table public.categories;
exception when duplicate_object then null;
when undefined_object then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table public.restaurant_settings;
exception when duplicate_object then null;
when undefined_object then null;
end $$;

insert into public.restaurant_settings (id, restaurant_name)
values (1, 'The Good Table')
on conflict (id) do nothing;

-- Starter categories (safe to run more than once)
insert into public.categories (name, sort_order) values
('Pizza',1),('Burgers',2),('Starters',3),('Main Course',4),('Beverages',5),('Desserts',6)
on conflict (name) do nothing;

-- OPTIONAL: Add one admin after creating the user in Authentication > Users.
-- Replace the UUID below with the auth.users.id of your one admin user.
-- insert into public.admin_users (user_id) values ('YOUR_AUTH_USER_UUID');
