// ═══════════════════════════════════════════════════════════════
// SIGDOF · Configuración y Utilidades Globales
// ═══════════════════════════════════════════════════════════════

const SUPABASE_URL  = 'https://iblzxodbotmdnpzcgdey.supabase.co';
const SUPABASE_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlibHp4b2Rib3RtZG5wemNnZGV5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxODExNTYsImV4cCI6MjA4Nzc1NzE1Nn0.IiQSxOeCMiu8Ur4vG1H_s94QHItBbYP1vGrnW_bM2ls';

// Cliente Supabase global
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ── CONSTANTES INSTITUCIONALES ──────────────────────────────────
const GRADOS = ['SUBTENIENTE','TENIENTE','CAPITAN','MAYOR','TENIENTE_CORONEL','CORONEL'];
const GRADOS_LABEL = {
  SUBTENIENTE:'Subteniente', TENIENTE:'Teniente', CAPITAN:'Capitán',
  MAYOR:'Mayor', TENIENTE_CORONEL:'Teniente Coronel', CORONEL:'Coronel'
};
const CARGOS_LABEL = {
  COMISARIO:'Comisario', SUBCOM_SERV:'Subcomisario de Servicios',
  SUBCOM_ADM:'Subcomisario Administrativo', JEFE_TEN:'Jefe de Tenencia',
  OF_OP:'Oficial Operativo'
};
const MOTIVOS_LABEL = {
  ROTACION:'Rotación normal', PERFECCIONAMIENTO:'Perfeccionamiento',
  ASCENSO_SIN_CARGO:'Ascenso sin cargo disponible', MEDICO:'Razones médicas',
  FAMILIAR:'Razones familiares/humanitarias', DISCIPLINARIO:'Razones disciplinarias',
  SOLICITUD_PROPIA:'Solicitud propia', NECESIDAD_INST:'Necesidad institucional'
};

// Años mínimos en grado para ascender
const ANIOS_MIN_ASCENSO = {
  SUBTENIENTE:3, TENIENTE:7, CAPITAN:8, MAYOR:3, TENIENTE_CORONEL:3
};

// Cargos compatibles por grado
const CARGOS_POR_GRADO = {
  SUBTENIENTE: ['JEFE_TEN','OF_OP'],
  TENIENTE:    ['SUBCOM_ADM','JEFE_TEN','OF_OP'],
  CAPITAN:     ['SUBCOM_SERV','SUBCOM_ADM'],
  MAYOR:       ['COMISARIO'],
  TENIENTE_CORONEL: ['COMISARIO'],
  CORONEL:     ['COMISARIO']
};

// Grados válidos por cargo
const GRADOS_POR_CARGO = {
  COMISARIO:    ['MAYOR','TENIENTE_CORONEL','CORONEL'],
  SUBCOM_SERV:  ['CAPITAN'],
  SUBCOM_ADM:   ['TENIENTE','CAPITAN'],
  JEFE_TEN:     ['SUBTENIENTE','TENIENTE'],
  OF_OP:        ['SUBTENIENTE','TENIENTE']
};

// Grado siguiente
const GRADO_SIGUIENTE = {
  SUBTENIENTE:'TENIENTE', TENIENTE:'CAPITAN', CAPITAN:'MAYOR',
  MAYOR:'TENIENTE_CORONEL', TENIENTE_CORONEL:'CORONEL'
};

