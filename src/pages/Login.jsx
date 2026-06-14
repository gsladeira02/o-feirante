import { useState } from 'react'
import { supabase, hasSupabaseConfig } from '../supabase'

export default function Login({ onLogin }) {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [stallName, setStallName] = useState('')
  const [city, setCity] = useState('')
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
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({ email, password })
        if (error) throw error

        if (data.user) {
          await supabase.from('profiles').insert({
            id: data.user.id,
            name,
            stall_name: stallName,
            city,
          })
        }

        setMessage('Cadastro criado. Se o Supabase pedir confirmação, verifique seu e-mail.')
        if (data.session) onLogin(data.session)
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        onLogin(data.session)
      }
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
        <h1>O Feirante</h1>
        <p>Saiba o que levou, o que voltou e quanto vendeu.</p>
      </section>

      <form className="form-card" onSubmit={handleSubmit}>
        <h2>{mode === 'login' ? 'Entrar' : 'Criar conta'}</h2>

        {mode === 'signup' && (
          <>
            <label>Seu nome</label>
            <input value={name} onChange={(e) => setName(e.target.value)} required />

            <label>Nome da banca</label>
            <input value={stallName} onChange={(e) => setStallName(e.target.value)} />

            <label>Cidade</label>
            <input value={city} onChange={(e) => setCity(e.target.value)} />
          </>
        )}

        <label>E-mail</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />

        <label>Senha</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength="6" required />

        {message && <p className="message">{message}</p>}

        <button className="primary-btn" disabled={loading}>
          {loading ? 'Aguarde...' : mode === 'login' ? 'Entrar' : 'Cadastrar'}
        </button>

        <button type="button" className="link-btn" onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}>
          {mode === 'login' ? 'Criar uma conta' : 'Já tenho conta'}
        </button>
      </form>
    </main>
  )
}
