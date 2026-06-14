import { BarChart3, Boxes, History, ShoppingBasket } from 'lucide-react'

export default function BottomNav({ page, setPage, hasActiveFair }) {
  const items = [
    { id: 'dashboard', label: 'Início', icon: BarChart3 },
    { id: 'estoque', label: 'Estoque', icon: Boxes },
    { id: hasActiveFair ? 'encerrar' : 'comecar', label: hasActiveFair ? 'Encerrar' : 'Feira', icon: ShoppingBasket },
    { id: 'historico', label: 'Histórico', icon: History },
  ]

  return (
    <nav className="bottom-nav">
      {items.map((item) => {
        const Icon = item.icon
        return (
          <button
            key={item.id}
            className={page === item.id ? 'nav-item active' : 'nav-item'}
            onClick={() => setPage(item.id)}
          >
            <Icon size={20} />
            <span>{item.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
