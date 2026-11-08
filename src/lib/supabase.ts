import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

// Sin las variables de entorno la app funciona igual, en modo invitado (todo en este navegador)
export const supabase: SupabaseClient | null = url && key ? createClient(url, key) : null
export const cloudEnabled = supabase !== null

// Proveedores de login activados en Supabase (separados por coma). Solo se muestran esos botones
export const authProviders = ((import.meta.env.VITE_AUTH_PROVIDERS as string | undefined) ?? 'github')
  .split(',')
  .map((p) => p.trim())
