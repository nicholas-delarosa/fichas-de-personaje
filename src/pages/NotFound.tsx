import { Link } from 'react-router'

export function NotFound() {
  return (
    <div className="page status-message">
      <p>* Aquí no hay nada.</p>
      <Link to="/" className="menu-item">Volver a mis fichas</Link>
    </div>
  )
}
