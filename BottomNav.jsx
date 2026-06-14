import { useEffect, useState } from 'react'
import { startFair } from '../services/api'
import { number } from '../utils/format'

export default function ComecarFeira({ user, products, selectedFairPlace, reload, setPage }) {
  const [items, setItems] = useState(products.map((p) => ({ ...p, quantity_taken: '' })))
  const [message, setMessage] = useState('')

  useEffect(() => {
    setItems(products.map((p) => ({ ...p, quantity_taken: '' })))
  }, [products])

  if (!selectedFairPlace) {
    return (
      <main className="page">
        <h2>Escolha uma feira</h2>
        <p className="muted">Antes de iniciar, cadastre uma feira e toque nela.</p>
        <button className="primary-btn" onClick={() => setPage('feiras')}>Ir para minhas feiras</button>
      </main>
    )
  }

  function updateQuantity(id, value) {
    setItems(items.map((item) => item.id === id ? { ...item, quantity_taken: value } : item))
  }

  async function submit(event) {
    event.preventDefault()
    setMessage('')

    try {
      await startFair({
        userId: user.id,
        fairPlace: selectedFairPlace,
        items,
      })
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

      <p className="muted">Informe tudo que está levando para esta feira.</p>

      <form onSubmit={submit}>
        <section className="list">
          {items.map((product) => (
            <article className="item-card input-card" key={product.id}>
              <div>
                <strong>{product.name}</strong>
                <span>{product.categories?.name || product.category || 'Sem categoria'}</span>
                <small>Disponível: {number(product.stock)} {product.unit}</small>
              </div>
              <input
                type="number"
                step="0.01"
                max={product.stock}
                value={product.quantity_taken}
                onChange={(e) => updateQuantity(product.id, e.target.value)}
                placeholder="Levou"
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
