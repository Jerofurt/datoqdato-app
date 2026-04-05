import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Types
export interface Category {
  id: string
  name: string
  slug: string
  icon: string
}

export interface Provider {
  id: string
  name: string
  phone: string
  whatsapp: string
  latitude: number
  longitude: number
  address: string
  city: string
  coverage_radius_km: number
  avg_rating: number
  total_reviews: number
  total_views: number
  total_contacts: number
  subscription_status: string
  province: string
  photo_url: string | null
  created_at: string
}

export interface ProviderSearchResult {
  id: string
  name: string
  phone: string
  whatsapp: string
  latitude: number
  longitude: number
  address: string
  city: string
  coverage_radius_km: number
  avg_rating: number
  total_reviews: number
  distance_km: number
  category_name: string
  category_slug: string
  keywords: string[]
  photo_url: string | null
}

export interface Review {
  id: string
  provider_id: string
  reviewer_name: string
  reviewer_city: string
  rating: number
  comment: string
  is_verified: boolean
  created_at: string
}
