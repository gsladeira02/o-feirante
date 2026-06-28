import { useMemo, useState } from 'react'
import { supabase, hasSupabaseConfig } from '../supabase'
import { PrivacyPolicy, TermsOfUse } from '../components/LegalDocuments'

const PLANS = [
  {
    id: 'mensal',
    name: 'Mensal',
    priceLabel: 'R$ 19,90',
    installmentLabel: '',
    amountCents: 1990,
    intervalMonths: 1,
    recurrenceLabel: 'Cobrança recorrente mensal',
    note: 'Ideal para começar',
  },
  {
    id: 'trimestral',
    name: 'Trimestral',
    priceLabel: 'R$ 54,90',
    installmentLabel: 'Equivale a R$ 18,30/mês',
    amountCents: 5490,
    intervalMonths: 3,
    recurrenceLabel: 'Cobrança recorrente a cada 3 meses',
    note: 'Economize no trimestre',
  },
  {
    id: 'semestral',
    name: 'Semestral',
    priceLabel: 'R$ 99,90',
    installmentLabel: 'Equivale a R$ 16,65/mês',
    amountCents: 9990,
    intervalMonths: 6,
    recurrenceLabel: 'Cobrança recorrente a cada 6 meses',
    note: 'Mais controle por menos',
  },
  {
    id: 'anual',
    name: 'Anual',
    priceLabel: 'R$ 179,90',
    installmentLabel: 'Equivale a R$ 14,99/mês',
    amountCents: 17990,
    intervalMonths: 12,
    recurrenceLabel: 'Cobrança recorrente anual',
    note: 'Melhor custo-benefício',
    featured: true,
  },
]

const INITIAL_SIGNUP = {
  fullName: '',
  email: '',
  cpf: '',
  birthDate: '',
  phone: '',
  city: '',
  state: '',
  stallName: '',
  cnpj: '',
}

function onlyDigits(value) {
  return String(value || '').replace(/\D/g, '')
}

function formatBrazilPhone(value) {
  const digits = onlyDigits(value)
  if (!digits) return ''
  return digits.startsWith('55') ? `+${digits}` : `+55${digits}`
}

