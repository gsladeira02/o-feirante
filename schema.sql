import { useState } from 'react'
import { createFairPlace, deleteFairPlace } from '../services/api'

export default function Feiras({ user, fairPlaces, reload, setPage, setSelectedFairPlace }) {
  const [form, setForm] = useState({ name: '', address: '', weekday: '' })
  const [message, setMessage] = useState('')

  async function submit(event) {
    event.preventDefault()
    setMessage('')

    try {
      await createFairPlace({
        userId: user.id,
        name: form.name,
        address: form.address,
        weekday: form.weekday,
      })

      setForm({ name: '', address: '', weekday: '' })
      await reload()
    } catch (error) {
      setMessage(error.message)
    }
  }

  async function remove(id) {
    if (!confirm('Excluir feira cadastrada?')) return
    await deleteFairPlace(id)
    await reload()
  }

  function start(place) {
    setSelectedFairPlace(place)
    setPage('comecar')
  }

  return (
    <main className="page">
      <h2>Minhas feiras</h2>
      <p className="muted">Cadastre os locais. Depois toque em uma feira para iniciar.</p>

      <form className="form-card compact" onSubmit={submit}>
        <h3>Cadastrar feira</h3>

        <label>Nome da feira</label>
        <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Feira da Glória" required />

        <label>Bairro ou endereço</label>
        <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Opcional" />

        <label>Dia da semana</label>
        <select value={form.weekday} onChange={(e) => setForm({ ...form, weekday: e.target.value })}>
          <option value="">Não informar</option>
          <option value="Segunda">Segunda</option>
          <option value="Terça">Terça</option>
          <option value="Quarta">Quarta</option>
          <option value="Quinta">Quinta</option>
          <option value="Sexta">Sexta</option>
          <option value="Sábado">Sábado</option>
          <option value="Domingo">Domingo</option>
        </select>

        {message && <p className="message">{message}</p>}
        <button className="primary-btn">Salvar feira</button>
      </form>

      <section className="list">
        {fairPlaces.map((place) => (
          <article className="item-card fair-place-card" key={place.id}>
            <button className="fair-start" onClick={() => start(place)}>
              <strong>{place.name}</strong>
              <span>{place.weekday || 'Dia não informado'} {place.address ? `· ${place.address}` : ''}</span>
              <small>Toque para iniciar esta feira</small>
            </button>
            <button className="mini-btn danger-text" onClick={() => remove(place.id)}>Excluir</button>
          </article>
        ))}
        {!fairPlaces.length && <p className="empty">Nenhuma feira cadastrada.</p>}
      </section>
    </main>
  )
}
