import { useState } from 'react'
import { changeFirstPassword } from '../services/api'

export default function ChangePassword({ onDone }) {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  async function submit(event) {
    event.preventDefault()
    setMessage('')

    if (password.length < 6) {
      setMessage('A nova senha precisa ter pelo menos 6 caracteres.')
      return
    }

    if (password !== confirmPassword) {
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
        <div className="logo-mark">OF</div>
        <h1>Primeiro acesso</h1>
        <p>Por segurança, defina sua nova senha antes de usar o aplicativo.</p>
      </section>

      <form className="form-card" onSubmit={submit}>
        <h2>Alterar senha</h2>

        <label>Nova senha</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength="6"
          required
        />

        <label>Confirmar nova senha</label>
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          minLength="6"
          required
        />

        {message && <p className="message">{message}</p>}

        <button className="primary-btn" disabled={loading}>
          {loading ? 'Salvando...' : 'Salvar senha e entrar'}
        </button>
      </form>
    </main>
  )
}
