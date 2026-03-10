// ═══════════════════════════════════════════════════════════════
// SIGDOF · Dashboard y Motor de Alertas
// ═══════════════════════════════════════════════════════════════

const Dashboard = {
  cuarteles: [], oficiales: [], alertas: [],

  async cargar() {
    const [{ data: cuarteles }, { data: oficiales }] = await Promise.all([
      sb.from('cuarteles').select('*').eq('activo', true).order('region'),
      sb.from('oficiales').select('*, cuarteles(*)').in('estado', ['ACTIVO','PERFECCIONAMIENTO'])
    ]);
    this.cuarteles = cuarteles || [];
    this.oficiales = oficiales || [];
    this.renderStats();
    this.generarAlertas();
    this.renderCalendario();
    this.renderAlertas();
    if (window.Mapa) Mapa.renderizar(this.cuarteles, this.oficiales);
    if (window.Charts) Charts.renderDashboard(this.cuarteles, this.oficiales);
  },

  renderStats() {
    const ofFrontera    = this.oficiales.filter(o => o.cuartel_id && o.estado === 'ACTIVO');
    const especialistas = this.oficiales.filter(o => o.especialidad_mof);
    const enFrontera    = especialistas.filter(o => o.cuartel_id && o.estado === 'ACTIVO');

    // CORRECCIÓN #4: excluir BAJA y RETIRADO del conteo de bolsa
    const fueraDeFrontera = especialistas.filter(o =>
      (!o.cuartel_id || o.estado !== 'ACTIVO') &&
      !['BAJA', 'RETIRADO'].includes(o.estado)
    );

    const vacantes = this.calcularVacantes();

    const stats = [
      { id: 'stat-cuarteles',     val: this.cuarteles.length },
      { id: 'stat-en-frontera',   val: ofFrontera.length },
      { id: 'stat-especialistas', val: enFrontera.length },
      { id: 'stat-bolsa',         val: fueraDeFrontera.length },
      { id: 'stat-vacantes',      val: vacantes },
    ];
    stats.forEach(s => {
      const el = document.getElementById(s.id);
      if (el) this.animarNumero(el, s.val);
    });
  },

  // CORRECCIÓN #10: animarNumero maneja target = 0 correctamente
  animarNumero(el, target) {
    if (target === 0) { el.textContent = 0; return; }
    let current = 0;
    const step = Math.max(1, Math.floor(target / 20));
    const timer = setInterval(() => {
      current = Math.min(current + step, target);
      el.textContent = current;
      if (current >= target) clearInterval(timer);
    }, 40);
  },

  calcularVacantes() {
    let total = 0;
    this.cuarteles.forEach(c => {
      const asignados = this.oficiales.filter(o => o.cuartel_id === c.id && o.estado === 'ACTIVO');
      const optimo = (c.dot_comisario||0)+(c.dot_subcom_serv||0)+(c.dot_subcom_adm||0)+(c.dot_jefe_ten||0)+(c.dot_of_op||0);
      total += Math.max(0, optimo - asignados.length);
    });
    return total;
  },

  generarAlertas() {
    this.alertas = [];
    const hoy = new Date();

    this.cuarteles.forEach(c => {
      const asignados = this.oficiales.filter(o => o.cuartel_id === c.id && o.estado === 'ACTIVO');
      const especialistasEnCuartel = asignados.filter(o => o.especialidad_mof);
      const optimo = (c.dot_comisario||0)+(c.dot_subcom_serv||0)+(c.dot_subcom_adm||0)+(c.dot_jefe_ten||0)+(c.dot_of_op||0);
      const deficit = Math.max(0, optimo - asignados.length);

      if (deficit > 0 && c.criticidad === 'ALTA') {
        this.alertas.push({ nivel:'critica', cuartel: c.nombre, msg:`${deficit} cargo(s) vacante(s) sin cobertura. Criticidad ALTA.`, icon:'🔴' });
      }

      if (especialistasEnCuartel.length === 0 && asignados.length > 0) {
        this.alertas.push({
          nivel: c.criticidad === 'ALTA' ? 'critica' : 'preventiva',
          cuartel: c.nombre,
          msg: `Sin ningún especialista "Montaña o Frontera" en dotación activa.`,
          icon: c.criticidad === 'ALTA' ? '🔴' : '🟡'
        });
      }
    });

    this.oficiales.forEach(o => {
      if (!o.cuartel_id || !o.fecha_ingreso_cuartel || !o.cuarteles) return;
      const c = o.cuarteles;
      const limite     = Utils.aniosRotacion(c.zona_trat_pct);
      const acumulado  = Utils.aniosDecimal(o.fecha_ingreso_cuartel);
      const restante   = limite - acumulado;
      const exceso     = acumulado - limite;

      if (restante < -0.25) {
        // CORRECCIÓN #6: muestra cuánto lleva vencida la rotación
        this.alertas.push({
          nivel: 'critica', oficial: o.nombre,
          msg: `${GRADOS_LABEL[o.grado]} ${o.nombre}: rotación VENCIDA en ${c.nombre} (lleva ${exceso.toFixed(1)} año(s) de exceso sobre el límite de ${limite} años).`,
          icon: '🔴'
        });
      } else if (restante <= 0.5 && restante >= 0) {
        this.alertas.push({
          nivel: 'preventiva', oficial: o.nombre,
          msg: `${GRADOS_LABEL[o.grado]} ${o.nombre}: rotación próxima en ${Math.round(restante * 12)} meses en ${c.nombre}.`,
          icon: '🟡'
        });
      }

      const aniosHastaAsc = Utils.aniosHastaAscenso(o.grado, o.fecha_ascenso_grado);
      const gradoSig = GRADO_SIGUIENTE[o.grado];
      if (gradoSig && o.cargo_actual) {
        const compActual = GRADOS_POR_CARGO[o.cargo_actual]?.includes(o.grado);
        const compSig    = GRADOS_POR_CARGO[o.cargo_actual]?.includes(gradoSig);
        if (compActual && !compSig && aniosHastaAsc <= 1) {
          this.alertas.push({
            nivel: 'critica', oficial: o.nombre,
            msg: `${GRADOS_LABEL[o.grado]} ${o.nombre}: ascenderá a ${GRADOS_LABEL[gradoSig]} en ~${Math.round(aniosHastaAsc * 12)} meses y quedará incompatible con cargo actual (${CARGOS_LABEL[o.cargo_actual]}).`,
            icon: '🔴'
          });
        } else if (compActual && !compSig && aniosHastaAsc <= 2) {
          this.alertas.push({
            nivel: 'preventiva', oficial: o.nombre,
            msg: `${GRADOS_LABEL[o.grado]} ${o.nombre}: en ~${Math.round(aniosHastaAsc * 12)} meses ascenderá a ${GRADOS_LABEL[gradoSig]}, incompatible con ${CARGOS_LABEL[o.cargo_actual]}.`,
            icon: '🟡'
          });
        }
      }

      if (o.estado === 'PERFECCIONAMIENTO' && o.acipol_retorno) {
        const diasRetorno = (new Date(o.acipol_retorno) - hoy) / (1000 * 60 * 60 * 24);
        if (diasRetorno <= 90 && diasRetorno > 0) {
          this.alertas.push({
            nivel: 'preventiva', oficial: o.nombre,
            msg: `${GRADOS_LABEL[o.grado]} ${o.nombre}: retorna de perfeccionamiento en ${Math.round(diasRetorno)} días. Planificar destino.`,
            icon: '🟡'
          });
        }
      }
    });

    // Alerta de calendario
    const mes = Utils.mesActual();
    if (mes === 4) {
      this.alertas.unshift({ nivel: 'preventiva', msg: 'Abril: Es momento de iniciar la programación del Plan de Traslados de diciembre.', icon: '📅' });
    } else if (mes === 11) {
      this.alertas.unshift({ nivel: 'critica', msg: 'Noviembre: El Plan de Traslados debe ejecutarse en menos de 60 días.', icon: '📅' });
    }

    const criticas = this.alertas.filter(a => a.nivel === 'critica').length;

    // CORRECCIÓN #1: badge sidebar — actualiza textContent Y visibilidad
    const badge = document.getElementById('alertas-badge');
    if (badge) {
      badge.textContent = criticas || '';
      badge.style.display = criticas > 0 ? 'inline-flex' : 'none';
    }

    // CORRECCIÓN #2: actualizar contador visible en el panel de alertas
    const contadorAlertas = document.getElementById('contador-alertas');
    if (contadorAlertas) contadorAlertas.textContent = this.alertas.length;

    // CORRECCIÓN #5: nav-alertas-badge muestra solo alertas críticas (más relevante)
    const navBadge = document.getElementById('nav-alertas-badge');
    if (navBadge) navBadge.textContent = criticas || '';
  },

  renderAlertas() {
    const cont = document.getElementById('alertas-lista');
    if (!cont) return;
    if (!this.alertas.length) {
      cont.innerHTML = `<div class="empty-state"><div class="empty-icon">✅</div><p>Sin alertas activas. Sistema en orden.</p></div>`;
      return;
    }
    const orden = { critica: 0, preventiva: 1, info: 2 };
    const sorted = [...this.alertas].sort((a, b) => (orden[a.nivel] || 2) - (orden[b.nivel] || 2));
    cont.innerHTML = sorted.map(a => `
      <div class="alerta-item alerta-${a.nivel}">
        <span class="alerta-icon">${a.icon}</span>
        <div class="alerta-body">
          <div class="alerta-titulo">${a.nivel === 'critica' ? 'CRÍTICA' : a.nivel === 'preventiva' ? 'PREVENTIVA' : 'INFORMATIVA'}</div>
          <div class="alerta-desc">${a.msg}</div>
        </div>
      </div>`).join('');
  },

  renderCalendario() {
    const cont = document.getElementById('calendario-bar');
    if (!cont) return;
    const mesActual = Utils.mesActual();
    const items = [
      { mes: 'ENE', evento: 'Ingreso Grupo Montaña', num: 1 },
      { mes: 'ABR', evento: 'Programar Plan Traslados', num: 4 },
      { mes: 'JUN', evento: 'Seguimiento semestral', num: 6 },
      { mes: 'NOV', evento: 'Cierre borrador plan', num: 11 },
      { mes: 'DIC', evento: 'Egreso Grupo Montaña · Ejecución Plan', num: 12 },
    ];
    cont.innerHTML = items.map(i => `
      <div class="cal-item ${i.num === mesActual ? 'activo' : ''}">
        <div class="cal-mes">${i.mes}</div>
        <div class="cal-dot"></div>
        <div class="cal-evento">${i.evento}</div>
      </div>`).join('');
  }
};

