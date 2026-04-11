-- ═══════════════════════════════════════════════════════════════
-- SIGDOF v2.0 · Schema Supabase
-- Carabineros de Chile · Dotación Fronteriza
-- ═══════════════════════════════════════════════════════════════

-- Extensión UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── TABLA: cuarteles ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cuarteles (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre           TEXT NOT NULL,
  region           TEXT NOT NULL,
  tipo             TEXT NOT NULL CHECK (tipo IN ('COMISARÍA','TENENCIA','SUBCOMISARÍA')),
  tipo_comisaria   TEXT NOT NULL DEFAULT 'MAYOR_TCOL' CHECK (tipo_comisaria IN ('MAYOR_TCOL','SOLO_MAYOR')),
  zona_trat_pct    INTEGER NOT NULL DEFAULT 60 CHECK (zona_trat_pct BETWEEN 0 AND 100),
  criticidad       TEXT NOT NULL DEFAULT 'MEDIA' CHECK (criticidad IN ('ALTA','MEDIA','BAJA')),
  dot_comisario    INTEGER NOT NULL DEFAULT 0,
  dot_subcom_serv  INTEGER NOT NULL DEFAULT 0,
  dot_subcom_adm   INTEGER NOT NULL DEFAULT 0,
  dot_jefe_ten     INTEGER NOT NULL DEFAULT 0,
  dot_of_op        INTEGER NOT NULL DEFAULT 0,
  latitud          DECIMAL(9,6),
  longitud         DECIMAL(9,6),
  activo           BOOLEAN NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── TABLA: oficiales ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS oficiales (
  id                       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre                   TEXT NOT NULL,
  rut                      TEXT UNIQUE,
  grado                    TEXT NOT NULL CHECK (grado IN ('SUBTENIENTE','TENIENTE','CAPITAN','MAYOR','TENIENTE_CORONEL','CORONEL')),
  fecha_ascenso_grado      DATE NOT NULL,
  especialidad_mof         BOOLEAN NOT NULL DEFAULT false,
  anio_egreso_grupo_montana INTEGER,
  motivo_perdida_esp       TEXT,
  cuartel_id               UUID REFERENCES cuarteles(id) ON DELETE SET NULL,
  cargo_actual             TEXT CHECK (cargo_actual IN ('COMISARIO','SUBCOM_SERV','SUBCOM_ADM','JEFE_TEN','OF_OP')),
  fecha_ingreso_cuartel    DATE,
  estado                   TEXT NOT NULL DEFAULT 'ACTIVO' CHECK (estado IN ('ACTIVO','PERFECCIONAMIENTO','BAJA','RETIRADO')),
  motivo_fuera_frontera    TEXT CHECK (motivo_fuera_frontera IN ('ROTACION','PERFECCIONAMIENTO','ASCENSO_SIN_CARGO','MEDICO','FAMILIAR','DISCIPLINARIO','SOLICITUD_PROPIA','NECESIDAD_INST')),
  puede_volver             TEXT DEFAULT 'SI' CHECK (puede_volver IN ('SI','CONDICIONAL','NO')),
  fecha_disponibilidad     DATE,
  acipol_inicio            DATE,
  acipol_retorno           DATE,
  formacion                JSONB DEFAULT '[]'::jsonb,
  observaciones            TEXT,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── TABLA: planes_traslado ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS planes_traslado (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  anio        INTEGER NOT NULL,
  estado      TEXT NOT NULL DEFAULT 'BORRADOR' CHECK (estado IN ('BORRADOR','EJECUTADO','ANULADO')),
  fecha_ejec  DATE,
  notas       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── TABLA: movimientos ─────────────────────────────────────────
-- Registra TODAS las decisiones del plan: traslados Y "se mantienen"
CREATE TABLE IF NOT EXISTS movimientos (
  id                     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_id                UUID NOT NULL REFERENCES planes_traslado(id) ON DELETE CASCADE,
  oficial_id             UUID NOT NULL REFERENCES oficiales(id) ON DELETE CASCADE,
  tipo                   TEXT NOT NULL DEFAULT 'SE_MUEVE' CHECK (tipo IN ('SE_MUEVE','SE_MANTIENE')),
  cuartel_origen_id      UUID REFERENCES cuarteles(id) ON DELETE SET NULL,
  cuartel_destino_id     UUID REFERENCES cuarteles(id) ON DELETE SET NULL,
  cargo_destino          TEXT CHECK (cargo_destino IN ('COMISARIO','SUBCOM_SERV','SUBCOM_ADM','JEFE_TEN','OF_OP')),
  justificacion          TEXT,
  es_excepcion           BOOLEAN NOT NULL DEFAULT false,
  justif_excepcion       TEXT,
  permanencia_proyectada DECIMAL(4,2),
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── TABLA: grupo_montana_formacion ────────────────────────────
CREATE TABLE IF NOT EXISTS grupo_montana_formacion (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  oficial_id       UUID REFERENCES oficiales(id) ON DELETE CASCADE,
  anio_ingreso     INTEGER NOT NULL,
  anio_egreso      INTEGER,
  promocion        TEXT,
  estado           TEXT DEFAULT 'EN_FORMACION' CHECK (estado IN ('EN_FORMACION','EGRESADO','RETIRADO')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── ÍNDICES para performance ────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_oficiales_cuartel ON oficiales(cuartel_id);
CREATE INDEX IF NOT EXISTS idx_oficiales_estado  ON oficiales(estado);
CREATE INDEX IF NOT EXISTS idx_oficiales_grado   ON oficiales(grado);
CREATE INDEX IF NOT EXISTS idx_movimientos_plan  ON movimientos(plan_id);
CREATE INDEX IF NOT EXISTS idx_movimientos_oficial ON movimientos(oficial_id);
CREATE INDEX IF NOT EXISTS idx_cuarteles_activo  ON cuarteles(activo);

-- ── ROW LEVEL SECURITY ─────────────────────────────────────────
-- Habilitar RLS para que solo usuarios autenticados accedan
ALTER TABLE cuarteles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE oficiales           ENABLE ROW LEVEL SECURITY;
ALTER TABLE planes_traslado     ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimientos         ENABLE ROW LEVEL SECURITY;
ALTER TABLE grupo_montana_formacion ENABLE ROW LEVEL SECURITY;

-- Políticas: solo usuarios autenticados pueden leer y escribir
CREATE POLICY "Autenticados pueden leer cuarteles"
  ON cuarteles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Autenticados pueden modificar cuarteles"
  ON cuarteles FOR ALL TO authenticated USING (true);

CREATE POLICY "Autenticados pueden leer oficiales"
  ON oficiales FOR SELECT TO authenticated USING (true);
CREATE POLICY "Autenticados pueden modificar oficiales"
  ON oficiales FOR ALL TO authenticated USING (true);

CREATE POLICY "Autenticados pueden leer planes"
  ON planes_traslado FOR SELECT TO authenticated USING (true);
CREATE POLICY "Autenticados pueden modificar planes"
  ON planes_traslado FOR ALL TO authenticated USING (true);

CREATE POLICY "Autenticados pueden leer movimientos"
  ON movimientos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Autenticados pueden modificar movimientos"
  ON movimientos FOR ALL TO authenticated USING (true);

CREATE POLICY "Autenticados pueden leer grupo_montana"
  ON grupo_montana_formacion FOR SELECT TO authenticated USING (true);
CREATE POLICY "Autenticados pueden modificar grupo_montana"
  ON grupo_montana_formacion FOR ALL TO authenticated USING (true);

-- ── FUNCIÓN updated_at automático ──────────────────────────────
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_cuarteles
  BEFORE UPDATE ON cuarteles
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_oficiales
  BEFORE UPDATE ON oficiales
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_planes
  BEFORE UPDATE ON planes_traslado
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ── DATOS INICIALES: 35 cuarteles fronterizos ──────────────────
-- (Actualiza latitud/longitud con coordenadas reales de cada cuartel)
INSERT INTO cuarteles (nombre, region, tipo, zona_trat_pct, criticidad, dot_comisario, dot_subcom_serv, dot_subcom_adm, dot_jefe_ten, dot_of_op, latitud, longitud) VALUES
  ('Colchane',          'Tarapacá',     'COMISARÍA', 90, 'ALTA',   1, 1, 1, 1, 2, -19.2748, -68.6378),
  ('Pisiga',            'Tarapacá',     'TENENCIA',  85, 'ALTA',   0, 0, 0, 1, 1, -19.4500, -68.7200),
  ('Visviri',           'Arica y Parinacota', 'COMISARÍA', 95, 'ALTA', 1, 1, 0, 1, 2, -17.5959, -69.4754),
  ('Chungará',          'Arica y Parinacota', 'TENENCIA', 90, 'ALTA', 0, 0, 0, 1, 1, -18.2400, -69.0800),
  ('Collahuasi',        'Tarapacá',     'TENENCIA',  70, 'MEDIA',  0, 0, 0, 1, 1, -20.9800, -68.7000),
  ('Ollagüe',           'Antofagasta',  'COMISARÍA', 80, 'ALTA',   1, 0, 1, 1, 1, -21.2224, -68.2505),
  ('Socaire',           'Antofagasta',  'TENENCIA',  75, 'MEDIA',  0, 0, 0, 1, 1, -23.5900, -67.9000),
  ('San Pedro de Atacama','Antofagasta','COMISARÍA', 75, 'ALTA',   1, 1, 1, 1, 2, -22.9076, -68.1997),
  ('Paso Jama',         'Antofagasta',  'TENENCIA',  85, 'ALTA',   0, 0, 0, 1, 1, -22.9800, -67.0500),
  ('Paso Sico',         'Antofagasta',  'TENENCIA',  80, 'ALTA',   0, 0, 0, 1, 1, -23.7100, -67.1300),
  ('Copiapó Frontera',  'Atacama',      'TENENCIA',  55, 'MEDIA',  0, 0, 0, 1, 1, -27.3667, -69.5000),
  ('Paso San Francisco','Atacama',      'TENENCIA',  60, 'MEDIA',  0, 0, 0, 1, 1, -26.8500, -68.2800),
  ('Paso Agua Negra',   'Coquimbo',     'TENENCIA',  60, 'MEDIA',  0, 0, 0, 1, 1, -30.2600, -69.9000),
  ('Pircas Negras',     'Atacama',      'TENENCIA',  65, 'MEDIA',  0, 0, 0, 1, 1, -28.0000, -68.8000),
  ('Los Andes Frontera','Valparaíso',   'COMISARÍA', 55, 'MEDIA',  1, 0, 1, 1, 2, -32.8333, -70.6000),
  ('Paso Los Libertadores','Valparaíso','TENENCIA',  70, 'ALTA',   0, 0, 0, 1, 2, -32.8300, -70.0800),
  ('Paso Maule',        'Maule',        'TENENCIA',  50, 'BAJA',   0, 0, 0, 1, 1, -35.7000, -70.5000),
  ('Paso Pehuenche',    'Maule',        'TENENCIA',  55, 'MEDIA',  0, 0, 0, 1, 1, -35.8500, -70.4000),
  ('Paso Icalma',       'La Araucanía', 'TENENCIA',  50, 'BAJA',   0, 0, 0, 1, 1, -38.7000, -71.1500),
  ('Paso Pino Hachado', 'La Araucanía', 'COMISARÍA', 55, 'MEDIA',  1, 0, 1, 1, 1, -38.6600, -70.9000),
  ('Paso Mamuil Malal', 'La Araucanía', 'TENENCIA',  55, 'MEDIA',  0, 0, 0, 1, 1, -39.5300, -71.4000),
  ('Paso Carirriñe',    'Los Ríos',     'TENENCIA',  50, 'BAJA',   0, 0, 0, 1, 1, -40.1000, -71.7200),
  ('Paso Huahum',       'Los Ríos',     'TENENCIA',  50, 'BAJA',   0, 0, 0, 1, 1, -39.9800, -71.7700),
  ('Paso Samoré',       'Los Lagos',    'COMISARÍA', 55, 'MEDIA',  1, 0, 1, 1, 2, -40.7100, -71.7800),
  ('Paso Futaleufú',    'Los Lagos',    'COMISARÍA', 55, 'MEDIA',  1, 0, 1, 1, 1, -43.1900, -71.8500),
  ('Paso Río Encuentro','Los Lagos',    'TENENCIA',  50, 'BAJA',   0, 0, 0, 1, 1, -43.6500, -71.8000),
  ('Coyhaique Frontera','Aysén',        'COMISARÍA', 60, 'MEDIA',  1, 1, 1, 1, 2, -45.5714, -72.0670),
  ('Paso Coyhaique Alto','Aysén',       'TENENCIA',  65, 'MEDIA',  0, 0, 0, 1, 1, -45.5000, -71.6500),
  ('Paso Huemules',     'Aysén',        'TENENCIA',  60, 'MEDIA',  0, 0, 0, 1, 1, -46.5000, -72.1000),
  ('Paso Roballos',     'Aysén',        'TENENCIA',  60, 'MEDIA',  0, 0, 0, 1, 1, -47.2000, -72.3000),
  ('Cochrane Frontera', 'Aysén',        'TENENCIA',  65, 'MEDIA',  0, 0, 0, 1, 1, -47.2500, -72.5700),
  ('Paso Mayer',        'Aysén',        'TENENCIA',  65, 'ALTA',   0, 0, 0, 1, 1, -48.3000, -72.3000),
  ('Punta Arenas Frontera','Magallanes','COMISARÍA', 70, 'ALTA',   1, 1, 1, 1, 2, -53.1638, -70.9171),
  ('Paso Dorotea',      'Magallanes',   'TENENCIA',  70, 'ALTA',   0, 0, 0, 1, 1, -51.8000, -72.4000),
  ('Paso Casas Viejas', 'Magallanes',   'TENENCIA',  75, 'ALTA',   0, 0, 0, 1, 1, -52.5000, -71.9000);
