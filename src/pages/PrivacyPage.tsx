import { Link } from 'react-router'

// Política de privacidad y condiciones de uso (Google las pide para publicar el login con Google)
export default function PrivacyPage() {
  return (
    <div className="page narrow legal">
      <h1 className="page-title">Privacidad y condiciones</h1>

      <section className="box">
        <h2 className="box-title">Qué datos guardamos</h2>
        <ul className="sheet-list">
          <li>Al entrar con GitHub o Google: tu nombre, tu correo y tu foto de perfil, solo para identificarte y mostrarte como autor de tus fichas.</li>
          <li>Las fichas, plantillas y mundos que creas, y las imágenes de avatar que subes.</li>
          <li>En modo invitado no se guarda nada en nuestros servidores: todo queda en tu navegador.</li>
        </ul>
      </section>

      <section className="box">
        <h2 className="box-title">Dónde y quién los ve</h2>
        <ul className="sheet-list">
          <li>Los datos se guardan en Supabase (base de datos y almacenamiento) y el sitio se sirve desde Vercel.</li>
          <li>Tus fichas son privadas por defecto. Solo las ve otra persona si eliges “Con enlace” o “Pública”.</li>
          <li>No vendemos ni compartimos tus datos con nadie, y no usamos publicidad ni rastreadores.</li>
        </ul>
      </section>

      <section className="box">
        <h2 className="box-title">Borrar tus datos</h2>
        <p className="sheet-text">
          Puedes borrar cualquier ficha desde su página. Para borrar tu cuenta y todo lo que contiene, escribe a{' '}
          <a className="link" href="mailto:nicholasandresdelarosarivera@hotmail.com">nicholasandresdelarosarivera@hotmail.com</a>.
        </p>
      </section>

      <section className="box">
        <h2 className="box-title">Condiciones de uso</h2>
        <ul className="sheet-list">
          <li>El servicio es gratuito y se ofrece tal cual, sin garantías de disponibilidad.</li>
          <li>Eres responsable del contenido que publicas. No subas contenido ilegal ni que no tengas derecho a usar.</li>
          <li>Podemos retirar contenido público que incumpla estas condiciones.</li>
        </ul>
      </section>

      <Link to="/" className="menu-item">Volver a mis fichas</Link>
    </div>
  )
}
