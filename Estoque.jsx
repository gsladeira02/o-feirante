import { LogOut } from 'lucide-react'

export default function Header({ onLogout }) {
  return (
    <header className="topbar">
      <div>
        <p className="eyebrow">O Feirante</p>
        <h1>Controle sua banca</h1>
      </div>
      <button className="icon-btn" onClick={onLogout} title="Sair">
        <LogOut size={20} />
      </button>
    </header>
  )
}
