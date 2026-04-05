'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { supabase, ProviderSearchResult, Category } from '@/lib/supabase'
import { Search, MapPin, Star, ArrowLeft, Phone, MessageCircle, ChevronDown, Filter } from 'lucide-react'

function SearchContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [results, setResults] = useState<ProviderSearchResult[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState(searchParams.get('q') || '')
  const [selectedCat, setSelectedCat] = useState(searchParams.get('cat') || '')
  const [showFilters, setShowFilters] = useState(false)
  const [radius, setRadius] = useState(20)

  const lat = searchParams.get('lat') ? parseFloat(searchParams.get('lat')!) : null
  const lng = searchParams.get('lng') ? parseFloat(searchParams.get('lng')!) : null

  useEffect(() => {
    loadCategories()
    doSearch()
  }, [])

  async function loadCategories() {
    const { data } = await supabase.from('categories').select('*').order('name')
    if (data) setCategories(data)
  }

  async function doSearch() {
    setLoading(true)

    // Default location: San Fernando, Buenos Aires if no GPS
    const searchLat = lat || -34.4425
    const searchLng = lng || -58.5575

    // Find category ID if searching by slug
    let categoryId = null
    if (selectedCat) {
      const { data: catData } = await supabase
        .from('categories')
        .select('id')
        .eq('slug', selectedCat)
        .single()
      if (catData) categoryId = catData.id
    }

    const { data, error } = await supabase.rpc('search_providers', {
      search_lat: searchLat,
      search_lng: searchLng,
      search_radius_km: radius,
      search_category: categoryId,
      search_query: query || null,
    })

    if (data) {
      // Sort by distance first, then by rating
      const sorted = data.sort((a: ProviderSearchResult, b: ProviderSearchResult) => {
        // Primary: distance
        const distDiff = a.distance_km - b.distance_km
        if (Math.abs(distDiff) > 1) return distDiff
        // Secondary: rating (higher first)
        return b.avg_rating - a.avg_rating
      })
      setResults(sorted)
    }
    setLoading(false)
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    doSearch()
  }

  async function handleContact(provider: ProviderSearchResult) {
    // Register contact for metrics
    await supabase.rpc('register_contact', {
      p_provider_id: provider.id,
      p_type: 'whatsapp',
    })
    // Open WhatsApp
    const message = encodeURIComponent(
      `Hola ${provider.name}, te encontré en DatoqDato. Necesito un servicio de ${provider.category_name}. ¿Podemos hablar?`
    )
    window.open(`https://wa.me/${provider.whatsapp.replace(/[^0-9]/g, '')}?text=${message}`, '_blank')
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 sticky top-0 z-20">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => router.back()} className="p-1">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <form onSubmit={handleSearch} className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar servicio..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
            />
          </form>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="p-2 rounded-xl bg-slate-100 text-slate-600"
          >
            <Filter className="w-5 h-5" />
          </button>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="px-4 pb-3 border-t border-slate-50">
            <div className="flex items-center gap-2 mt-3 overflow-x-auto pb-2">
              <button
                onClick={() => { setSelectedCat(''); doSearch() }}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  !selectedCat ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                Todos
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => { setSelectedCat(cat.slug); setTimeout(doSearch, 0) }}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    selectedCat === cat.slug ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
            <div className="mt-2">
              <label className="text-xs text-slate-500">Radio de búsqueda: {radius} km</label>
              <input
                type="range"
                min="5"
                max="50"
                value={radius}
                onChange={(e) => setRadius(parseInt(e.target.value))}
                onMouseUp={() => doSearch()}
                onTouchEnd={() => doSearch()}
                className="w-full mt-1 accent-brand-600"
              />
            </div>
          </div>
        )}
      </div>

      {/* Location notice */}
      {!lat && (
        <div className="mx-4 mt-3 p-3 bg-amber-50 border border-amber-100 rounded-xl flex items-start gap-2">
          <MapPin className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-700">
            No tenemos tu ubicación. Mostrando resultados desde San Fernando.{' '}
            <button
              onClick={() => {
                navigator.geolocation.getCurrentPosition(
                  (pos) => {
                    const params = new URLSearchParams(searchParams.toString())
                    params.set('lat', pos.coords.latitude.toString())
                    params.set('lng', pos.coords.longitude.toString())
                    router.replace(`/buscar?${params.toString()}`)
                    window.location.reload()
                  },
                  () => {}
                )
              }}
              className="underline font-semibold"
            >
              Activar ubicación
            </button>
          </p>
        </div>
      )}

      {/* Results */}
      <div className="px-4 py-4">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-2xl p-4 animate-pulse">
                <div className="flex gap-3">
                  <div className="w-12 h-12 rounded-xl bg-slate-200" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-slate-200 rounded w-1/2" />
                    <div className="h-3 bg-slate-100 rounded w-1/3" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : results.length === 0 ? (
          <div className="text-center py-16">
            <Search className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="font-bold text-slate-600 mb-2">No encontramos resultados</h3>
            <p className="text-sm text-slate-400">Probá con otro término o ampliá el radio de búsqueda.</p>
          </div>
        ) : (
          <>
            <p className="text-xs text-slate-400 mb-3 font-medium">
              {results.length} profesional{results.length !== 1 ? 'es' : ''} encontrado{results.length !== 1 ? 's' : ''}
            </p>
            <div className="space-y-3">
              {results.map((provider) => (
                <div
                  key={provider.id}
                  className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 active:scale-[0.99] transition-transform"
                >
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    {provider.photo_url ? (
                      <img src={provider.photo_url} alt={provider.name} className="w-12 h-12 rounded-xl object-cover shrink-0" />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-brand-100 flex items-center justify-center text-brand-600 font-bold text-sm shrink-0">
                        {provider.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <button
                          onClick={() => router.push(`/proveedor/${provider.id}`)}
                          className="font-bold text-slate-800 text-sm hover:text-brand-600 transition-colors text-left"
                        >
                          {provider.name}
                        </button>
                        {provider.avg_rating > 0 && (
                          <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                            <Star className="w-3 h-3 fill-current" />
                            {provider.avg_rating.toFixed(1)}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{provider.category_name} · {provider.city}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {provider.distance_km < 1
                            ? `${Math.round(provider.distance_km * 1000)} m`
                            : `${provider.distance_km.toFixed(1)} km`
                          }
                        </span>
                        {provider.total_reviews > 0 && (
                          <span className="text-xs text-slate-400">
                            {provider.total_reviews} reseña{provider.total_reviews !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                      {/* Keywords */}
                      {provider.keywords && provider.keywords.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {provider.keywords.slice(0, 4).map((kw, i) => (
                            <span key={i} className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                              {kw}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  {/* Action buttons */}
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => handleContact(provider)}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#25D366] hover:bg-[#20bd5a] text-white text-sm font-semibold rounded-xl transition-colors"
                    >
                      <MessageCircle className="w-4 h-4" />
                      WhatsApp
                    </button>
                    <button
                      onClick={() => router.push(`/proveedor/${provider.id}`)}
                      className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm font-medium rounded-xl transition-colors"
                    >
                      Ver perfil
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function BuscarPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center"><p className="text-slate-400">Cargando...</p></div>}>
      <SearchContent />
    </Suspense>
  )
}
