-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Users Table (Managed by NextAuth, but we define schema for clarity)
-- Note: NextAuth with Supabase adapter usually manages this, but we'll define a custom one for simplicity with Credentials provider
create table if not exists public.users (
  id uuid default uuid_generate_v4() primary key,
  username text unique not null,
  password_hash text not null,
  name text,
  role text check (role in ('admin', 'student')) default 'student',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Books Table
create table if not exists public.books (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  author text,
  level integer,
  description text,
  cover_url text,
  file_url text,
  file_type text check (file_type in ('pdf', 'text')) default 'pdf',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Readings Table (History & Bookmarks)
create table if not exists public.readings (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  book_id uuid references public.books(id) on delete cascade not null,
  last_page integer default 0,
  last_read_at timestamp with time zone default timezone('utc'::text, now()) not null,
  is_finished boolean default false,
  unique(user_id, book_id)
);

-- Enable Row Level Security (RLS)
alter table public.users enable row level security;
alter table public.books enable row level security;
alter table public.readings enable row level security;

-- Policies

-- Books: Everyone can read, only admin can insert/update/delete
create policy "Books are viewable by everyone" on public.books
  for select using (true);

create policy "Books are insertable by admin only" on public.books
  for insert with check (
    exists (select 1 from public.users where id = auth.uid() and role = 'admin')
  );

-- Readings: Users can see and modify only their own readings
-- Note: For simplicity in prototype, we might skip complex RLS for now and handle in API, 
-- but setting up basic RLS is good practice.
-- However, since we are using NextAuth credentials provider, Supabase might not see the user as "authenticated" in the database level 
-- unless we use the Supabase Adapter correctly or sign JWTs. 
-- For this prototype using simple Credentials provider, we will bypass RLS for now using the service role key in API routes, 
-- or just allow public access for now (NOT RECOMMENDED for production but ok for prototype if handled in API).
-- Let's stick to API-level security for this phase to avoid complexity with JWT signing.

-- For now, allow all access to tables, we will control it via Next.js API Routes.
create policy "Enable all access for now" on public.users for all using (true);
create policy "Enable all access for now" on public.books for all using (true);
create policy "Enable all access for now" on public.readings for all using (true);
