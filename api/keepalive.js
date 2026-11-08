// Supabase (plan gratis) pausa el proyecto tras ~1 semana sin actividad.
// Vercel llama a esta función una vez al día (ver "crons" en vercel.json) y hace una consulta mínima.
export async function GET() {
  const url = process.env.VITE_SUPABASE_URL
  const key = process.env.VITE_SUPABASE_ANON_KEY
  if (!url || !key) return Response.json({ ok: false, error: 'Faltan las variables de Supabase' }, { status: 500 })

  const res = await fetch(`${url}/rest/v1/characters?select=id&limit=1`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` }
  })
  return Response.json({ ok: res.ok, status: res.status, at: new Date().toISOString() }, { status: res.ok ? 200 : 502 })
}
