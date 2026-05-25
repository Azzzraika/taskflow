import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useTask } from '@/context/TaskContext'
import { Copy, Users, Plus, Link2, Crown, UserCheck } from 'lucide-react'
import toast from 'react-hot-toast'

export default function TeamPage() {
  const { user } = useAuth()
  const { teams, createTeam, joinTeam, loading } = useTask()
  const navigate = useNavigate()

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showJoinModal, setShowJoinModal] = useState(false)
  const [teamName, setTeamName] = useState('')
  const [teamDesc, setTeamDesc] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [creating, setCreating] = useState(false)
  const [joining, setJoining] = useState(false)

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!teamName.trim()) return

    setCreating(true)
    const createdTeam = await createTeam(teamName.trim(), teamDesc.trim())
    setTeamName('')
    setTeamDesc('')
    setShowCreateModal(false)
    setCreating(false)

    if (createdTeam) {
      navigate('/')
    }
  }

  const handleJoinTeam = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteCode.trim()) return

    setJoining(true)
    const success = await joinTeam(inviteCode.trim().toUpperCase())
    if (!success) {
      toast.error('Қате шақыру коды немесе сіз бұл командадасыз')
    }
    setInviteCode('')
    setShowJoinModal(false)
    setJoining(false)
  }

  const copyInviteCode = (code: string) => {
    navigator.clipboard.writeText(code)
    toast.success('Шақыру коды көшірілді!')
  }

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'owner':
        return { label: 'Иесі', icon: Crown, color: 'text-yellow-600 bg-yellow-50' }
      case 'admin':
        return { label: 'Админ', icon: UserCheck, color: 'text-blue-600 bg-blue-50' }
      default:
        return { label: 'Мүше', icon: Users, color: 'text-gray-600 bg-gray-50' }
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Менің командаларым</h1>
          <p className="text-gray-600 mt-1">
            Команда құрыңыз немесе шақыру коды арқылы қосылыңыз
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowJoinModal(true)}
            className="btn-secondary flex items-center gap-2"
          >
            <Link2 className="w-4 h-4" />
            Қосылу
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Команда құру
          </button>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
        </div>
      )}

      {!loading && teams.length === 0 ? (
        <div className="text-center py-20 card">
          <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Командалар жоқ
          </h3>
          <p className="text-gray-500 max-w-md mx-auto">
            Жұмыс жасау үшін командалар құрыңыз немесе бар командаларға қосылыңыз
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {teams.map((team) => {
            const myRole = team.team_members?.find((m) => m.user_id === user?.id)?.role
            const roleInfo = getRoleLabel(myRole || 'member')
            const RoleIcon = roleInfo.icon

            return (
              <div key={team.id} className="card hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center">
                    <Users className="w-6 h-6 text-primary-600" />
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${roleInfo.color}`}
                  >
                    <RoleIcon className="w-3 h-3" />
                    {roleInfo.label}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-gray-900 mb-1">
                  {team.name}
                </h3>
                {team.description && (
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                    {team.description}
                  </p>
                )}

                <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                  <Users className="w-4 h-4" />
                  <span>{team.team_members?.length || 0} мүше</span>
                </div>

                {team.owner_id === user?.id && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <label className="text-xs font-medium text-gray-600 mb-1 block">
                      Шақыру коды
                    </label>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 bg-white border border-gray-200 rounded px-3 py-1.5 text-sm font-mono text-gray-700">
                        {team.invite_code}
                      </code>
                      <button
                        onClick={() => copyInviteCode(team.invite_code)}
                        className="p-2 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                        title="Көшіру"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Create Team Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Жаңа команда</h2>
            </div>
            <form onSubmit={handleCreateTeam} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Команда аты *
                </label>
                <input
                  type="text"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  className="input-field"
                  placeholder="Мысалы: Дизайн тобы"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Сипаттама
                </label>
                <textarea
                  value={teamDesc}
                  onChange={(e) => setTeamDesc(e.target.value)}
                  className="input-field min-h-[80px] resize-none"
                  placeholder="Команда не істейді..."
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn-secondary"
                >
                  Болдырмау
                </button>
                <button 
                  type="submit" 
                  className="btn-primary"
                  disabled={creating}
                >
                  {creating ? 'Құру...' : 'Құру'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Join Team Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Командаларға қосылу</h2>
            </div>
            <form onSubmit={handleJoinTeam} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Шақыру коды *
                </label>
                <input
                  type="text"
                  value={inviteCode}
                  onChange={(e) =>
                    setInviteCode(e.target.value.toUpperCase())
                  }
                  className="input-field font-mono uppercase"
                  placeholder="ABCDEF12"
                  maxLength={8}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Команда иесінен шақыру кодын сұраңыз
                </p>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowJoinModal(false)}
                  className="btn-secondary"
                >
                  Болдырмау
                </button>
                <button 
                  type="submit" 
                  className="btn-primary"
                  disabled={joining}
                >
                  {joining ? 'Қосылу...' : 'Қосылу'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
