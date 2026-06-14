import { useState } from 'react'
import { closeFair } from '../services/api'
import { number } from '../utils/format'

export default function EncerrarFeira({ activeFair, reload, setPage }) {
  const [items, setItems] = useState((activeFair?.fair_items || []).map((item) => ({
    ...item,
    quantity_returned: '',
    quantity_lost: '',
  })))
  const [message, setMessage] = useState('')

  if (!activeFair) {
    return (
      <main className="page">
        <h2>Nenhuma feira em andamento</h2>
        <p className="muted">Comece uma feira para depois encerrá-la.</p>
      </main>
    )
  }

  function updateItem(id, field, value) {
    setItems(items.map((item) => item.id === id ? { ...item, [field]: value } : item))
  }

  async function submit(event) {
    event.preventDefault()
    setMessage('')

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

      <form onSubmit={submit}>
        <section className="list">
          {items.map((item) => (
            <article className="close-card" key={item.id}>
              <div className="close-header">
                <strong>{item.product_name}</strong>
                <span>Levou {number(item.quantity_taken)} {item.unit}</span>
              </div>

              <div className="row">
                <div>
                  <label>Voltou</label>
                  <input
                    type="number"
                    step="0.01"
                    value={item.quantity_returned}
                    onChange={(e) => updateItem(item.id, 'quantity_returned', e.target.value)}
                  />
                </div>

                <div>
                  <label>Perdeu</label>
                  <input
                    type="number"
                    step="0.01"
                    value={item.quantity_lost}
                    onChange={(e) => updateItem(item.id, 'quantity_lost', e.target.value)}
                  />
                </div>
              </div>
            </article>
          ))}
        </section>

        {message && <p className="message">{message}</p>}

        <button className="primary-btn sticky-btn">Calcular resultado</button>
      </form>
    </main>
  )
}
