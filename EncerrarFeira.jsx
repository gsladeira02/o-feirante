import { money } from '../utils/format'

export default function Dashboard({ products, fairs, activeFair, setPage }) {
  const revenue = fairs.reduce((sum, fair) => sum + Number(fair.revenue_total || 0), 0)
  const profit = fairs.reduce((sum, fair) => sum + Number(fair.profit_total || 0), 0)
  const loss = fairs.reduce((sum, fair) => sum + Number(fair.loss_total || 0), 0)

  return (
    <main className="page">
      <section className="hero">
        <p>Resultado registrado</p>
        <h2>{money(revenue)}</h2>
        <span>Lucro estimado: {money(profit)}</span>
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
        <div className="stat"><small>Feiras feitas</small><strong>{fairs.length}</strong></div>
        <div className="stat"><small>Perdas</small><strong>{money(loss)}</strong></div>
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
