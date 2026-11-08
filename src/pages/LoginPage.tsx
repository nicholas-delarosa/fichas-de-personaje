import { Navigate } from 'react-router'
import { useSession } from '../lib/session'
import { authProviders, cloudEnabled } from '../lib/supabase'

export default function LoginPage() {
  const { user, signIn } = useSession()
  if (user || !cloudEnabled) return <Navigate to="/" replace />

  return (
    <div className="page narrow">
      <h1 className="page-title">Entrar</h1>
      <section className="box login-box">
        <p>Con una cuenta tus fichas se guardan en la nube y puedes compartirlas con un enlace o publicarlas en Explorar.</p>
        <div className="login-options">
          {authProviders.includes('github') && <button type="button" className="menu-item" onClick={() => signIn('github')}>Entrar con GitHub</button>}
          {authProviders.includes('google') && <button type="button" className="menu-item" onClick={() => signIn('google')}>Entrar con Google</button>}
        </div>
        <p className="muted">Si ya tienes fichas en modo invitado, al entrar te ofrecemos pasarlas a tu cuenta.</p>
      </section>
    </div>
  )
}
