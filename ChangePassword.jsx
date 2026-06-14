import { money } from '../utils/format'

export default function Dashboard({ products, fairs, activeFair, setPage }) {
  const monthRevenue = fairs.reduce((sum, fair) => sum + Number(fair.revenue_total || 0), 0)
  const monthProfit = fairs.reduce((sum, fair) => sum + Number(fair.profit_total || 0), 0)
  const monthLoss = fairs.reduce((sum, fair) => sum + Number(fair.loss_total || 0), 0)

  return (
    <main className="page">
      <section className="hero">
        <p>Resultado do mês</p>
        <h2>{money(monthRevenue)}</h2>
        <span>Lucro estimado: {money(monthProfit)}</span>
      </section>

      {activeFair ? (
        <button className="action-card danger" onClick={() => setPage('encerrar')}>
          <strong>Feira em andamento</strong>
          <span>{activeFair.name}</span>
          <small>Toque para encerrar e calcular o resultado.</small>
        </button>
      ) : (
        <button className="action-card success" onClick={() => setPage('feiras')}>
          <strong>Minhas feiras</strong>
          <span>Escolha uma feira cadastrada para iniciar.</span>
        </button>
      )}

      <div className="stats-grid">
        <div className="stat">
          <small>Produtos</small>
          <strong>{products.length}</strong>
        </div>
        <div className="stat">
          <small>Feiras encerradas</small>
          <strong>{fairs.length}</strong>
        </div>
        <div className="stat">
          <small>Perdas</small>
          <strong>{money(monthLoss)}</strong>
        </div>
      </div>

      <section className="section">
        <h3>Ações rápidas</h3>
        <div className="quick-grid">
          <button onClick={() => setPage('estoque')}>Estoque</button>
          <button onClick={() => setPage('categorias')}>Categorias</button>
          <button onClick={() => setPage('feiras')}>Feiras</button>
          <button onClick={() => setPage('compras')}>Compra</button>
          <button onClick={() => setPage('historico')}>Histórico</button>
        </div>
      </section>
    </main>
  )
}
