'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, Provider, Review } from '@/lib/supabase'
import { ArrowLeft, MapPin, MessageCircle, Phone, Star, ThumbsUp, ThumbsDown, Loader2 } from 'lucide-react'

interface ProviderCategory {
  category_id: string
  keywords: string[]
  categories: { name: string; slug: string }
}

// Star display component (0-10 scale, shows filled/half/empty)
function StarsDisplay({ value, size = 'md' }: { value: number; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClass = size === 'lg' ? 'w-6 h-6' : size === 'md' ? 'w-4 h-4' : 'w-3.5 h-3.5'
  // Map 0-10 to 0-5 stars for visual display
  const mapped = value / 2
  const full = Math.floor(mapped)
  const hasHalf = mapped - full >= 0.3
  const empty = 5 - full - (hasHalf ? 1 : 0)

  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: full }).map((_, i) => (
        <Star key={`f${i}`} className={`${sizeClass} text-amber-400 fill-amber-400`} />
      ))}
      {hasHalf && (
        <div className="relative">
          <Star className={`${sizeClass} text-slate-200`} />
          <div className="absolute inset-0 overflow-hidden w-1/2">
            <Star className={`${sizeClass} text-amber-400 fill-amber-400`} />
          </div>
        </div>
      )}
      {Array.from({ length: empty }).map((_, i) => (
        <Star key={`e${i}`} className={`${sizeClass} text-slate-200`} />
      ))}
    </div>
  )
}

