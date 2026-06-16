import { useState } from 'react'
import { registerPurchase } from '../services/api'
import { decimalInputProps, parseDecimal } from '../utils/number'

export default function Compras({ user, products, reload, readOnly = false, onBlockedAction }) {
  const [productId, setProductId] = useState('')
  const [quantity, setQuantity] = useState('')
  const [totalValue, setTotalValue] = useState('')
  const [message, setMessage] = useState('')

  async function submit(event) {
    event.preventDefault()
    setMessage('')

    if (readOnly) {
      setMessage(onBlockedAction?.() || 'Esta é uma conta teste. Alterações bloqueadas.')
      return
    }

    const product = products.find((item) => item.id === productId)

    if (!product) {
      setMessage('Selecione um produto.')
      return
    }

    if (parseDecimal(quantity) <= 0) {
      setMessage('A quantidade comprada precisa ser maior que zero.')
      return
    }

    if (parseDecimal(totalValue) < 0) {
      setMessage('O valor total pago não pode ser negativo.')
      return
    }

    try {
      await registerPurchase({ userId: user.id, product, quantity, totalValue })
      setProductId('')
      setQuantity('')
      setTotalValue('')
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
        <input {...decimalInputProps({ min: '0', value: quantity, onChange: (e) => setQuantity(e.target.value), required: true })} />

        <label>Valor total da entrada</label>
        <input {...decimalInputProps({ min: '0', value: totalValue, onChange: (e) => setTotalValue(e.target.value), required: true })} />
        {message && <p className="message">{message}</p>}
        <button className="primary-btn">Registrar entrada</button>
      </form>
    </main>
  )
}
