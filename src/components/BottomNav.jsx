import { BarChart3, Boxes, Brain, History, MapPinned, ShieldCheck, Truck } from 'lucide-react'

export default function BottomNav({ page, setPage, isAdmin = false }) {
  const items = [
    { id: 'dashboard', label: 'Início', icon: BarChart3 },
    { id: 'estoque', label: 'Estoque', icon: Boxes },
    { id: 'feiras', label: 'Feiras', icon: MapPinned },
    { id: 'entregas', label: 'Entrega', icon: Truck },
    { id: 'inteligencia', label: 'Análise', icon: Brain },
    { id: 'historico', label: 'Hist.', icon: History },
  ]

  if (isAdmin) {
    items.push({ id: 'admin', label: 'Gestão', icon: ShieldCheck })
  }

  return (
    <nav className="bottom-nav" style={{ '--nav-count': items.length }}>
      {items.map((item) => {
        const Icon = item.icon
        return (
          <button key={item.id} className={page === item.id ? 'nav-item active' : 'nav-item'} onClick={() => setPage(item.id)}>
            <Icon size={16} strokeWidth={2.4} />
            <span>{item.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
