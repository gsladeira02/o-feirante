import { useState } from 'react'
import { supabase, hasSupabaseConfig } from '../supabase'

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    setMessage('')

    if (!hasSupabaseConfig) {
      setMessage('Configure o arquivo .env com as chaves do Supabase.')
      return
    }

    setLoading(true)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      onLogin(data.session)
    } catch (error) {
      setMessage('E-mail ou senha inválidos.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="login-screen">
      <section className="brand-card">
        <div className="logo-mark">OF</div>
        <h1>O Feirante</h1>
        <p>Acesso exclusivo para assinantes.</p>
      </section>

      <form className="form-card" onSubmit={handleSubmit}>
        <h2>Entrar</h2>

        <label>E-mail</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />

        <label>Senha</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />

        {message && <p className="message">{message}</p>}

        <button className="primary-btn" disabled={loading}>
          {loading ? 'Aguarde...' : 'Entrar'}
        </button>

        <p className="access-note">
          Sua conta é criada pelo administrador após a assinatura.
        </p>
      </form>
    </main>
  )
}
