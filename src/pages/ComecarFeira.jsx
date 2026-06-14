import { useState } from 'react'
import { startFair } from '../services/api'
import { number } from '../utils/format'

export default function ComecarFeira({ user, products, reload, setPage }) {
  const [name, setName] = useState('')
  const [items, setItems] = useState(products.map((p) => ({ ...p, quantity_taken: '' })))
  const [message, setMessage] = useState('')

  function updateQuantity(id, value) {
    setItems(items.map((item) => item.id === id ? { ...item, quantity_taken: value } : item))
  }

  async function submit(event) {
    event.preventDefault()
    setMessage('')

    try {
      await startFair({
        userId: user.id,
        name: name || 'Feira de hoje',
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
      <h2>Começar feira</h2>
      <p className="muted">Informe tudo que está levando para a banca.</p>

      <form onSubmit={submit}>
        <section className="form-card compact">
          <label>Nome ou local da feira</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Feira da Glória" />
        </section>

        <section className="list">
          {items.map((product) => (
            <article className="item-card input-card" key={product.id}>
              <div>
                <strong>{product.name}</strong>
                <span>Disponível: {number(product.stock)} {product.unit}</span>
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

        <button className="primary-btn sticky-btn">Iniciar feira</button>
      </form>
    </main>
  )
}
