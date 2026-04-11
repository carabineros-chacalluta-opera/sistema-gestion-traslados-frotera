// ═══════════════════════════════════════════════════════════════
// SIGDOF · Mapa Interactivo de Chile (Leaflet.js) v2.1
// ═══════════════════════════════════════════════════════════════

const Mapa = {
  mapDashboard: null,
  mapFull: null,
  markersDashboard: [],
  markersFull: [],
  filtroActual: 'todos',
  // Datos en memoria para poder re-renderizar sin nueva consulta
  _cuarteles: [],
  _oficiales: [],

  _crearTileLayer() {
    return L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap', maxZoom: 18
    });
  },

  // ── DASHBOARD ────────────────────────────────────────────────
  // Llamado desde appInit(). El div YA existe pero puede no tener
  // dimensiones definitivas — por eso forzamos invalidateSize()
  initDashboard(divId) {
    if (this.mapDashboard) {
      // Ya existe: solo forzar redibujado de dimensiones
      setTimeout(() => this.mapDashboard.invalidateSize(), 100);
      return;
    }
    const el = document.getElementById(divId);
    if (!el) return;

    this.mapDashboard = L.map(divId, {
      center: [-38.0, -71.0], zoom: 4,
      zoomControl: true,
      preferCanvas: true   // más rápido con muchos markers
    });
    this._crearTileLayer().addTo(this.mapDashboard);

    // Si ya hay datos cargados (Dashboard los guardó antes), renderizar ahora
    setTimeout(() => {
      this.mapDashboard.invalidateSize();
      if (this._cuarteles.length > 0) {
        this.renderizar(this._cuarteles, this._oficiales);
      }
    }, 200);
  },

  renderizar(cuarteles, oficiales) {
    // Guardar datos en memoria
    this._cuarteles = cuarteles;
    this._oficiales = oficiales;

    if (!this.mapDashboard) return;

    this.markersDashboard.forEach(m => m.remove());
    this.markersDashboard = [];
    this._poblarMapa(this.mapDashboard, this.markersDashboard, cuarteles, oficiales);

    // Forzar redibujado SIEMPRE después de poblar
    setTimeout(() => this.mapDashboard.invalidateSize(), 100);
  },

  // ── MAPA FULL ────────────────────────────────────────────────
  // Llamado al navegar a la página Mapa. El div puede no existir aún.
  initFull(divId) {
    if (this.mapFull) {
      setTimeout(() => {
        this.mapFull.invalidateSize();
        // Si ya hay datos pero no markers, repoblar
        if (this.markersFull.length === 0 && this._cuarteles.length > 0) {
          this.renderizarFull(this._cuarteles, this._oficiales);
        }
      }, 100);
      return;
    }
    const el = document.getElementById(divId);
    if (!el) return;

    this.mapFull = L.map(divId, {
      center: [-38.0, -71.0], zoom: 4,
      zoomControl: true,
      preferCanvas: true
    });
    this._crearTileLayer().addTo(this.mapFull);

    // Filtros: solo los del contenedor #page-mapa para no colisionar con dashboard
    this._initFiltrosFull();

    setTimeout(() => this.mapFull.invalidateSize(), 200);
  },

  renderizarFull(cuarteles, oficiales) {
    this._cuarteles = cuarteles;
    this._oficiales = oficiales;

    if (!this.mapFull) return;

    this.markersFull.forEach(m => m.remove());
    this.markersFull = [];
    this._poblarMapa(this.mapFull, this.markersFull, cuarteles, oficiales);
    this.aplicarFiltro();

    setTimeout(() => this.mapFull.invalidateSize(), 100);
  },

  // ── LÓGICA COMPARTIDA ─────────────────────────────────────────
  _poblarMapa(mapaInstancia, markersArr, cuarteles, oficiales) {
    let conCoordenadas = 0;
    cuarteles.forEach(c => {
      if (!c.latitud || !c.longitud) return;
      conCoordenadas++;

      const asignados     = oficiales.filter(o => o.cuartel_id === c.id && o.estado === 'ACTIVO');
      const especialistas = asignados.filter(o => o.especialidad_mof);
      const optimo  = Utils.dotacionOptima(c);
      const deficit = Math.max(0, optimo - asignados.length);

      let estado, color, radio, pulso;
      if (deficit > 0 && c.criticidad === 'ALTA') {
        estado = 'deficit-critico'; color = '#C62828'; radio = 14; pulso = true;
      } else if (deficit > 0 || (optimo > 0 && especialistas.length < asignados.length)) {
        estado = 'deficit';         color = '#F9A825'; radio = 10; pulso = false;
      } else if (optimo > 0 && asignados.length >= optimo) {
        estado = 'completo';        color = '#2E7D32'; radio = 9;  pulso = false;
      } else {
        estado = 'sin-datos';       color = '#90A4AE'; radio = 7;  pulso = false;
      }

      const icon = L.divIcon({
        className: '',
        html: `<div style="
          width:${radio * 2}px;height:${radio * 2}px;
          background:${color};border:3px solid white;
          border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.4);
          ${pulso ? 'animation:mapaMarkerPulse 1.5s infinite;' : ''}
          cursor:pointer;
        "></div>`,
        iconSize:   [radio * 2, radio * 2],
        iconAnchor: [radio, radio]
      });

      const marker = L.marker([c.latitud, c.longitud], { icon })
        .addTo(mapaInstancia)
        .bindPopup(this._popupContent(c, asignados, especialistas, optimo, deficit), { maxWidth: 320 });

      marker.cuartelData = { c, estado };
      markersArr.push(marker);
    });

    if (conCoordenadas === 0) {
      console.warn('SIGDOF Mapa: ningún cuartel tiene coordenadas (latitud/longitud). Agrega coordenadas en la BD.');
    }
  },

  _popupContent(c, asignados, especialistas, optimo, deficit) {
    const critColor = c.criticidad === 'ALTA' ? '#C62828' : c.criticidad === 'MEDIA' ? '#F9A825' : '#2E7D32';
    const rotRegla  = Utils.aniosRotacion(c.zona_trat_pct);
    const ofHtml = asignados.length
      ? asignados.map(o => `
        <div style="display:flex;align-items:center;gap:6px;padding:4px 0;border-bottom:1px solid #eee;font-size:12px;">
          <span>${o.especialidad_mof ? '🟢' : '🔴'}</span>
          <span><b>${GRADOS_LABEL[o.grado] || o.grado}</b> ${o.nombre}</span>
          <span style="margin-left:auto;color:#666;font-size:11px;">${o.cargo_actual ? (CARGOS_LABEL[o.cargo_actual] || o.cargo_actual) : ''}</span>
        </div>`).join('')
      : '<div style="color:#999;font-size:12px;padding:4px 0;">Sin oficiales asignados</div>';

    return `
      <div style="font-family:'Source Sans 3',sans-serif;min-width:260px;">
        <div style="background:#1B5E20;color:white;padding:10px 12px;margin:-1px -1px 0;border-radius:4px 4px 0 0;">
          <div style="font-family:'Oswald',sans-serif;font-size:13px;font-weight:600;letter-spacing:0.05em;">${c.nombre}</div>
          <div style="font-size:11px;opacity:0.75;">${c.region}</div>
        </div>
        <div style="padding:10px 12px;">
          <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px;">
            <span style="background:${critColor};color:white;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:700;">${c.criticidad}</span>
            <span style="background:#E8F5E9;color:#1B5E20;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:600;">${c.tipo}</span>
            <span style="background:#E3F2FD;color:#1565C0;padding:2px 8px;border-radius:10px;font-size:11px;">${c.zona_trat_pct}% · Rot. ${rotRegla}a</span>
          </div>
          <div style="font-size:12px;color:#546E7A;margin-bottom:8px;">
            Dotación: <b style="color:${deficit > 0 ? '#C62828' : '#2E7D32'}">${asignados.length}/${optimo}</b> ·
            Especialistas: <b>${especialistas.length}/${asignados.length}</b>
            ${deficit > 0 ? `<span style="color:#C62828;font-weight:700;"> ⚠️ ${deficit} vacante${deficit > 1 ? 's' : ''}</span>` : ''}
          </div>
          <div style="border-top:1px solid #eee;padding-top:8px;">
            <div style="font-size:11px;font-weight:700;color:#263238;margin-bottom:4px;">OFICIALES ASIGNADOS</div>
            ${ofHtml}
          </div>
        </div>
      </div>`;
  },

  // Filtros solo para el mapa full (scope: #page-mapa)
  _initFiltrosFull() {
    const pageMapa = document.getElementById('page-mapa');
    if (!pageMapa) return;
    pageMapa.querySelectorAll('[data-filtro-mapa]').forEach(btn => {
      btn.addEventListener('click', () => {
        pageMapa.querySelectorAll('[data-filtro-mapa]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.filtroActual = btn.dataset.filtroMapa;
        this.aplicarFiltro();
      });
    });
  },

  aplicarFiltro() {
    this.markersFull.forEach(m => {
      const { estado } = m.cuartelData;
      const visible =
        this.filtroActual === 'todos'    ? true :
        this.filtroActual === 'deficit'  ? estado.includes('deficit') :
        this.filtroActual === 'critico'  ? estado === 'deficit-critico' :
        this.filtroActual === 'completo' ? estado === 'completo' : true;
      m.setOpacity(visible ? 1 : 0.15);
    });
  }
};

// CSS animación pulse
const _mapaStyle = document.createElement('style');
_mapaStyle.textContent = `
@keyframes mapaMarkerPulse {
  0%,100% { box-shadow: 0 0 0 0 rgba(198,40,40,0.5); }
  50%      { box-shadow: 0 0 0 10px rgba(198,40,40,0); }
}`;
document.head.appendChild(_mapaStyle);
