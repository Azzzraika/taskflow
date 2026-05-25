import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import type { Task, TaskStatus } from '@/types'
import TaskCard from './TaskCard'
import { Plus } from 'lucide-react'

interface TaskColumnProps {
  status: TaskStatus
  title: string
  tasks: Task[]
  color: string
  onEdit: (task: Task) => void
  onDelete: (id: string) => void
  onAdd: () => void
}

const statusConfig = {
  todo: { bg: 'bg-gray-50', border: 'border-gray-200', dot: 'bg-gray-400' },
  in_progress: { bg: 'bg-blue-50', border: 'border-blue-200', dot: 'bg-blue-500' },
  done: { bg: 'bg-green-50', border: 'border-green-200', dot: 'bg-green-500' },
}

export default function TaskColumn({
  status,
  title,
  tasks,
  color,
  onEdit,
  onDelete,
  onAdd,
}: TaskColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status })
  const config = statusConfig[status]

  return (
    <div
      className={`flex flex-col rounded-xl border-2 transition-colors ${
        isOver ? 'border-primary-400 bg-primary-50' : config.border
      } ${config.bg} min-h-[500px]`}
    >
      <div className="p-4 border-b border-gray-200/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${color}`} />
            <h2 className="font-semibold text-gray-900">{title}</h2>
            <span className="bg-white text-gray-600 text-xs font-medium px-2 py-0.5 rounded-full border border-gray-200">
              {tasks.length}
            </span>
          </div>
          <button
            onClick={onAdd}
            className="p-1 text-gray-400 hover:text-primary-600 hover:bg-white rounded transition-colors"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div ref={setNodeRef} className="flex-1 p-3 space-y-3">
        <SortableContext
          items={tasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </SortableContext>
        {tasks.length === 0 && (
          <div className="text-center py-8 text-gray-400 text-sm">
            Тапсырма жоқ
          </div>
        )}
      </div>
    </div>
  )
}
