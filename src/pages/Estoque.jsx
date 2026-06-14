import { useState } from 'react'
import { createProduct, deleteProduct, updateProduct } from '../services/api'
import { money, qty } from '../utils/format'

const emptyForm = {
  name: '',
  category_id: '',
  unit: 'kg',
  stock: '',
  average_cost: '',
  sale_price: '',
}

export default function Estoque({ user, products, categories, reload, setPage }) {
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState(emptyForm)
  const [message, setMessage] = useState('')

  function validateProduct(data) {
    if (!data.name.trim()) return 'Informe o nome do produto.'
    if (Number(data.stock || 0) < 0) return 'A quantidade inicial não pode ser negativa.'
    if (Number(data.average_cost || 0) < 0) return 'O preço de custo não pode ser negativo.'
    if (Number(data.sale_price || 0) < 0) return 'O preço de venda não pode ser negativo.'
    return ''
  }

  async function submit(event) {
    event.preventDefault()
    setMessage('')

    const errorMessage = validateProduct(form)
    if (errorMessage) {
      setMessage(errorMessage)
      return
    }

    try {
      await createProduct({
        user_id: user.id,
        category_id: form.category_id || null,
        name: form.name.trim(),
        unit: form.unit,
        stock: Number(form.stock || 0),
        average_cost: Number(form.average_cost || 0),
        sale_price: Number(form.sale_price || 0),
      })

      setForm(emptyForm)
      await reload()
    } catch (error) {
      setMessage(error.message)
    }
  }

  function startEdit(product) {
    setEditingId(product.id)
    setEditForm({
      name: product.name || '',
      category_id: product.category_id || '',
      unit: product.unit || 'kg',
      stock: product.stock ?? '',
      average_cost: product.average_cost ?? '',
      sale_price: product.sale_price ?? '',
    })
  }

  async function saveEdit(event) {
    event.preventDefault()
    setMessage('')

    const errorMessage = validateProduct(editForm)
    if (errorMessage) {
      setMessage(errorMessage)
      return
    }

    try {
      await updateProduct({
        id: editingId,
        ...editForm,
        name: editForm.name.trim(),
      })

      setEditingId(null)
      setEditForm(emptyForm)
      await reload()
    } catch (error) {
      setMessage(error.message)
    }
  }

  async function remove(id) {
    if (!confirm('Excluir produto?')) return
    await deleteProduct(id)
    await reload()
  }

  function ProductFields({ data, setData }) {
    return (
      <>
        <label>Produto</label>
        <input value={data.name} onChange={(e) => setData({ ...data, name: e.target.value })} placeholder="Banana" required />

        <label>Categoria</label>
        <select value={data.category_id} onChange={(e) => setData({ ...data, category_id: e.target.value })}>
          <option value="">Sem categoria</option>
          {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
        </select>

        <label>Unidade</label>
        <select value={data.unit} onChange={(e) => setData({ ...data, unit: e.target.value })}>
          <option value="kg">kg</option>
          <option value="un">unidade</option>
          <option value="dz">dúzia</option>
          <option value="cx">caixa</option>
          <option value="maço">maço</option>
        </select>

        <div className="row">
          <div>
            <label>Quantidade</label>
            <input min="0" type="number" step="0.01" value={data.stock} onChange={(e) => setData({ ...data, stock: e.target.value })} />
          </div>
          <div>
            <label>Preço de venda</label>
            <input min="0" type="number" step="0.01" value={data.sale_price} onChange={(e) => setData({ ...data, sale_price: e.target.value })} />
          </div>
        </div>

        <label>Preço de custo</label>
        <input min="0" type="number" step="0.01" value={data.average_cost} onChange={(e) => setData({ ...data, average_cost: e.target.value })} />
      </>
    )
  }

  return (
    <main className="page">
      <h2>Estoque</h2>

      <form className="form-card compact" onSubmit={submit}>
        <h3>Novo produto</h3>

        <ProductFields data={form} setData={setForm} />

        {!categories.length && (
          <button type="button" className="secondary-btn" onClick={() => setPage('categorias')}>Criar primeira categoria</button>
        )}

        {message && <p className="message">{message}</p>}
        <button className="primary-btn">Salvar produto</button>
      </form>

      <section className="list">
        {products.map((product) => (
          <article className="item-card editable-card" key={product.id}>
            {editingId === product.id ? (
              <form className="inline-edit wide" onSubmit={saveEdit}>
                <ProductFields data={editForm} setData={setEditForm} />
                <div className="inline-actions">
                  <button className="mini-filled" type="submit">Salvar</button>
                  <button className="mini-btn" type="button" onClick={() => setEditingId(null)}>Cancelar</button>
                </div>
              </form>
            ) : (
              <>
                <div>
                  <strong>{product.name}</strong>
                  <span>{qty(product.stock)} {product.unit} em estoque</span>
                  <small>{product.categories?.name || 'Sem categoria'}</small>
                  <small>Custo {money(product.average_cost)} · Venda {money(product.sale_price)}</small>
                </div>
                <div className="card-actions">
                  <button className="mini-btn" onClick={() => startEdit(product)}>Editar</button>
                  <button className="mini-btn danger-text" onClick={() => remove(product.id)}>Excluir</button>
                </div>
              </>
            )}
          </article>
        ))}

        {!products.length && <p className="empty">Nenhum produto cadastrado.</p>}
      </section>
    </main>
  )
}
