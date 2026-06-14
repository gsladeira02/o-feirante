import { useState } from 'react'
import { createFairPlace, deleteFairPlace, updateFairPlace } from '../services/api'

const emptyForm = { name: '', address: '', weekday: '' }

export default function Feiras({ user, fairPlaces, reload, setPage, setSelectedFairPlace, readOnly = false, onBlockedAction }) {
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState(emptyForm)
  const [message, setMessage] = useState('')

  async function submit(event) {
    event.preventDefault()
    setMessage('')

    if (readOnly) {
      setMessage(onBlockedAction?.() || 'Esta é uma conta teste. Alterações bloqueadas.')
      return
    }

    try {
      await createFairPlace({
        userId: user.id,
        name: form.name,
        address: form.address,
        weekday: form.weekday,
      })

      setForm(emptyForm)
      await reload()
    } catch (error) {
      setMessage(error.message)
    }
  }

  function startEdit(place) {
    setMessage('')
    if (readOnly) {
      setMessage(onBlockedAction?.() || 'Esta é uma conta teste. Alterações bloqueadas.')
      return
    }

    setEditingId(place.id)
    setEditForm({
      name: place.name || '',
      address: place.address || '',
      weekday: place.weekday || '',
    })
  }

  async function saveEdit(event) {
    event.preventDefault()
    setMessage('')

    if (readOnly) {
      setMessage(onBlockedAction?.() || 'Esta é uma conta teste. Alterações bloqueadas.')
      return
    }

    try {
      await updateFairPlace({
        id: editingId,
        name: editForm.name,
        address: editForm.address,
        weekday: editForm.weekday,
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

    if (!confirm('Excluir feira cadastrada?')) return

    try {
      await deleteFairPlace(id)
      await reload()
    } catch (error) {
      setMessage(error.message)
    }
  }

  function start(place) {
    setMessage('')
    if (readOnly) {
      setMessage(onBlockedAction?.() || 'Esta é uma conta teste. Iniciar feira está bloqueado.')
      return
    }

    setSelectedFairPlace(place)
    setPage('comecar')
  }

  function FairFields({ data, setData }) {
    return (
      <>
        <label>Nome da feira</label>
        <input value={data.name} onChange={(e) => setData({ ...data, name: e.target.value })} placeholder="Feira da Glória" required />

        <label>Bairro ou endereço</label>
        <input value={data.address} onChange={(e) => setData({ ...data, address: e.target.value })} placeholder="Opcional" />

        <label>Dia da semana</label>
        <select value={data.weekday} onChange={(e) => setData({ ...data, weekday: e.target.value })}>
          <option value="">Não informar</option>
          <option value="Segunda">Segunda</option>
          <option value="Terça">Terça</option>
          <option value="Quarta">Quarta</option>
          <option value="Quinta">Quinta</option>
          <option value="Sexta">Sexta</option>
          <option value="Sábado">Sábado</option>
          <option value="Domingo">Domingo</option>
        </select>
      </>
    )
  }

  return (
    <main className="page">
      <h2>Minhas feiras</h2>
      <p className="muted">Cadastre os locais. Depois toque em uma feira para iniciar.</p>

      <form className="form-card compact" onSubmit={submit}>
        <h3>Cadastrar feira</h3>
        <FairFields data={form} setData={setForm} />
        {message && <p className="message">{message}</p>}
        <button className="primary-btn">Salvar feira</button>
      </form>

      <section className="list">
        {fairPlaces.map((place) => (
          <article className="item-card fair-place-card editable-card" key={place.id}>
            {editingId === place.id ? (
              <form className="inline-edit wide" onSubmit={saveEdit}>
                <FairFields data={editForm} setData={setEditForm} />
                <div className="inline-actions">
                  <button className="mini-filled" type="submit">Salvar</button>
                  <button className="mini-btn" type="button" onClick={() => setEditingId(null)}>Cancelar</button>
                </div>
              </form>
            ) : (
              <>
                <button className="fair-start" onClick={() => start(place)}>
                  <strong>{place.name}</strong>
                  <span>{place.weekday || 'Dia não informado'} {place.address ? `· ${place.address}` : ''}</span>
                  <small>Toque para iniciar esta feira</small>
                </button>
                <div className="card-actions">
                  <button className="mini-btn" onClick={() => startEdit(place)}>Editar</button>
                  <button className="mini-btn danger-text" onClick={() => remove(place.id)}>Excluir</button>
                </div>
              </>
            )}
          </article>
        ))}
        {!fairPlaces.length && <p className="empty">Nenhuma feira cadastrada.</p>}
      </section>
    </main>
  )
}
