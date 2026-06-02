import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/services/supabase'
import type { Task, Team, Notification } from '@/types'

interface TaskContextType {
  tasks: Task[]
  teams: Team[]
  notifications: Notification[]
  selectedTeamId: string | null
  loading: boolean
  setSelectedTeamId: (id: string | null) => void
  createTask: (task: Omit<Task, 'id' | 'created_at'>) => Promise<void>
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>
  deleteTask: (id: string) => Promise<void>
  refreshTasks: () => Promise<void>
  createTeam: (name: string, description: string) => Promise<void>
  joinTeam: (inviteCode: string) => Promise<void>
  markNotificationRead: (id: string) => Promise<void>
}

const TaskContext = createContext<TaskContextType | undefined>(undefined)

export function TaskProvider({ children }: { children: React.ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [selectedTeamId, setSelectedTeamIdState] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  
  // Ref для отслеживания текущей загрузки и предотвращения гонки
  const loadingRef = useRef(false)
  const lastLoadedTeamRef = useRef<string | null>(null)

  // Загрузка команд пользователя
  useEffect(() => {
    const loadTeams = async () => {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) return

      const { data: memberships } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', userData.user.id)

      if (!memberships?.length) {
        setTeams([])
        return
      }

      const teamIds = memberships.map(m => m.team_id)
      const { data: teamsData } = await supabase
        .from('teams')
        .select('*')
        .in('id', teamIds)

      setTeams(teamsData || [])
      
      // Выбираем первую команду по умолчанию ТОЛЬКО если ничего не выбрано
      if (!selectedTeamId && teamsData?.length) {
        setSelectedTeamIdState(teamsData[0].id)
      }
    }

    loadTeams()
  }, []) // ← Пустые зависимости! Загружаем команды только при монтировании

  // Загрузка задач при смене команды
  useEffect(() => {
    if (!selectedTeamId) {
      setTasks([])
      return
    }

    // Предотвращаем повторную загрузку той же команды
    if (lastLoadedTeamRef.current === selectedTeamId && !loadingRef.current) {
      return
    }

    const loadTasks = async () => {
      // Защита от параллельных запросов
      if (loadingRef.current) return
      
      loadingRef.current = true
      lastLoadedTeamRef.current = selectedTeamId
      setLoading(true)
      setTasks([]) // ← ОЧИЩАЕМ старые задачи сразу!

      try {
        const { data, error } = await supabase
          .from('tasks')
          .select('*')
          .eq('team_id', selectedTeamId)
          .order('created_at', { ascending: false })

        if (error) {
          console.error('Error fetching tasks:', error)
          setTasks([])
        } else {
          setTasks(data || [])
        }
      } finally {
        setLoading(false)
        loadingRef.current = false
      }
    }

    loadTasks()
  }, [selectedTeamId]) // ← Только selectedTeamId! НЕ tasks!

  // Real-time подписка
  useEffect(() => {
    if (!selectedTeamId) return

    const subscription = supabase
      .channel(`tasks:${selectedTeamId}`)
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'tasks', filter: `team_id=eq.${selectedTeamId}` },
        (payload) => {
          // Обновляем задачи локально, НЕ вызывая полную перезагрузку
          if (payload.eventType === 'INSERT') {
            setTasks(prev => [payload.new as Task, ...prev])
          } else if (payload.eventType === 'UPDATE') {
            setTasks(prev => prev.map(t => t.id === payload.new.id ? payload.new as Task : t))
          } else if (payload.eventType === 'DELETE') {
            setTasks(prev => prev.filter(t => t.id !== payload.old.id))
          }
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [selectedTeamId])

  const setSelectedTeamId = useCallback((id: string | null) => {
    if (id !== selectedTeamId) {
      setTasks([]) // ← Очистка при ручной смене
      setSelectedTeamIdState(id)
    }
  }, [selectedTeamId])

  const refreshTasks = useCallback(async () => {
    if (!selectedTeamId || loadingRef.current) return
    
    loadingRef.current = true
    setLoading(true)
    
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('team_id', selectedTeamId)
        .order('created_at', { ascending: false })

      if (!error) {
        setTasks(data || [])
      }
    } finally {
      setLoading(false)
      loadingRef.current = false
    }
  }, [selectedTeamId])

  const createTask = useCallback(async (task: Omit<Task, 'id' | 'created_at'>) => {
    const { error } = await supabase.from('tasks').insert(task)
    if (error) throw error
    // Real-time обновит список автоматически
  }, [])

  const updateTask = useCallback(async (id: string, updates: Partial<Task>) => {
    const { error } = await supabase.from('tasks').update(updates).eq('id', id)
    if (error) throw error
  }, [])

  const deleteTask = useCallback(async (id: string) => {
    const { error } = await supabase.from('tasks').delete().eq('id', id)
    if (error) throw error
  }, [])

  const createTeam = useCallback(async (name: string, description: string) => {
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) throw new Error('Not authenticated')

    const { data: team, error } = await supabase
      .from('teams')
      .insert({ name, description, owner_id: userData.user.id })
      .select()
      .single()

    if (error) throw error

    await supabase.from('team_members').insert({
      team_id: team.id,
      user_id: userData.user.id,
      role: 'owner'
    })

    setTeams(prev => [...prev, team])
  }, [])

  const joinTeam = useCallback(async (inviteCode: string) => {
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) throw new Error('Not authenticated')

    const { data: team } = await supabase
      .from('teams')
      .select('*')
      .eq('invite_code', inviteCode)
      .single()

    if (!team) throw new Error('Invalid invite code')

    const { error } = await supabase.from('team_members').insert({
      team_id: team.id,
      user_id: userData.user.id,
      role: 'member'
    })

    if (error) throw error
    
    setTeams(prev => [...prev, team])
  }, [])

  const markNotificationRead = useCallback(async (id: string) => {
    await supabase.from('notifications').update({ read: true }).eq('id', id)
    setNotifications(prev => prev.filter(n => n.id !== id))
  }, [])

  return (
    <TaskContext.Provider value={{
      tasks,
      teams,
      notifications,
      selectedTeamId,
      loading,
      setSelectedTeamId,
      createTask,
      updateTask,
      deleteTask,
      refreshTasks,
      createTeam,
      joinTeam,
      markNotificationRead
    }}>
      {children}
    </TaskContext.Provider>
  )
}

export function useTaskContext() {
  const ctx = useContext(TaskContext)
  if (!ctx) throw new Error('useTaskContext must be used within TaskProvider')
  return ctx
}