// ── CHARTS (Chart.js) ────────────────────────────────────────────
const Charts = {
  charts: {},

  // CORRECCIÓN #8: renderDashboard solo dibuja los canvas del dashboard
  // El fiscalizador maneja sus propios canvas por separado
  renderDashboard(cuarteles, oficiales) {
    this.renderDonaEspecialistas(oficiales);
    this.renderCobertura(cuarteles, oficiales);
    // chart-regiones vive solo en el fiscalizador (no hay canvas en el dashboard)
    // Se llama explícitamente desde cargarFiscalizador() cuando corresponde
  },

  renderDonaEspecialistas(oficiales) {
    const ctx = document.getElementById('chart-dona');
    if (!ctx) return;
    if (this.charts.dona) this.charts.dona.destroy();
    const enFrontera = oficiales.filter(o => o.especialidad_mof && o.cuartel_id && o.estado === 'ACTIVO').length;
    const bolsa      = oficiales.filter(o => o.especialidad_mof && (!o.cuartel_id || o.estado !== 'ACTIVO') && !['BAJA','RETIRADO'].includes(o.estado)).length;
    const perfec     = oficiales.filter(o => o.especialidad_mof && o.estado === 'PERFECCIONAMIENTO').length;
    const sinEsp     = oficiales.filter(o => !o.especialidad_mof && o.cuartel_id && o.estado === 'ACTIVO').length;
    this.charts.dona = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['En frontera (especialista)', 'Bolsa disponible', 'En perfeccionamiento', 'Sin especialidad en frontera'],
        datasets: [{ data: [enFrontera, bolsa, perfec, sinEsp], backgroundColor: ['#2E7D32','#4CAF50','#F9A825','#C62828'], borderWidth: 2 }]
      },
      options: { responsive: true, plugins: { legend: { position: 'bottom', labels: { font: { size: 11 }, padding: 12 } } } }
    });
  },

  renderBarrasRegion(cuarteles, oficiales) {
    const ctx = document.getElementById('chart-regiones');
    if (!ctx) return;
    if (this.charts.barras) this.charts.barras.destroy();
    const regiones  = [...new Set(cuarteles.map(c => c.region))];
    const optimos   = regiones.map(r => cuarteles.filter(c => c.region === r).reduce((s, c) => s + (c.dot_comisario||0) + (c.dot_subcom_serv||0) + (c.dot_subcom_adm||0) + (c.dot_jefe_ten||0) + (c.dot_of_op||0), 0));
    const cubiertos = regiones.map(r => {
      const cs = cuarteles.filter(c => c.region === r).map(c => c.id);
      return oficiales.filter(o => o.cuartel_id && cs.includes(o.cuartel_id) && o.estado === 'ACTIVO').length;
    });
    this.charts.barras = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: regiones.map(r => r.replace('La ', '').replace('Los ', '')),
        datasets: [
          { label: 'Dotación óptima', data: optimos, backgroundColor: 'rgba(46,125,50,0.3)', borderColor: '#2E7D32', borderWidth: 2 },
          { label: 'Cubiertos',       data: cubiertos, backgroundColor: '#4CAF50', borderRadius: 4 }
        ]
      },
      options: { responsive: true, plugins: { legend: { position: 'top' } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }
    });
  },

  renderCobertura(cuarteles, oficiales) {
    const ctx = document.getElementById('chart-cobertura');
    if (!ctx) return;
    if (this.charts.cobertura) this.charts.cobertura.destroy();
    const criticas = cuarteles.filter(c => c.criticidad === 'ALTA').length;
    const medias   = cuarteles.filter(c => c.criticidad === 'MEDIA').length;
    const bajas    = cuarteles.filter(c => c.criticidad === 'BAJA').length;
    this.charts.cobertura = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: ['Criticidad Alta', 'Criticidad Media', 'Criticidad Baja'],
        datasets: [{ data: [criticas, medias, bajas], backgroundColor: ['#C62828','#F9A825','#4CAF50'], borderWidth: 2 }]
      },
      options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
    });
  }
};
