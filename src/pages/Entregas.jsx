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

export default function Entregas({ user, products, customers, deliveries, reload, readOnly = false, onBlockedAction }) {
  const [message, setMessage] = useState('')
  const sortedCustomers = useMemo(() => [...customers].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')), [customers])

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
      setMessage('Cliente excluído.')
      await reload()
    } catch (error) {
      setMessage(error.message)
    }
  }

  return (
    <main className="page">
      <h2>Entregas</h2>
      <p className="muted">Cadastre clientes, crie entregas e confirme quando o produto for entregue.</p>

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
        <select name="customer_id" required>
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
        <h3>Clientes cadastrados</h3>
        <div className="list">
          {sortedCustomers.slice(0, 8).map((customer) => (
            <article className="item-card" key={customer.id}>
              <div>
                <strong>{customer.name}</strong>
                <span>{customer.phone}</span>
                <small>{customer.address}</small>
              </div>
              <button className="mini-btn danger-text" onClick={() => handleDeleteCustomer(customer.id)}>Excluir</button>
            </article>
          ))}
          {!sortedCustomers.length && <p className="empty">Nenhum cliente cadastrado.</p>}
        </div>
      </section>

      <section className="section">
        <h3>Entregas criadas</h3>
        <div className="list">
          {deliveries.map((delivery) => {
            const item = delivery.delivery_items?.[0]
            return (
              <article className="item-card editable-card" key={delivery.id}>
                <div>
                  <strong>{delivery.delivery_customers?.name || 'Cliente'}</strong>
                  <span>{item ? `${item.product_name} · ${qty(item.quantity)} ${item.unit}` : 'Produto não informado'}</span>
                  <small>{delivery.delivery_customers?.address}</small>
                  <small>Data: {new Date(`${delivery.delivery_date}T00:00:00`).toLocaleDateString('pt-BR')} · {delivery.status === 'delivered' ? 'Entregue' : 'Pendente'}</small>
                  {item && <small>Valor estimado: {money(item.revenue)} · Lucro estimado: {money(item.profit)}</small>}
                </div>
                <div className="card-actions">
                  {delivery.status !== 'delivered' && <button className="mini-filled" onClick={() => handleConfirm(delivery)}>Confirmar</button>}
                  {delivery.status !== 'delivered' && <button className="mini-btn danger-text" onClick={() => handleCancel(delivery.id)}>Cancelar</button>}
                </div>
              </article>
            )
          })}
          {!deliveries.length && <p className="empty">Nenhuma entrega criada.</p>}
        </div>
      </section>
    </main>
  )
}
