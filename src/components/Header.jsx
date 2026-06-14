import { LogOut } from 'lucide-react'

export default function Header({ user, onLogout }) {
  return (
    <header className="topbar">
      <div>
        <p className="eyebrow">O Feirante</p>
        <h1>Controle sua banca</h1>
      </div>

      {user && (
        <button className="icon-btn" onClick={onLogout} title="Sair">
          <LogOut size={20} />
        </button>
      )}
    </header>
  )
}
