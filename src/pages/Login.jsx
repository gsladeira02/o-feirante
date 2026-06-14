import { useState } from 'react'
import { supabase, hasSupabaseConfig } from '../supabase'
import { PrivacyPolicy, TermsOfUse } from '../components/LegalDocuments'

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [legalView, setLegalView] = useState(null)

  async function submit(event) {
    event.preventDefault()
    setMessage('')

    if (!hasSupabaseConfig) {
      setMessage('Configure as variáveis do Supabase na Vercel.')
      return
    }

    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      onLogin(data.session)
    } catch {
      setMessage('E-mail ou senha inválidos.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="login-screen">
      <section className="brand-card">
        <div className="logo-mark"><img src="/logo.svg" alt="Logo O Feirante" /></div>
        <h1>O Feirante</h1>
        <p>Acesso exclusivo para assinantes.</p>
      </section>

      <form className="form-card" onSubmit={submit}>
        <h2>Entrar</h2>

        <label>E-mail</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />

        <label>Senha</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />

        {message && <p className="message">{message}</p>}

        <button className="primary-btn" disabled={loading}>{loading ? 'Entrando...' : 'Entrar'}</button>
        <p className="access-note">Sua conta é criada pelo administrador após a assinatura.</p>
        <p className="legal-note">
          Ao acessar o O Feirante, você concorda com os{' '}
          <button type="button" onClick={() => setLegalView('terms')}>Termos de Uso</button>
          {' '}e com a{' '}
          <button type="button" onClick={() => setLegalView('privacy')}>Política de Privacidade</button>.
        </p>
      </form>

      {legalView && (
        <div className="legal-modal" role="dialog" aria-modal="true">
          <div className="legal-box">
            <button className="legal-close" onClick={() => setLegalView(null)}>Fechar</button>
            {legalView === 'privacy' ? <PrivacyPolicy /> : <TermsOfUse />}
          </div>
        </div>
      )}
    </main>
  )
}
