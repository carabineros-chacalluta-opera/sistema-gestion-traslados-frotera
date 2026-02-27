# SIGDOF — Sistema de Gestión de Dotación Fronteriza
## Carabineros de Chile

---

## 🚀 Instrucciones de Instalación

### Paso 1 — Configurar Supabase

1. Abre tu proyecto en [supabase.co](https://supabase.co)
2. Ve a **SQL Editor**
3. Copia y pega el contenido de `supabase_schema.sql`
4. Haz clic en **Run** — esto crea todas las tablas y carga los 35 cuarteles

### Paso 2 — Subir a GitHub

```bash
# En tu terminal:
cd sigdof
git init
git add .
git commit -m "SIGDOF v1.0 - Sistema de Gestión de Dotación Fronteriza"
git remote add origin https://github.com/TU-USUARIO/sigdof.git
git push -u origin main
```

### Paso 3 — Activar GitHub Pages

1. En tu repositorio GitHub, ve a **Settings → Pages**
2. Source: **Deploy from a branch**
3. Branch: **main** / **/ (root)**
4. Guarda → en unos minutos tendrás la URL pública

---

## 📁 Estructura del Proyecto

```
sigdof/
├── index.html              ← Aplicación completa
├── css/
│   └── main.css            ← Estilos (paleta Carabineros)
├── js/
│   ├── utils.js            ← Motor de reglas y cálculos
│   ├── dashboard.js        ← Dashboard + alertas automáticas
│   ├── mapa.js             ← Mapa Leaflet interactivo
│   ├── cuarteles.js        ← CRUD cuarteles
│   ├── oficiales.js        ← CRUD oficiales
│   ├── simulador.js        ← Simulador de traslados
│   └── planes.js           ← Planes de traslado + PDF
├── assets/
│   └── escudo.png          ← Logo Carabineros (agregar manualmente)
└── supabase_schema.sql     ← Schema de base de datos
```

---

## 🗄️ Base de Datos (Supabase)

### Tablas creadas automáticamente:
| Tabla | Descripción |
|---|---|
| `cuarteles` | 35 cuarteles fronterizos con dotación óptima |
| `oficiales` | Registro de oficiales (activos, bolsa, retirados) |
| `planes_traslado` | Planes anuales de traslado |
| `movimientos` | Movimientos dentro de cada plan |
| `grupo_montana_formacion` | Oficiales en formación |

---

## ⚙️ Módulos del Sistema

### 1. Dashboard
- Métricas en tiempo real
- Mapa interactivo de Chile con estado de cada cuartel
- Panel de alertas (🔴 Críticas / 🟡 Preventivas / 🟢 Informativas)
- Calendario operativo anual
- Gráficos de cobertura

### 2. Cuarteles
- Listado completo con estado de cobertura
- Ficha detallada con oficiales asignados
- Crear/editar cuarteles
- Criticidad operativa manual (Alta/Media/Baja)

### 3. Oficiales
- Registro completo con formación académica
- Cálculo automático de tiempo en grado y en cuartel
- Proyección de ascenso basada en tabla institucional
- Gestión de baja (genera vacante automáticamente)

### 4. Bolsa de Especialistas
- Especialistas "Montaña o Frontera" fuera de cuarteles fronterizos
- Registro de motivo de salida y disponibilidad de retorno

### 5. Simulador de Traslados
- Validación automática cargo-grado-especialidad
- Índice de Permanencia Proyectada
- Justificación automática editable
- Excepción operativa con justificación obligatoria

### 6. Planes de Traslado
- Plan anual con registro de cada decisión
- Justificación por oficial (SE MUEVE / SE MANTIENE)
- Exportación a PDF con formato institucional

### 7. Fiscalizador
- Vista analítica de solo lectura
- Gráficos de cobertura por región
- Estado detallado por cuartel

---

## 📐 Reglas Institucionales Implementadas

| Regla | Lógica |
|---|---|
| Rotación 4 años | Zona de tratamiento ≥ 60% |
| Rotación 6 años | Zona de tratamiento ≤ 55% |
| Comisario | Mayor, Teniente Coronel (según tipo de comisaría) |
| Subcomisario de Servicios | Capitán |
| Subcomisario Administrativo | Teniente, Capitán |
| Jefe de Tenencia | Subteniente, Teniente |
| Oficial Operativo | Subteniente, Teniente |
| Ascenso Subteniente | 3 años mínimo en grado |
| Ascenso Teniente | 7 años mínimo en grado |
| Ascenso Capitán | 8 años mínimo en grado |
| Ascenso Mayor | 3 años mínimo en grado |
| Ascenso Teniente Coronel | 3 años mínimo en grado |
| Especialidad | "Montaña o Frontera" — egreso Grupo de Montaña |

---

## 🔧 Personalización

### Agregar el escudo de Carabineros:
- Guarda el escudo como `assets/escudo.png`
- Reemplaza el archivo con la imagen oficial institucional

### Cambiar colores:
- Editar variables en `css/main.css` bajo `:root { ... }`

---

## 📞 Tecnologías Utilizadas

- **Frontend**: HTML5 + CSS3 + JavaScript vanilla
- **Base de datos**: Supabase (PostgreSQL)
- **Mapa**: Leaflet.js
- **Gráficos**: Chart.js
- **PDF**: jsPDF
- **Hosting**: GitHub Pages (gratuito)
