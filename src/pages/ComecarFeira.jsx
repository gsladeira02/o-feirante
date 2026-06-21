import { useEffect, useMemo, useState } from 'react'
import { startFair, sortProductsByCategoryName } from '../services/api'
import { qty } from '../utils/format'
import { decimalInputProps, parseDecimal } from '../utils/number'

export default function ComecarFeira({ user, products, selectedFairPlace, acceptedSuggestion, clearAcceptedSuggestion, reload, setPage, readOnly = false, onBlockedAction }) {
  const [items, setItems] = useState([])
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const suggestionItems = acceptedSuggestion?.items || {}
    const nextItems = sortProductsByCategoryName(products).map((p) => ({
      ...p,
      quantity_taken: suggestionItems[p.id] ?? '',
    }))
    setItems(nextItems)
    setMessage(acceptedSuggestion?.message || '')
  }, [products, acceptedSuggestion?.createdAt])

  const groupedItems = useMemo(() => {
    const groups = []
    const map = new Map()
    sortProductsByCategoryName(items).forEach((product) => {
      const categoryName = product.categories?.name || 'Sem categoria'
      if (!map.has(categoryName)) {
        const group = { name: categoryName, items: [] }
        map.set(categoryName, group)
        groups.push(group)
      }
      map.get(categoryName).items.push(product)
    })
    return groups
  }, [items])

  if (!selectedFairPlace) {
    return (
      <main className="page">
        <h2>Escolha uma feira</h2>
        <p className="muted">Você precisa tocar em uma feira cadastrada antes de iniciar.</p>
        <button className="primary-btn" onClick={() => setPage('feiras')}>Ir para minhas feiras</button>
      </main>
    )
  }

  function updateQuantity(id, value) {
    setMessage('')
    setItems((current) => current.map((item) => item.id === id ? { ...item, quantity_taken: value } : item))
  }

  async function submit(event) {
    event.preventDefault()
    setMessage('')
    if (saving) return

    if (readOnly) {
      setMessage(onBlockedAction?.() || 'Esta é uma conta teste. Iniciar feira está bloqueado.')
      return
    }

    const selected = items.filter((item) => parseDecimal(item.quantity_taken) > 0)

    if (!selected.length) {
      setMessage('Informe pelo menos um produto levado.')
      return
    }

    for (const item of items) {
      const taken = parseDecimal(item.quantity_taken)

      if (taken < 0) {
        setMessage(`A quantidade de ${item.name} não pode ser negativa.`)
        return
      }

      if (taken > parseDecimal(item.stock)) {
        setMessage(`Você não tem estoque suficiente de ${item.name}.`)
        return
      }
    }

    try {
      setSaving(true)
      await startFair({ userId: user.id, fairPlace: selectedFairPlace, items })
      clearAcceptedSuggestion?.()
      await reload()
      setPage('dashboard')
    } catch (error) {
      setMessage(error.message || 'Não foi possível iniciar a feira. Revise as quantidades e tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  const hasAcceptedSuggestion = Boolean(acceptedSuggestion?.fairPlaceId && acceptedSuggestion.fairPlaceId === selectedFairPlace.id)

  return (
    <main className="page">
      <h2>Iniciar feira</h2>

      <section className="selected-fair-card">
        <strong>{selectedFairPlace.name}</strong>
        <span>{selectedFairPlace.weekday || 'Dia não informado'} {selectedFairPlace.address ? `· ${selectedFairPlace.address}` : ''}</span>
      </section>

      {hasAcceptedSuggestion && (
        <section className="suggestion-banner">
          <strong>Sugestão aplicada</strong>
          <span>As quantidades foram preenchidas automaticamente. Você ainda pode alterar qualquer produto antes de iniciar.</span>
        </section>
      )}

      <form onSubmit={submit}>
        <section className="list">
          {groupedItems.map((group) => (
            <div className="category-group" key={group.name}>
              <h3>{group.name}</h3>
              {group.items.map((product) => (
                <article className="item-card input-card" key={product.id}>
                  <div>
                    <strong>{product.name}</strong>
                    <small>Disponível: {qty(product.stock)} {product.unit}</small>
                  </div>
                  <input
                    {...decimalInputProps({
                      min: '0',
                      max: product.stock,
                      value: product.quantity_taken,
                      onChange: (e) => updateQuantity(product.id, e.target.value),
                      placeholder: 'Levou',
                    })}
                  />
                </article>
              ))}
            </div>
          ))}
        </section>

        {message && <p className="message">{message}</p>}
        <button className="primary-btn sticky-btn" disabled={saving}>{saving ? 'Iniciando...' : `Iniciar ${selectedFairPlace.name}`}</button>
      </form>
    </main>
  )
}
