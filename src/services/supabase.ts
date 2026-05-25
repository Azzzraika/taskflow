import { createClient } from '@supabase/supabase-js'
import type { Profile, Task, Team, TeamWithMembers, Notification } from '@/types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseKey)

// ========== AUTH ==========
export async function signUp(email: string, password: string, name: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name }
    }
  })
  return { data, error }
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })
  return { data, error }
}

export async function signOut() {
  return await supabase.auth.signOut()
}

export async function getCurrentSession() {
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export function onAuthStateChange(callback: (event: string, session: any) => void) {
  return supabase.auth.onAuthStateChange(callback)
}

// ========== PROFILES ==========
export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) return null
  return data as Profile
}

export async function updateProfile(userId: string, updates: Partial<Profile>) {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single()

  if (error) throw error
  return data as Profile
}

// ========== TEAMS ==========
export async function getUserTeams(): Promise<TeamWithMembers[]> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('teams')
    .select(`*, team_members(*)`)
    .eq('team_members.user_id', user.id)

  if (error) {
    console.error('Error fetching teams:', error)
    return []
  }
  return (data || []) as TeamWithMembers[]
}

export async function getTeamById(teamId: string): Promise<TeamWithMembers | null> {
  const { data, error } = await supabase
    .from('teams')
    .select(`*, team_members(*)`)
    .eq('id', teamId)
    .single()

  if (error) return null
  return data as TeamWithMembers
}

export async function createTeam(name: string, description: string): Promise<Team> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const inviteCode = Math.random().toString(36).substring(2, 10).toUpperCase()

  const { data, error } = await supabase
    .from('teams')
    .insert({
      name,
      description,
      owner_id: user.id,
      invite_code: inviteCode
    })
    .select()
    .single()

  if (error) throw error

  const { error: memberError } = await supabase
    .from('team_members')
    .insert({
      team_id: data.id,
      user_id: user.id,
      role: 'owner'
    })

  if (memberError) throw memberError

  return data as Team
}

export async function joinTeamByCode(inviteCode: string): Promise<Team | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Find team by invite code
  const { data: team, error: teamError } = await supabase
    .from('teams')
    .select('*')
    .eq('invite_code', inviteCode)
    .single()

  if (teamError || !team) return null

  // Check if already member
  const { data: existing } = await supabase
    .from('team_members')
    .select('*')
    .eq('team_id', team.id)
    .eq('user_id', user.id)
    .single()

  if (existing) return null // Already a member

  // Add member
  const { error: memberError } = await supabase
    .from('team_members')
    .insert({
      team_id: team.id,
      user_id: user.id,
      role: 'member'
    })

  if (memberError) return null
  return team as Team
}

// ========== TASKS ==========
export async function getTasks(teamId: string): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('team_id', teamId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching tasks:', error)
    return []
  }
  return (data || []) as Task[]
}

export async function createTask(task: Omit<Task, 'id' | 'created_at' | 'updated_at'>): Promise<Task> {
  const { data, error } = await supabase
    .from('tasks')
    .insert(task)
    .select()
    .single()

  if (error) throw error
  return data as Task
}

export async function updateTask(id: string, updates: Partial<Task>): Promise<Task> {
  const { data, error } = await supabase
    .from('tasks')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as Task
}

export async function deleteTask(id: string): Promise<void> {
  const { error } = await supabase.from('tasks').delete().eq('id', id)
  if (error) throw error
}

// ========== NOTIFICATIONS ==========
export async function getNotifications(): Promise<Notification[]> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching notifications:', error)
    return []
  }
  return (data || []) as Notification[]
}

export async function createNotification(notification: Omit<Notification, 'id' | 'created_at'>): Promise<Notification> {
  const { data, error } = await supabase
    .from('notifications')
    .insert(notification)
    .select()
    .single()

  if (error) throw error
  return data as Notification
}

export async function markNotificationAsRead(id: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', id)

  if (error) throw error
}

// ========== REALTIME SUBSCRIPTIONS ==========
export function subscribeToTasks(teamId: string, callback: (payload: any) => void) {
  return supabase
    .channel(`tasks-${teamId}`)
    .on('postgres_changes', 
      { event: '*', schema: 'public', table: 'tasks', filter: `team_id=eq.${teamId}` }, 
      callback
    )
    .subscribe()
}

export function subscribeToNotifications(userId: string, callback: (payload: any) => void) {
  return supabase
    .channel(`notifications-${userId}`)
    .on('postgres_changes', 
      { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, 
      callback
    )
    .subscribe()
}

export function removeChannel(channel: any) {
  supabase.removeChannel(channel)
}
