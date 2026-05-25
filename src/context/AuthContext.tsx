import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import type { Profile } from '@/types'
import { 
  signUp as supabaseSignUp, 
  signIn as supabaseSignIn, 
  signOut as supabaseSignOut,
  getCurrentSession,
  getCurrentUser,
  onAuthStateChange,
  getProfile
} from '@/services/supabase'
import toast from 'react-hot-toast'

interface AuthContextType {
  user: Profile | null
  session: any
  login: (email: string, password: string) => Promise<boolean>
  register: (name: string, email: string, password: string) => Promise<boolean>
  logout: () => Promise<void>
  loading: boolean
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null)
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const loadUser = async (currentSession: any) => {
    if (currentSession?.user) {
      const profile = await getProfile(currentSession.user.id)
      setUser(profile)
    } else {
      setUser(null)
    }
  }

  useEffect(() => {
    // Check initial session
    getCurrentSession().then((currentSession) => {
      setSession(currentSession)
      loadUser(currentSession)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = onAuthStateChange((_event, currentSession) => {
      setSession(currentSession)
      loadUser(currentSession)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const { data, error } = await supabaseSignIn(email, password)
      if (error) {
        toast.error(error.message === 'Invalid login credentials' 
          ? 'Email немесе құпия сөз дұрыс емес' 
          : error.message)
        return false
      }
      if (data.session) {
        setSession(data.session)
        await loadUser(data.session)
        toast.success('Қош келдіңіз!')
        return true
      }
      return false
    } catch (err) {
      toast.error('Кіру қатесі')
      return false
    }
  }

  const register = async (name: string, email: string, password: string): Promise<boolean> => {
    try {
      const { data, error } = await supabaseSignUp(email, password, name)
      if (error) {
        toast.error(error.message === 'User already registered'
          ? 'Бұл email бұрыннан тіркелген'
          : error.message)
        return false
      }
      if (data.session) {
        setSession(data.session)
        await loadUser(data.session)
        toast.success('Тіркелу сәтті өтті!')
        return true
      }
      // Email confirmation required
      toast.success('Тіркелу сәтті! Email растауыңызды тексеріңіз.')
      return true
    } catch (err) {
      toast.error('Тіркелу қатесі')
      return false
    }
  }

  const logout = async () => {
    await supabaseSignOut()
    setUser(null)
    setSession(null)
    toast.success('Сіз жүйеден шықтыңыз')
  }

  const refreshUser = async () => {
    const currentUser = await getCurrentUser()
    if (currentUser) {
      const profile = await getProfile(currentUser.id)
      setUser(profile)
    }
  }

  return (
    <AuthContext.Provider value={{ user, session, login, register, logout, loading, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
