import { useMemo, useState } from 'react'
import { buildFairStats, buildMonthlyStats, buildProductStats, buildSuggestions, getCurrentMonthTotals } from '../utils/analytics'
import { money, qty } from '../utils/format'
import { decimalInputProps, parseDecimal } from '../utils/number'

function normalizeText(value = '') {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
}

export default function Inteligencia({ fairs, fairPlaces, products = [], onAcceptSuggestion }) {
  const [goal, setGoal] = useState(() => localStorage.getItem('ofeirante_meta_mensal') || '')
  const [selectedFairPlace, setSelectedFairPlace] = useState('')
  const [suggestionMessage, setSuggestionMessage] = useState('')

  const productStats = useMemo(() => buildProductStats(fairs), [fairs])
  const fairStats = useMemo(() => buildFairStats(fairs), [fairs])
  const monthlyStats = useMemo(() => buildMonthlyStats(fairs), [fairs])
  const monthTotals = useMemo(() => getCurrentMonthTotals(fairs), [fairs])
  const suggestions = useMemo(() => buildSuggestions(fairs, selectedFairPlace), [fairs, selectedFairPlace])

  const bestSold = [...productStats].sort((a, b) => b.sold - a.sold).slice(0, 5)
  const bestProfit = [...productStats].sort((a, b) => b.profit - a.profit).slice(0, 5)
  const worstLoss = [...productStats].sort((a, b) => b.lossValue - a.lossValue).slice(0, 5)
  const bestFairs = [...fairStats].sort((a, b) => b.avgProfit - a.avgProfit).slice(0, 5)

  const numericGoal = parseDecimal(goal)
  const goalPercent = numericGoal > 0 ? Math.min((monthTotals.revenue / numericGoal) * 100, 100) : 0

  function saveGoal(value) {
    setGoal(value)
    localStorage.setItem('ofeirante_meta_mensal', value)
  }

  function acceptSuggestion() {
    setSuggestionMessage('')

    if (!selectedFairPlace) {
      setSuggestionMessage('Escolha uma feira específica antes de aceitar a sugestão.')
      return
    }

    if (!suggestions.length) {
      setSuggestionMessage('Ainda não há sugestão suficiente para essa feira.')
      return
    }

    const productsByName = new Map(products.map((product) => [normalizeText(product.name), product]))
    const quantities = {}
    const stockWarnings = []
    let filledCount = 0

    suggestions.forEach((suggestion) => {
      const product = productsByName.get(normalizeText(suggestion.name))
      if (!product) return

      const suggestedQty = parseDecimal(suggestion.suggested)
      const stockQty = parseDecimal(product.stock)
      const finalQty = Math.max(Math.min(suggestedQty, stockQty), 0)

      if (finalQty > 0) {
        quantities[product.id] = String(finalQty)
        filledCount += 1
      }

      if (stockQty < suggestedQty) {
        stockWarnings.push(`${product.name}: sugerido ${qty(suggestedQty)} ${product.unit}, disponível ${qty(stockQty)} ${product.unit}.`)
      }
    })

    if (!filledCount) {
      setSuggestionMessage('Nenhum item da sugestão possui estoque disponível para iniciar a feira.')
      return
    }

    const message = stockWarnings.length
      ? `Sugestão aplicada com ajustes de estoque: ${stockWarnings.join(' ')}`
      : 'Sugestão aplicada com sucesso. Você ainda pode alterar as quantidades antes de iniciar.'

    onAcceptSuggestion?.({
      fairPlaceId: selectedFairPlace,
      items: quantities,
      message,
      createdAt: Date.now(),
    })
  }

  function RankList({ items, type }) {
    if (!items.length) return <p className="empty small">Ainda não há dados suficientes.</p>

    return (
      <div className="rank-list">
        {items.map((item, index) => (
          <article className="rank-card" key={`${type}-${item.name}`}>
            <div className="rank-number">{index + 1}</div>
            <div>
              <strong>{item.name}</strong>
              {type === 'sold' && <span>{qty(item.sold)} {item.unit} vendidos</span>}
              {type === 'profit' && <span>Lucro: {money(item.profit)}</span>}
              {type === 'loss' && <span>Perdas: {money(item.lossValue)}</span>}
              {type === 'fair' && <span>Lucro médio: {money(item.avgProfit)}</span>}
            </div>
          </article>
        ))}
      </div>
    )
  }

  return (
    <main className="page">
      <h2>Inteligência</h2>
      <p className="muted">Veja onde você vende mais, lucra mais e perde dinheiro.</p>

      <section className="hero">
        <p>Meta mensal</p>
        <h2>{money(monthTotals.revenue)}</h2>
        <span>{numericGoal > 0 ? `${goalPercent.toFixed(0)}% da meta de ${money(numericGoal)}` : 'Defina uma meta para acompanhar o mês.'}</span>

        <div className="goal-box">
          <input
            {...decimalInputProps({
              min: '0',
              value: goal,
              onChange: (e) => saveGoal(e.target.value),
              placeholder: 'Meta de faturamento',
            })}
          />
          <div className="progress-bar">
            <div style={{ width: `${goalPercent}%` }} />
          </div>
        </div>
      </section>

      <section className="insight-grid">
        <div className="stat"><small>Lucro do mês</small><strong>{money(monthTotals.profit)}</strong></div>
        <div className="stat"><small>Perdas do mês</small><strong>{money(monthTotals.lossValue)}</strong></div>
        <div className="stat"><small>Feiras no mês</small><strong>{monthTotals.count}</strong></div>
      </section>

      <section className="section">
        <h3>Produtos mais vendidos</h3>
        <RankList items={bestSold} type="sold" />
      </section>

      <section className="section">
        <h3>Produtos mais lucrativos</h3>
        <RankList items={bestProfit} type="profit" />
      </section>

      <section className="section">
        <h3>Produtos com mais perdas</h3>
        <RankList items={worstLoss} type="loss" />
      </section>

      <section className="section">
        <h3>Melhores feiras por lucro médio</h3>
        <RankList items={bestFairs} type="fair" />
      </section>

      <section className="section">
        <h3>Sugestão do que levar</h3>
        <div className="form-card compact">
          <label>Escolha a feira</label>
          <select value={selectedFairPlace} onChange={(e) => {
            setSelectedFairPlace(e.target.value)
            setSuggestionMessage('')
          }}>
            <option value="">Todas as feiras</option>
            {fairPlaces.map((place) => (
              <option key={place.id} value={place.id}>{place.name}</option>
            ))}
          </select>

          <p className="muted">A sugestão usa a média vendida e adiciona uma margem de 10%.</p>

          <div className="rank-list">
            {suggestions.slice(0, 12).map((item) => {
              const product = products.find((p) => normalizeText(p.name) === normalizeText(item.name))
              const stock = parseDecimal(product?.stock)
              const suggested = parseDecimal(item.suggested)
              const willTake = Math.max(Math.min(suggested, stock), 0)
              const limited = product && stock < suggested

              return (
                <article className="rank-card" key={item.name}>
                  <div className="rank-number">↗</div>
                  <div>
                    <strong>{item.name}</strong>
                    <span>Média: {qty(item.avgSold)} {item.unit} · Sugestão: {qty(item.suggested)} {item.unit}</span>
                    {product && <small className={limited ? 'warning-text' : 'success-text'}>{limited ? `Estoque menor: será preenchido com ${qty(willTake)} ${product.unit}.` : `Estoque disponível: ${qty(stock)} ${product.unit}.`}</small>}
                  </div>
                </article>
              )
            })}

            {!suggestions.length && <p className="empty small">Depois de encerrar algumas feiras, as sugestões aparecerão aqui.</p>}
          </div>

          {suggestionMessage && <p className="message">{suggestionMessage}</p>}
          <button type="button" className="primary-btn full-width" onClick={acceptSuggestion} disabled={!selectedFairPlace || !suggestions.length}>Aceitar sugestão e iniciar feira</button>
        </div>
      </section>

      <section className="section">
        <h3>Evolução mensal</h3>
        <div className="chart-list">
          {monthlyStats.map((month) => {
            const maxRevenue = Math.max(...monthlyStats.map((m) => m.revenue), 1)
            const width = (month.revenue / maxRevenue) * 100

            return (
              <article className="bar-row" key={month.key}>
                <div>
                  <strong>{month.label}</strong>
                  <span>{money(month.revenue)} · lucro {money(month.profit)}</span>
                </div>
                <div className="bar-track">
                  <div style={{ width: `${width}%` }} />
                </div>
              </article>
            )
          })}

          {!monthlyStats.length && <p className="empty small">Ainda não há histórico mensal.</p>}
        </div>
      </section>
    </main>
  )
}
