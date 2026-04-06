'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, Category } from '@/lib/supabase'
import { Search, MapPin, Star, Shield, ChevronDown, ChevronUp, Wrench, UserSearch, LogOut } from 'lucide-react'

const POPULAR_SLUGS = ['plomero', 'electricista', 'gasista', 'cerrajero', 'pintor', 'albanil']

const SEARCH_EXAMPLES = [
  'se me rompió un caño',
  'necesito un electricista',
  'service de aire acondicionado',
  'reparar celular',
  'paseador de perros',
  'pintar departamento',
]

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Buen día'
  if (hour < 19) return 'Buenas tardes'
  return 'Buenas noches'
}

export default function HomePage() {
  const router = useRouter()
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [query, setQuery] = useState('')
  const [categories, setCategories] = useState<Category[]>([])
  const [showAllCategories, setShowAllCategories] = useState(false)
  const [locationStatus, setLocationStatus] = useState<'idle' | 'loading' | 'granted' | 'denied'>('idle')
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [placeholder, setPlaceholder] = useState(SEARCH_EXAMPLES[0])
  const [userName, setUserName] = useState<string | null>(null)
  const [isProvider, setIsProvider] = useState(false)
  const [greeting, setGreeting] = useState(getGreeting())

  useEffect(() => {
    checkAuth()
    const interval = setInterval(() => {
      setPlaceholder(SEARCH_EXAMPLES[Math.floor(Math.random() * SEARCH_EXAMPLES.length)])
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  async function checkAuth() {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      setIsLoggedIn(true)
      if (user.user_metadata?.name) {
        setUserName(user.user_metadata.name.split(' ')[0])
      }
      // Check if provider
      const { data: prov } = await supabase
        .from('providers')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()
      if (prov) setIsProvider(true)

      // Load categories
      const { data: cats } = await supabase.from('categories').select('*').order('name')
      if (cats) setCategories(cats)
    }
    setCheckingAuth(false)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    localStorage.removeItem('datoqdato_role')
    window.location.reload()
  }

  function requestLocation() {
    setLocationStatus('loading')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setLocationStatus('granted')
      },
      () => setLocationStatus('denied'),
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!query.trim()) return
    const params = new URLSearchParams({ q: query.trim() })
    if (userLocation) {
      params.set('lat', userLocation.lat.toString())
      params.set('lng', userLocation.lng.toString())
    }
    router.push(`/buscar?${params.toString()}`)
  }

  function handleCategoryClick(slug: string) {
    const params = new URLSearchParams({ cat: slug })
    if (userLocation) {
      params.set('lat', userLocation.lat.toString())
      params.set('lng', userLocation.lng.toString())
    }
    router.push(`/buscar?${params.toString()}`)
  }

  const popularCategories = categories.filter(c => POPULAR_SLUGS.includes(c.slug))
  const otherCategories = categories.filter(c => !POPULAR_SLUGS.includes(c.slug))

  // ==================== LOADING ====================
  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-brand-700 flex items-center justify-center">
        <img src="/logo.png" alt="DatoqDato" className="w-24 h-24 rounded-full shadow-xl animate-pulse" />
      </div>
    )
  }

  // ==================== NOT LOGGED IN: WELCOME SCREEN ====================
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-brand-600 via-brand-700 to-brand-800 flex flex-col items-center justify-center px-6">
        <img src="/logo.png" alt="DatoqDato" className="w-28 h-28 rounded-full shadow-xl mb-6" />
        <h1 className="text-3xl font-bold text-white text-center mb-2">Bienvenido a DatoqDato</h1>
        <p className="text-brand-200 text-center mb-10 max-w-xs">Agenda de Oficios — Profesionales verificados cerca tuyo</p>

        <div className="w-full max-w-sm space-y-4">
          <button
            onClick={() => router.push('/login?redirect=/')}
            className="w-full flex items-center gap-4 p-5 bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all active:scale-[0.98]"
          >
            <div className="w-14 h-14 bg-brand-100 rounded-xl flex items-center justify-center shrink-0">
              <UserSearch className="w-7 h-7 text-brand-600" />
            </div>
            <div className="text-left">
              <p className="font-bold text-slate-800 text-lg">Busco un servicio</p>
              <p className="text-sm text-slate-500">Ingresá para encontrar profesionales</p>
            </div>
          </button>

          <button
            onClick={() => router.push('/login?redirect=/proveedor/registro')}
            className="w-full flex items-center gap-4 p-5 bg-slate-900 rounded-2xl shadow-lg hover:shadow-xl transition-all active:scale-[0.98]"
          >
            <div className="w-14 h-14 bg-brand-600 rounded-xl flex items-center justify-center shrink-0">
              <Wrench className="w-7 h-7 text-white" />
            </div>
            <div className="text-left">
              <p className="font-bold text-white text-lg">Soy profesional</p>
              <p className="text-sm text-slate-400">Ingresá para gestionar tu perfil</p>
            </div>
          </button>

          {/* Login link for existing users */}
          <p className="text-center text-sm text-brand-200 mt-6">
            ¿Ya tenés cuenta?{' '}
            <button
              onClick={() => router.push('/login')}
              className="font-semibold text-white underline"
            >
              Iniciar sesión
            </button>
          </p>
        </div>
      </div>
    )
  }

  // ==================== LOGGED IN: FULL HOME ====================
  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-600 via-brand-700 to-brand-800">
      {/* Header */}
      <header className="pt-10 pb-6 px-4 text-white">
        <div className="flex items-center gap-4">
          <img src="/logo.png" alt="DatoqDato" className="w-20 h-20 rounded-full shadow-lg shrink-0" />
          <div className="flex-1">
            <h1 className="text-xl font-bold">
              {greeting}{userName ? `, ${userName}` : ''} 👋
            </h1>
            <p className="text-brand-200 text-xs mt-0.5">Agenda de Oficios</p>
            <p className="text-white/70 text-sm mt-1">¿En qué podemos ayudarte hoy?</p>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
            title="Cerrar sesión"
          >
            <LogOut className="w-5 h-5 text-white/70" />
          </button>
        </div>
      </header>

      {/* Search */}
      <div className="px-4 pb-4">
        <form onSubmit={handleSearch} className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white shadow-lg text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-300"
          />
        </form>
      </div>

      {/* Location */}
      <div className="px-4 pb-4">
        {locationStatus === 'idle' && (
          <button
            onClick={requestLocation}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-white/10 text-white/90 text-sm hover:bg-white/15 transition-colors"
          >
            <MapPin className="w-4 h-4" />
            Activar mi ubicación para buscar cerca
          </button>
        )}
        {locationStatus === 'loading' && (
          <div className="text-center text-brand-200 text-sm py-3">Obteniendo ubicación...</div>
        )}
        {locationStatus === 'granted' && (
          <div className="flex items-center justify-center gap-2 text-emerald-300 text-sm py-2">
            <MapPin className="w-4 h-4" />
            Ubicación activada
          </div>
        )}
        {locationStatus === 'denied' && (
          <div className="text-center text-red-300 text-sm py-2">
            No pudimos acceder a tu ubicación
          </div>
        )}
      </div>

      {/* Main content */}
      <div className="bg-slate-50 rounded-t-3xl min-h-[50vh] px-4 pt-6 pb-8">
        {/* Popular categories */}
        <h3 className="font-bold text-slate-700 text-sm mb-3">Los más buscados</h3>
        <div className="flex flex-wrap gap-2 mb-4">
          {popularCategories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => handleCategoryClick(cat.slug)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-white rounded-xl border border-slate-100 shadow-sm text-sm font-medium text-slate-700 hover:border-brand-200 hover:bg-brand-50 transition-colors active:scale-[0.97]"
            >
              <CategoryIcon name={cat.icon} />
              {cat.name}
            </button>
          ))}
        </div>

        {/* All categories toggle */}
        {otherCategories.length > 0 && (
          <>
            <button
              onClick={() => setShowAllCategories(!showAllCategories)}
              className="flex items-center gap-1 text-sm text-brand-600 font-semibold mb-3"
            >
              {showAllCategories ? 'Ocultar' : `Ver todas las categorías (${otherCategories.length} más)`}
              {showAllCategories ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {showAllCategories && (
              <div className="flex flex-wrap gap-2 mb-4">
                {otherCategories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => handleCategoryClick(cat.slug)}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-white rounded-xl border border-slate-100 shadow-sm text-sm font-medium text-slate-700 hover:border-brand-200 hover:bg-brand-50 transition-colors active:scale-[0.97]"
                  >
                    <CategoryIcon name={cat.icon} />
                    {cat.name}
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {/* Trust badges */}
        <div className="mt-4 space-y-2">
          <h3 className="font-bold text-slate-700 text-sm mb-3">¿Por qué DatoqDato?</h3>
          <div className="flex items-start gap-3 p-3 bg-white rounded-xl border border-slate-100">
            <Shield className="w-5 h-5 text-brand-600 shrink-0 mt-0.5" />
            <p className="text-sm text-slate-600">Reseñas verificadas — imposible inventar</p>
          </div>
          <div className="flex items-start gap-3 p-3 bg-white rounded-xl border border-slate-100">
            <MapPin className="w-5 h-5 text-brand-600 shrink-0 mt-0.5" />
            <p className="text-sm text-slate-600">Resultados ordenados por cercanía a tu ubicación</p>
          </div>
          <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-xl border border-amber-100">
            <Star className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800">Sistema de estrellas 0-10 — difícil de ganar, fácil de perder</p>
          </div>
        </div>

        {/* CTA providers / dashboard */}
        <div className="mt-6 p-4 bg-slate-900 rounded-2xl text-center">
          {isProvider ? (
            <>
              <p className="text-white font-bold text-sm mb-1">Tu panel profesional</p>
              <p className="text-slate-400 text-xs mb-3">Revisá tus estrellas, reseñas y contactos</p>
              <button
                onClick={() => router.push('/dashboard')}
                className="px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-xl transition-colors"
              >
                Mi Panel
              </button>
            </>
          ) : (
            <>
              <p className="text-white font-bold text-sm mb-1">¿Sos profesional?</p>
              <p className="text-slate-400 text-xs mb-3">Registrate y que los clientes te encuentren</p>
              <button
                onClick={() => router.push('/proveedor/registro')}
                className="px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-xl transition-colors"
              >
                Registrarme como Profesional
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function CategoryIcon({ name }: { name: string }) {
  const icons: Record<string, string> = {
    droplets: '🔧', zap: '⚡', flame: '🔥', paintbrush: '🎨',
    'brick-wall': '🧱', 'key-round': '🔑', snowflake: '❄️',
    trees: '🌳', bug: '🐛', truck: '🚚', sparkles: '✨',
    smartphone: '📱', monitor: '💻', cpu: '🔌', dog: '🐕',
    'paw-print': '🐾', axe: '🪓', square: '🪟', home: '🏠',
    anvil: '⚒️', wrench: '🔧',
  }
  return <span className="text-base">{icons[name] || '🔧'}</span>
}
