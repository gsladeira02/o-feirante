import { useState } from 'react'
import { createProduct, deleteProduct } from '../services/api'
import { money, number } from '../utils/format'

export default function Estoque({ user, products, reload }) {
  const [form, setForm] = useState({ name: '', category: '', unit: 'kg', stock: '', average_cost: '', sale_price: '' })
  const [message, setMessage] = useState('')

  async function submit(event) {
    event.preventDefault()
    setMessage('')

    try {
      await createProduct({
        user_id: user.id,
        name: form.name,
        category: form.category,
        unit: form.unit,
        stock: Number(form.stock || 0),
        average_cost: Number(form.average_cost || 0),
        sale_price: Number(form.sale_price || 0),
      })
      setForm({ name: '', category: '', unit: 'kg', stock: '', average_cost: '', sale_price: '' })
      await reload()
    } catch (error) {
      setMessage(error.message)
    }
  }

  async function remove(id) {
    if (!confirm('Excluir este produto?')) return
    await deleteProduct(id)
    await reload()
  }

  return (
    <main className="page">
      <h2>Estoque</h2>

      <form className="form-card compact" onSubmit={submit}>
        <h3>Novo produto</h3>

        <label>Produto</label>
        <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Banana" required />

        <div className="row">
          <div>
            <label>Categoria</label>
            <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Fruta" />
          </div>
          <div>
            <label>Unidade</label>
            <select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}>
              <option value="kg">kg</option>
              <option value="un">un</option>
              <option value="dz">dúzia</option>
              <option value="cx">caixa</option>
              <option value="maço">maço</option>
            </select>
          </div>
        </div>

        <div className="row">
          <div>
            <label>Estoque</label>
            <input type="number" step="0.01" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
          </div>
          <div>
            <label>Venda</label>
            <input type="number" step="0.01" value={form.sale_price} onChange={(e) => setForm({ ...form, sale_price: e.target.value })} />
          </div>
        </div>

        <label>Custo médio</label>
        <input type="number" step="0.01" value={form.average_cost} onChange={(e) => setForm({ ...form, average_cost: e.target.value })} />

        {message && <p className="message">{message}</p>}
        <button className="primary-btn">Salvar produto</button>
      </form>

      <section className="list">
        {products.map((product) => (
          <article className="item-card" key={product.id}>
            <div>
              <strong>{product.name}</strong>
              <span>{number(product.stock)} {product.unit} em estoque</span>
              <small>Custo {money(product.average_cost)} · Venda {money(product.sale_price)}</small>
            </div>
            <button className="mini-btn danger-text" onClick={() => remove(product.id)}>Excluir</button>
          </article>
        ))}

        {!products.length && <p className="empty">Nenhum produto cadastrado ainda.</p>}
      </section>
    </main>
  )
}
