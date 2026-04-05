'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, Provider, Review } from '@/lib/supabase'
import { ArrowLeft, Star, MapPin, MessageCircle, Phone, Clock, Eye, Users, Shield } from 'lucide-react'

interface ProviderCategory {
  category_id: string
  keywords: string[]
  categories: { name: string; slug: string }
}

export default function ProviderProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [provider, setProvider] = useState<Provider | null>(null)
  const [categories, setCategories] = useState<ProviderCategory[]>([])
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadProvider()
  }, [id])

  async function loadProvider() {
    setLoading(true)

    // Load provider
    const { data: prov } = await supabase
      .from('providers')
      .select('*')
      .eq('id', id)
      .single()

    if (prov) {
      setProvider(prov)

      // Register view
      await supabase.rpc('increment_views', { p_provider_id: id })

      // Load categories + keywords
      const { data: cats } = await supabase
        .from('provider_categories')
        .select('category_id, keywords, categories(name, slug)')
        .eq('provider_id', id)

      if (cats) setCategories(cats as unknown as ProviderCategory[])

      // Load reviews
      const { data: revs } = await supabase
        .from('reviews')
        .select('*')
        .eq('provider_id', id)
        .eq('is_verified', true)
        .order('created_at', { ascending: false })

      if (revs) setReviews(revs)
    }

    setLoading(false)
  }

  async function handleContact(type: 'whatsapp' | 'phone') {
    if (!provider) return
    await supabase.rpc('register_contact', {
      p_provider_id: provider.id,
      p_type: type,
    })
    if (type === 'whatsapp') {
      const msg = encodeURIComponent(`Hola ${provider.name}, te encontré en DatoqDato. ¿Podemos hablar?`)
      window.open(`https://wa.me/${provider.whatsapp.replace(/[^0-9]/g, '')}?text=${msg}`, '_blank')
    } else {
      window.open(`tel:${provider.phone}`, '_self')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!provider) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4">
        <h2 className="font-bold text-slate-600 mb-2">Proveedor no encontrado</h2>
        <button onClick={() => router.back()} className="text-brand-600 font-medium text-sm">Volver</button>
      </div>
    )
  }

  const initials = provider.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header */}
      <div className="bg-brand-600 text-white px-4 pt-4 pb-16">
        <button onClick={() => router.back()} className="p-1 mb-4">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-white font-bold text-xl">
            {initials}
          </div>
          <div>
            <h1 className="text-xl font-bold">{provider.name}</h1>
            <p className="text-brand-200 text-sm flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" />
              {provider.city}, {provider.province}
            </p>
          </div>
        </div>
      </div>

      {/* Stats cards */}
      <div className="px-4 -mt-8">
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-2xl p-4 text-center shadow-sm border border-slate-100">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Star className="w-4 h-4 text-amber-500 fill-current" />
              <span className="text-xl font-bold text-slate-800">
                {provider.avg_rating > 0 ? provider.avg_rating.toFixed(1) : '—'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Calificación</p>
          </div>
          <div className="bg-white rounded-2xl p-4 text-center shadow-sm border border-slate-100">
            <p className="text-xl font-bold text-slate-800 mb-1">{provider.total_reviews}</p>
            <p className="text-[11px] text-slate-400">Reseñas</p>
          </div>
          <div className="bg-white rounded-2xl p-4 text-center shadow-sm border border-slate-100">
            <p className="text-xl font-bold text-slate-800 mb-1">{provider.coverage_radius_km} km</p>
            <p className="text-[11px] text-slate-400">Cobertura</p>
          </div>
        </div>
      </div>

      {/* Categories & Keywords */}
      <div className="px-4 mt-6">
        <h3 className="text-sm font-bold text-slate-700 mb-3">Servicios que ofrece</h3>
        {categories.map((cat) => (
          <div key={cat.category_id} className="mb-3 bg-white rounded-xl p-4 border border-slate-100">
            <p className="font-semibold text-slate-800 text-sm">{cat.categories.name}</p>
            {cat.keywords.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {cat.keywords.map((kw, i) => (
                  <span key={i} className="text-xs bg-brand-50 text-brand-600 px-2.5 py-1 rounded-full">
                    {kw}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Verification badge */}
      <div className="mx-4 mt-4 p-3 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center gap-3">
        <Shield className="w-5 h-5 text-emerald-600 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-emerald-800">Profesional verificado</p>
          <p className="text-xs text-emerald-600">Todas las reseñas son de clientes reales verificados por teléfono</p>
        </div>
      </div>

      {/* Reviews */}
      <div className="px-4 mt-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-slate-700">Reseñas ({reviews.length})</h3>
          <button
            onClick={() => router.push(`/proveedor/${id}/resena`)}
            className="text-xs font-semibold text-brand-600"
          >
            Dejar reseña
          </button>
        </div>

        {reviews.length === 0 ? (
          <div className="bg-white rounded-xl p-6 border border-slate-100 text-center">
            <p className="text-sm text-slate-400">Todavía no tiene reseñas. ¡Sé el primero!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {reviews.map((review) => (
              <div key={review.id} className="bg-white rounded-xl p-4 border border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 text-xs font-bold">
                      {review.reviewer_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-700">{review.reviewer_name}</p>
                      {review.reviewer_city && (
                        <p className="text-[11px] text-slate-400">{review.reviewer_city}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-3.5 h-3.5 ${
                          star <= review.rating ? 'text-amber-400 fill-current' : 'text-slate-200'
                        }`}
                      />
                    ))}
                  </div>
                </div>
                {review.comment && (
                  <p className="text-sm text-slate-600 leading-relaxed">{review.comment}</p>
                )}
                <p className="text-[11px] text-slate-300 mt-2">
                  {new Date(review.created_at).toLocaleDateString('es-AR', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Floating contact bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-4 py-3 flex gap-3 z-30">
        <button
          onClick={() => handleContact('whatsapp')}
          className="flex-1 flex items-center justify-center gap-2 py-3 bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold rounded-xl transition-colors"
        >
          <MessageCircle className="w-5 h-5" />
          WhatsApp
        </button>
        <button
          onClick={() => handleContact('phone')}
          className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl transition-colors"
        >
          <Phone className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}
