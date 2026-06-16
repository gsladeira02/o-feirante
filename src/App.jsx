import { useEffect, useState } from 'react'
import { hasSupabaseConfig, supabase } from './supabase'
import {
  getActiveFair,
  getCategories,
  getClosedFairs,
  getFairPlaces,
  DEMO_ACCOUNT_MESSAGE,
  getOrCreateProfile,
  getProducts,
  getUserAccess,
  signOut,
} from './services/api'

import Header from './components/Header'
import BottomNav from './components/BottomNav'
import Login from './pages/Login'
import ChangePassword from './pages/ChangePassword'
import Dashboard from './pages/Dashboard'
import Estoque from './pages/Estoque'
import Categorias from './pages/Categorias'
import Compras from './pages/Compras'
import Feiras from './pages/Feiras'
import ComecarFeira from './pages/ComecarFeira'
import EncerrarFeira from './pages/EncerrarFeira'
import Historico from './pages/Historico'
import Inteligencia from './pages/Inteligencia'

export default function App() {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [page, setPage] = useState('dashboard')
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [fairPlaces, setFairPlaces] = useState([])
  const [fairs, setFairs] = useState([])
  const [activeFair, setActiveFair] = useState(null)
  const [selectedFairPlace, setSelectedFairPlace] = useState(null)
  const [loading, setLoading] = useState(true)
  const [access, setAccess] = useState({ read_only: false, is_active: true, label: null })

  const user = session?.user

  async function loadData(currentUser = user) {
    if (!currentUser || !hasSupabaseConfig) return

    const [profileData, accessData] = await Promise.all([
      getOrCreateProfile(currentUser),
      getUserAccess(currentUser.id),
    ])

    setProfile(profileData)
    setAccess(accessData)

    if (profileData.first_login) return

    const [productsData, categoriesData, fairPlacesData, fairsData, activeFairData] = await Promise.all([
      getProducts(currentUser.id),
      getCategories(currentUser.id),
      getFairPlaces(currentUser.id),
      getClosedFairs(currentUser.id),
      getActiveFair(currentUser.id),
    ])

    setProducts(productsData)
    setCategories(categoriesData)
    setFairPlaces(fairPlacesData)
    setFairs(fairsData)
    setActiveFair(activeFairData)
  }

  useEffect(() => {
    async function init() {
      if (!hasSupabaseConfig) {
        setLoading(false)
        return
      }

      const { data } = await supabase.auth.getSession()
      setSession(data.session)

      if (data.session?.user) {
        await loadData(data.session.user)
      }

      setLoading(false)
    }

    init()

    if (hasSupabaseConfig) {
      const { data } = supabase.auth.onAuthStateChange((_event, newSession) => {
        setSession(newSession)
      })

      return () => data.subscription.unsubscribe()
    }
  }, [])

  async function handleLogout() {
    await signOut()
    setSession(null)
    setProfile(null)
    setProducts([])
    setCategories([])
    setFairPlaces([])
    setFairs([])
    setActiveFair(null)
    setSelectedFairPlace(null)
    setAccess({ read_only: false, is_active: true, label: null, subscription_status: 'manual' })
  }

  if (loading) return <div className="loading">Carregando...</div>

  if (!session) {
    return <Login onLogin={(newSession) => {
      setSession(newSession)
      loadData(newSession.user)
    }} />
  }

  const isDemoAccount = Boolean(access?.read_only)
  const graceUntil = access?.grace_until ? new Date(access.grace_until) : null
  const periodEnd = access?.current_period_end ? new Date(access.current_period_end) : null
  const isExpiredByDate = graceUntil ? graceUntil.getTime() < Date.now() : false
  const isBlockedBySubscription = ['canceled', 'expired'].includes(access?.subscription_status) || (access?.subscription_status === 'past_due' && isExpiredByDate)
  const isInactiveAccount = access?.is_active === false || isBlockedBySubscription
  const isInGracePeriod = access?.subscription_status === 'past_due' && graceUntil && graceUntil.getTime() >= Date.now()

  function formatDate(dateLike) {
    if (!dateLike) return ''
    const date = new Date(dateLike)
    if (Number.isNaN(date.getTime())) return ''
    return date.toLocaleDateString('pt-BR')
  }

  function showDemoMessage() {
    window.alert(DEMO_ACCOUNT_MESSAGE)
    return DEMO_ACCOUNT_MESSAGE
  }

  if (isInactiveAccount) {
    return (
      <main className="login-screen">
        <section className="brand-card">
          <div className="logo-mark"><img src="/logo.svg" alt="Logo O Feirante" /></div>
          <h1>Conta inativa</h1>
          <p>{isBlockedBySubscription ? 'Sua assinatura está vencida. O acesso é bloqueado após 3 dias do vencimento. Regularize o pagamento para voltar a usar o sistema.' : 'Seu acesso está temporariamente bloqueado. Entre em contato pelo canal oficial do O Feirante para regularizar ou reativar sua assinatura.'}</p>
        </section>
        <button className="primary-btn" onClick={handleLogout}>Sair</button>
      </main>
    )
  }

  if (profile?.first_login) {
    return <ChangePassword onDone={async () => {
      await loadData(user)
      setPage('dashboard')
    }} />
  }

  return (
    <div className="app-shell">
      <Header onLogout={handleLogout} isDemoAccount={isDemoAccount} />

      {isDemoAccount && (
        <section className="demo-banner">
          <strong>Conta teste</strong>
          <span>Você pode visualizar o sistema, mas cadastros, edições, entradas e feiras estão bloqueados para demonstração.</span>
        </section>
      )}

      {!isDemoAccount && (access?.plan_name || access?.current_period_end || isInGracePeriod) && (
        <section className={`subscription-banner ${isInGracePeriod ? 'warning' : ''}`}>
          <strong>{access?.plan_name ? `Plano ${access.plan_name}` : 'Assinatura'}</strong>
          <span>
            {isInGracePeriod
              ? `Pagamento em atraso. Regularize até ${formatDate(access.grace_until)} para evitar bloqueio.`
              : periodEnd
                ? `Acesso ativo até ${formatDate(access.current_period_end)}.`
                : 'Acesso ativo.'}
          </span>
        </section>
      )}

      {page === 'dashboard' && (
        <Dashboard products={products} fairs={fairs} activeFair={activeFair} setPage={setPage} />
      )}

      {page === 'estoque' && (
        <Estoque user={user} products={products} categories={categories} reload={loadData} setPage={setPage} readOnly={isDemoAccount} onBlockedAction={showDemoMessage} />
      )}

      {page === 'categorias' && (
        <Categorias user={user} categories={categories} reload={loadData} readOnly={isDemoAccount} onBlockedAction={showDemoMessage} />
      )}

      {page === 'compras' && (
        <Compras user={user} products={products} reload={loadData} readOnly={isDemoAccount} onBlockedAction={showDemoMessage} />
      )}

      {page === 'feiras' && (
        <Feiras
          user={user}
          fairPlaces={fairPlaces}
          reload={loadData}
          setPage={setPage}
          setSelectedFairPlace={setSelectedFairPlace}
          readOnly={isDemoAccount}
          onBlockedAction={showDemoMessage}
        />
      )}

      {page === 'comecar' && (
        <ComecarFeira
          user={user}
          products={products}
          selectedFairPlace={selectedFairPlace}
          reload={loadData}
          setPage={setPage}
          readOnly={isDemoAccount}
          onBlockedAction={showDemoMessage}
        />
      )}

      {page === 'encerrar' && (
        <EncerrarFeira activeFair={activeFair} reload={loadData} setPage={setPage} readOnly={isDemoAccount} onBlockedAction={showDemoMessage} />
      )}

      {page === 'historico' && (
        <Historico fairs={fairs} />
      )}

      {page === 'inteligencia' && (
        <Inteligencia fairs={fairs} fairPlaces={fairPlaces} />
      )}

      <BottomNav page={page} setPage={setPage} />
    </div>
  )
}
