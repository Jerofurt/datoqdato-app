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
  user_id: string
  name: string
  phone: string
  whatsapp: string
  email: string | null
  latitude: number
  longitude: number
  address: string
  city: string
  coverage_radius_km: number
  stars: number
  total_reviews: number
  total_views: number
  total_contacts: number
  subscription_status: 'trial' | 'active' | 'expired' | 'cancelled'
  trial_ends_at: string
  province: string
  photo_url: string | null
  visit_cost: string | null
  created_at: string
  updated_at: string
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
  stars: number
  total_reviews: number
  distance_km: number
  category_name: string
  category_slug: string
  keywords: string[]
  photo_url: string | null
  visit_cost: string | null
}

export interface Review {
  id: string
  provider_id: string
  client_id: string
  is_positive: boolean
  comment: string | null
  created_at: string
}
