'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, Eye, EyeOff, User, Mail, Phone, MapPin, Loader2 } from 'lucide-react'

export default function RegistroPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    city: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  function updateField(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
    setError('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    // Validaciones
    if (!form.name.trim()) return setError('Ingresá tu nombre')
    if (!form.email.trim()) return setError('Ingresá tu email')
    if (!form.phone.trim()) return setError('Ingresá tu teléfono')
    if (form.password.length < 6) return setError('La contraseña debe tener al menos 6 caracteres')
    if (!form.city.trim()) return setError('Ingresá tu ciudad o barrio')

    setLoading(true)

    const { data, error: authError } = await supabase.auth.signUp({
      email: form.email.trim(),
      password: form.password,
      options: {
        data: {
          name: form.name.trim(),
          phone: form.phone.trim(),
          city: form.city.trim(),
        },
      },
    })

    if (authError) {
      setLoading(false)
      if (authError.message.includes('already registered')) {
        return setError('Este email ya está registrado. ¿Querés iniciar sesión?')
      }
      return setError(authError.message)
    }

    setSuccess(true)
    setLoading(false)
  }

  if (success) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-6">
          <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-slate-800 mb-2 text-center">¡Registro exitoso!</h1>
        <p className="text-sm text-slate-500 text-center mb-6 max-w-xs">
          Te enviamos un email de confirmación a <strong>{form.email}</strong>. Revisá tu bandeja de entrada (y spam).
        </p>
        <button
          onClick={() => router.push('/login')}
          className="px-6 py-3 bg-brand-600 text-white font-semibold rounded-xl"
        >
          Ir a Iniciar Sesión
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-brand-600 text-white px-4 pt-4 pb-12">
        <button onClick={() => router.back()} className="p-1 mb-4">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold">Crear cuenta</h1>
        <p className="text-brand-200 text-sm mt-1">Gratis para siempre — buscá y calificá profesionales</p>
      </div>

      {/* Form */}
      <div className="px-4 -mt-6">
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 space-y-4">
          {/* Name */}
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">
              Nombre completo
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={form.name}
                onChange={(e) => updateField('name', e.target.value)}
                placeholder="Ej: María López"
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-transparent"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="email"
                value={form.email}
                onChange={(e) => updateField('email', e.target.value)}
                placeholder="tu@email.com"
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-transparent"
              />
            </div>
          </div>

          {/* Phone */}
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">
              Teléfono
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => updateField('phone', e.target.value)}
                placeholder="11 2345-6789"
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-transparent"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Se usa para verificar tus reseñas — no se muestra públicamente</p>
          </div>

          {/* City */}
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">
              Ciudad / Barrio
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={form.city}
                onChange={(e) => updateField('city', e.target.value)}
                placeholder="Ej: San Fernando, Tigre, San Isidro..."
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-transparent"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">
              Contraseña
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={(e) => updateField('password', e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="w-full pl-4 pr-12 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-transparent"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-xl">
              <p className="text-sm text-red-600">{error}</p>
              {error.includes('iniciar sesión') && (
                <button
                  type="button"
                  onClick={() => router.push('/login')}
                  className="text-sm font-semibold text-red-700 underline mt-1"
                >
                  Ir a Login
                </button>
              )}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-400 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Registrando...
              </>
            ) : (
              'Crear mi cuenta'
            )}
          </button>

          {/* Login link */}
          <p className="text-center text-sm text-slate-500">
            ¿Ya tenés cuenta?{' '}
            <button
              type="button"
              onClick={() => router.push('/login')}
              className="font-semibold text-brand-600"
            >
              Iniciá sesión
            </button>
          </p>
        </form>

        {/* Provider CTA */}
        <div className="mt-4 p-4 bg-slate-900 rounded-2xl text-center mb-8">
          <p className="text-white font-bold text-sm mb-1">¿Sos profesional?</p>
          <p className="text-slate-400 text-xs mb-3">Registrate primero acá y después completá tu perfil profesional</p>
        </div>
      </div>
    </div>
  )
}
