import { useMemo, useState } from 'react'
import { createProduct, deleteProduct, registerPurchase, updateProduct } from '../services/api'
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

function productFromForm(formElement) {
  const formData = new FormData(formElement)

  return {
    name: String(formData.get('name') || ''),
    category_id: String(formData.get('category_id') || ''),
    unit: String(formData.get('unit') || 'kg'),
    stock: String(formData.get('stock') || ''),
    average_cost: String(formData.get('average_cost') || ''),
    sale_price: String(formData.get('sale_price') || ''),
  }
}

function ProductFields({ defaultValues = emptyForm, categories }) {
  return (
    <>
      <label>Produto</label>
      <input
        name="name"
        defaultValue={defaultValues.name || ''}
        placeholder="Banana"
        autoComplete="off"
        required
      />

      <label>Categoria</label>
      <select name="category_id" defaultValue={defaultValues.category_id || ''}>
        <option value="">Sem categoria</option>
        {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
      </select>

      <label>Unidade</label>
      <select name="unit" defaultValue={defaultValues.unit || 'kg'}>
        <option value="kg">kg</option>
        <option value="un">unidade</option>
        <option value="dz">dúzia</option>
        <option value="cx">caixa</option>
        <option value="maço">maço</option>
      </select>

      <div className="row">
        <div>
          <label>Quantidade</label>
          <input
            {...decimalInputProps({ min: '0' })}
            name="stock"
            defaultValue={defaultValues.stock ?? ''}
            autoComplete="off"
          />
        </div>
        <div>
          <label>Preço de venda</label>
          <input
            {...decimalInputProps({ min: '0' })}
            name="sale_price"
            defaultValue={defaultValues.sale_price ?? ''}
            autoComplete="off"
          />
        </div>
      </div>

      <label>Preço de custo</label>
      <input
        {...decimalInputProps({ min: '0' })}
        name="average_cost"
        defaultValue={defaultValues.average_cost ?? ''}
        autoComplete="off"
      />
    </>
  )
}

export default function Estoque({ user, products, categories, reload, setPage, readOnly = false, onBlockedAction }) {
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState(emptyForm)
  const [formKey, setFormKey] = useState(0)
  const [purchaseKey, setPurchaseKey] = useState(0)
  const [message, setMessage] = useState('')
  const [entryOpen, setEntryOpen] = useState(false)

  const groupedProducts = useMemo(() => {
    const groups = []
    const map = new Map()
    products.forEach((product) => {
      const categoryName = product.categories?.name || 'Sem categoria'
      if (!map.has(categoryName)) {
        const group = { name: categoryName, items: [] }
        map.set(categoryName, group)
        groups.push(group)
      }
      map.get(categoryName).items.push(product)
    })
    return groups
  }, [products])

  function validateProduct(data) {
    if (!data.name.trim()) return 'Informe o nome do produto.'
    if (parseDecimal(data.stock) < 0) return 'A quantidade inicial não pode ser negativa.'
    if (parseDecimal(data.average_cost) < 0) return 'O preço de custo não pode ser negativo.'
    if (parseDecimal(data.sale_price) < 0) return 'O preço de venda não pode ser negativo.'
    return ''
  }

  async function submit(event) {
    event.preventDefault()
    const formElement = event.currentTarget
    setMessage('')

    if (readOnly) {
      setMessage(onBlockedAction?.() || 'Esta é uma conta teste. Alterações bloqueadas.')
      return
    }

    const formData = productFromForm(formElement)
    const errorMessage = validateProduct(formData)
    if (errorMessage) {
      setMessage(errorMessage)
      return
    }

    try {
      await createProduct({
        user_id: user.id,
        category_id: formData.category_id || null,
        name: formData.name.trim(),
        unit: formData.unit,
        stock: parseDecimal(formData.stock),
        average_cost: parseDecimal(formData.average_cost),
        sale_price: parseDecimal(formData.sale_price),
      })

      formElement.reset()
      setFormKey((current) => current + 1)
      await reload()
    } catch (error) {
      setMessage(error.message)
    }
  }

  async function submitEntry(event) {
    event.preventDefault()
    const formElement = event.currentTarget
    setMessage('')

    if (readOnly) {
      setMessage(onBlockedAction?.() || 'Esta é uma conta teste. Alterações bloqueadas.')
      return
    }

    const formData = new FormData(formElement)
    const productId = String(formData.get('product_id') || '')
    const quantity = String(formData.get('quantity') || '')
    const totalValue = String(formData.get('total_value') || '')
    const product = products.find((item) => item.id === productId)

    if (!product) {
      setMessage('Selecione um produto para dar entrada.')
      return
    }

    if (parseDecimal(quantity) <= 0) {
      setMessage('A quantidade recebida precisa ser maior que zero.')
      return
    }

    if (parseDecimal(totalValue) < 0) {
      setMessage('O valor total da entrada não pode ser negativo.')
      return
    }

    try {
      await registerPurchase({ userId: user.id, product, quantity, totalValue })
      formElement.reset()
      setPurchaseKey((current) => current + 1)
      setMessage('Entrada registrada e estoque atualizado.')
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
    const formElement = event.currentTarget
    setMessage('')

    if (readOnly) {
      setMessage(onBlockedAction?.() || 'Esta é uma conta teste. Alterações bloqueadas.')
      return
    }

    const formData = productFromForm(formElement)
    const errorMessage = validateProduct(formData)
    if (errorMessage) {
      setMessage(errorMessage)
      return
    }

    try {
      await updateProduct({
        id: editingId,
        category_id: formData.category_id || null,
        name: formData.name.trim(),
        unit: formData.unit,
        stock: parseDecimal(formData.stock),
        average_cost: parseDecimal(formData.average_cost),
        sale_price: parseDecimal(formData.sale_price),
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

      <form className="form-card compact" onSubmit={submit} key={formKey}>
        <h3>Novo produto</h3>

        <ProductFields categories={categories} />

        {!categories.length && (
          <button type="button" className="secondary-btn" onClick={() => setPage('categorias')}>Criar primeira categoria</button>
        )}

        {message && <p className="message">{message}</p>}
        <button className="primary-btn">Salvar produto</button>
      </form>

      <section className="form-card compact">
        <div className="section-head-inline">
          <div>
            <h3>Entrada de mercadoria</h3>
            <p className="muted small">Use quando chegarem produtos novos para atualizar o estoque.</p>
          </div>
          <button type="button" className="mini-filled" onClick={() => setEntryOpen((current) => !current)}>
            {entryOpen ? 'Fechar' : 'Abrir'}
          </button>
        </div>

        {entryOpen && (
          <form className="inline-edit" onSubmit={submitEntry} key={purchaseKey}>
            <label>Produto</label>
            <select name="product_id" required>
              <option value="">Selecione</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {(product.categories?.name || 'Sem categoria')} · {product.name} · estoque {qty(product.stock)} {product.unit}
                </option>
              ))}
            </select>

            <div className="row">
              <div>
                <label>Quantidade recebida</label>
                <input {...decimalInputProps({ min: '0' })} name="quantity" required />
              </div>
              <div>
                <label>Valor total</label>
                <input {...decimalInputProps({ min: '0' })} name="total_value" required />
              </div>
            </div>

            <button className="primary-btn">Registrar entrada</button>
          </form>
        )}
      </section>

      <section className="list">
        {groupedProducts.map((group) => (
          <div className="category-group" key={group.name}>
            <h3>{group.name}</h3>
            {group.items.map((product) => (
              <article className="item-card editable-card" key={product.id}>
                {editingId === product.id ? (
                  <form className="inline-edit wide" onSubmit={saveEdit}>
                    <ProductFields defaultValues={editForm} categories={categories} />
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
          </div>
        ))}

        {!products.length && <p className="empty">Nenhum produto cadastrado.</p>}
      </section>
    </main>
  )
}
