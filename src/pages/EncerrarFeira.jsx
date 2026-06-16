import { useMemo, useState } from 'react'
import { closeFair } from '../services/api'
import { money, qty } from '../utils/format'
import { decimalInputProps, parseDecimal } from '../utils/number'

export default function EncerrarFeira({ activeFair, reload, setPage, readOnly = false, onBlockedAction }) {
  const [items, setItems] = useState((activeFair?.fair_items || []).map((item) => ({
    ...item,
    quantity_returned: '',
    quantity_lost: '',
  })))
  const [showSummary, setShowSummary] = useState(false)
  const [message, setMessage] = useState('')

  const totals = useMemo(() => {
    return items.reduce((acc, item) => {
      const taken = parseDecimal(item.quantity_taken)
      const returned = parseDecimal(item.quantity_returned)
      const lost = parseDecimal(item.quantity_lost)
      const sold = Math.max(taken - returned - lost, 0)
      const revenue = sold * parseDecimal(item.sale_price_at_time)
      const cost = sold * parseDecimal(item.cost_at_time)
      const profit = revenue - cost
      const lossValue = lost * parseDecimal(item.cost_at_time)

      acc.sold += sold
      acc.returned += returned
      acc.lost += lost
      acc.revenue += revenue
      acc.cost += cost
      acc.profit += profit
      acc.lossValue += lossValue

      return acc
    }, { sold: 0, returned: 0, lost: 0, revenue: 0, cost: 0, profit: 0, lossValue: 0 })
  }, [items])

  if (!activeFair) {
    return (
      <main className="page">
        <h2>Nenhuma feira em andamento</h2>
        <button className="primary-btn" onClick={() => setPage('feiras')}>Iniciar uma feira</button>
      </main>
    )
  }

  function update(id, field, value) {
    setShowSummary(false)
    setItems((current) => current.map((item) => item.id === id ? { ...item, [field]: value } : item))
  }

  function validateClosing() {
    for (const item of items) {
      const returned = parseDecimal(item.quantity_returned)
      const lost = parseDecimal(item.quantity_lost)
      const taken = parseDecimal(item.quantity_taken)

      if (returned < 0) return `A quantidade que voltou de ${item.product_name} não pode ser negativa.`
      if (lost < 0) return `A perda de ${item.product_name} não pode ser negativa.`
      if (returned + lost > taken) return `${item.product_name}: voltou + perdeu não pode ser maior que a quantidade levada.`
    }

    return ''
  }

  function preview(event) {
    event.preventDefault()
    setMessage('')

    const errorMessage = validateClosing()
    if (errorMessage) {
      setMessage(errorMessage)
      return
    }

    setShowSummary(true)
  }

  async function confirmClose() {
    setMessage('')

    if (readOnly) {
      setMessage(onBlockedAction?.() || 'Esta é uma conta teste. Encerrar feira está bloqueado.')
      return
    }

    const errorMessage = validateClosing()
    if (errorMessage) {
      setMessage(errorMessage)
      return
    }

    try {
      await closeFair({ fair: activeFair, closingItems: items })
      await reload()
      setPage('historico')
    } catch (error) {
      setMessage(error.message)
    }
  }

  return (
    <main className="page">
      <h2>Encerrar feira</h2>
      <p className="muted">{activeFair.name}</p>

      <form onSubmit={preview}>
        <section className="list">
          {items.map((item) => {
            const taken = parseDecimal(item.quantity_taken)
            const returned = parseDecimal(item.quantity_returned)
            const lost = parseDecimal(item.quantity_lost)
            const sold = Math.max(taken - returned - lost, 0)

            return (
              <article className="close-card" key={item.id}>
                <div className="close-header">
                  <strong>{item.product_name}</strong>
                  <span>Levou {qty(item.quantity_taken)} {item.unit}</span>
                </div>

                <div className="row">
                  <div>
                    <label>Voltou</label>
                    <input {...decimalInputProps({ min: '0', value: item.quantity_returned, onChange: (e) => update(item.id, 'quantity_returned', e.target.value) })} />
                  </div>
                  <div>
                    <label>Perdeu</label>
                    <input {...decimalInputProps({ min: '0', value: item.quantity_lost, onChange: (e) => update(item.id, 'quantity_lost', e.target.value) })} />
                  </div>
                </div>

                <small className="calculated-line">Vendido calculado: {qty(sold)} {item.unit}</small>
              </article>
            )
          })}
        </section>

        {message && <p className="message">{message}</p>}

        {showSummary && (
          <section className="summary-card">
            <h3>Resumo antes de salvar</h3>
            <div className="result-grid">
              <div><small>Vendido</small><strong>{qty(totals.sold)}</strong></div>
              <div><small>Voltou</small><strong>{qty(totals.returned)}</strong></div>
              <div><small>Perdeu</small><strong>{qty(totals.lost)}</strong></div>
            </div>
            <div className="result-grid">
              <div><small>Faturamento</small><strong>{money(totals.revenue)}</strong></div>
              <div><small>Lucro</small><strong>{money(totals.profit)}</strong></div>
              <div><small>Perdas</small><strong>{money(totals.lossValue)}</strong></div>
            </div>
            <button type="button" className="primary-btn" onClick={confirmClose}>Confirmar e salvar</button>
          </section>
        )}

        {!showSummary && (
          <button className="primary-btn sticky-btn">Ver resumo</button>
        )}
      </form>
    </main>
  )
}
