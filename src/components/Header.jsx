import { LogOut, UserRound } from 'lucide-react'

export default function Header({ onLogout, isDemoAccount, onProfileClick }) {
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
      <div className="header-actions">
        <button className="icon-btn" onClick={onProfileClick} title="Dados cadastrais" aria-label="Dados cadastrais">
          <UserRound size={19} />
        </button>
        <button className="icon-btn" onClick={onLogout} title="Sair" aria-label="Sair">
          <LogOut size={20} />
        </button>
      </div>
    </header>
  )
}
