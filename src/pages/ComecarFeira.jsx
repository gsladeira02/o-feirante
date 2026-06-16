import { useEffect, useState } from 'react'
import { startFair } from '../services/api'
import { qty } from '../utils/format'
import { decimalInputProps, parseDecimal } from '../utils/number'

export default function ComecarFeira({ user, products, selectedFairPlace, reload, setPage, readOnly = false, onBlockedAction }) {
  const [items, setItems] = useState([])
  const [message, setMessage] = useState('')

  useEffect(() => {
    setItems(products.map((p) => ({ ...p, quantity_taken: '' })))
  }, [products])

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
    setItems((current) => current.map((item) => item.id === id ? { ...item, quantity_taken: value } : item))
  }

  async function submit(event) {
    event.preventDefault()
    setMessage('')

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
      await startFair({ userId: user.id, fairPlace: selectedFairPlace, items })
      await reload()
      setPage('dashboard')
    } catch (error) {
      setMessage(error.message)
    }
  }

  return (
    <main className="page">
      <h2>Iniciar feira</h2>

      <section className="selected-fair-card">
        <strong>{selectedFairPlace.name}</strong>
        <span>{selectedFairPlace.weekday || 'Dia não informado'} {selectedFairPlace.address ? `· ${selectedFairPlace.address}` : ''}</span>
      </section>

      <form onSubmit={submit}>
        <section className="list">
          {items.map((product) => (
            <article className="item-card input-card" key={product.id}>
              <div>
                <strong>{product.name}</strong>
                <span>{product.categories?.name || 'Sem categoria'}</span>
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
        </section>

        {message && <p className="message">{message}</p>}
        <button className="primary-btn sticky-btn">Iniciar {selectedFairPlace.name}</button>
      </form>
    </main>
  )
}
