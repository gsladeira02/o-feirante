import { getItemCategoryName, sortFairItemsByCategoryName } from '../services/api'
import { dateBR, money, qty } from '../utils/format'

function groupFairItems(items = []) {
  const map = new Map()
  sortFairItemsByCategoryName(items).forEach((item) => {
    const categoryName = getItemCategoryName(item)
    if (!map.has(categoryName)) map.set(categoryName, [])
    map.get(categoryName).push(item)
  })

  return Array.from(map.entries()).map(([name, categoryItems]) => ({
    name,
    items: sortFairItemsByCategoryName(categoryItems),
  }))
}

export default function Historico({ fairs }) {
  const groups = fairs.reduce((acc, fair) => {
    const key = fair.fair_places?.name || fair.name || 'Sem local'
    if (!acc[key]) acc[key] = []
    acc[key].push(fair)
    return acc
  }, {})

  return (
    <main className="page">
      <h2>Histórico por feira</h2>

      {Object.entries(groups).map(([placeName, placeFairs]) => {
        const revenue = placeFairs.reduce((sum, fair) => sum + Number(fair.revenue_total || 0), 0)
        const profit = placeFairs.reduce((sum, fair) => sum + Number(fair.profit_total || 0), 0)

        return (
          <section className="history-group" key={placeName}>
            <div className="group-header">
              <div>
                <h3>{placeName}</h3>
                <span>{placeFairs.length} feira(s) encerrada(s)</span>
              </div>
              <strong>{money(revenue)}</strong>
            </div>
            <small>Lucro estimado: {money(profit)}</small>

            <div className="list nested">
              {placeFairs.map((fair) => (
                <article className="history-card" key={fair.id}>
                  <div>
                    <strong>{dateBR(fair.closed_at)}</strong>
                    <span>{fair.fair_places?.weekday || ''}</span>
                  </div>

                  <div className="result-grid">
                    <div><small>Faturamento</small><strong>{money(fair.revenue_total)}</strong></div>
                    <div><small>Lucro</small><strong>{money(fair.profit_total)}</strong></div>
                    <div><small>Perdas</small><strong>{money(fair.loss_total)}</strong></div>
                  </div>

                  <details>
                    <summary>Ver produtos</summary>
                    {groupFairItems(fair.fair_items || []).map((group) => (
                      <div className="history-products-group" key={group.name}>
                        <strong>{group.name}</strong>
                        {group.items.map((item) => (
                          <p key={item.id}>{item.product_name}: vendeu {qty(item.quantity_sold)} {item.unit}</p>
                        ))}
                      </div>
                    ))}
                  </details>
                </article>
              ))}
            </div>
          </section>
        )
      })}

      {!fairs.length && <p className="empty">Nenhuma feira encerrada ainda.</p>}
    </main>
  )
}
