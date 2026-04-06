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
  const [showWelcome, setShowWelcome] = useState(true)
  const [checkingRole, setCheckingRole] = useState(true)
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
    // Check if user already chose their role
    const role = localStorage.getItem('datoqdato_role')
    if (role) {
      setShowWelcome(false)
    }
    setCheckingRole(false)
    loadCategories()
    loadUser()
    let idx = 0
    const interval = setInterval(() => {
      idx = (idx + 1) % SEARCH_EXAMPLES.length
      setPlaceholder(SEARCH_EXAMPLES[idx])
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  async function loadCategories() {
    const { data } = await supabase
      .from('categories')
      .select('*')
      .order('name')
    if (data) setCategories(data)
  }

  async function loadUser() {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      if (user.user_metadata?.name) {
        const firstName = user.user_metadata.name.split(' ')[0]
        setUserName(firstName)
      }
      // Check if user is a provider
      const { data: prov } = await supabase
        .from('providers')
        .select('id')
        .eq('user_id', user.id)
        .single()
      if (prov) setIsProvider(true)
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    localStorage.removeItem('datoqdato_role')
    setUserName(null)
    setIsProvider(false)
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

  function handleChooseClient() {
    localStorage.setItem('datoqdato_role', 'cliente')
    setShowWelcome(false)
  }

  function handleChoosePro() {
    localStorage.setItem('datoqdato_role', 'profesional')
    router.push('/registro?pro=1')
  }

  // Loading
  if (checkingRole) {
    return (
      <div className="min-h-screen bg-brand-700 flex items-center justify-center">
        <img src="/logo.png" alt="DatoqDato" className="w-24 h-24 rounded-full shadow-xl animate-pulse" />
      </div>
    )
  }

  // Welcome chooser
  if (showWelcome) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-brand-600 via-brand-700 to-brand-800 flex flex-col items-center justify-center px-6">
        <img src="/logo.png" alt="DatoqDato" className="w-28 h-28 rounded-full shadow-xl mb-6" />
        <h1 className="text-3xl font-bold text-white text-center mb-2">Bienvenido a DatoqDato</h1>
        <p className="text-brand-200 text-center mb-10 max-w-xs">Agenda de Oficios — Profesionales verificados cerca tuyo</p>

        <div className="w-full max-w-sm space-y-4">
          <button
            onClick={handleChooseClient}
            className="w-full flex items-center gap-4 p-5 bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all active:scale-[0.98]"
          >
            <div className="w-14 h-14 bg-brand-100 rounded-xl flex items-center justify-center shrink-0">
              <UserSearch className="w-7 h-7 text-brand-600" />
            </div>
            <div className="text-left">
              <p className="font-bold text-slate-800 text-lg">Busco un servicio</p>
              <p className="text-sm text-slate-500">Encontrá profesionales cerca tuyo</p>
            </div>
          </button>

          <button
            onClick={handleChoosePro}
            className="w-full flex items-center gap-4 p-5 bg-slate-900 rounded-2xl shadow-lg hover:shadow-xl transition-all active:scale-[0.98]"
          >
            <div className="w-14 h-14 bg-brand-600 rounded-xl flex items-center justify-center shrink-0">
              <Wrench className="w-7 h-7 text-white" />
            </div>
            <div className="text-left">
              <p className="font-bold text-white text-lg">Soy profesional</p>
              <p className="text-sm text-slate-400">Registrate y que te encuentren</p>
            </div>
          </button>
        </div>

        <p className="text-brand-300/50 text-xs mt-10">100% gratis para clientes · 30 días gratis para profesionales</p>
      </div>
    )
  }

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
          {userName && (
            <button
              onClick={handleLogout}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
              title="Cerrar sesión"
            >
              <LogOut className="w-5 h-5 text-white/70" />
            </button>
          )}
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
            className="w-full pl-12 pr-20 py-4 rounded-2xl bg-white text-slate-800 placeholder-slate-400 text-base shadow-xl focus:outline-none focus:ring-2 focus:ring-brand-300"
          />
          {query.trim() && (
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-2 bg-brand-600 text-white text-sm font-semibold rounded-xl"
            >
              Buscar
            </button>
          )}
        </form>
        <p className="text-brand-200/60 text-xs text-center mt-2">
          Escribí lo que necesitás, ej: &quot;plomero&quot;, &quot;arreglar aire&quot;, &quot;pasear perro&quot;
        </p>

        {/* Location */}
        <button
          onClick={requestLocation}
          className={`mt-3 w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all ${
            locationStatus === 'granted'
              ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-400/30'
              : locationStatus === 'denied'
              ? 'bg-red-500/20 text-red-200 border border-red-400/30'
              : 'bg-white/10 text-white/80 border border-white/20 hover:bg-white/20'
          }`}
        >
          <MapPin className="w-4 h-4" />
          {locationStatus === 'idle' && 'Activar mi ubicación para buscar cerca'}
          {locationStatus === 'loading' && 'Obteniendo ubicación...'}
          {locationStatus === 'granted' && '✓ Ubicación activada — mostramos los más cercanos'}
          {locationStatus === 'denied' && 'Ubicación denegada — buscá por zona'}
        </button>
      </div>

      {/* Content */}
      <div className="bg-white rounded-t-3xl min-h-[50vh] px-4 pt-6 pb-24">
        {/* Popular categories */}
        <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">Los más buscados</h2>
        <div className="grid grid-cols-3 gap-2 mb-4">
          {popularCategories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => handleCategoryClick(cat.slug)}
              className="flex flex-col items-center gap-2 p-3 bg-slate-50 hover:bg-brand-50 border border-slate-100 hover:border-brand-200 rounded-2xl text-center transition-all active:scale-[0.97]"
            >
              <span className="text-2xl"><CategoryIcon name={cat.icon} /></span>
              <span className="text-xs font-medium text-slate-600 leading-tight">{cat.name}</span>
            </button>
          ))}
        </div>

        {/* Show more */}
        <button
          onClick={() => setShowAllCategories(!showAllCategories)}
          className="w-full flex items-center justify-center gap-1 py-2 text-sm font-medium text-brand-600 hover:text-brand-700 transition-colors"
        >
          {showAllCategories ? (
            <>Menos categorías <ChevronUp className="w-4 h-4" /></>
          ) : (
            <>Ver todas las categorías ({otherCategories.length} más) <ChevronDown className="w-4 h-4" /></>
          )}
        </button>

        {showAllCategories && (
          <div className="grid grid-cols-2 gap-2 mt-2 mb-4">
            {otherCategories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => handleCategoryClick(cat.slug)}
                className="flex items-center gap-3 p-3 bg-slate-50 hover:bg-brand-50 border border-slate-100 hover:border-brand-200 rounded-xl text-left transition-all active:scale-[0.98]"
              >
                <span className="text-lg"><CategoryIcon name={cat.icon} /></span>
                <span className="text-xs font-medium text-slate-600 leading-tight">{cat.name}</span>
              </button>
            ))}
          </div>
        )}

        <div className="border-t border-slate-100 my-5"></div>

        {/* Value props */}
        <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">¿Por qué DatoqDato?</h2>
        <div className="space-y-2.5">
          <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-xl">
            <Shield className="w-5 h-5 text-emerald-600 shrink-0" />
            <p className="text-sm text-emerald-800">Reseñas verificadas por teléfono — imposible inventar</p>
          </div>
          <div className="flex items-center gap-3 p-3 bg-brand-50 rounded-xl">
            <MapPin className="w-5 h-5 text-brand-600 shrink-0" />
            <p className="text-sm text-brand-800">Resultados ordenados por cercanía a tu ubicación</p>
          </div>
          <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-xl">
            <Star className="w-5 h-5 text-amber-600 shrink-0" />
            <p className="text-sm text-amber-800">100% gratis para clientes — siempre</p>
          </div>
        </div>

        {/* CTA providers */}
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
                onClick={() => router.push('/registro?pro=1')}
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
  const iconMap: Record<string, string> = {
    'droplets': '🔧',
    'zap': '⚡',
    'flame': '🔥',
    'paintbrush': '🎨',
    'brick-wall': '🧱',
    'key-round': '🔑',
    'snowflake': '❄️',
    'trees': '🌳',
    'bug': '🐛',
    'truck': '🚛',
    'sparkles': '✨',
    'smartphone': '📱',
    'monitor': '💻',
    'cpu': '🔌',
    'dog': '🐕',
    'paw-print': '🐾',
    'axe': '🪓',
    'square': '🪟',
    'home': '🏠',
    'anvil': '⚒️',
    'wrench': '🔧',
  }
  return <>{iconMap[name] || '🔧'}</>
}