// ── UTILIDADES DE FECHA ─────────────────────────────────────────
const Utils = {
  hoy() { return new Date(); },

  fechaStr(date) {
    if (!date) return '—';
    const d = new Date(date);
    return d.toLocaleDateString('es-CL', { day:'2-digit', month:'2-digit', year:'numeric' });
  },

  aniosMeses(fechaInicio) {
    if (!fechaInicio) return { anios:0, meses:0, texto:'—' };
    const inicio = new Date(fechaInicio);
    const hoy    = new Date();
    let anios = hoy.getFullYear() - inicio.getFullYear();
    let meses = hoy.getMonth() - inicio.getMonth();
    if (meses < 0) { anios--; meses += 12; }
    return {
      anios, meses,
      texto: anios > 0
        ? `${anios} año${anios!==1?'s':''} ${meses} mes${meses!==1?'es':''}`
        : `${meses} mes${meses!==1?'es':''}`
    };
  },

  // Retorna años decimales entre dos fechas
  aniosDecimal(fechaInicio, fechaFin = null) {
    const inicio = new Date(fechaInicio);
    const fin    = fechaFin ? new Date(fechaFin) : new Date();
    return (fin - inicio) / (365.25 * 24 * 3600 * 1000);
  },

  // Fecha estimada de ascenso
  fechaAscensoEstimada(grado, fechaAscensoGrado) {
    const min = ANIOS_MIN_ASCENSO[grado];
    if (!min) return null;
    const fecha = new Date(fechaAscensoGrado);
    fecha.setFullYear(fecha.getFullYear() + min);
    return fecha;
  },

  // Años restantes hasta ascenso
  aniosHastaAscenso(grado, fechaAscensoGrado) {
    const fechaAsc = this.fechaAscensoEstimada(grado, fechaAscensoGrado);
    if (!fechaAsc) return 99;
    const diff = this.aniosDecimal(new Date(), fechaAsc);
    return diff < 0 ? 0 : diff;
  },

  // Regla de rotación según zona de tratamiento
  aniosRotacion(zonaTratPct) {
    if (zonaTratPct >= 60) return 4;
    if (zonaTratPct <= 55) return 6;
    return 5; // zona intermedia
  },

  // Tiempo restante en cuartel antes de rotación
  aniosRestantesRotacion(fechaIngreso, zonaTratPct) {
    const limite = this.aniosRotacion(zonaTratPct);
    const acumulado = this.aniosDecimal(fechaIngreso);
    return Math.max(0, limite - acumulado);
  },

  // ÍNDICE CLAVE: permanencia proyectada en el cargo
  permanenciaProyectada(oficial, cargo, cuartel) {
    const aniosHastaAsc = this.aniosHastaAscenso(oficial.grado, oficial.fecha_ascenso_grado);
    const aniosHastaRot = cuartel.fecha_ingreso_cuartel
      ? this.aniosRestantesRotacion(cuartel.fecha_ingreso_cuartel, cuartel.zona_trat_pct)
      : this.aniosRotacion(cuartel.zona_trat_pct);

    // Si el grado siguiente aún es compatible con el cargo, el ascenso no lo saca
    const gradoSig = GRADO_SIGUIENTE[oficial.grado];
    const ascensoCompatible = gradoSig && GRADOS_POR_CARGO[cargo]?.includes(gradoSig);

    const limitePorAscenso = ascensoCompatible ? 99 : aniosHastaAsc;
    return Math.min(aniosHastaRot, limitePorAscenso);
  },

  // Validar compatibilidad oficial → cargo → cuartel
  validarAsignacion(oficial, cargo, cuartel) {
    const errores = [];
    const advertencias = [];

    // 1. Grado compatible con cargo
    const gradosValidos = GRADOS_POR_CARGO[cargo] || [];
    if (!gradosValidos.includes(oficial.grado)) {
      errores.push(`Grado ${GRADOS_LABEL[oficial.grado]} no es válido para ${CARGOS_LABEL[cargo]}. Se requiere: ${gradosValidos.map(g=>GRADOS_LABEL[g]).join(' o ')}.`);
    }

    // 2. Comisaría solo Mayor
    if (cargo === 'COMISARIO' && cuartel.tipo_comisaria === 'SOLO_MAYOR' && oficial.grado !== 'MAYOR') {
      errores.push(`Esta comisaría solo admite Mayor como Comisario.`);
    }

    // 3. Especialidad
    if (!oficial.especialidad_mof) {
      errores.push(`El oficial no posee la especialidad "Montaña o Frontera".`);
    }

    // 4. Proyección ascenso vs cargo
    const aniosHastaAsc = this.aniosHastaAscenso(oficial.grado, oficial.fecha_ascenso_grado);
    const gradoSig = GRADO_SIGUIENTE[oficial.grado];
    if (gradoSig && !GRADOS_POR_CARGO[cargo]?.includes(gradoSig) && aniosHastaAsc < 2) {
      advertencias.push(`El oficial proyecta ascender a ${GRADOS_LABEL[gradoSig]} en menos de 2 años y ese grado no es compatible con este cargo.`);
    }

    // 5. Permanencia
    const permanencia = this.permanenciaProyectada(oficial, cargo, cuartel);
    if (permanencia < 1) {
      advertencias.push(`Permanencia proyectada menor a 1 año. Se recomienda buscar candidato con mayor proyección en el cargo.`);
    }

    return { valido: errores.length === 0, errores, advertencias, permanencia };
  },

  // Generar justificación automática
  generarJustificacion(oficial, cargo, cuartel, tipo) {
    const tiempoEnCargo = oficial.fecha_ingreso_cuartel
      ? this.aniosMeses(oficial.fecha_ingreso_cuartel).texto : 'sin registro';
    const aniosAsc = this.aniosHastaAscenso(oficial.grado, oficial.fecha_ascenso_grado);
    const aniosAscFmt = aniosAsc > 90 ? 'sin ascenso proyectado próximo' : `${aniosAsc.toFixed(1)} años`;
    const permanencia = this.permanenciaProyectada(oficial, cargo, cuartel);
    const gradoSig = GRADO_SIGUIENTE[oficial.grado];
    const esp = oficial.especialidad_mof
      ? `Especialidad Montaña o Frontera vigente (egreso Grupo de Montaña ${oficial.anio_egreso_grupo_montana || 'sin registro'}).`
      : 'SIN especialidad Montaña o Frontera. Cobertura temporal.';
    const rotRegla = this.aniosRotacion(cuartel.zona_trat_pct);

    if (tipo === 'SE_MANTIENE') {
      return `${GRADOS_LABEL[oficial.grado]} ${oficial.nombre} — SE MANTIENE en ${CARGOS_LABEL[cargo]}, ${cuartel.nombre}. Lleva ${tiempoEnCargo} en el cargo. Proyección de ascenso a ${GRADOS_LABEL[gradoSig] || 'grado máximo'}: ${aniosAscFmt}. Zona de tratamiento ${cuartel.zona_trat_pct}%: rotación obligatoria a los ${rotRegla} años. Permanencia restante proyectada: ${permanencia.toFixed(1)} año(s). ${esp} Se recomienda mantener para preservar continuidad operativa y maximizar aprovechamiento del período en el cargo.`;
    } else {
      return `${GRADOS_LABEL[oficial.grado]} ${oficial.nombre} — SE TRASLADA a ${CARGOS_LABEL[cargo]}, ${cuartel.nombre}. Permanencia proyectada en destino: ${permanencia.toFixed(1)} año(s). Proyección de ascenso a ${GRADOS_LABEL[gradoSig] || 'grado máximo'}: ${aniosAscFmt}. Cuartel destino criticidad ${cuartel.criticidad}. ${esp}`;
    }
  },

  mesActual() { return new Date().getMonth() + 1; }, // 1-12

  colorCriticidad(c) {
    return c==='ALTA' ? 'rojo' : c==='MEDIA' ? 'amarillo' : 'verde';
  },

  colorZona(pct) {
    if (pct >= 80) return '#C62828';
    if (pct >= 60) return '#F9A825';
    return '#4CAF50';
  }
};

