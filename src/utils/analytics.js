export function buildProductStats(fairs = []) {
  const map = new Map()

  fairs.forEach((fair) => {
    ;(fair.fair_items || []).forEach((item) => {
      const current = map.get(item.product_name) || {
        name: item.product_name,
        unit: item.unit,
        sold: 0,
        revenue: 0,
        profit: 0,
        lossValue: 0,
        lost: 0,
      }

      current.sold += Number(item.quantity_sold || 0)
      current.revenue += Number(item.revenue || 0)
      current.profit += Number(item.profit || 0)
      current.lossValue += Number(item.loss_value || 0)
      current.lost += Number(item.quantity_lost || 0)

      map.set(item.product_name, current)
    })
  })

  return Array.from(map.values())
}

export function buildFairStats(fairs = []) {
  const map = new Map()

  fairs.forEach((fair) => {
    const key = fair.fair_places?.name || fair.name || 'Sem local'

    const current = map.get(key) || {
      name: key,
      count: 0,
      revenue: 0,
      profit: 0,
      lossValue: 0,
      avgRevenue: 0,
      avgProfit: 0,
    }

    current.count += 1
    current.revenue += Number(fair.revenue_total || 0)
    current.profit += Number(fair.profit_total || 0)
    current.lossValue += Number(fair.loss_total || 0)
    current.avgRevenue = current.revenue / current.count
    current.avgProfit = current.profit / current.count

    map.set(key, current)
  })

  return Array.from(map.values())
}

export function buildMonthlyStats(fairs = []) {
  const map = new Map()

  fairs.forEach((fair) => {
    const date = new Date(fair.closed_at || fair.created_at)
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

    const current = map.get(key) || {
      key,
      label: date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }),
      revenue: 0,
      profit: 0,
      lossValue: 0,
      count: 0,
    }

    current.revenue += Number(fair.revenue_total || 0)
    current.profit += Number(fair.profit_total || 0)
    current.lossValue += Number(fair.loss_total || 0)
    current.count += 1

    map.set(key, current)
  })

  return Array.from(map.values()).sort((a, b) => a.key.localeCompare(b.key))
}

export function buildSuggestions(fairs = [], fairPlaceId = '') {
  const relevant = fairPlaceId
    ? fairs.filter((fair) => fair.fair_place_id === fairPlaceId)
    : fairs

  const map = new Map()

  relevant.forEach((fair) => {
    ;(fair.fair_items || []).forEach((item) => {
      const current = map.get(item.product_name) || {
        name: item.product_name,
        unit: item.unit,
        totalSold: 0,
        appearances: 0,
        avgSold: 0,
        suggested: 0,
      }

      current.totalSold += Number(item.quantity_sold || 0)
      current.appearances += 1
      current.avgSold = current.totalSold / current.appearances
      current.suggested = Math.ceil(current.avgSold * 1.1)

      map.set(item.product_name, current)
    })
  })

  return Array.from(map.values())
    .filter((item) => item.avgSold > 0)
    .sort((a, b) => b.avgSold - a.avgSold)
}

export function getCurrentMonthTotals(fairs = []) {
  const now = new Date()
  const month = now.getMonth()
  const year = now.getFullYear()

  return fairs
    .filter((fair) => {
      const date = new Date(fair.closed_at || fair.created_at)
      return date.getMonth() === month && date.getFullYear() === year
    })
    .reduce((acc, fair) => {
      acc.revenue += Number(fair.revenue_total || 0)
      acc.profit += Number(fair.profit_total || 0)
      acc.lossValue += Number(fair.loss_total || 0)
      acc.count += 1
      return acc
    }, { revenue: 0, profit: 0, lossValue: 0, count: 0 })
}