export default function ProviderProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [provider, setProvider] = useState<Provider | null>(null)
  const [categories, setCategories] = useState<ProviderCategory[]>([])
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [showReviewForm, setShowReviewForm] = useState(false)
  const [reviewLoading, setReviewLoading] = useState(false)
  const [reviewComment, setReviewComment] = useState('')
  const [existingReview, setExistingReview] = useState<Review | null>(null)

  useEffect(() => {
    loadProvider()
  }, [id])

  async function loadProvider() {
    setLoading(true)

    const { data: prov } = await supabase
      .from('providers')
      .select('*')
      .eq('id', id)
      .single()

    if (prov) {
      setProvider(prov)

      // Register view
      await supabase.rpc('increment_views', { p_provider_id: id })

      // Load categories
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
        .order('created_at', { ascending: false })

      if (revs) setReviews(revs)

      // Check if current user already reviewed
      const { data: { user } } = await supabase.auth.getUser()
      if (user && revs) {
        const mine = revs.find(r => r.client_id === user.id)
        if (mine) setExistingReview(mine)
      }
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
      const msg = encodeURIComponent(`Hola ${provider.name}, te encontré en DatoQDato. ¿Podemos hablar?`)
      window.open(`https://wa.me/${provider.whatsapp.replace(/[^0-9]/g, '')}?text=${msg}`, '_blank')
    } else {
      window.open(`tel:${provider.phone}`, '_self')
    }
  }

  async function submitReview(isPositive: boolean) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login?redirect=' + encodeURIComponent(`/proveedor/${id}`))
      return
    }

    setReviewLoading(true)
    const { error } = await supabase.from('reviews').insert({
      provider_id: id,
      client_id: user.id,
      is_positive: isPositive,
      comment: reviewComment.trim() || null,
    })

    if (!error) {
      setShowReviewForm(false)
      setReviewComment('')
      await loadProvider() // Reload to get updated stars
    }
    setReviewLoading(false)
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
  const positiveCount = reviews.filter(r => r.is_positive).length
  const negativeCount = reviews.filter(r => !r.is_positive).length

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header */}
      <div className="bg-brand-600 text-white px-4 pt-4 pb-8">
        <button onClick={() => router.back()} className="p-1 mb-4">
          <ArrowLeft className="w-5 h-5" />
        </button>
      </div>

      {/* Profile card */}
      <div className="px-4 -mt-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 text-center">
          {/* Photo */}
          {provider.photo_url ? (
            <img
              src={provider.photo_url}
              alt={provider.name}
              className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-md mx-auto -mt-16 mb-3"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-brand-100 border-4 border-white shadow-md mx-auto -mt-16 mb-3 flex items-center justify-center text-brand-600 font-bold text-2xl">
              {initials}
            </div>
          )}

          {/* Name */}
          <h1 className="text-xl font-bold text-slate-800">{provider.name}</h1>
          <p className="text-sm text-slate-400 flex items-center justify-center gap-1 mt-1">
            <MapPin className="w-3.5 h-3.5" />
            {provider.city}, {provider.province}
          </p>

          {/* Stars */}
          <div className="flex flex-col items-center mt-4">
            <StarsDisplay value={provider.stars} size="lg" />
            <p className="text-sm font-semibold text-slate-700 mt-1">
              {provider.stars.toFixed(1)} / 10
            </p>
            <p className="text-xs text-slate-400">
              {provider.total_reviews} servicio{provider.total_reviews !== 1 ? 's' : ''} realizado{provider.total_reviews !== 1 ? 's' : ''}
            </p>
          </div>

          {/* Visit cost */}
          {provider.visit_cost && (
            <div className="mt-4 inline-block bg-emerald-50 text-emerald-700 text-sm font-semibold px-4 py-2 rounded-full">
              Visita: {provider.visit_cost}
            </div>
          )}
        </div>
      </div>

      {/* Services */}
      <div className="px-4 mt-6">
        <h3 className="text-sm font-bold text-slate-700 mb-3">Servicios</h3>
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

      {/* Review summary */}
      <div className="px-4 mt-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-slate-700">
            Reseñas ({reviews.length})
          </h3>
          {!existingReview && (
            <button
              onClick={() => setShowReviewForm(true)}
              className="text-xs font-semibold text-brand-600"
            >
              Calificar
            </button>
          )}
        </div>

        {/* Summary bar */}
        {reviews.length > 0 && (
          <div className="bg-white rounded-xl p-4 border border-slate-100 flex items-center gap-4 mb-3">
            <div className="flex items-center gap-1 text-emerald-600">
              <ThumbsUp className="w-4 h-4" />
              <span className="text-sm font-semibold">{positiveCount}</span>
            </div>
            <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full"
                style={{ width: `${reviews.length > 0 ? (positiveCount / reviews.length) * 100 : 0}%` }}
              />
            </div>
            <div className="flex items-center gap-1 text-red-500">
              <ThumbsDown className="w-4 h-4" />
              <span className="text-sm font-semibold">{negativeCount}</span>
            </div>
          </div>
        )}

        {/* Review form */}
        {showReviewForm && (
          <div className="bg-white rounded-xl p-4 border-2 border-brand-200 mb-3">
            <p className="text-sm font-semibold text-slate-700 mb-3">¿Cómo fue tu experiencia?</p>
            <textarea
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              placeholder="Comentario opcional..."
              className="w-full border border-slate-200 rounded-lg p-3 text-sm mb-3 resize-none"
              rows={2}
            />
            <div className="flex gap-2">
              <button
                onClick={() => submitReview(true)}
                disabled={reviewLoading}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl text-sm transition-colors disabled:opacity-50"
              >
                {reviewLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ThumbsUp className="w-4 h-4" />}
                Buen trabajo
              </button>
              <button
                onClick={() => submitReview(false)}
                disabled={reviewLoading}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-xl text-sm transition-colors disabled:opacity-50"
              >
                {reviewLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ThumbsDown className="w-4 h-4" />}
                Mal trabajo
              </button>
            </div>
            <button
              onClick={() => setShowReviewForm(false)}
              className="w-full text-xs text-slate-400 mt-2"
            >
              Cancelar
            </button>
          </div>
        )}

        {/* Recent reviews */}
        {reviews.length === 0 ? (
          <div className="bg-white rounded-xl p-6 border border-slate-100 text-center">
            <p className="text-sm text-slate-400">Todavía no tiene reseñas</p>
          </div>
        ) : (
          <div className="space-y-2">
            {reviews.slice(0, 10).map((review) => (
              <div key={review.id} className="bg-white rounded-xl p-3 border border-slate-100 flex items-start gap-3">
                <div className={`mt-0.5 p-1.5 rounded-full ${review.is_positive ? 'bg-emerald-50' : 'bg-red-50'}`}>
                  {review.is_positive
                    ? <ThumbsUp className="w-3.5 h-3.5 text-emerald-600" />
                    : <ThumbsDown className="w-3.5 h-3.5 text-red-500" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  {review.comment ? (
                    <p className="text-sm text-slate-600 leading-relaxed">{review.comment}</p>
                  ) : (
                    <p className="text-sm text-slate-400 italic">
                      {review.is_positive ? 'Buen trabajo' : 'Mal trabajo'}
                    </p>
                  )}
                  <p className="text-[11px] text-slate-300 mt-1">
                    {new Date(review.created_at).toLocaleDateString('es-AR', {
                      day: 'numeric', month: 'short', year: 'numeric',
                    })}
                  </p>
                </div>
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
          Contactar
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
