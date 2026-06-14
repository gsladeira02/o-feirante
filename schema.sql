import { useState } from 'react'
import { createCategory, deleteCategory } from '../services/api'

export default function Categorias({ user, categories, reload }) {
  const [name, setName] = useState('')
  const [message, setMessage] = useState('')

  async function submit(event) {
    event.preventDefault()
    setMessage('')

    try {
      await createCategory({ userId: user.id, name })
      setName('')
      await reload()
    } catch (error) {
      setMessage(error.message)
    }
  }

  async function remove(id) {
    if (!confirm('Excluir esta categoria? Os produtos continuarão cadastrados, mas ficarão sem categoria.')) return
    await deleteCategory(id)
    await reload()
  }

  return (
    <main className="page">
      <h2>Categorias</h2>
      <p className="muted">Organize os produtos por grupos, como frutas, verduras e legumes.</p>

      <form className="form-card compact" onSubmit={submit}>
        <h3>Nova categoria</h3>

        <label>Nome</label>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Frutas" required />

        {message && <p className="message">{message}</p>}

        <button className="primary-btn">Salvar categoria</button>
      </form>

      <section className="list">
        {categories.map((category) => (
          <article className="item-card" key={category.id}>
            <div>
              <strong>{category.name}</strong>
              <span>Categoria cadastrada</span>
            </div>
            <button className="mini-btn danger-text" onClick={() => remove(category.id)}>Excluir</button>
          </article>
        ))}

        {!categories.length && <p className="empty">Nenhuma categoria criada ainda.</p>}
      </section>
    </main>
  )
}
