import { LogOut } from 'lucide-react'

export default function Header({ onLogout, isDemoAccount }) {
  return (
    <header className="topbar">
      <div className="header-brand">
        <img src="/logo.svg" alt="Logo O Feirante" />
        <div>
          <p className="eyebrow">O Feirante</p>
          <h1>Controle sua banca</h1>
          {isDemoAccount && <span className="demo-pill">Conta teste</span>}
        </div>
      </div>
      <button className="icon-btn" onClick={onLogout} title="Sair">
        <LogOut size={20} />
      </button>
    </header>
  )
}
