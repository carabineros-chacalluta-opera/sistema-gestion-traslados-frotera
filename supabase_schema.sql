-- ═══════════════════════════════════════════════════════════════
-- SIGDOF · Schema SQL para Supabase
-- Ejecutar en el SQL Editor de tu proyecto Supabase
-- ═══════════════════════════════════════════════════════════════

-- ── CUARTELES ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cuarteles (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  numero          INTEGER,
  nombre          TEXT NOT NULL,
  region          TEXT NOT NULL,
  tipo            TEXT CHECK (tipo IN ('COM','SUBCOM','TCIA','RET')),
  zona_trat_pct   INTEGER DEFAULT 0,
  tipo_comisaria  TEXT CHECK (tipo_comisaria IN ('SOLO_MAYOR','MAYOR_TCOL')) DEFAULT 'MAYOR_TCOL',
  criticidad      TEXT CHECK (criticidad IN ('ALTA','MEDIA','BAJA')) DEFAULT 'MEDIA',
  dot_comisario   INTEGER DEFAULT 0,
  dot_subcom_serv INTEGER DEFAULT 0,
  dot_subcom_adm  INTEGER DEFAULT 0,
  dot_jefe_ten    INTEGER DEFAULT 0,
  dot_of_op       INTEGER DEFAULT 0,
  latitud         DECIMAL(10,7),
  longitud        DECIMAL(10,7),
  activo          BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── OFICIALES ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS oficiales (
  id                        UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre                    TEXT NOT NULL,
  rut                       TEXT,
  grado                     TEXT CHECK (grado IN ('SUBTENIENTE','TENIENTE','CAPITAN','MAYOR','TENIENTE_CORONEL','CORONEL')) NOT NULL,
  fecha_ascenso_grado       DATE NOT NULL,
  especialidad_mof          BOOLEAN DEFAULT false,
  anio_egreso_grupo_montana INTEGER,
  estado_especialidad       TEXT CHECK (estado_especialidad IN ('VIGENTE','SUSPENDIDA','PERDIDA')) DEFAULT 'VIGENTE',
  motivo_perdida_esp        TEXT,
  cuartel_id                UUID REFERENCES cuarteles(id),
  cargo_actual              TEXT CHECK (cargo_actual IN ('COMISARIO','SUBCOM_SERV','SUBCOM_ADM','JEFE_TEN','OF_OP')),
  fecha_ingreso_cuartel     DATE,
  estado                    TEXT CHECK (estado IN ('ACTIVO','PERFECCIONAMIENTO','RETIRADO','BAJA')) DEFAULT 'ACTIVO',
  motivo_fuera_frontera     TEXT CHECK (motivo_fuera_frontera IN ('ROTACION','PERFECCIONAMIENTO','ASCENSO_SIN_CARGO','MEDICO','FAMILIAR','DISCIPLINARIO','SOLICITUD_PROPIA','NECESIDAD_INST')),
  puede_volver              TEXT CHECK (puede_volver IN ('SI','CONDICIONAL','NO')) DEFAULT 'SI',
  fecha_disponibilidad      DATE,
  acipol_inicio             DATE,
  acipol_retorno            DATE,
  retiro_estimado           DATE,
  formacion                 JSONB DEFAULT '[]',
  observaciones             TEXT,
  created_at                TIMESTAMPTZ DEFAULT NOW(),
  updated_at                TIMESTAMPTZ DEFAULT NOW()
);

-- ── PLANES DE TRASLADO ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS planes_traslado (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  anio          INTEGER NOT NULL,
  fecha_ejec    DATE,
  estado        TEXT CHECK (estado IN ('BORRADOR','EJECUTADO')) DEFAULT 'BORRADOR',
  resumen       TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── MOVIMIENTOS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS movimientos (
  id                      UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id                 UUID REFERENCES planes_traslado(id) ON DELETE CASCADE,
  oficial_id              UUID REFERENCES oficiales(id),
  tipo                    TEXT CHECK (tipo IN ('SE_MUEVE','SE_MANTIENE')) NOT NULL,
  cuartel_origen_id       UUID REFERENCES cuarteles(id),
  cuartel_destino_id      UUID REFERENCES cuarteles(id),
  cargo_destino           TEXT,
  justificacion           TEXT,
  es_excepcion            BOOLEAN DEFAULT false,
  justif_excepcion        TEXT,
  permanencia_proyectada  DECIMAL(4,1),
  created_at              TIMESTAMPTZ DEFAULT NOW()
);

-- ── GRUPO MONTAÑA EN FORMACION ─────────────────────────────────
CREATE TABLE IF NOT EXISTS grupo_montana_formacion (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  oficial_id   UUID REFERENCES oficiales(id),
  anio_ingreso INTEGER NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ── INDEXES ────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_oficiales_cuartel    ON oficiales(cuartel_id);
CREATE INDEX IF NOT EXISTS idx_oficiales_estado     ON oficiales(estado);
CREATE INDEX IF NOT EXISTS idx_oficiales_grado      ON oficiales(grado);
CREATE INDEX IF NOT EXISTS idx_oficiales_mof        ON oficiales(especialidad_mof);
CREATE INDEX IF NOT EXISTS idx_movimientos_plan     ON movimientos(plan_id);
CREATE INDEX IF NOT EXISTS idx_movimientos_oficial  ON movimientos(oficial_id);

-- ── ROW LEVEL SECURITY (opcional, para uso personal desactivar) ─
ALTER TABLE cuarteles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE oficiales            ENABLE ROW LEVEL SECURITY;
ALTER TABLE planes_traslado      ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimientos          ENABLE ROW LEVEL SECURITY;
ALTER TABLE grupo_montana_formacion ENABLE ROW LEVEL SECURITY;

-- Políticas abiertas (uso personal sin auth):
CREATE POLICY "allow_all_cuarteles"    ON cuarteles            FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_oficiales"    ON oficiales            FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_planes"       ON planes_traslado      FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_movimientos"  ON movimientos          FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_grupo"        ON grupo_montana_formacion FOR ALL USING (true) WITH CHECK (true);

-- ── DATOS INICIALES: CUARTELES ─────────────────────────────────
INSERT INTO cuarteles (numero,nombre,region,tipo,zona_trat_pct,criticidad,dot_comisario,dot_subcom_serv,dot_subcom_adm,dot_jefe_ten,dot_of_op,latitud,longitud) VALUES
(1,  '4TA. COM. CHACALLUTA',          'Arica y Parinacota','COM',  85,'ALTA',  1,1,1,0,3,-18.3422,-70.0580),
(9,  'TCIA. CHUNGARA',                'Arica y Parinacota','TCIA', 85,'ALTA',  0,0,0,1,0,-18.2767,-69.1478),
(10, 'TCIA. VISVIRI',                 'Arica y Parinacota','TCIA', 85,'ALTA',  0,0,0,1,0,-17.5972,-69.4944),
(12, 'SUBCOM. COLCHANE',              'Tarapacá',          'SUBCOM',85,'ALTA', 1,1,1,0,3,-19.2833,-68.6333),
(14, 'TCIA. UJINA',                   'Tarapacá',          'TCIA', 85,'MEDIA', 0,0,0,1,0,-19.4167,-68.5500),
(15, '2DA. COM. SAN PEDRO DE ATACAMA','Antofagasta',       'COM',  75,'MEDIA', 1,1,1,0,3,-22.9083,-68.1997),
(24, '4TA. COM. EL SALVADOR',         'Atacama',           'COM',  65,'MEDIA', 1,1,1,0,2,-26.2564,-69.6447),
(35, 'TCIA. JUNTAS DEL TORO',         'Coquimbo',          'TCIA', 65,'BAJA',  0,0,0,1,0,-31.8500,-70.5833),
(36, '6TA. COM. ISLA DE PASCUA',      'Valparaíso',        'COM',  75,'MEDIA', 1,1,1,0,3,-27.1127,-109.3497),
(38, 'SUBCOM. LOS LIBERTADORES',      'Valparaíso',        'SUBCOM',65,'MEDIA',0,0,1,1,0,-32.8547,-70.1228),
(43, 'SUBCOM. SAN JOSE DE MAIPO',     'Metropolitana',     'SUBCOM',55,'BAJA', 0,0,1,1,0,-33.6433,-70.3567),
(44, 'TCIA. SAN GABRIEL',             'Metropolitana',     'TCIA', 55,'BAJA',  0,0,0,1,0,-33.7833,-70.2500),
(53, 'SUBCOM. SAN FABIAN',            'Ñuble',             'SUBCOM',55,'BAJA', 0,0,1,1,0,-36.5667,-71.5333),
(61, 'SUBCOM. LONQUIMAY',             'La Araucanía',      'SUBCOM',65,'MEDIA',0,0,1,1,0,-38.4333,-71.2333),
(62, 'TCIA. CURARREHUE',              'La Araucanía',      'TCIA', 65,'MEDIA', 0,0,0,1,0,-39.3667,-71.5667),
(63, 'TCIA. LIUCURA',                 'La Araucanía',      'TCIA', 65,'BAJA',  0,0,0,1,0,-39.2500,-71.6833),
(68, 'TCIA. PIRIHUEICO',              'La Araucanía',      'TCIA', 65,'MEDIA', 0,0,0,1,0,-39.9167,-71.8333),
(69, '3RA. COM. FUTALEUFU',           'Los Lagos',         'COM',  75,'ALTA',  1,1,1,0,3,-43.1833,-71.8667),
(70, '4TA. COM. CHAITEN',             'Los Lagos',         'COM',  75,'MEDIA', 1,1,1,0,3,-42.9167,-72.7167),
(71, '5TA. COM. PALENA',              'Los Lagos',         'COM',  75,'MEDIA', 1,1,1,0,3,-43.6167,-71.8167),
(77, 'TCIA. EL LIMITE',               'Los Lagos',         'TCIA', 75,'MEDIA', 0,0,0,1,0,-41.8333,-72.1667),
(79, 'TCIA. PAJARITOS',               'Los Lagos',         'TCIA', 75,'BAJA',  0,0,0,1,0,-41.5167,-72.2833),
(81, 'TCIA. CASA PANGUE',             'Los Lagos',         'TCIA', 75,'BAJA',  0,0,0,1,0,-41.9667,-72.0833),
(82, '3RA. COM. CHILE CHICO',         'Aysén',             'COM',  85,'ALTA',  1,1,1,0,3,-46.5333,-71.7333),
(83, '4TA. COM. COCHRANE',            'Aysén',             'COM',  85,'ALTA',  1,1,1,0,3,-47.2500,-72.5667),
(90, 'SUBCOM. BALMACEDA',             'Aysén',             'SUBCOM',75,'MEDIA',0,0,1,1,0,-45.9167,-71.6833),
(91, 'SUBCOM. VILLA O''HIGGINS',      'Aysén',             'SUBCOM',85,'ALTA', 0,0,1,1,0,-48.4667,-72.5667),
(93, 'TCIA. PUERTO ING. IBAÑEZ',      'Aysén',             'TCIA', 75,'MEDIA', 0,0,0,1,0,-46.2833,-72.0833),
(94, 'TCIA. RIO MAYER',               'Aysén',             'TCIA', 85,'ALTA',  0,0,0,1,0,-48.0167,-72.3333),
(95, 'TCIA. TTE. HERNAN MERINO C.',   'Magallanes',        'TCIA', 85,'MEDIA', 0,0,0,1,0,-51.7333,-72.5000),
(97, '4TA. COM. PUERTO WILLIAMS',     'Magallanes',        'COM',  85,'ALTA',  1,1,1,0,3,-54.9333,-67.6167),
(105,'SUBCOM. CASAS VIEJAS',          'Magallanes',        'SUBCOM',85,'MEDIA',0,0,1,1,0,-52.3333,-71.6167),
(106,'TCIA. MONTE AYMOND',            'Magallanes',        'TCIA', 75,'MEDIA', 0,0,0,1,0,-52.0167,-69.6333),
(107,'TCIA. SAN SEBASTIAN',           'Magallanes',        'TCIA', 85,'MEDIA', 0,0,0,1,0,-53.3167,-68.7333),
(108,'TCIA. YENDEGAIA',               'Magallanes',        'TCIA', 85,'ALTA',  0,0,0,1,0,-54.8833,-68.8167)
ON CONFLICT DO NOTHING;
