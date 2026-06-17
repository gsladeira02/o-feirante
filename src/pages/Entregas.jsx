import { useMemo, useState } from 'react'
import {
  cancelDelivery,
  confirmDelivery,
  createDelivery,
  createDeliveryCustomer,
  deleteDeliveryCustomer,
} from '../services/api'
import { money, qty } from '../utils/format'
import { decimalInputProps, parseDecimal } from '../utils/number'

function today() {
  return new Date().toISOString().slice(0, 10)
}

function formatDate(dateLike) {
  if (!dateLike) return 'Sem data'
  const date = new Date(`${dateLike}T00:00:00`)
  if (Number.isNaN(date.getTime())) return 'Sem data'
  return date.toLocaleDateString('pt-BR')
}

export default function Entregas({ user, products, customers, deliveries, reload, readOnly = false, onBlockedAction }) {
  const [message, setMessage] = useState('')
  const [selectedCustomerId, setSelectedCustomerId] = useState('')

  const sortedCustomers = useMemo(() => [...customers].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')), [customers])

  const selectedCustomer = useMemo(
    () => sortedCustomers.find((customer) => customer.id === selectedCustomerId) || null,
    [sortedCustomers, selectedCustomerId]
  )

  const customerStats = useMemo(() => {
    const stats = new Map()

    for (const customer of customers) {
      stats.set(customer.id, {
        totalRevenue: 0,
        deliveredCount: 0,
        pendingCount: 0,
        totalQuantity: 0,
        lastPurchase: null,
        favoriteProduct: '',
        productCount: new Map(),
      })
    }

    for (const delivery of deliveries) {
      const stat = stats.get(delivery.customer_id)
      if (!stat) continue

      const item = delivery.delivery_items?.[0]
      if (delivery.status === 'delivered') {
        stat.deliveredCount += 1
        stat.totalRevenue += Number(item?.revenue || 0)
        stat.totalQuantity += Number(item?.quantity || 0)
        const currentDate = delivery.delivered_at || delivery.delivery_date || delivery.created_at
        if (!stat.lastPurchase || new Date(currentDate) > new Date(stat.lastPurchase)) stat.lastPurchase = currentDate
        if (item?.product_name) {
          stat.productCount.set(item.product_name, (stat.productCount.get(item.product_name) || 0) + Number(item.quantity || 0))
        }
      } else {
        stat.pendingCount += 1
      }
    }

    for (const stat of stats.values()) {
      const productsByQty = [...stat.productCount.entries()].sort((a, b) => b[1] - a[1])
      stat.favoriteProduct = productsByQty[0]?.[0] || ''
    }

    return stats
  }, [customers, deliveries])

  const visibleDeliveries = useMemo(() => {
    const list = selectedCustomerId
      ? deliveries.filter((delivery) => delivery.customer_id === selectedCustomerId)
      : deliveries

    return [...list].sort((a, b) => {
      const dateA = new Date(a.delivered_at || a.delivery_date || a.created_at).getTime()
      const dateB = new Date(b.delivered_at || b.delivery_date || b.created_at).getTime()
      return dateB - dateA
    })
  }, [deliveries, selectedCustomerId])

  const selectedStats = selectedCustomer ? customerStats.get(selectedCustomer.id) : null

  function blocked() {
    const text = onBlockedAction?.() || 'Esta é uma conta teste. Alterações bloqueadas.'
    setMessage(text)
    return true
  }

  async function submitCustomer(event) {
    event.preventDefault()
    setMessage('')
    if (readOnly) return blocked()

    const form = event.currentTarget
    const data = new FormData(form)
    const name = String(data.get('name') || '').trim()
    const address = String(data.get('address') || '').trim()
    const phone = String(data.get('phone') || '').trim()

    try {
      await createDeliveryCustomer({ userId: user.id, name, address, phone })
      form.reset()
      setMessage('Cliente cadastrado.')
      await reload()
    } catch (error) {
      setMessage(error.message)
    }
  }

  async function submitDelivery(event) {
    event.preventDefault()
    setMessage('')
    if (readOnly) return blocked()

    const form = event.currentTarget
    const data = new FormData(form)
    const customerId = String(data.get('customer_id') || '')
    const productId = String(data.get('product_id') || '')
    const quantity = String(data.get('quantity') || '')
    const deliveryDate = String(data.get('delivery_date') || today())
    const product = products.find((item) => item.id === productId)

    if (parseDecimal(quantity) <= 0) {
      setMessage('Informe uma quantidade maior que zero.')
      return
    }

    try {
      await createDelivery({ userId: user.id, customerId, product, quantity, deliveryDate })
      form.reset()
      setSelectedCustomerId(customerId)
      setMessage('Entrega criada. Confirme quando ela for concluída.')
      await reload()
    } catch (error) {
      setMessage(error.message)
    }
  }

  async function handleConfirm(delivery) {
    setMessage('')
    if (readOnly) return blocked()
    if (!confirm('Confirmar entrega e baixar o estoque?')) return

    try {
      await confirmDelivery(delivery)
      setMessage('Entrega confirmada e estoque atualizado.')
      await reload()
    } catch (error) {
      setMessage(error.message)
    }
  }

  async function handleCancel(id) {
    setMessage('')
    if (readOnly) return blocked()
    if (!confirm('Cancelar essa entrega?')) return

    try {
      await cancelDelivery(id)
      setMessage('Entrega cancelada.')
      await reload()
    } catch (error) {
      setMessage(error.message)
    }
  }

  async function handleDeleteCustomer(id) {
    setMessage('')
    if (readOnly) return blocked()
    if (!confirm('Excluir cliente?')) return

    try {
      await deleteDeliveryCustomer(id)
      if (selectedCustomerId === id) setSelectedCustomerId('')
      setMessage('Cliente excluído.')
      await reload()
    } catch (error) {
      setMessage(error.message)
    }
  }

  async function handleRepeatDelivery(delivery) {
    setMessage('')
    if (readOnly) return blocked()

    const item = delivery.delivery_items?.[0]
    if (!item) {
      setMessage('Essa entrega não possui produto para repetir.')
      return
    }

    const product = products.find((productItem) => productItem.id === item.product_id)
    if (!product) {
      setMessage('Produto não encontrado no estoque atual.')
      return
    }

    try {
      await createDelivery({
        userId: user.id,
        customerId: delivery.customer_id,
        product,
        quantity: String(item.quantity || 0),
        deliveryDate: today(),
      })
      setSelectedCustomerId(delivery.customer_id)
      setMessage('Entrega repetida e criada como pendente para hoje.')
      await reload()
    } catch (error) {
      setMessage(error.message)
    }
  }

  return (
    <main className="page">
      <h2>Entregas</h2>
      <p className="muted">Cadastre clientes, crie entregas e acompanhe o histórico de compras de cada cliente.</p>

      <form className="form-card compact" onSubmit={submitCustomer}>
        <h3>Cadastrar cliente</h3>
        <label>Nome do cliente</label>
        <input name="name" placeholder="Maria Silva" autoComplete="off" required />

        <label>Endereço</label>
        <input name="address" placeholder="Rua, número, bairro" autoComplete="off" required />

        <label>Telefone</label>
        <input name="phone" placeholder="(27) 99999-9999" inputMode="tel" autoComplete="off" required />

        <button className="primary-btn">Salvar cliente</button>
      </form>

      <form className="form-card compact" onSubmit={submitDelivery}>
        <h3>Nova entrega</h3>
        <label>Cliente</label>
        <select name="customer_id" defaultValue={selectedCustomerId} required>
          <option value="">Selecione</option>
          {sortedCustomers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}
        </select>

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
            <label>Quantidade</label>
            <input {...decimalInputProps({ min: '0' })} name="quantity" placeholder="0" required />
          </div>
          <div>
            <label>Data</label>
            <input type="date" name="delivery_date" defaultValue={today()} required />
          </div>
        </div>

        {message && <p className="message">{message}</p>}
        <button className="primary-btn">Criar entrega</button>
      </form>

      <section className="section">
        <div className="section-heading">
          <div>
            <h3>Clientes cadastrados</h3>
            <span>{sortedCustomers.length} cliente{sortedCustomers.length === 1 ? '' : 's'}</span>
          </div>
          {selectedCustomer && <button className="mini-btn" onClick={() => setSelectedCustomerId('')}>Ver todos</button>}
        </div>

        <div className="list">
          {sortedCustomers.map((customer) => {
            const stat = customerStats.get(customer.id) || {}
            const active = selectedCustomerId === customer.id
            return (
              <article className={`item-card editable-card ${active ? 'selected-client' : ''}`} key={customer.id}>
                <div>
                  <strong>{customer.name}</strong>
                  <span>{customer.phone}</span>
                  <small>{customer.address}</small>
                  <small>{stat.deliveredCount || 0} compra{stat.deliveredCount === 1 ? '' : 's'} confirmada{stat.deliveredCount === 1 ? '' : 's'} · Total {money(stat.totalRevenue || 0)}</small>
                </div>
                <div className="card-actions">
                  <button className="mini-filled" onClick={() => setSelectedCustomerId(customer.id)}>Histórico</button>
                  <button className="mini-btn danger-text" onClick={() => handleDeleteCustomer(customer.id)}>Excluir</button>
                </div>
              </article>
            )
          })}
          {!sortedCustomers.length && <p className="empty">Nenhum cliente cadastrado.</p>}
        </div>
      </section>

      {selectedCustomer && (
        <section className="customer-history-card">
          <div className="customer-history-header">
            <div>
              <small>Histórico do cliente</small>
              <h3>{selectedCustomer.name}</h3>
              <span>{selectedCustomer.phone} · {selectedCustomer.address}</span>
            </div>
            <button className="mini-btn" onClick={() => setSelectedCustomerId('')}>Fechar</button>
          </div>

          <div className="customer-stats-grid">
            <div><small>Total comprado</small><strong>{money(selectedStats?.totalRevenue || 0)}</strong></div>
            <div><small>Compras</small><strong>{selectedStats?.deliveredCount || 0}</strong></div>
            <div><small>Pendentes</small><strong>{selectedStats?.pendingCount || 0}</strong></div>
          </div>

          <div className="customer-details-list">
            <span>Última compra: <strong>{selectedStats?.lastPurchase ? new Date(selectedStats.lastPurchase).toLocaleDateString('pt-BR') : 'Ainda não comprou'}</strong></span>
            <span>Produto mais comprado: <strong>{selectedStats?.favoriteProduct || 'Sem histórico'}</strong></span>
          </div>
        </section>
      )}

      <section className="section">
        <div className="section-heading">
          <div>
            <h3>{selectedCustomer ? `Compras de ${selectedCustomer.name}` : 'Entregas criadas'}</h3>
            <span>{selectedCustomer ? 'Histórico completo desse cliente' : 'Todas as entregas da banca'}</span>
          </div>
        </div>

        <div className="list">
          {visibleDeliveries.map((delivery) => {
            const item = delivery.delivery_items?.[0]
            const delivered = delivery.status === 'delivered'
            return (
              <article className="item-card editable-card" key={delivery.id}>
                <div>
                  <strong>{delivery.delivery_customers?.name || 'Cliente'}</strong>
                  <span>{item ? `${item.product_name} · ${qty(item.quantity)} ${item.unit}` : 'Produto não informado'}</span>
                  <small>{delivery.delivery_customers?.address}</small>
                  <small>Data: {formatDate(delivery.delivery_date)} · {delivered ? 'Entregue' : 'Pendente'}</small>
                  {item && <small>Total: {money(item.revenue)} · Lucro estimado: {money(item.profit)}</small>}
                </div>
                <div className="card-actions">
                  {!delivered && <button className="mini-filled" onClick={() => handleConfirm(delivery)}>Confirmar</button>}
                  {delivered && <button className="mini-filled light" onClick={() => handleRepeatDelivery(delivery)}>Repetir</button>}
                  {!delivered && <button className="mini-btn danger-text" onClick={() => handleCancel(delivery.id)}>Cancelar</button>}
                </div>
              </article>
            )
          })}
          {!visibleDeliveries.length && <p className="empty">Nenhuma entrega encontrada.</p>}
        </div>
      </section>
    </main>
  )
}
