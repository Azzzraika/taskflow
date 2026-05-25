-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Profiles table (extends auth.users)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  name text not null,
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Teams table
create table if not exists public.teams (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  description text,
  owner_id uuid references public.profiles(id) not null,
  invite_code text unique not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Team members junction table
create table if not exists public.team_members (
  id uuid default uuid_generate_v4() primary key,
  team_id uuid references public.teams(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  role text not null check (role in ('owner', 'admin', 'member')) default 'member',
  joined_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(team_id, user_id)
);

-- Tasks table
create table if not exists public.tasks (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  description text,
  status text not null check (status in ('todo', 'in_progress', 'done')) default 'todo',
  priority text not null check (priority in ('low', 'medium', 'high')) default 'medium',
  assignee_id uuid references public.profiles(id),
  team_id uuid references public.teams(id) on delete cascade not null,
  deadline timestamp with time zone,
  created_by uuid references public.profiles(id) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Notifications table
create table if not exists public.notifications (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  type text not null check (type in ('deadline', 'invite', 'mention')),
  message text not null,
  read boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security
alter table public.profiles enable row level security;
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.tasks enable row level security;
alter table public.notifications enable row level security;

-- RLS Policies for Profiles
create policy "Profiles are viewable by everyone"
  on public.profiles for select using (true);

create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert with check (auth.uid() = id);

-- RLS Policies for Teams
create policy "Team members can view team"
  on public.teams for select
  using (
    exists (
      select 1 from public.team_members
      where team_id = teams.id and user_id = auth.uid()
    )
    or owner_id = auth.uid()
  );

create policy "Authenticated users can create teams"
  on public.teams for insert with check (auth.uid() = owner_id);

create policy "Owners can update team"
  on public.teams for update using (owner_id = auth.uid());

create policy "Owners can delete team"
  on public.teams for delete using (owner_id = auth.uid());

-- RLS Policies for Team Members
create policy "Team members viewable by team members"
  on public.team_members for select
  using (
    exists (
      select 1 from public.team_members tm
      where tm.team_id = team_members.team_id and tm.user_id = auth.uid()
    )
  );

create policy "Team members can join with invite"
  on public.team_members for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.teams
      where id = team_members.team_id
    )
  );

create policy "Owners can manage members"
  on public.team_members for all
  using (
    exists (
      select 1 from public.teams
      where id = team_members.team_id and owner_id = auth.uid()
    )
  );

-- RLS Policies for Tasks
create policy "Tasks viewable by team members"
  on public.tasks for select
  using (
    exists (
      select 1 from public.team_members
      where team_id = tasks.team_id and user_id = auth.uid()
    )
  );

create policy "Team members can create tasks"
  on public.tasks for insert
  with check (
    exists (
      select 1 from public.team_members
      where team_id = tasks.team_id and user_id = auth.uid()
    )
  );

create policy "Team members can update tasks"
  on public.tasks for update
  using (
    exists (
      select 1 from public.team_members
      where team_id = tasks.team_id and user_id = auth.uid()
    )
  );

create policy "Team members can delete tasks"
  on public.tasks for delete
  using (
    exists (
      select 1 from public.team_members
      where team_id = tasks.team_id and user_id = auth.uid()
    )
  );

-- RLS Policies for Notifications
create policy "Users view own notifications"
  on public.notifications for select using (user_id = auth.uid());

create policy "Users can create notifications"
  on public.notifications for insert with check (user_id = auth.uid());

create policy "Users update own notifications"
  on public.notifications for update using (user_id = auth.uid());

-- Function to auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, avatar_url)
  values (
    new.id, 
    coalesce(new.raw_user_meta_data->>'name', new.email),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger for new user
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Function to update updated_at timestamp
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Trigger for tasks updated_at
drop trigger if exists tasks_updated_at on public.tasks;
create trigger tasks_updated_at
  before update on public.tasks
  for each row execute procedure public.handle_updated_at();

-- Enable Realtime for tables
alter publication supabase_realtime add table public.tasks;
alter publication supabase_realtime add table public.notifications;
