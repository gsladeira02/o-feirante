import { useState } from 'react'
import { createProduct, deleteProduct, updateProduct } from '../services/api'
import { money, qty } from '../utils/format'
import { decimalInputProps, parseDecimal } from '../utils/number'

const emptyForm = {
  name: '',
  category_id: '',
  unit: 'kg',
  stock: '',
  average_cost: '',
  sale_price: '',
}

function ProductFields({ data, setData, categories }) {
  return (
    <>
      <label>Produto</label>
      <input value={data.name} onChange={(e) => setData((current) => ({ ...current, name: e.target.value }))} placeholder="Banana" required />

      <label>Categoria</label>
      <select value={data.category_id} onChange={(e) => setData((current) => ({ ...current, category_id: e.target.value }))}>
        <option value="">Sem categoria</option>
        {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
      </select>

      <label>Unidade</label>
      <select value={data.unit} onChange={(e) => setData((current) => ({ ...current, unit: e.target.value }))}>
        <option value="kg">kg</option>
        <option value="un">unidade</option>
        <option value="dz">dúzia</option>
        <option value="cx">caixa</option>
        <option value="maço">maço</option>
      </select>

      <div className="row">
        <div>
          <label>Quantidade</label>
          <input {...decimalInputProps({ min: '0', value: data.stock, onChange: (e) => setData((current) => ({ ...current, stock: e.target.value })) })} />
        </div>
        <div>
          <label>Preço de venda</label>
          <input {...decimalInputProps({ min: '0', value: data.sale_price, onChange: (e) => setData((current) => ({ ...current, sale_price: e.target.value })) })} />
        </div>
      </div>

      <label>Preço de custo</label>
      <input {...decimalInputProps({ min: '0', value: data.average_cost, onChange: (e) => setData((current) => ({ ...current, average_cost: e.target.value })) })} />
    </>
  )
}

export default function Estoque({ user, products, categories, reload, setPage, readOnly = false, onBlockedAction }) {
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState(emptyForm)
  const [message, setMessage] = useState('')

  function validateProduct(data) {
    if (!data.name.trim()) return 'Informe o nome do produto.'
    if (parseDecimal(data.stock) < 0) return 'A quantidade inicial não pode ser negativa.'
    if (parseDecimal(data.average_cost) < 0) return 'O preço de custo não pode ser negativo.'
    if (parseDecimal(data.sale_price) < 0) return 'O preço de venda não pode ser negativo.'
    return ''
  }

  async function submit(event) {
    event.preventDefault()
    setMessage('')

    if (readOnly) {
      setMessage(onBlockedAction?.() || 'Esta é uma conta teste. Alterações bloqueadas.')
      return
    }

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
        stock: parseDecimal(form.stock),
        average_cost: parseDecimal(form.average_cost),
        sale_price: parseDecimal(form.sale_price),
      })

      setForm(emptyForm)
      await reload()
    } catch (error) {
      setMessage(error.message)
    }
  }

  function startEdit(product) {
    setMessage('')
    if (readOnly) {
      setMessage(onBlockedAction?.() || 'Esta é uma conta teste. Alterações bloqueadas.')
      return
    }

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

    if (readOnly) {
      setMessage(onBlockedAction?.() || 'Esta é uma conta teste. Alterações bloqueadas.')
      return
    }

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
    setMessage('')
    if (readOnly) {
      setMessage(onBlockedAction?.() || 'Esta é uma conta teste. Alterações bloqueadas.')
      return
    }

    if (!confirm('Excluir produto?')) return

    try {
      await deleteProduct(id)
      await reload()
    } catch (error) {
      setMessage(error.message)
    }
  }

  return (
    <main className="page">
      <h2>Estoque</h2>

      <form className="form-card compact" onSubmit={submit}>
        <h3>Novo produto</h3>

        <ProductFields data={form} setData={setForm} categories={categories} />

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
                <ProductFields data={editForm} setData={setEditForm} categories={categories} />
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
