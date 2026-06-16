import { BarChart3, Boxes, Brain, History, MapPinned, ShieldCheck } from 'lucide-react'

export default function BottomNav({ page, setPage, isAdmin = false }) {
  const items = [
    { id: 'dashboard', label: 'Início', icon: BarChart3 },
    { id: 'estoque', label: 'Estoque', icon: Boxes },
    { id: 'feiras', label: 'Feiras', icon: MapPinned },
    { id: 'inteligencia', label: 'Análise', icon: Brain },
    { id: 'historico', label: 'Histórico', icon: History },
  ]

  if (isAdmin) {
    items.push({ id: 'admin', label: 'Admin', icon: ShieldCheck })
  }

  return (
    <nav className="bottom-nav">
      {items.map((item) => {
        const Icon = item.icon
        return (
          <button key={item.id} className={page === item.id ? 'nav-item active' : 'nav-item'} onClick={() => setPage(item.id)}>
            <Icon size={20} />
            <span>{item.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
