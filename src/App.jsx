import { useEffect, useState } from 'react'
import { hasSupabaseConfig, supabase } from './supabase'
import {
  getActiveFair,
  getCategories,
  getClosedFairs,
  getFairPlaces,
  getOrCreateProfile,
  getProducts,
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

  const user = session?.user

  async function loadData(currentUser = user) {
    if (!currentUser || !hasSupabaseConfig) return

    const profileData = await getOrCreateProfile(currentUser)
    setProfile(profileData)

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
      <Header onLogout={handleLogout} />

      {page === 'dashboard' && (
        <Dashboard products={products} fairs={fairs} activeFair={activeFair} setPage={setPage} />
      )}

      {page === 'estoque' && (
        <Estoque user={user} products={products} categories={categories} reload={loadData} setPage={setPage} />
      )}

      {page === 'categorias' && (
        <Categorias user={user} categories={categories} reload={loadData} />
      )}

      {page === 'compras' && (
        <Compras user={user} products={products} reload={loadData} />
      )}

      {page === 'feiras' && (
        <Feiras
          user={user}
          fairPlaces={fairPlaces}
          reload={loadData}
          setPage={setPage}
          setSelectedFairPlace={setSelectedFairPlace}
        />
      )}

      {page === 'comecar' && (
        <ComecarFeira
          user={user}
          products={products}
          selectedFairPlace={selectedFairPlace}
          reload={loadData}
          setPage={setPage}
        />
      )}

      {page === 'encerrar' && (
        <EncerrarFeira activeFair={activeFair} reload={loadData} setPage={setPage} />
      )}

      {page === 'historico' && (
        <Historico fairs={fairs} />
      )}

      <BottomNav page={page} setPage={setPage} />
    </div>
  )
}
