import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from './supabase'
import { cloudRepo, localRepo, type Repo } from './store'

interface Session {
  user: User | null
  displayName: string | null
  ready: boolean
  repo: Repo
  signIn(provider: 'google' | 'github'): Promise<void>
  signOut(): Promise<void>
}

const SessionContext = createContext<Session | null>(null)

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [ready, setReady] = useState(!supabase)

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null)
      setReady(true)
    })
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null))
    return () => data.subscription.unsubscribe()
  }, [])

  const value = useMemo<Session>(() => ({
    user,
    displayName: (user?.user_metadata.full_name as string | undefined) ?? (user?.user_metadata.user_name as string | undefined) ?? user?.email ?? null,
    ready,
    repo: user ? cloudRepo(user.id) : localRepo,
    async signIn(provider) {
      await supabase?.auth.signInWithOAuth({ provider, options: { redirectTo: window.location.origin + '/' } })
    },
    async signOut() {
      await supabase?.auth.signOut()
    }
  }), [user, ready])

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSession() {
  const session = useContext(SessionContext)
  if (!session) throw new Error('useSession fuera de SessionProvider')
  return session
}
