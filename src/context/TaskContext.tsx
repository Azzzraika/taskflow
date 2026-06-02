import { createContext, useContext, useState, useEffect, useRef, useCallback, type ReactNode } from 'react'
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
  activeTeamId: string | null
  setActiveTeamId: (id: string | null) => void
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
  refreshTasks: () => Promise<void>
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
  const [activeTeamId, setActiveTeamIdState] = useState<string | null>(null)
  
  // Ref для отслеживания загруженной команды и предотвращения цикла
  const lastLoadedTeamRef = useRef<string | null>(null)
  const isLoadingRef = useRef(false)

  // Load teams on mount
  useEffect(() => {
    if (user) {
      refreshTeams()
      refreshNotifications()
    }
  }, [user])

  // Загрузка задач при смене activeTeamId — ТОЛЬКО если команда реально изменилась
  useEffect(() => {
    if (!activeTeamId || !user) {
      setTasks([])
      lastLoadedTeamRef.current = null
      return
    }

    // Главная защита: не грузим, если уже грузим эту же команду
    if (lastLoadedTeamRef.current === activeTeamId || isLoadingRef.current) {
      return
    }

    const loadTasks = async () => {
      isLoadingRef.current = true
      lastLoadedTeamRef.current = activeTeamId
      setLoading(true)
      setTasks([]) // Очищаем старые задачи сразу

      try {
        const data = await getTasks(activeTeamId)
        // Проверяем, что команда не сменилась пока мы грузили
        if (lastLoadedTeamRef.current === activeTeamId) {
          setTasks(data)
        }
      } catch (err) {
        console.error('Error loading tasks:', err)
      } finally {
        setLoading(false)
        isLoadingRef.current = false
      }
    }

    loadTasks()
  }, [activeTeamId, user])

  // Real-time подписка — обновляем локально, НЕ вызывая refreshTasks
  useEffect(() => {
    if (!activeTeamId || !user) return

    const taskChannel = subscribeToTasks(activeTeamId, (payload) => {
      console.log('Task change:', payload)
      
      // Локальное обновление вместо полной перезагрузки
      setTasks((prev) => {
        if (payload.eventType === 'INSERT') {
          return [payload.new as Task, ...prev]
        } else if (payload.eventType === 'UPDATE') {
          return prev.map((t) => (t.id === payload.new.id ? payload.new as Task : t))
        } else if (payload.eventType === 'DELETE') {
          return prev.filter((t) => t.id !== payload.old.id)
        }
        return prev
      })
    })

    return () => {
      removeChannel(taskChannel)
    }
  }, [activeTeamId, user])

  // Notifications subscription
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
    }, 60000)

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

  // setActiveTeamId — публичный setter
  const setActiveTeamId = useCallback((id: string | null) => {
    if (id !== activeTeamId) {
      setTasks([]) // Очищаем сразу
      lastLoadedTeamRef.current = null // Сбрасываем ref
      setActiveTeamIdState(id)
    }
  }, [activeTeamId])

  // refreshTasks — перезагрузка для текущей команды (без смены activeTeamId!)
  const refreshTasks = useCallback(async () => {
    if (!activeTeamId || isLoadingRef.current) return

    isLoadingRef.current = true
    lastLoadedTeamRef.current = activeTeamId
    setLoading(true)

    try {
      const data = await getTasks(activeTeamId)
      if (lastLoadedTeamRef.current === activeTeamId) {
        setTasks(data)
      }
    } catch (err) {
      console.error('Error refreshing tasks:', err)
    } finally {
      setLoading(false)
      isLoadingRef.current = false
    }
  }, [activeTeamId])

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
      // Real-time обновит список автоматически
    } catch (err) {
      toast.error('Тапсырма құру сәтсіз')
      throw err
    }
  }

  const updateTaskStatus = async (id: string, status: TaskStatus) => {
    try {
      await updateTaskApi(id, { status })
      // Real-time обновит список автоматически
    } catch (err) {
      toast.error('Мәртебені өзгерту сәтсіз')
    }
  }

  const editTask = async (updated: Task) => {
    try {
      await updateTaskApi(updated.id, updated)
      toast.success('Тапсырма жаңартылды!')
      // Real-time обновит список автоматически
    } catch (err) {
      toast.error('Жаңарту сәтсіз')
    }
  }

  const removeTask = async (id: string) => {
    try {
      await deleteTaskApi(id)
      toast.success('Тапсырма өшірілді!')
      // Real-time обновит список автоматически
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
        activeTeamId,
        setActiveTeamId,
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
