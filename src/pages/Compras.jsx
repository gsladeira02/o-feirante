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

    if (Number(quantity || 0) <= 0) {
      setMessage('A quantidade comprada precisa ser maior que zero.')
      return
    }

    if (Number(totalValue || 0) < 0) {
      setMessage('O valor total pago não pode ser negativo.')
      return
    }

    try {
      await registerPurchase({ userId: user.id, product, quantity, totalValue, supplier })
      setProductId('')
      setQuantity('')
      setTotalValue('')
      setSupplier('')
      setMessage('Entrada registrada.')
      await reload()
    } catch (error) {
      setMessage(error.message)
    }
  }

  return (
    <main className="page">
      <h2>Entrada de mercadoria</h2>

      <form className="form-card" onSubmit={submit}>
        <label>Produto</label>
        <select value={productId} onChange={(e) => setProductId(e.target.value)} required>
          <option value="">Selecione</option>
          {products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
        </select>

        <label>Quantidade recebida</label>
        <input min="0" type="number" step="0.01" value={quantity} onChange={(e) => setQuantity(e.target.value)} required />

        <label>Valor total da entrada</label>
        <input min="0" type="number" step="0.01" value={totalValue} onChange={(e) => setTotalValue(e.target.value)} required />
        {message && <p className="message">{message}</p>}
        <button className="primary-btn">Registrar entrada</button>
      </form>
    </main>
  )
}
