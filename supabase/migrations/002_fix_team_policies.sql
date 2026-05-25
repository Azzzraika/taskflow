-- Fix recursive RLS on teams and team_members

drop policy if exists "Team members can view team" on public.teams;
drop policy if exists "Authenticated users can create teams" on public.teams;
drop policy if exists "Owners can update team" on public.teams;
drop policy if exists "Owners can delete team" on public.teams;

drop policy if exists "Team members viewable by team members" on public.team_members;
drop policy if exists "Team members can join with invite" on public.team_members;
drop policy if exists "Owners can manage members" on public.team_members;

create policy "Team members can view team"
  on public.teams for select
  using (
    auth.uid() is not null
  );

create policy "Authenticated users can create teams"
  on public.teams for insert with check (auth.uid() = owner_id);

create policy "Owners can update team"
  on public.teams for update using (owner_id = auth.uid());

create policy "Owners can delete team"
  on public.teams for delete using (owner_id = auth.uid());

create policy "Team members viewable by team members"
  on public.team_members for select
  using (
    user_id = auth.uid()
    or exists (
      select 1
      from public.teams
      where id = team_members.team_id and owner_id = auth.uid()
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
      select 1
      from public.teams
      where id = team_members.team_id and owner_id = auth.uid()
    )
  );
