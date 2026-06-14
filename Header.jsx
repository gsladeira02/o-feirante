import { useState } from 'react'
import { registerPurchase } from '../services/api'

export default function Compras({ user, products, reload }) {
  const [productId, setProductId] = useState('')
  const [quantity, setQuantity] = useState('')
  const [totalValue, setTotalValue] = useState('')
  const [supplier, setSupplier] = useState('')
  const [message, setMessage] = useState('')

  async function submit(event) {
    event.preventDefault()
    setMessage('')

    const product = products.find((item) => item.id === productId)
    if (!product) {
      setMessage('Selecione um produto.')
      return
    }

    try {
      await registerPurchase({ userId: user.id, product, quantity, totalValue, supplier })
      setProductId('')
      setQuantity('')
      setTotalValue('')
      setSupplier('')
      setMessage('Compra registrada e estoque atualizado.')
      await reload()
    } catch (error) {
      setMessage(error.message)
    }
  }

  return (
    <main className="page">
      <h2>Comprar mercadoria</h2>

      <form className="form-card" onSubmit={submit}>
        <label>Produto</label>
        <select value={productId} onChange={(e) => setProductId(e.target.value)} required>
          <option value="">Selecione</option>
          {products.map((product) => (
            <option value={product.id} key={product.id}>{product.name}</option>
          ))}
        </select>

        <label>Quantidade comprada</label>
        <input type="number" step="0.01" value={quantity} onChange={(e) => setQuantity(e.target.value)} required />

        <label>Valor total pago</label>
        <input type="number" step="0.01" value={totalValue} onChange={(e) => setTotalValue(e.target.value)} required />

        <label>Fornecedor</label>
        <input value={supplier} onChange={(e) => setSupplier(e.target.value)} placeholder="Opcional" />

        {message && <p className="message">{message}</p>}

        <button className="primary-btn">Registrar compra</button>
      </form>
    </main>
  )
}
