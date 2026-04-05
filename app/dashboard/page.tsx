'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, Provider, Review } from '@/lib/supabase'
import {
  ArrowLeft, Star, Eye, Users, ThumbsUp, ThumbsDown,
  Settings, LogOut, AlertTriangle, CheckCircle, Clock,
  DollarSign, Loader2, Camera
} from 'lucide-react'

function StarsDisplay({ value }: { value: number }) {
  const mapped = value / 2
  const full = Math.floor(mapped)
  const hasHalf = mapped - full >= 0.3
  const empty = 5 - full - (hasHalf ? 1 : 0)

  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: full }).map((_, i) => (
        <Star key={`f${i}`} className="w-5 h-5 text-amber-400 fill-amber-400" />
      ))}
      {hasHalf && (
        <div className="relative">
          <Star className="w-5 h-5 text-slate-200" />
          <div className="absolute inset-0 overflow-hidden w-1/2">
            <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
          </div>
        </div>
      )}
      {Array.from({ length: empty }).map((_, i) => (
        <Star key={`e${i}`} className="w-5 h-5 text-slate-200" />
      ))}
    </div>
  )
}

function StatusBadge({ status, trialEnds }: { status: string; trialEnds: string }) {
  const isTrialExpired = status === 'trial' && new Date(trialEnds) < new Date()
  const effectiveStatus = isTrialExpired ? 'expired' : status

  const config: Record<string, { bg: string; text: string; icon: React.ReactNode; label: string }> = {
    trial: {
      bg: 'bg-blue-50 border-blue-200',
      text: 'text-blue-700',
      icon: <Clock className="w-4 h-4" />,
      label: `Prueba gratis (vence ${new Date(trialEnds).toLocaleDateString('es-AR')})`,
    },
    active: {
      bg: 'bg-emerald-50 border-emerald-200',
      text: 'text-emerald-700',
      icon: <CheckCircle className="w-4 h-4" />,
      label: 'Suscripción activa',
    },
    expired: {
      bg: 'bg-red-50 border-red-200',
      text: 'text-red-700',
      icon: <AlertTriangle className="w-4 h-4" />,
      label: 'Suscripción vencida',
    },
    cancelled: {
      bg: 'bg-slate-50 border-slate-200',
      text: 'text-slate-600',
      icon: <AlertTriangle className="w-4 h-4" />,
      label: 'Suscripción cancelada',
    },
  }

  const c = config[effectiveStatus] || config.expired

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${c.bg} ${c.text}`}>
      {c.icon}
      <span className="text-sm font-medium">{c.label}</span>
    </div>
  )
}

export default function DashboardPage() {
  const router = useRouter()
  const [provider, setProvider] = useState<Provider | null>(null)
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [editingCost, setEditingCost] = useState(false)
  const [costValue, setCostValue] = useState('')
  const [savingCost, setSavingCost] = useState(false)

  useEffect(() => {
    loadDashboard()
  }, [])

  async function loadDashboard() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    const { data: prov } = await supabase
      .from('providers')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (!prov) {
      // Not a provider, redirect
      router.push('/')
      return
    }

    setProvider(prov)
    setCostValue(prov.visit_cost || '')

    const { data: revs } = await supabase
      .from('reviews')
      .select('*')
      .eq('provider_id', prov.id)
      .order('created_at', { ascending: false })

    if (revs) setReviews(revs)
    setLoading(false)
  }

  async function saveCost() {
    if (!provider) return
    setSavingCost(true)
    await supabase
      .from('providers')
      .update({ visit_cost: costValue.trim() || 'A convenir' })
      .eq('id', provider.id)

    setProvider({ ...provider, visit_cost: costValue.trim() || 'A convenir' })
    setEditingCost(false)
    setSavingCost(false)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    localStorage.removeItem('datoqdato_role')
    router.push('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!provider) return null

  const positiveCount = reviews.filter(r => r.is_positive).length
  const negativeCount = reviews.filter(r => !r.is_positive).length
  const initials = provider.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className="min-h-screen bg-slate-50 pb-8">
      {/* Header */}
      <div className="bg-brand-600 text-white px-4 pt-4 pb-8">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => router.push('/')} className="p-1">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <button onClick={handleLogout} className="p-1">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
        <div className="flex items-center gap-4">
          {provider.photo_url ? (
            <img src={provider.photo_url} alt={provider.name} className="w-16 h-16 rounded-2xl object-cover border-2 border-white/20" />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center text-white font-bold text-xl">
              {initials}
            </div>
          )}
          <div>
            <h1 className="text-xl font-bold">{provider.name}</h1>
            <p className="text-brand-200 text-sm">Mi Panel</p>
          </div>
        </div>
      </div>

      <div className="px-4 -mt-4 space-y-4">
        {/* Account status */}
        <StatusBadge status={provider.subscription_status} trialEnds={provider.trial_ends_at} />

        {/* Stars card */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 text-center">
          <StarsDisplay value={provider.stars} />
          <p className="text-2xl font-bold text-slate-800 mt-2">
            {provider.stars.toFixed(1)} <span className="text-sm font-normal text-slate-400">/ 10</span>
          </p>
          <p className="text-xs text-slate-400 mt-1">
            {provider.total_reviews} servicio{provider.total_reviews !== 1 ? 's' : ''} calificado{provider.total_reviews !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Eye className="w-4 h-4 text-blue-600" />
              </div>
              <span className="text-xs text-slate-400">Vistas</span>
            </div>
            <p className="text-2xl font-bold text-slate-800">{provider.total_views}</p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 bg-emerald-50 rounded-lg">
                <Users className="w-4 h-4 text-emerald-600" />
              </div>
              <span className="text-xs text-slate-400">Contactos</span>
            </div>
            <p className="text-2xl font-bold text-slate-800">{provider.total_contacts}</p>
          </div>
        </div>

        {/* Visit cost */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-amber-50 rounded-lg">
                <DollarSign className="w-4 h-4 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-slate-400">Costo de visita</p>
                {!editingCost && (
                  <p className="text-sm font-semibold text-slate-800">{provider.visit_cost || 'A convenir'}</p>
                )}
              </div>
            </div>
            {!editingCost && (
              <button onClick={() => setEditingCost(true)} className="text-xs text-brand-600 font-semibold">
                Editar
              </button>
            )}
          </div>
          {editingCost && (
            <div className="mt-3 flex gap-2">
              <input
                value={costValue}
                onChange={(e) => setCostValue(e.target.value)}
                placeholder="Ej: $5.000, Gratis, A convenir"
                className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm"
              />
              <button
                onClick={saveCost}
                disabled={savingCost}
                className="px-4 py-2 bg-brand-600 text-white text-sm font-semibold rounded-lg disabled:opacity-50"
              >
                {savingCost ? <Loader2 className="w-4 h-4 animate-spin" /> : 'OK'}
              </button>
            </div>
          )}
        </div>

        {/* Reviews section */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
          <h3 className="text-sm font-bold text-slate-700 mb-3">Mis Reseñas</h3>

          {/* Positive / Negative summary */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center gap-1.5 text-emerald-600">
              <ThumbsUp className="w-4 h-4" />
              <span className="font-bold">{positiveCount}</span>
              <span className="text-xs text-slate-400">buenos</span>
            </div>
            <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full"
                style={{ width: `${reviews.length > 0 ? (positiveCount / reviews.length) * 100 : 0}%` }}
              />
            </div>
            <div className="flex items-center gap-1.5 text-red-500">
              <ThumbsDown className="w-4 h-4" />
              <span className="font-bold">{negativeCount}</span>
              <span className="text-xs text-slate-400">malos</span>
            </div>
          </div>

          {/* Review list */}
          {reviews.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">
              Todavía no tenés reseñas
            </p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {reviews.map((review) => (
                <div
                  key={review.id}
                  className={`flex items-start gap-3 p-3 rounded-xl ${
                    review.is_positive ? 'bg-emerald-50/50' : 'bg-red-50/50'
                  }`}
                >
                  {review.is_positive
                    ? <ThumbsUp className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                    : <ThumbsDown className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                  }
                  <div className="flex-1 min-w-0">
                    {review.comment && (
                      <p className="text-sm text-slate-600">{review.comment}</p>
                    )}
                    {!review.comment && (
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

        {/* Rating explanation */}
        <div className="bg-slate-100 rounded-xl p-4 text-xs text-slate-500 leading-relaxed">
          <p className="font-semibold text-slate-600 mb-1">¿Cómo funciona el puntaje?</p>
          <p>Cada buen trabajo suma ⅓ de estrella. Cada mal trabajo resta 1 estrella entera. Necesitás 30 buenos trabajos sin ninguno malo para llegar a 10 estrellas.</p>
        </div>
      </div>
    </div>
  )
}
