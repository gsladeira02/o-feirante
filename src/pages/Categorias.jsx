import { useState } from 'react'
import { createCategory, deleteCategory, updateCategory } from '../services/api'

export default function Categorias({ user, categories, reload, readOnly = false, onBlockedAction }) {
  const [name, setName] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editingName, setEditingName] = useState('')
  const [message, setMessage] = useState('')

  async function submit(event) {
    event.preventDefault()
    setMessage('')

    if (readOnly) {
      setMessage(onBlockedAction?.() || 'Esta é uma conta teste. Alterações bloqueadas.')
      return
    }

    try {
      await createCategory({ userId: user.id, name })
      setName('')
      await reload()
    } catch (error) {
      setMessage(error.message)
    }
  }

  async function saveEdit(event) {
    event.preventDefault()
    setMessage('')

    if (readOnly) {
      setMessage(onBlockedAction?.() || 'Esta é uma conta teste. Alterações bloqueadas.')
      return
    }

    try {
      await updateCategory({ id: editingId, name: editingName })
      setEditingId(null)
      setEditingName('')
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

    if (!confirm('Excluir categoria? Os produtos continuarão cadastrados, mas ficarão sem categoria.')) return

    try {
      await deleteCategory(id)
      await reload()
    } catch (error) {
      setMessage(error.message)
    }
  }

  return (
    <main className="page">
      <h2>Categorias</h2>

      <form className="form-card compact" onSubmit={submit}>
        <h3>Nova categoria</h3>
        <label>Nome</label>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Frutas" required />
        {message && <p className="message">{message}</p>}
        <button className="primary-btn">Salvar categoria</button>
      </form>

      <section className="list">
        {categories.map((category) => (
          <article className="item-card editable-card" key={category.id}>
            {editingId === category.id ? (
              <form className="inline-edit" onSubmit={saveEdit}>
                <input value={editingName} onChange={(e) => setEditingName(e.target.value)} required />
                <div className="inline-actions">
                  <button className="mini-filled" type="submit">Salvar</button>
                  <button className="mini-btn" type="button" onClick={() => setEditingId(null)}>Cancelar</button>
                </div>
              </form>
            ) : (
              <>
                <div>
                  <strong>{category.name}</strong>
                  <span>Categoria cadastrada</span>
                </div>
                <div className="card-actions">
                  <button className="mini-btn" onClick={() => {
                    setMessage('')
                    if (readOnly) {
                      setMessage(onBlockedAction?.() || 'Esta é uma conta teste. Alterações bloqueadas.')
                      return
                    }
                    setEditingId(category.id)
                    setEditingName(category.name)
                  }}>Editar</button>
                  <button className="mini-btn danger-text" onClick={() => remove(category.id)}>Excluir</button>
                </div>
              </>
            )}
          </article>
        ))}

        {!categories.length && <p className="empty">Nenhuma categoria criada.</p>}
      </section>
    </main>
  )
}
