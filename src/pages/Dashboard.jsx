import { money } from '../utils/format'
import { buildProductStats, getCurrentMonthTotals } from '../utils/analytics'

export default function Dashboard({ products, fairs, activeFair, setPage }) {
  const month = getCurrentMonthTotals(fairs)
  const productStats = buildProductStats(fairs)
  const topProduct = [...productStats].sort((a, b) => b.profit - a.profit)[0]

  return (
    <main className="page">
      <section className="hero">
        <p>Resultado do mês</p>
        <h2>{money(month.revenue)}</h2>
        <span>Lucro estimado: {money(month.profit)}</span>
      </section>

      {activeFair ? (
        <button className="action-card danger" onClick={() => setPage('encerrar')}>
          <strong>Feira em andamento</strong>
          <span>{activeFair.name}</span>
          <small>Toque para encerrar e calcular.</small>
        </button>
      ) : (
        <button className="action-card success" onClick={() => setPage('feiras')}>
          <strong>Iniciar feira</strong>
          <span>Escolha uma feira cadastrada.</span>
        </button>
      )}

      <div className="stats-grid">
        <div className="stat"><small>Produtos</small><strong>{products.length}</strong></div>
        <div className="stat"><small>Feiras no mês</small><strong>{month.count}</strong></div>
        <div className="stat"><small>Perdas</small><strong>{money(month.lossValue)}</strong></div>
      </div>

      <section className="section">
        <button className="intelligence-banner" onClick={() => setPage('inteligencia')}>
          <strong>Inteligência da banca</strong>
          <span>
            {topProduct
              ? `Produto mais lucrativo: ${topProduct.name} (${money(topProduct.profit)})`
              : 'Veja produtos mais vendidos, lucro, perdas e sugestões.'}
          </span>
        </button>
      </section>

      <section className="section">
        <h3>Ações rápidas</h3>
        <div className="quick-grid">
          <button onClick={() => setPage('estoque')}>Estoque</button>
          <button onClick={() => setPage('categorias')}>Categorias</button>
          <button onClick={() => setPage('feiras')}>Feiras</button>
          <button onClick={() => setPage('compras')}>Entrada</button>
          <button onClick={() => setPage('historico')}>Histórico</button>
          <button onClick={() => setPage('inteligencia')}>Inteligência</button>
        </div>
      </section>
    </main>
  )
}