function makeOrderNsu(planId) {
  const random = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID().slice(0, 8)
    : Math.random().toString(36).slice(2, 10)

  return `OF-${planId.toUpperCase()}-${Date.now()}-${random}`
}

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [legalView, setLegalView] = useState(null)
  const [mode, setMode] = useState('login')
  const [selectedPlanId, setSelectedPlanId] = useState('anual')
  const [signup, setSignup] = useState(INITIAL_SIGNUP)
  const [signupLoading, setSignupLoading] = useState(false)
  const [signupMessage, setSignupMessage] = useState('')

  const selectedPlan = useMemo(
    () => PLANS.find((plan) => plan.id === selectedPlanId) || PLANS[0],
    [selectedPlanId]
  )

  const paymentSuccess = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('pagamento')

  function updateSignup(field, value) {
    setSignup((current) => ({ ...current, [field]: value }))
  }

  async function submit(event) {
    event.preventDefault()
    setMessage('')

    if (!hasSupabaseConfig) {
      setMessage('Não foi possível conectar ao sistema agora. Tente novamente em alguns instantes.')
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

  async function submitSignup(event) {
    event.preventDefault()
    setSignupMessage('')

    if (!hasSupabaseConfig) {
      setSignupMessage('Não foi possível iniciar seu cadastro agora. Tente novamente em alguns instantes.')
      return
    }

    const cpfDigits = onlyDigits(signup.cpf)
    const cnpjDigits = onlyDigits(signup.cnpj)
    const phoneDigits = onlyDigits(signup.phone)

    if (cpfDigits.length !== 11) {
      setSignupMessage('Informe um CPF válido com 11 números.')
      return
    }

    if (cnpjDigits && cnpjDigits.length !== 14) {
      setSignupMessage('O CNPJ é opcional, mas se informado precisa ter 14 números.')
      return
    }

    if (phoneDigits.length < 10) {
      setSignupMessage('Informe um celular válido com DDD.')
      return
    }

    const orderNsu = makeOrderNsu(selectedPlan.id)
    const redirectUrl = `${window.location.origin}/?pagamento=sucesso`
    const signupData = {
      full_name: signup.fullName.trim(),
      email: signup.email.trim().toLowerCase(),
      cpf: cpfDigits,
      birth_date: signup.birthDate,
      phone: phoneDigits,
      city: signup.city.trim(),
      state: signup.state.trim().toUpperCase(),
      stall_name: signup.stallName.trim(),
      cnpj: cnpjDigits || null,
      plan_id: selectedPlan.id,
      plan_name: selectedPlan.name,
      amount_cents: selectedPlan.amountCents,
      billing_interval_months: selectedPlan.intervalMonths,
      order_nsu: orderNsu,
      payment_status: 'pending',
    }

    setSignupLoading(true)
    try {
      const paymentResponse = await fetch('/api/stripe-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan_id: selectedPlan.id,
          order_nsu: orderNsu,
          success_url: redirectUrl,
          cancel_url: `${window.location.origin}/?pagamento=cancelado`,
          customer: {
            name: signupData.full_name,
            email: signupData.email,
            phone_number: formatBrazilPhone(signupData.phone),
          },
          signup: signupData,
        }),
      })

      const paymentData = await paymentResponse.json().catch(() => ({}))
      const paymentUrl = paymentData.url

      if (!paymentResponse.ok || !paymentUrl) {
        throw new Error(paymentData.message || 'Não foi possível iniciar o pagamento pela Stripe.')
      }

      const { error: signupError } = await supabase.from('customer_signups').insert({
        ...signupData,
        stripe_checkout_session_id: paymentData.id || null,
        stripe_checkout_url: paymentUrl,
        stripe_price_id: paymentData.price_id || null,
        infinitepay_url: paymentUrl,
      })

      if (signupError) throw signupError

      window.location.href = paymentUrl
    } catch (error) {
      console.error(error)
      setSignupMessage(error.message || 'Não foi possível iniciar a assinatura. Tente novamente.')
    } finally {
      setSignupLoading(false)
    }
  }

  return (
    <main className={`login-screen ${mode === 'signup' ? 'wide-login' : ''}`}>
      <section className="brand-card">
        <div className="logo-mark"><img src="/logo.svg" alt="Logo O Feirante" /></div>
        <h1>O Feirante</h1>
        <p>Controle estoque, feiras, perdas e lucro da sua banca pelo celular.</p>
      </section>

      {paymentSuccess && (
        <section className="success-box">
          <strong>Assinatura enviada</strong>
          <span>Recebemos o retorno da Stripe. Seu acesso será liberado após a confirmação.</span>
        </section>
      )}

      <section className="plans-section">
        <div className="section-heading">
          <span>Planos</span>
          <h2>Escolha seu acesso</h2>
        </div>
        <div className="plans-grid">
          {PLANS.map((plan) => (
            <button
              key={plan.id}
              type="button"
              className={`plan-card ${selectedPlanId === plan.id ? 'selected' : ''} ${plan.featured ? 'featured' : ''}`}
              onClick={() => {
                setSelectedPlanId(plan.id)
                setMode('signup')
              }}
            >
              {plan.featured && <small>Recomendado</small>}
              <strong>{plan.name}</strong>
              <b>{plan.priceLabel}</b>
              {plan.installmentLabel && <i>{plan.installmentLabel}</i>}
              <em>{plan.recurrenceLabel}</em>
              <span>{plan.note}</span>
            </button>
          ))}
        </div>
      </section>

      {mode === 'signup' ? (
        <form className="form-card signup-card" onSubmit={submitSignup}>
          <div className="form-title-row">
            <div>
              <h2>Assinar plano {selectedPlan.name}</h2>
              <p>{selectedPlan.priceLabel}{selectedPlan.installmentLabel ? ` · ${selectedPlan.installmentLabel}` : ''} · {selectedPlan.recurrenceLabel}</p>
            </div>
            <button type="button" className="mini-btn" onClick={() => setMode('login')}>Já tenho acesso</button>
          </div>

          <label>Nome completo</label>
          <input value={signup.fullName} onChange={(e) => updateSignup('fullName', e.target.value)} required />

          <label>E-mail para acesso</label>
          <input type="email" value={signup.email} onChange={(e) => updateSignup('email', e.target.value)} required />

          <div className="row">
            <div>
              <label>CPF</label>
              <input inputMode="numeric" value={signup.cpf} onChange={(e) => updateSignup('cpf', e.target.value)} placeholder="Somente números" required />
            </div>
            <div>
              <label>Data de nascimento</label>
              <input type="date" value={signup.birthDate} onChange={(e) => updateSignup('birthDate', e.target.value)} required />
            </div>
          </div>

          <label>Celular</label>
          <input inputMode="tel" value={signup.phone} onChange={(e) => updateSignup('phone', e.target.value)} placeholder="DDD + número" required />

          <div className="row">
            <div>
              <label>Cidade</label>
              <input value={signup.city} onChange={(e) => updateSignup('city', e.target.value)} required />
            </div>
            <div>
              <label>Estado</label>
              <input value={signup.state} onChange={(e) => updateSignup('state', e.target.value)} maxLength={2} placeholder="ES" required />
            </div>
          </div>

          <label>Nome da banca</label>
          <input value={signup.stallName} onChange={(e) => updateSignup('stallName', e.target.value)} required />

          <label>CNPJ da banca <span className="optional-label">opcional</span></label>
          <input inputMode="numeric" value={signup.cnpj} onChange={(e) => updateSignup('cnpj', e.target.value)} placeholder="Somente números" />

          {signupMessage && <p className="message">{signupMessage}</p>}

          <button className="primary-btn" disabled={signupLoading}>{signupLoading ? 'Abrindo pagamento...' : 'Ir para pagamento'}</button>
          <p className="access-note">Após a confirmação da assinatura, seu acesso será liberado conforme o plano escolhido.</p>
          <p className="legal-note">
            Ao assinar, você concorda com os{' '}
            <button type="button" onClick={() => setLegalView('terms')}>Termos de Uso</button>
            {' '}e com a{' '}
            <button type="button" onClick={() => setLegalView('privacy')}>Política de Privacidade</button>.
          </p>
        </form>
      ) : (
        <form className="form-card" onSubmit={submit}>
          <h2>Entrar</h2>

          <label>E-mail</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />

          <label>Senha</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />

          {message && <p className="message">{message}</p>}

          <button className="primary-btn" disabled={loading}>{loading ? 'Entrando...' : 'Entrar'}</button>
          <button type="button" className="secondary-btn" onClick={() => setMode('signup')}>Ainda não tenho acesso</button>
          <p className="access-note">Assine um plano para receber seu acesso ao sistema.</p>
          <p className="legal-note">
            Ao acessar o O Feirante, você concorda com os{' '}
            <button type="button" onClick={() => setLegalView('terms')}>Termos de Uso</button>
            {' '}e com a{' '}
            <button type="button" onClick={() => setLegalView('privacy')}>Política de Privacidade</button>.
          </p>
        </form>
      )}

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
