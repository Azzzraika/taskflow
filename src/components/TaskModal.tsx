import { useState, useEffect } from 'react'
import type { Task, TaskStatus } from '@/types'
import { X, Calendar } from 'lucide-react'

interface TaskModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (task: Partial<Task>) => void
  task?: Task | null
  teamId: string
  defaultStatus?: TaskStatus
}

export default function TaskModal({
  isOpen,
  onClose,
  onSubmit,
  task,
  teamId,
  defaultStatus = 'todo',
}: TaskModalProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<TaskStatus>(defaultStatus)
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium')
  const [deadline, setDeadline] = useState('')

  useEffect(() => {
    if (task) {
      setTitle(task.title)
      setDescription(task.description || '')
      setStatus(task.status)
      setPriority(task.priority)
      setDeadline(task.deadline ? task.deadline.split('T')[0] : '')
    } else {
      setTitle('')
      setDescription('')
      setStatus(defaultStatus)
      setPriority('medium')
      setDeadline('')
    }
  }, [task, defaultStatus, isOpen])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    onSubmit({
      id: task?.id,
      title: title.trim(),
      description: description.trim() || null,
      status,
      priority,
      deadline: deadline ? new Date(deadline).toISOString() : null,
      team_id: teamId,
      assignee_id: task?.assignee_id || null,
      created_by: task?.created_by,
    })
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">
            {task ? 'Тапсырманы өңдеу' : 'Жаңа тапсырма'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Тақырып *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input-field"
              placeholder="Тапсырма тақырыбы"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Сипаттама
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input-field min-h-[100px] resize-none"
              placeholder="Тапсырма сипаттамасы..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Мәртебе
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
                className="input-field"
              >
                <option value="todo">Күтуде</option>
                <option value="in_progress">Орындалуда</option>
                <option value="done">Дайын</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Приоритет
              </label>
              <select
                value={priority}
                onChange={(e) =>
                  setPriority(e.target.value as 'low' | 'medium' | 'high')
                }
                className="input-field"
              >
                <option value="low">Төмен</option>
                <option value="medium">Орташа</option>
                <option value="high">Жоғары</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <span className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Дедлайн
              </span>
            </label>
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="input-field"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="btn-secondary">
              Болдырмау
            </button>
            <button type="submit" className="btn-primary">
              {task ? 'Сақтау' : 'Құру'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
