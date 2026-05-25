import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import type { Task, TaskStatus, TeamWithMembers, Notification } from '@/types'
import { useAuth } from './AuthContext'
import {
  getUserTeams,
  getTasks,
  createTask as createTaskApi,
  updateTask as updateTaskApi,
  deleteTask as deleteTaskApi,
  joinTeamByCode,
  createTeam as createTeamApi,
  getNotifications,
  markNotificationAsRead,
  createNotification,
  subscribeToTasks,
  subscribeToNotifications,
  removeChannel,
} from '@/services/supabase'
import toast from 'react-hot-toast'

interface TaskContextType {
  tasks: Task[]
  teams: TeamWithMembers[]
  notifications: Notification[]
  createTask: (task: Omit<Task, 'id' | 'created_at' | 'updated_at'>) => Promise<void>
  updateTaskStatus: (id: string, status: TaskStatus) => Promise<void>
  editTask: (task: Task) => Promise<void>
  removeTask: (id: string) => Promise<void>
  createTeam: (name: string, description: string) => Promise<TeamWithMembers | null>
  joinTeam: (inviteCode: string) => Promise<boolean>
  getTeamTasks: (teamId: string) => Task[]
  getUserTeamsList: () => TeamWithMembers[]
  unreadCount: number
  markNotifRead: (id: string) => Promise<void>
  refreshTasks: (teamId: string) => Promise<void>
  refreshTeams: () => Promise<void>
  refreshNotifications: () => Promise<void>
  loading: boolean
}

const TaskContext = createContext<TaskContextType | undefined>(undefined)

export function TaskProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [tasks, setTasks] = useState<Task[]>([])
  const [teams, setTeams] = useState<TeamWithMembers[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(false)
  const [activeTeamId, setActiveTeamId] = useState<string>('')

  // Load teams on mount
  useEffect(() => {
    if (user) {
      refreshTeams()
      refreshNotifications()
    }
  }, [user])

  // Subscribe to realtime updates when active team changes
  useEffect(() => {
    if (!activeTeamId || !user) return

    // Initial load
    refreshTasks(activeTeamId)

    // Subscribe to task changes
    const taskChannel = subscribeToTasks(activeTeamId, (payload) => {
      console.log('Task change:', payload)
      refreshTasks(activeTeamId)
    })

    return () => {
      removeChannel(taskChannel)
    }
  }, [activeTeamId, user])

  // Subscribe to notifications
  useEffect(() => {
    if (!user) return

    const notifChannel = subscribeToNotifications(user.id, (payload) => {
      console.log('New notification:', payload)
      refreshNotifications()
      if (payload.new) {
        toast(payload.new.message, { icon: '🔔' })
      }
    })

    return () => {
      removeChannel(notifChannel)
    }
  }, [user])

  // Check deadlines periodically
  useEffect(() => {
    if (!user) return
    const interval = setInterval(() => {
      checkDeadlines()
    }, 60000) // Every minute

    return () => clearInterval(interval)
  }, [user, tasks])

  const checkDeadlines = async () => {
    const now = new Date()
    const upcomingTasks = tasks.filter(
      (t) => t.assignee_id === user?.id && t.status !== 'done' && t.deadline
    )

    for (const task of upcomingTasks) {
      const deadline = new Date(task.deadline!)
      const diff = deadline.getTime() - now.getTime()
      const hoursLeft = diff / (1000 * 60 * 60)

      if (hoursLeft > 0 && hoursLeft < 24) {
        // Check if notification already exists
        const existing = notifications.find(
          (n) => n.type === 'deadline' && n.message.includes(task.title)
        )
        if (!existing) {
          try {
            await createNotification({
              user_id: user!.id,
              type: 'deadline',
              message: `Дедлайн жақындады: "${task.title}"`,
              read: false,
            })
            refreshNotifications()
          } catch (err) {
            console.error('Failed to create notification:', err)
          }
        }
      }
    }
  }

  const refreshTasks = async (teamId: string) => {
    if (!teamId) return
    setActiveTeamId(teamId)
    const data = await getTasks(teamId)
    setTasks(data)
  }

  const refreshTeams = async () => {
    setLoading(true)
    const data = await getUserTeams()
    setTeams(data)
    setLoading(false)
  }

  const refreshNotifications = async () => {
    const data = await getNotifications()
    setNotifications(data)
  }

  const createTask = async (taskData: Omit<Task, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      await createTaskApi(taskData)
      toast.success('Тапсырма құрылды!')
      if (activeTeamId) {
        await refreshTasks(activeTeamId)
      }
    } catch (err) {
      toast.error('Тапсырма құру сәтсіз')
      throw err
    }
  }

  const updateTaskStatus = async (id: string, status: TaskStatus) => {
    try {
      await updateTaskApi(id, { status })
      if (activeTeamId) {
        await refreshTasks(activeTeamId)
      }
    } catch (err) {
      toast.error('Мәртебені өзгерту сәтсіз')
    }
  }

  const editTask = async (updated: Task) => {
    try {
      await updateTaskApi(updated.id, updated)
      toast.success('Тапсырма жаңартылды!')
      if (activeTeamId) {
        await refreshTasks(activeTeamId)
      }
    } catch (err) {
      toast.error('Жаңарту сәтсіз')
    }
  }

  const removeTask = async (id: string) => {
    try {
      await deleteTaskApi(id)
      toast.success('Тапсырма өшірілді!')
      if (activeTeamId) {
        await refreshTasks(activeTeamId)
      }
    } catch (err) {
      toast.error('Өшіру сәтсіз')
    }
  }

  const createTeam = async (name: string, description: string): Promise<TeamWithMembers | null> => {
    try {
      const team = await createTeamApi(name, description)
      await refreshTeams()
      if (team) {
        localStorage.setItem('taskflow-active-team-id', team.id)
      }
      toast.success('Команда құрылды!')
      return team as TeamWithMembers
    } catch (err) {
      toast.error('Команда құру сәтсіз')
      return null
    }
  }

  const joinTeam = async (inviteCode: string): Promise<boolean> => {
    try {
      const team = await joinTeamByCode(inviteCode)
      if (team) {
        await refreshTeams()
        toast.success(`"${team.name}" командасына қосылдыңыз!`)
        return true
      }
      toast.error('Қате шақыру коды немесе сіз бұл командадасыз')
      return false
    } catch (err) {
      toast.error('Қосылу сәтсіз')
      return false
    }
  }

  const getTeamTasks = (teamId: string) => {
    return tasks.filter((t) => t.team_id === teamId)
  }

  const getUserTeamsList = () => teams

  const unreadCount = notifications.filter((n) => !n.read).length

  const markNotifRead = async (id: string) => {
    try {
      await markNotificationAsRead(id)
      await refreshNotifications()
    } catch (err) {
      console.error('Failed to mark notification as read:', err)
    }
  }

  return (
    <TaskContext.Provider
      value={{
        tasks,
        teams,
        notifications,
        createTask,
        updateTaskStatus,
        editTask,
        removeTask,
        createTeam,
        joinTeam,
        getTeamTasks,
        getUserTeamsList,
        unreadCount,
        markNotifRead,
        refreshTasks,
        refreshTeams,
        refreshNotifications,
        loading,
      }}
    >
      {children}
    </TaskContext.Provider>
  )
}

export function useTask() {
  const context = useContext(TaskContext)
  if (!context) {
    throw new Error('useTask must be used within TaskProvider')
  }
  return context
}