// ── TOAST ───────────────────────────────────────────────────────
function toast(msg, tipo='ok') {
  const cont = document.getElementById('toast-container');
  if (!cont) return;
  const t = document.createElement('div');
  t.className = `toast${tipo==='error'?' error':tipo==='warning'?' warning':''}`;
  t.innerHTML = `<span>${tipo==='ok'?'✅':tipo==='error'?'❌':'⚠️'}</span> ${msg}`;
  cont.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}

// ── MODAL ────────────────────────────────────────────────────────
function abrirModal(id) { document.getElementById(id)?.classList.add('open'); }
function cerrarModal(id) { document.getElementById(id)?.classList.remove('open'); }
document.addEventListener('click', e => {
  if (e.target.classList.contains('modal-overlay')) e.target.classList.remove('open');
});

// ── NAVEGACION ──────────────────────────────────────────────────
function navegarA(pageId) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const page = document.getElementById('page-' + pageId);
  if (page) page.classList.add('active');
  const navItem = document.querySelector(`[data-page="${pageId}"]`);
  if (navItem) navItem.classList.add('active');
  const topTitle = document.getElementById('topbar-title');
  if (topTitle && navItem) topTitle.textContent = navItem.querySelector('.nav-label')?.textContent || 'SIGDOF';
  // Disparar evento de carga de página
  document.dispatchEvent(new CustomEvent('pageChanged', { detail: { page: pageId } }));
}

// ── GRADO HTML ───────────────────────────────────────────────────
function badgeGrado(grado) {
  const cls = 'grado-' + grado.toLowerCase().replace('_','-');
  return `<span class="grado-badge ${cls}">${GRADOS_LABEL[grado]||grado}</span>`;
}

function semaforo(nivel, texto) {
  return `<span class="semaforo semaforo-${nivel}"><span class="semaforo-dot"></span>${texto}</span>`;
}

// ── TABS ─────────────────────────────────────────────────────────
function initTabs(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      container.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      const panel = container.querySelector('#' + btn.dataset.tab);
      if (panel) panel.classList.add('active');
    });
  });
}

// ── FECHA ACTUAL ─────────────────────────────────────────────────
function actualizarFecha() {
  const el = document.getElementById('topbar-fecha');
  if (el) {
    el.textContent = new Date().toLocaleDateString('es-CL', {
      weekday:'long', day:'numeric', month:'long', year:'numeric'
    });
  }
}
