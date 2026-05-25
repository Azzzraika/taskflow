import { useState, useMemo, useEffect } from 'react'
import {
  DndContext,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import type { Task, TaskStatus } from '@/types'
import { useAuth } from '@/context/AuthContext'
import { useTask } from '@/context/TaskContext'
import TaskColumn from '@/components/TaskColumn'
import TaskModal from '@/components/TaskModal'
import TaskCard from '@/components/TaskCard'
import { Plus, Filter, Search } from 'lucide-react'

const columns: { status: TaskStatus; title: string; color: string }[] = [
  { status: 'todo', title: 'Күтуде', color: 'bg-gray-400' },
  { status: 'in_progress', title: 'Орындалуда', color: 'bg-blue-500' },
  { status: 'done', title: 'Дайын', color: 'bg-green-500' },
]

export default function DashboardPage() {
  const { user } = useAuth()
  const { 
    tasks, 
    teams, 
    updateTaskStatus, 
    createTask, 
    editTask, 
    removeTask,
    refreshTasks,
    loading: tasksLoading 
  } = useTask()

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [modalStatus, setModalStatus] = useState<TaskStatus>('todo')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterPriority, setFilterPriority] = useState<string>('all')
  const [activeTeam, setActiveTeam] = useState<string>('')
  const [activeDragTask, setActiveDragTask] = useState<Task | null>(null)
  const [localTasks, setLocalTasks] = useState<Task[]>([])

  // Sync with context tasks
  useEffect(() => {
    setLocalTasks(tasks)
  }, [tasks])

  // Auto-select first team
  useEffect(() => {
    if (teams.length > 0 && !activeTeam) {
      setActiveTeam(teams[0].id)
    }
  }, [teams, activeTeam])

  // Load tasks when team changes
  useEffect(() => {
    if (activeTeam) {
      refreshTasks(activeTeam)
    }
  }, [activeTeam])

  const filteredTasks = useMemo(() => {
    let result = [...localTasks]

    if (searchQuery) {
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    }

    if (filterPriority !== 'all') {
      result = result.filter((t) => t.priority === filterPriority)
    }

    return result
  }, [localTasks, searchQuery, filterPriority])

  const tasksByStatus = useMemo(() => {
    return {
      todo: filteredTasks.filter((t) => t.status === 'todo'),
      in_progress: filteredTasks.filter((t) => t.status === 'in_progress'),
      done: filteredTasks.filter((t) => t.status === 'done'),
    }
  }, [filteredTasks])

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveDragTask(null)

    if (!over) return

    const taskId = active.id as string
    const overId = over.id as string

    // Check if dropped on a column
    const columnStatus = columns.find((c) => c.status === overId)?.status
    if (columnStatus) {
      // Optimistic update
      setLocalTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: columnStatus } : t))
      )
      updateTaskStatus(taskId, columnStatus)
      return
    }

    // Check if dropped on another task
    const overTask = localTasks.find((t) => t.id === overId)
    if (overTask && overTask.id !== taskId) {
      const draggedTask = localTasks.find((t) => t.id === taskId)
      if (draggedTask && overTask.status !== draggedTask.status) {
        setLocalTasks((prev) =>
          prev.map((t) => (t.id === taskId ? { ...t, status: overTask.status } : t))
        )
        updateTaskStatus(taskId, overTask.status)
      }
    }
  }

  const handleDragStart = (event: DragStartEvent) => {
    const taskId = String(event.active.id)
    const task = localTasks.find((t) => t.id === taskId)
    if (task) setActiveDragTask(task)
  }

  const handleAddTask = (status: TaskStatus) => {
    setEditingTask(null)
    setModalStatus(status)
    setIsModalOpen(true)
  }

  const handleEditTask = (task: Task) => {
    setEditingTask(task)
    setModalStatus(task.status)
    setIsModalOpen(true)
  }

  const handleSubmit = async (taskData: Partial<Task>) => {
    if (editingTask) {
      await editTask({ ...editingTask, ...taskData } as Task)
    } else {
      await createTask({
        title: taskData.title!,
        description: taskData.description || '',
        status: (taskData.status as TaskStatus) || modalStatus,
        priority: taskData.priority || 'medium',
        assignee_id: user?.id || null,
        team_id: activeTeam,
        deadline: taskData.deadline || null,
        created_by: user?.id || '',
      })
    }
  }

  if (teams.length === 0 && !tasksLoading) {
    return (
      <div className="text-center py-20">
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Plus className="w-10 h-10 text-gray-400" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Командалар жоқ
        </h2>
        <p className="text-gray-600 mb-6">
          Тапсырмаларды басқару үшін алдымен команда құрыңыз немесе қосылыңыз
        </p>
        <a href="/team" className="btn-primary inline-flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Команда құру
        </a>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Тапсырмалар тақтасы</h1>
          <p className="text-gray-600 mt-1">
            Тапсырмаларды сүйреп, мәртебесін өзгертіңіз
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Team Selector */}
          <select
            value={activeTeam}
            onChange={(e) => setActiveTeam(e.target.value)}
            className="input-field w-auto"
          >
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Іздеу..."
              className="input-field pl-9 w-48"
            />
          </div>

          {/* Priority Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="input-field pl-9 w-40"
            >
              <option value="all">Барлық приоритет</option>
              <option value="high">Жоғары</option>
              <option value="medium">Орташа</option>
              <option value="low">Төмен</option>
            </select>
          </div>

          <button
            onClick={() => handleAddTask('todo')}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Жаңа тапсырма
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {columns.map((col) => (
          <div key={col.status} className="card py-4">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${col.color}`} />
              <span className="text-sm text-gray-600">{col.title}</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {tasksByStatus[col.status].length}
            </p>
          </div>
        ))}
      </div>

      {/* Loading */}
      {tasksLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
        </div>
      )}

      {/* Kanban Board */}
      {!tasksLoading && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {columns.map((col) => (
              <TaskColumn
                key={col.status}
                status={col.status}
                title={col.title}
                tasks={tasksByStatus[col.status]}
                color={col.color}
                onEdit={handleEditTask}
                onDelete={removeTask}
                onAdd={() => handleAddTask(col.status)}
              />
            ))}
          </div>

          <DragOverlay>
            {activeDragTask ? (
              <div className="opacity-90 rotate-2">
                <TaskCard
                  task={activeDragTask}
                  onEdit={() => {}}
                  onDelete={() => {}}
                />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      <TaskModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setEditingTask(null)
        }}
        onSubmit={handleSubmit}
        task={editingTask}
        teamId={activeTeam}
        defaultStatus={modalStatus}
      />
    </div>
  )
}
