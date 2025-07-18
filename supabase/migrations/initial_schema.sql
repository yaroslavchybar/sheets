-- Create a table for public profiles
create table profiles (
  id uuid references auth.users not null primary key,
  updated_at timestamp with time zone,
  username text unique,
  full_name text,
  avatar_url text,
  website text,

  constraint username_length check (char_length(username) >= 3)
);

alter table profiles
  enable row level security;

create policy "Public profiles are viewable by everyone." on profiles
  for select using (true);

create policy "Users can insert their own profile." on profiles
  for insert with check (auth.uid() = id);

create policy "Users can update own profile." on profiles
  for update using (auth.uid() = id);

-- Create a table for roles
create table roles (
  id bigserial primary key,
  name text not null unique
);

alter table roles
  enable row level security;
  
create policy "Authenticated users can view roles." on roles
  for select using (auth.role() = 'authenticated');

-- Seed the roles table
insert into roles (name) values ('admin'), ('member');

-- Add role to profiles table
alter table profiles
  add column role bigint references roles(id) default 2; -- Default to 'member'

create policy "Admins can see all profiles" on profiles
  for select to authenticated
  using (
    (get_user_role(auth.uid()) = 'admin')
  );

-- Create a function to get a user's role
create or replace function get_user_role(user_id uuid)
returns text
language plpgsql
security definer
as $$
declare
  role_name text;
begin
  select r.name into role_name
  from profiles p
  join roles r on p.role = r.id
  where p.id = user_id;
  return role_name;
end;
$$;


-- Set up Realtime!
begin;
  drop publication if exists supabase_realtime;
  create publication supabase_realtime;
commit;
alter publication supabase_realtime
  add table profiles;

-- Set up Storage!
insert into storage.buckets (id, name)
  values ('avatars', 'avatars');

create policy "Avatar images are publicly accessible." on storage.objects
  for select using (bucket_id = 'avatars');

create policy "Anyone can upload an avatar." on storage.objects
  for insert with check (bucket_id = 'avatars');
  
create policy "Anyone can update their own avatar." on storage.objects
  for update using (auth.uid() = owner) with check (bucket_id = 'avatars');

-- Function to automatically create a profile for a new user
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, avatar_url, role)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url', 2); -- Default role 'member'
  return new;
end;
$$;

-- Trigger the function every time a user is created
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
