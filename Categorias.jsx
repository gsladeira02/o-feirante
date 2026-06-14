import { useState } from 'react'
import { createProduct, deleteProduct } from '../services/api'
import { money, number } from '../utils/format'

export default function Estoque({ user, products, categories, reload, setPage }) {
  const [form, setForm] = useState({
    name: '',
    category_id: '',
    unit: 'kg',
    stock: '',
    average_cost: '',
    sale_price: ''
  })
  const [message, setMessage] = useState('')

  async function submit(event) {
    event.preventDefault()
    setMessage('')

    try {
      const selectedCategory = categories.find((category) => category.id === form.category_id)

      await createProduct({
        user_id: user.id,
        name: form.name,
        category_id: form.category_id || null,
        category: selectedCategory?.name || '',
        unit: form.unit,
        stock: Number(form.stock || 0),
        average_cost: Number(form.average_cost || 0),
        sale_price: Number(form.sale_price || 0),
      })

      setForm({ name: '', category_id: '', unit: 'kg', stock: '', average_cost: '', sale_price: '' })
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

        <label>Categoria</label>
        <select value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
          <option value="">Sem categoria</option>
          {categories.map((category) => (
            <option value={category.id} key={category.id}>{category.name}</option>
          ))}
        </select>

        {!categories.length && (
          <button type="button" className="secondary-btn" onClick={() => setPage('categorias')}>
            Criar primeira categoria
          </button>
        )}

        <label>Unidade</label>
        <select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}>
          <option value="kg">kg</option>
          <option value="un">un</option>
          <option value="dz">dúzia</option>
          <option value="cx">caixa</option>
          <option value="maço">maço</option>
        </select>

        <div className="row">
          <div>
            <label>Quantidade inicial</label>
            <input type="number" step="0.01" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
          </div>
          <div>
            <label>Preço de venda</label>
            <input type="number" step="0.01" value={form.sale_price} onChange={(e) => setForm({ ...form, sale_price: e.target.value })} />
          </div>
        </div>

        <label>Preço de custo</label>
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
              <small>{product.categories?.name || product.category || 'Sem categoria'}</small>
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
