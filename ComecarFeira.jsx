import { useEffect, useState } from 'react'
import { hasSupabaseConfig, supabase } from './supabase'
import { getActiveFair, getClosedFairs, getOrCreateProfile, getProducts, signOut } from './services/api'
import Header from './components/Header'
import BottomNav from './components/BottomNav'
import Login from './pages/Login'
import ChangePassword from './pages/ChangePassword'
import Dashboard from './pages/Dashboard'
import Estoque from './pages/Estoque'
import Compras from './pages/Compras'
import ComecarFeira from './pages/ComecarFeira'
import EncerrarFeira from './pages/EncerrarFeira'
import Historico from './pages/Historico'

export default function App() {
  const [session, setSession] = useState(null)
  const [page, setPage] = useState('dashboard')
  const [profile, setProfile] = useState(null)
  const [products, setProducts] = useState([])
  const [fairs, setFairs] = useState([])
  const [activeFair, setActiveFair] = useState(null)
  const [loading, setLoading] = useState(true)

  const user = session?.user

  async function loadData(currentUser = user) {
    if (!currentUser || !hasSupabaseConfig) return

    const profileData = await getOrCreateProfile(currentUser)
    setProfile(profileData)

    if (profileData.first_login) return

    const [productsData, fairsData, activeFairData] = await Promise.all([
      getProducts(currentUser.id),
      getClosedFairs(currentUser.id),
      getActiveFair(currentUser.id),
    ])
    setProducts(productsData)
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
      const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
        setSession(newSession)
      })
      return () => listener.subscription.unsubscribe()
    }
  }, [])

  async function handleLogout() {
    await signOut()
    setSession(null)
    setProfile(null)
    setProducts([])
    setFairs([])
    setActiveFair(null)
  }

  if (loading) return <div className="loading">Carregando...</div>

  if (!session) {
    return <Login onLogin={(newSession) => {
      setSession(newSession)
      loadData(newSession.user)
    }} />
  }

  if (profile?.first_login) {
    return <ChangePassword onDone={async () => {
      await loadData(user)
      setPage('dashboard')
    }} />
  }

  return (
    <div className="app-shell">
      <Header user={user} onLogout={handleLogout} />

      {page === 'dashboard' && (
        <Dashboard products={products} fairs={fairs} activeFair={activeFair} setPage={setPage} />
      )}

      {page === 'estoque' && (
        <Estoque user={user} products={products} reload={loadData} />
      )}

      {page === 'compras' && (
        <Compras user={user} products={products} reload={loadData} />
      )}

      {page === 'comecar' && (
        <ComecarFeira user={user} products={products} reload={loadData} setPage={setPage} />
      )}

      {page === 'encerrar' && (
        <EncerrarFeira activeFair={activeFair} reload={loadData} setPage={setPage} />
      )}

      {page === 'historico' && (
        <Historico fairs={fairs} />
      )}

      <BottomNav page={page} setPage={setPage} hasActiveFair={Boolean(activeFair)} />
    </div>
  )
}
