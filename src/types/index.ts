export type TaskStatus = 'todo' | 'in_progress' | 'done'

export interface Profile {
  id: string
  name: string
  avatar_url: string | null
  created_at: string
}

export interface Task {
  id: string
  title: string
  description: string | null
  status: TaskStatus
  priority: 'low' | 'medium' | 'high'
  assignee_id: string | null
  team_id: string
  deadline: string | null
  created_by: string
  created_at: string
  updated_at: string
}

export interface Team {
  id: string
  name: string
  description: string | null
  owner_id: string
  invite_code: string
  created_at: string
}

export interface TeamMember {
  id: string
  team_id: string
  user_id: string
  role: 'owner' | 'admin' | 'member'
  joined_at: string
}

export interface TeamWithMembers extends Team {
  team_members: TeamMember[]
}

export interface Notification {
  id: string
  user_id: string
  type: 'deadline' | 'invite' | 'mention'
  message: string
  read: boolean
  created_at: string
}
