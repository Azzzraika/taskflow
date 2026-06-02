import { useState, useMemo } from 'react'
import { useTaskContext } from '@/context/TaskContext'
import { DndContext, DragEndEvent } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import TaskCard from '@/components/TaskCard'
import TaskModal from '@/components/TaskModal'
import { Plus, Search, Filter, Loader2 } from 'lucide-react'

const COLUMNS = [
  { id: 'todo', title: 'Күтуде', color: 'bg-gray-50 border-gray-200' },
  { id: 'in_progress', title: 'Орындалуда', color: 'bg-blue-50 border-blue-200' },
  { id: 'done', title: 'Дайын', color: 'bg-green-50 border-green-200' },
]

export default function DashboardPage() {
  const { 
    tasks, 
    teams, 
    selectedTeamId, 
    loading, 
    setSelectedTeamId, 
    updateTask,
    createTask 
  } = useTaskContext()
  
  const [search, setSearch] = useState('')
  const [filterPriority, setFilterPriority] = useState<string>('all')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [modalStatus, setModalStatus] = useState<string>('todo')

  // Ключ для принудительного ре-mount при смене команды
  const boardKey = selectedTeamId || 'no-team'

  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      const matchesSearch = task.title.toLowerCase().includes(search.toLowerCase()) ||
        task.description?.toLowerCase().includes(search.toLowerCase())
      const matchesPriority = filterPriority === 'all' || task.priority === filterPriority
      return matchesSearch && matchesPriority
    })
  }, [tasks, search, filterPriority])

  const tasksByStatus = useMemo(() => ({
    todo: filteredTasks.filter(t => t.status === 'todo'),
    in_progress: filteredTasks.filter(t => t.status === 'in_progress'),
    done: filteredTasks.filter(t => t.status === 'done'),
  }), [filteredTasks])

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over) return

    const taskId = active.id as string
    const newStatus = over.id as string
    
    if (['todo', 'in_progress', 'done'].includes(newStatus)) {
      await updateTask(taskId, { status: newStatus })
    }
  }

  const openCreateModal = (status: string) => {
    setEditingTask(null)
    setModalStatus(status)
    setIsModalOpen(true)
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Тапсырмалар тақтасы</h1>
          <p className="text-gray-500 mt-1">Тапсырмаларды сүйреп, мәртебесін өзгертіңіз</p>
        </div>
        
        <div className="flex items-center gap-3 flex-wrap">
          {/* Team Selector */}
          <select
            value={selectedTeamId || ''}
            onChange={(e) => setSelectedTeamId(e.target.value || null)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none bg-white"
          >
            {teams.map(team => (
              <option key={team.id} value={team.id}>{team.name}</option>
            ))}
          </select>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Іздеу..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none w-48"
            />
          </div>

          {/* Priority Filter */}
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none bg-white"
          >
            <option value="all">Барлық приоритет</option>
            <option value="high">Жоғары</option>
            <option value="medium">Орташа</option>
            <option value="low">Төмен</option>
          </select>

          <button
            onClick={() => openCreateModal('todo')}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Жаңа тапсырма
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {COLUMNS.map(col => (
          <div key={col.id} className={`card ${col.color}`}>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${
                col.id === 'todo' ? 'bg-gray-400' : 
                col.id === 'in_progress' ? 'bg-blue-500' : 'bg-green-500'
              }`} />
              <span className="text-sm font-medium text-gray-600">{col.title}</span>
            </div>
            <p className="text-2xl font-bold mt-2">
              {loading ? '-' : tasksByStatus[col.id as keyof typeof tasksByStatus].length}
            </p>
          </div>
        ))}
      </div>

      {/* Board — key принудительно пересоздаёт при смене команды */}
      <DndContext onDragEnd={handleDragEnd} key={boardKey}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {COLUMNS.map(column => (
            <div 
              key={column.id} 
              className={`card ${column.color} min-h-[400px]`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    column.id === 'todo' ? 'bg-gray-400' : 
                    column.id === 'in_progress' ? 'bg-blue-500' : 'bg-green-500'
                  }`} />
                  <h3 className="font-semibold">{column.title}</h3>
                  <span className="text-sm text-gray-500 bg-white px-2 py-0.5 rounded-full">
                    {loading ? '...' : tasksByStatus[column.id as keyof typeof tasksByStatus].length}
                  </span>
                </div>
                <button 
                  onClick={() => openCreateModal(column.id)}
                  className="text-gray-400 hover:text-primary-600 transition-colors"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>

              {/* Loading State */}
              {loading ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                  <Loader2 className="w-8 h-8 animate-spin mb-2" />
                  <span className="text-sm">Жүктелуде...</span>
                </div>
              ) : tasksByStatus[column.id as keyof typeof tasksByStatus].length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <p>Тапсырма жоқ</p>
                </div>
              ) : (
                <SortableContext 
                  items={tasksByStatus[column.id as keyof typeof tasksByStatus].map(t => t.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-3">
                    {tasksByStatus[column.id as keyof typeof tasksByStatus].map(task => (
                      <TaskCard 
                        key={task.id} 
                        task={task}
                        onEdit={() => {
                          setEditingTask(task)
                          setModalStatus(task.status)
                          setIsModalOpen(true)
                        }}
                      />
                    ))}
                  </div>
                </SortableContext>
              )}
            </div>
          ))}
        </div>
      </DndContext>

      {isModalOpen && (
        <TaskModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false)
            setEditingTask(null)
          }}
          task={editingTask}
          status={modalStatus}
          teamId={selectedTeamId!}
        />
      )}
    </div>
  )
}
