import { money, number } from '../utils/format'

export default function Historico({ fairs }) {
  return (
    <main className="page">
      <h2>Histórico</h2>

      <section className="list">
        {fairs.map((fair) => (
          <article className="history-card" key={fair.id}>
            <div>
              <strong>{fair.name}</strong>
              <span>{new Date(fair.closed_at || fair.created_at).toLocaleDateString('pt-BR')}</span>
            </div>

            <div className="result-grid">
              <div>
                <small>Faturamento</small>
                <strong>{money(fair.revenue_total)}</strong>
              </div>
              <div>
                <small>Lucro</small>
                <strong>{money(fair.profit_total)}</strong>
              </div>
              <div>
                <small>Perdas</small>
                <strong>{money(fair.loss_total)}</strong>
              </div>
            </div>

            <details>
              <summary>Ver produtos</summary>
              {(fair.fair_items || []).map((item) => (
                <p key={item.id}>
                  {item.product_name}: vendeu {number(item.quantity_sold)} {item.unit}
                </p>
              ))}
            </details>
          </article>
        ))}

        {!fairs.length && <p className="empty">Nenhuma feira encerrada ainda.</p>}
      </section>
    </main>
  )
}
