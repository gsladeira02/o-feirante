import { useState } from 'react'
import { changeFirstPassword } from '../services/api'

export default function ChangePassword({ onDone }) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(event) {
    event.preventDefault()
    setMessage('')

    if (password.length < 6) {
      setMessage('A senha precisa ter pelo menos 6 caracteres.')
      return
    }

    if (password !== confirm) {
      setMessage('As senhas não conferem.')
      return
    }

    setLoading(true)
    try {
      await changeFirstPassword(password)
      await onDone()
    } catch (error) {
      setMessage(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="login-screen">
      <section className="brand-card">
        <div className="logo-mark"><img src="/logo.svg" alt="Logo O Feirante" /></div>
        <h1>Primeiro acesso</h1>
        <p>Por segurança, defina sua nova senha.</p>
      </section>

      <form className="form-card" onSubmit={submit}>
        <h2>Alterar senha</h2>

        <label>Nova senha</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />

        <label>Confirmar senha</label>
        <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />

        {message && <p className="message">{message}</p>}

        <button className="primary-btn" disabled={loading}>{loading ? 'Salvando...' : 'Salvar senha'}</button>
      </form>
    </main>
  )
}
