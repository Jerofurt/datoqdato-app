'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, Category } from '@/lib/supabase'
import { ArrowLeft, MapPin, Plus, X, Loader2, CheckCircle, Phone, ChevronRight, Camera, User } from 'lucide-react'

interface SelectedCategory {
  category: Category
  keywords: string[]
}

export default function ProveedorRegistroPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  // Step 1: Datos básicos + foto
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [sameAsPhone, setSameAsPhone] = useState(true)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)

  // Step 2: Ubicación
  const [latitude, setLatitude] = useState<number | null>(null)
  const [longitude, setLongitude] = useState<number | null>(null)
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [coverageRadius, setCoverageRadius] = useState(10)
  const [locationStatus, setLocationStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')

  // Step 3: Categorías
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategories, setSelectedCategories] = useState<SelectedCategory[]>([])
  const [newKeyword, setNewKeyword] = useState('')
  const [showCategoryPicker, setShowCategoryPicker] = useState(false)

  useEffect(() => {
    checkAuth()
    loadCategories()
  }, [])

  async function checkAuth() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/registro?pro=1')
      return
    }
    setUserId(user.id)
    if (user.user_metadata?.name) setName(user.user_metadata.name)
    if (user.user_metadata?.phone) {
      setPhone(user.user_metadata.phone)
      setWhatsapp(user.user_metadata.phone)
    }
    if (user.user_metadata?.city) setCity(user.user_metadata.city)
    setCheckingAuth(false)
  }

  async function loadCategories() {
    const { data } = await supabase.from('categories').select('*').order('name')
    if (data) setCategories(data)
  }

  function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    
    // Validate size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('La foto no puede pesar más de 5MB')
      return
    }

    setPhotoFile(file)
    const reader = new FileReader()
    reader.onload = (ev) => setPhotoPreview(ev.target?.result as string)
    reader.readAsDataURL(file)
    setError('')
  }

  function requestLocation() {
    setLocationStatus('loading')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude)
        setLongitude(pos.coords.longitude)
        setLocationStatus('done')
      },
      () => setLocationStatus('error'),
      { enableHighAccuracy: true, timeout: 15000 }
    )
  }

  function addCategory(cat: Category) {
    if (selectedCategories.length >= 2) return
    if (selectedCategories.find(sc => sc.category.id === cat.id)) return
    setSelectedCategories([...selectedCategories, { category: cat, keywords: [] }])
    setShowCategoryPicker(false)
  }

  function removeCategory(catId: string) {
    setSelectedCategories(selectedCategories.filter(sc => sc.category.id !== catId))
  }

  function addKeyword(catId: string) {
    if (!newKeyword.trim()) return
    setSelectedCategories(selectedCategories.map(sc => {
      if (sc.category.id === catId && sc.keywords.length < 8) {
        return { ...sc, keywords: [...sc.keywords, newKeyword.trim()] }
      }
      return sc
    }))
    setNewKeyword('')
  }

  function removeKeyword(catId: string, keyword: string) {
    setSelectedCategories(selectedCategories.map(sc => {
      if (sc.category.id === catId) {
        return { ...sc, keywords: sc.keywords.filter(k => k !== keyword) }
      }
      return sc
    }))
  }

  function validateStep(s: number): boolean {
    setError('')
    if (s === 1) {
      if (!name.trim()) { setError('Ingresá tu nombre'); return false }
      if (!phone.trim()) { setError('Ingresá tu teléfono'); return false }
      if (!sameAsPhone && !whatsapp.trim()) { setError('Ingresá tu WhatsApp'); return false }
      if (!photoFile) { setError('Subí una foto de perfil — es obligatoria para generar confianza'); return false }
      return true
    }
    if (s === 2) {
      if (!city.trim()) { setError('Ingresá tu ciudad o barrio'); return false }
      if (!latitude || !longitude) { setError('Necesitamos tu ubicación para mostrar tu perfil a clientes cercanos'); return false }
      return true
    }
    if (s === 3) {
      if (selectedCategories.length === 0) { setError('Elegí al menos una categoría'); return false }
      return true
    }
    return true
  }

  function nextStep() {
    if (validateStep(step)) setStep(step + 1)
  }

  async function handleSubmit() {
    if (!validateStep(3)) return
    if (!userId) return

    setLoading(true)
    setError('')

    // Upload photo
    let photoUrl = null
    if (photoFile) {
      const ext = photoFile.name.split('.').pop()
      const fileName = `${userId}-${Date.now()}.${ext}`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('profile-photos')
        .upload(fileName, photoFile, { upsert: true })

      if (uploadError) {
        setLoading(false)
        return setError('Error al subir la foto: ' + uploadError.message)
      }

      const { data: urlData } = supabase.storage
        .from('profile-photos')
        .getPublicUrl(fileName)
      
      photoUrl = urlData.publicUrl
    }

    const finalWhatsapp = sameAsPhone ? phone : whatsapp

    // Create provider
    const { data: provider, error: provError } = await supabase
      .from('providers')
      .insert({
        user_id: userId,
        name: name.trim(),
        phone: phone.trim(),
        whatsapp: finalWhatsapp.trim(),
        latitude: latitude!,
        longitude: longitude!,
        address: address.trim(),
        city: city.trim(),
        coverage_radius_km: coverageRadius,
        photo_url: photoUrl,
      })
      .select()
      .single()

    if (provError) {
      setLoading(false)
      if (provError.message.includes('duplicate')) {
        return setError('Ya tenés un perfil profesional registrado')
      }
      return setError('Error al registrar: ' + provError.message)
    }

    // Add categories + keywords
    for (const sc of selectedCategories) {
      await supabase.from('provider_categories').insert({
        provider_id: provider.id,
        category_id: sc.category.id,
        keywords: sc.keywords,
      })
    }

    setSuccess(true)
    setLoading(false)
  }

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-brand-600 animate-spin" />
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-6">
          <CheckCircle className="w-8 h-8 text-emerald-600" />
        </div>
        <h1 className="text-xl font-bold text-slate-800 mb-2 text-center">¡Tu perfil está activo!</h1>
        <p className="text-sm text-slate-500 text-center mb-2 max-w-xs">
          Tenés <strong>30 días gratis</strong> para que los clientes te encuentren y contacten.
        </p>
        <p className="text-sm text-slate-400 text-center mb-6 max-w-xs">
          Los clientes cercanos a tu zona ya pueden verte cuando busquen tus servicios.
        </p>
        <button
          onClick={() => router.push('/')}
          className="px-6 py-3 bg-brand-600 text-white font-semibold rounded-xl"
        >
          Ir al inicio
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-8">
      {/* Header */}
      <div className="bg-brand-600 text-white px-4 pt-4 pb-12">
        <button onClick={() => step > 1 ? setStep(step - 1) : router.back()} className="p-1 mb-4">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold">Registro Profesional</h1>
        <p className="text-brand-200 text-sm mt-1">Paso {step} de 3</p>
        <div className="flex gap-2 mt-4">
          {[1, 2, 3].map(s => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full transition-colors ${
                s <= step ? 'bg-white' : 'bg-white/20'
              }`}
            />
          ))}
        </div>
      </div>

      <div className="px-4 -mt-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">

          {/* ══════════ STEP 1: Datos + Foto ══════════ */}
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-slate-800 mb-1">Tus datos</h2>
              <p className="text-sm text-slate-400 mb-4">Así te van a ver los clientes</p>

              {/* Photo upload */}
              <div className="flex flex-col items-center mb-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="relative w-24 h-24 rounded-full overflow-hidden border-3 border-dashed border-slate-200 hover:border-brand-400 transition-colors bg-slate-50 flex items-center justify-center group"
                >
                  {photoPreview ? (
                    <img src={photoPreview} alt="Foto" className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center gap-1">
                      <Camera className="w-6 h-6 text-slate-400 group-hover:text-brand-500" />
                      <span className="text-[10px] text-slate-400 group-hover:text-brand-500">Subir foto</span>
                    </div>
                  )}
                  {photoPreview && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Camera className="w-6 h-6 text-white" />
                    </div>
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoSelect}
                  className="hidden"
                />
                <p className="text-xs text-slate-400 mt-2">Foto de perfil <span className="text-red-400 font-semibold">*obligatoria</span></p>
                <p className="text-[11px] text-slate-400">Los clientes confían más cuando ven tu cara</p>
              </div>

              {/* Name */}
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">
                  Nombre completo o del negocio
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: Carlos Méndez o Electricidad Rápida"
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                />
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
                    value={phone}
                    onChange={(e) => { setPhone(e.target.value); if (sameAsPhone) setWhatsapp(e.target.value) }}
                    placeholder="11 2345-6789"
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="samePhone"
                  checked={sameAsPhone}
                  onChange={(e) => {
                    setSameAsPhone(e.target.checked)
                    if (e.target.checked) setWhatsapp(phone)
                  }}
                  className="w-4 h-4 rounded accent-brand-600"
                />
                <label htmlFor="samePhone" className="text-sm text-slate-600">Mi WhatsApp es el mismo número</label>
              </div>

              {!sameAsPhone && (
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">
                    WhatsApp
                  </label>
                  <input
                    type="tel"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    placeholder="11 9876-5432"
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                  />
                </div>
              )}
            </div>
          )}

          {/* ══════════ STEP 2: Ubicación ══════════ */}
          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-slate-800 mb-1">Tu ubicación</h2>
              <p className="text-sm text-slate-400 mb-4">Para mostrar tu perfil a clientes cercanos</p>

              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">
                  Ciudad / Barrio
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Ej: San Fernando"
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">
                  Dirección (opcional)
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Ej: Av. Libertador 1234"
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                />
                <p className="text-[11px] text-slate-400 mt-1">No se muestra públicamente, solo para calcular cercanía</p>
              </div>

              <button
                onClick={requestLocation}
                className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all ${
                  locationStatus === 'done'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : locationStatus === 'error'
                    ? 'bg-red-50 text-red-600 border border-red-200'
                    : 'bg-brand-50 text-brand-600 border border-brand-200 hover:bg-brand-100'
                }`}
              >
                <MapPin className="w-4 h-4" />
                {locationStatus === 'idle' && 'Obtener mi ubicación por GPS'}
                {locationStatus === 'loading' && 'Obteniendo ubicación...'}
                {locationStatus === 'done' && '✓ Ubicación obtenida'}
                {locationStatus === 'error' && 'Error — intentá de nuevo'}
              </button>

              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">
                  Radio de cobertura: {coverageRadius} km
                </label>
                <input
                  type="range"
                  min="3"
                  max="50"
                  value={coverageRadius}
                  onChange={(e) => setCoverageRadius(parseInt(e.target.value))}
                  className="w-full accent-brand-600"
                />
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>3 km</span>
                  <span>50 km</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  ¿Hasta dónde llegás a trabajar? Los clientes dentro de este radio te van a ver.
                </p>
              </div>
            </div>
          )}

          {/* ══════════ STEP 3: Categorías ══════════ */}
          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-slate-800 mb-1">¿Qué hacés?</h2>
              <p className="text-sm text-slate-400 mb-4">Elegí hasta 2 categorías y agregá palabras clave</p>

              {selectedCategories.map((sc) => (
                <div key={sc.category.id} className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-semibold text-slate-800 text-sm">{sc.category.name}</span>
                    <button onClick={() => removeCategory(sc.category.id)} className="text-slate-400 hover:text-red-500">
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {sc.keywords.map((kw) => (
                      <span
                        key={kw}
                        className="inline-flex items-center gap-1 text-xs bg-brand-100 text-brand-700 px-2.5 py-1 rounded-full"
                      >
                        {kw}
                        <button onClick={() => removeKeyword(sc.category.id, kw)} className="hover:text-red-500">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>

                  {sc.keywords.length < 8 && (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newKeyword}
                        onChange={(e) => setNewKeyword(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addKeyword(sc.category.id) } }}
                        placeholder="Ej: caño roto, pérdida de agua..."
                        className="flex-1 px-3 py-2 rounded-lg bg-white border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-brand-300"
                      />
                      <button
                        onClick={() => addKeyword(sc.category.id)}
                        className="px-3 py-2 bg-brand-600 text-white rounded-lg text-xs font-medium"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  <p className="text-[11px] text-slate-400 mt-2">
                    Palabras clave que tus clientes usarían para buscarte ({sc.keywords.length}/8)
                  </p>
                </div>
              ))}

              {selectedCategories.length < 2 && (
                <button
                  onClick={() => setShowCategoryPicker(true)}
                  className="w-full py-3 border-2 border-dashed border-slate-200 rounded-xl text-sm font-medium text-slate-500 hover:border-brand-300 hover:text-brand-600 transition-colors flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Agregar categoría ({selectedCategories.length}/2)
                </button>
              )}

              {showCategoryPicker && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
                  <div className="bg-white rounded-t-3xl w-full max-h-[70vh] overflow-hidden">
                    <div className="flex items-center justify-between p-4 border-b border-slate-100">
                      <h3 className="font-bold text-slate-800">Elegí una categoría</h3>
                      <button onClick={() => setShowCategoryPicker(false)}>
                        <X className="w-5 h-5 text-slate-400" />
                      </button>
                    </div>
                    <div className="overflow-y-auto max-h-[55vh] p-4 space-y-2">
                      {categories
                        .filter(c => !selectedCategories.find(sc => sc.category.id === c.id))
                        .map(cat => (
                          <button
                            key={cat.id}
                            onClick={() => addCategory(cat)}
                            className="w-full flex items-center gap-3 p-3 bg-slate-50 hover:bg-brand-50 border border-slate-100 hover:border-brand-200 rounded-xl text-left transition-all"
                          >
                            <span className="text-lg"><CategoryIcon name={cat.icon} /></span>
                            <span className="text-sm font-medium text-slate-700">{cat.name}</span>
                            <ChevronRight className="w-4 h-4 text-slate-300 ml-auto" />
                          </button>
                        ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl">
                <p className="text-sm text-emerald-800 font-medium">🎉 30 días gratis</p>
                <p className="text-xs text-emerald-600 mt-0.5">Después $5.000/mes. Sin comisiones por trabajo. Cancelás cuando quieras.</p>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-xl">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Navigation */}
          <div className="mt-6 flex gap-3">
            {step > 1 && (
              <button
                onClick={() => setStep(step - 1)}
                className="px-6 py-3 bg-slate-100 text-slate-600 font-medium rounded-xl text-sm"
              >
                Atrás
              </button>
            )}
            {step < 3 ? (
              <button
                onClick={nextStep}
                className="flex-1 py-3 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl text-sm transition-colors"
              >
                Siguiente
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 py-3 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-400 text-white font-bold rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Registrando...
                  </>
                ) : (
                  'Publicar mi perfil'
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function CategoryIcon({ name }: { name: string }) {
  const iconMap: Record<string, string> = {
    'droplets': '🔧', 'zap': '⚡', 'flame': '🔥', 'paintbrush': '🎨',
    'brick-wall': '🧱', 'key-round': '🔑', 'snowflake': '❄️', 'trees': '🌳',
    'bug': '🐛', 'truck': '🚛', 'sparkles': '✨', 'smartphone': '📱',
    'monitor': '💻', 'cpu': '🔌', 'dog': '🐕', 'paw-print': '🐾',
    'axe': '🪓', 'square': '🪟', 'home': '🏠', 'anvil': '⚒️', 'wrench': '🔧',
  }
  return <>{iconMap[name] || '🔧'}</>
}
