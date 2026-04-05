-- ═══════════════════════════════════════════════════════════════
-- DatoQDato - Supabase Schema
-- Ejecutar en Supabase SQL Editor (en orden)
-- ═══════════════════════════════════════════════════════════════

-- 1. Extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- Para búsqueda fuzzy

-- ═══════════════════ CATEGORÍAS ═══════════════════
CREATE TABLE categories (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  icon TEXT DEFAULT 'wrench', -- nombre del icono para el frontend
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Categorías iniciales
INSERT INTO categories (name, slug, icon) VALUES
  ('Plomero', 'plomero', 'droplets'),
  ('Electricista', 'electricista', 'zap'),
  ('Gasista', 'gasista', 'flame'),
  ('Pintor', 'pintor', 'paintbrush'),
  ('Albañil', 'albanil', 'brick-wall'),
  ('Cerrajero', 'cerrajero', 'key-round'),
  ('Técnico en refrigeración', 'refrigeracion', 'snowflake'),
  ('Jardinero', 'jardinero', 'trees'),
  ('Fumigador', 'fumigador', 'bug'),
  ('Mudanzas', 'mudanzas', 'truck'),
  ('Limpieza', 'limpieza', 'sparkles'),
  ('Reparación de celulares', 'reparacion-celulares', 'smartphone'),
  ('Service de computadoras', 'service-computadoras', 'monitor'),
  ('Electrónica', 'electronica', 'cpu'),
  ('Paseador de perros', 'paseador-perros', 'dog'),
  ('Guardería de mascotas', 'guarderia-mascotas', 'paw-print'),
  ('Carpintero', 'carpintero', 'axe'),
  ('Vidriero', 'vidriero', 'square'),
  ('Techista', 'techista', 'home'),
  ('Herrería', 'herreria', 'anvil');

-- ═══════════════════ PROVEEDORES ═══════════════════
CREATE TABLE providers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  email TEXT,
  -- Ubicación
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  address TEXT,
  city TEXT,
  province TEXT DEFAULT 'Buenos Aires',
  coverage_radius_km INT DEFAULT 10,
  -- Suscripción
  is_active BOOLEAN DEFAULT TRUE,
  subscription_status TEXT DEFAULT 'trial' CHECK (subscription_status IN ('trial', 'active', 'expired', 'cancelled')),
  trial_ends_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
  -- Métricas
  avg_rating DECIMAL(2,1) DEFAULT 0,
  total_reviews INT DEFAULT 0,
  total_views INT DEFAULT 0,
  total_contacts INT DEFAULT 0,
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para búsqueda geográfica
CREATE INDEX idx_providers_location ON providers (latitude, longitude);
CREATE INDEX idx_providers_active ON providers (is_active) WHERE is_active = TRUE;
CREATE INDEX idx_providers_city ON providers (city);

-- ═══════════════════ PROVEEDOR ↔ CATEGORÍAS ═══════════════════
CREATE TABLE provider_categories (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  keywords TEXT[] DEFAULT '{}', -- Array de palabras clave
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(provider_id, category_id)
);

CREATE INDEX idx_provider_categories_provider ON provider_categories (provider_id);
CREATE INDEX idx_provider_categories_category ON provider_categories (category_id);
-- Índice GIN para búsqueda en keywords
CREATE INDEX idx_provider_categories_keywords ON provider_categories USING GIN (keywords);

-- ═══════════════════ RESEÑAS ═══════════════════
CREATE TABLE reviews (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  -- Datos del reviewer (público: solo nombre + inicial + ciudad)
  reviewer_name TEXT NOT NULL, -- "María R."
  reviewer_phone_hash TEXT NOT NULL, -- Hash del teléfono para anti-duplicado
  reviewer_city TEXT,
  -- Reseña
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  -- Verificación
  is_verified BOOLEAN DEFAULT FALSE,
  device_id TEXT, -- Para detectar múltiples reseñas del mismo dispositivo
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Un teléfono solo puede reseñar una vez a cada proveedor
CREATE UNIQUE INDEX idx_reviews_unique_phone_provider 
  ON reviews (reviewer_phone_hash, provider_id);

CREATE INDEX idx_reviews_provider ON reviews (provider_id);

-- ═══════════════════ CONTACTOS (métricas) ═══════════════════
CREATE TABLE contacts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  contact_type TEXT DEFAULT 'whatsapp' CHECK (contact_type IN ('whatsapp', 'phone', 'email')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_contacts_provider ON contacts (provider_id);
CREATE INDEX idx_contacts_date ON contacts (created_at);

-- ═══════════════════ VISTAS DE PERFIL (métricas) ═══════════════════
CREATE TABLE profile_views (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_profile_views_provider ON profile_views (provider_id);

-- ═══════════════════ FUNCIONES ═══════════════════

-- Función para buscar proveedores por cercanía (Haversine)
CREATE OR REPLACE FUNCTION search_providers(
  search_lat DOUBLE PRECISION,
  search_lng DOUBLE PRECISION,
  search_radius_km INT DEFAULT 20,
  search_category UUID DEFAULT NULL,
  search_query TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  phone TEXT,
  whatsapp TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  address TEXT,
  city TEXT,
  coverage_radius_km INT,
  avg_rating DECIMAL,
  total_reviews INT,
  distance_km DOUBLE PRECISION,
  category_name TEXT,
  category_slug TEXT,
  keywords TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT ON (p.id)
    p.id,
    p.name,
    p.phone,
    p.whatsapp,
    p.latitude,
    p.longitude,
    p.address,
    p.city,
    p.coverage_radius_km,
    p.avg_rating,
    p.total_reviews,
    -- Distancia en km usando Haversine
    (6371 * acos(
      cos(radians(search_lat)) * cos(radians(p.latitude)) *
      cos(radians(p.longitude) - radians(search_lng)) +
      sin(radians(search_lat)) * sin(radians(p.latitude))
    )) AS distance_km,
    c.name AS category_name,
    c.slug AS category_slug,
    pc.keywords
  FROM providers p
  JOIN provider_categories pc ON pc.provider_id = p.id
  JOIN categories c ON c.id = pc.category_id
  WHERE p.is_active = TRUE
    AND p.subscription_status IN ('trial', 'active')
    -- Filtrar por radio de búsqueda
    AND (6371 * acos(
      cos(radians(search_lat)) * cos(radians(p.latitude)) *
      cos(radians(p.longitude) - radians(search_lng)) +
      sin(radians(search_lat)) * sin(radians(p.latitude))
    )) <= search_radius_km
    -- Filtrar por categoría si se especifica
    AND (search_category IS NULL OR pc.category_id = search_category)
    -- Búsqueda por texto en categoría o keywords
    AND (
      search_query IS NULL
      OR c.name ILIKE '%' || search_query || '%'
      OR c.slug ILIKE '%' || search_query || '%'
      OR EXISTS (
        SELECT 1 FROM unnest(pc.keywords) kw WHERE kw ILIKE '%' || search_query || '%'
      )
    )
  ORDER BY p.id, distance_km ASC;
END;
$$ LANGUAGE plpgsql;

-- Función para actualizar avg_rating y total_reviews del proveedor
CREATE OR REPLACE FUNCTION update_provider_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE providers SET
    avg_rating = (SELECT COALESCE(AVG(rating), 0) FROM reviews WHERE provider_id = NEW.provider_id AND is_verified = TRUE),
    total_reviews = (SELECT COUNT(*) FROM reviews WHERE provider_id = NEW.provider_id AND is_verified = TRUE),
    updated_at = NOW()
  WHERE id = NEW.provider_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_rating
  AFTER INSERT OR UPDATE ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_provider_rating();

-- Función para incrementar vistas
CREATE OR REPLACE FUNCTION increment_views(p_provider_id UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO profile_views (provider_id) VALUES (p_provider_id);
  UPDATE providers SET total_views = total_views + 1, updated_at = NOW() WHERE id = p_provider_id;
END;
$$ LANGUAGE plpgsql;

-- Función para registrar contacto
CREATE OR REPLACE FUNCTION register_contact(p_provider_id UUID, p_type TEXT DEFAULT 'whatsapp')
RETURNS VOID AS $$
BEGIN
  INSERT INTO contacts (provider_id, contact_type) VALUES (p_provider_id, p_type);
  UPDATE providers SET total_contacts = total_contacts + 1, updated_at = NOW() WHERE id = p_provider_id;
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════ RLS (Row Level Security) ═══════════════════
ALTER TABLE providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Categorías: todos pueden leer
CREATE POLICY "categories_read" ON categories FOR SELECT USING (true);

-- Proveedores: todos pueden leer los activos, solo el dueño puede editar
CREATE POLICY "providers_read" ON providers FOR SELECT USING (is_active = TRUE);
CREATE POLICY "providers_insert" ON providers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "providers_update" ON providers FOR UPDATE USING (auth.uid() = user_id);

-- Provider categories: lectura pública, escritura del dueño
CREATE POLICY "provider_categories_read" ON provider_categories FOR SELECT USING (true);
CREATE POLICY "provider_categories_insert" ON provider_categories FOR INSERT 
  WITH CHECK (EXISTS (SELECT 1 FROM providers WHERE id = provider_id AND user_id = auth.uid()));
CREATE POLICY "provider_categories_update" ON provider_categories FOR UPDATE 
  USING (EXISTS (SELECT 1 FROM providers WHERE id = provider_id AND user_id = auth.uid()));

-- Reseñas: lectura pública, cualquier usuario autenticado puede crear
CREATE POLICY "reviews_read" ON reviews FOR SELECT USING (true);
CREATE POLICY "reviews_insert" ON reviews FOR INSERT WITH CHECK (true);

-- Contactos: solo insertar (público), leer solo el dueño del proveedor
CREATE POLICY "contacts_insert" ON contacts FOR INSERT WITH CHECK (true);
CREATE POLICY "contacts_read" ON contacts FOR SELECT 
  USING (EXISTS (SELECT 1 FROM providers WHERE id = provider_id AND user_id = auth.uid()));

-- Vistas: insertar público, leer solo el dueño
CREATE POLICY "views_insert" ON profile_views FOR INSERT WITH CHECK (true);
CREATE POLICY "views_read" ON profile_views FOR SELECT 
  USING (EXISTS (SELECT 1 FROM providers WHERE id = provider_id AND user_id = auth.uid()));
