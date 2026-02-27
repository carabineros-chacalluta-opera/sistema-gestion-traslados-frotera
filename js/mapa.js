// ═══════════════════════════════════════════════════════════════
// SIGDOF · Mapa Interactivo de Chile (Leaflet.js)
// ═══════════════════════════════════════════════════════════════

const Mapa = {
  map: null, markers: [], filtroActual: 'todos',

  init() {
    if (this.map) return;
    this.map = L.map('mapa', { center:[-35.5, -71.0], zoom:5, zoomControl:true });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:'© OpenStreetMap',
      maxZoom:18
    }).addTo(this.map);
    this.initFiltros();
  },

  renderizar(cuarteles, oficiales) {
    if (!this.map) this.init();
    // Limpiar markers anteriores
    this.markers.forEach(m => m.remove());
    this.markers = [];

    cuarteles.forEach(c => {
      if (!c.latitud || !c.longitud) return;
      const asignados    = oficiales.filter(o => o.cuartel_id === c.id && o.estado==='ACTIVO');
      const especialistas= asignados.filter(o => o.especialidad_mof);
      const optimo = (c.dot_comisario||0)+(c.dot_subcom_serv||0)+(c.dot_subcom_adm||0)+(c.dot_jefe_ten||0)+(c.dot_of_op||0);
      const deficit = Math.max(0, optimo - asignados.length);

      let estado, color, radio, pulso;
      if (deficit > 0 && c.criticidad === 'ALTA') {
        estado='deficit-critico'; color='#C62828'; radio=14; pulso=true;
      } else if (deficit > 0 || especialistas.length < asignados.length) {
        estado='deficit'; color='#F9A825'; radio=10; pulso=false;
      } else if (asignados.length >= optimo && optimo > 0) {
        estado='completo'; color='#2E7D32'; radio=9; pulso=false;
      } else {
        estado='sin-datos'; color='#90A4AE'; radio=7; pulso=false;
      }

      const icon = L.divIcon({
        className: '',
        html: `<div style="
          width:${radio*2}px; height:${radio*2}px;
          background:${color}; border:3px solid white;
          border-radius:50%; box-shadow:0 2px 8px rgba(0,0,0,0.4);
          ${pulso?'animation:mapaMarkerPulse 1.5s infinite;':''}
          cursor:pointer;
        "></div>`,
        iconSize: [radio*2, radio*2],
        iconAnchor: [radio, radio]
      });

      const marker = L.marker([c.latitud, c.longitud], { icon })
        .addTo(this.map)
        .bindPopup(this.popupContent(c, asignados, especialistas, optimo, deficit), { maxWidth:300 });

      marker.cuartelData = { c, estado };
      this.markers.push(marker);
    });
  },

  popupContent(c, asignados, especialistas, optimo, deficit) {
    const criticidadColor = c.criticidad==='ALTA'?'#C62828':c.criticidad==='MEDIA'?'#F9A825':'#2E7D32';
    const rotRegla = Utils.aniosRotacion(c.zona_trat_pct);
    const ofHtml = asignados.length ? asignados.map(o => `
      <div style="display:flex;align-items:center;gap:6px;padding:4px 0;border-bottom:1px solid #eee;font-size:12px;">
        <span>${o.especialidad_mof?'🟢':'🔴'}</span>
        <span><b>${GRADOS_LABEL[o.grado]}</b> ${o.nombre}</span>
        <span style="margin-left:auto;color:#666;font-size:11px;">${o.cargo_actual?CARGOS_LABEL[o.cargo_actual]:''}</span>
      </div>`).join('') : '<div style="color:#999;font-size:12px;padding:4px 0;">Sin oficiales asignados</div>';

    return `
      <div style="font-family:'Source Sans 3',sans-serif;min-width:260px;">
        <div style="background:#1B5E20;color:white;padding:10px 12px;margin:-1px -1px 0;border-radius:4px 4px 0 0;">
          <div style="font-family:'Oswald',sans-serif;font-size:13px;font-weight:600;letter-spacing:0.05em;">${c.nombre}</div>
          <div style="font-size:11px;opacity:0.75;">${c.region}</div>
        </div>
        <div style="padding:10px 12px;">
          <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px;">
            <span style="background:${criticidadColor};color:white;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:700;">${c.criticidad}</span>
            <span style="background:#E8F5E9;color:#1B5E20;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:600;">${c.tipo}</span>
            <span style="background:#E3F2FD;color:#1565C0;padding:2px 8px;border-radius:10px;font-size:11px;">${c.zona_trat_pct}% · Rot. ${rotRegla}a</span>
          </div>
          <div style="font-size:12px;color:#546E7A;margin-bottom:8px;">
            Dotación: <b style="color:${deficit>0?'#C62828':'#2E7D32'}">${asignados.length}/${optimo}</b> · 
            Especialistas: <b>${especialistas.length}/${asignados.length}</b>
            ${deficit>0?`<span style="color:#C62828;font-weight:700;"> ⚠️ Déficit: ${deficit}</span>`:''}
          </div>
          <div style="border-top:1px solid #eee;padding-top:8px;">
            <div style="font-size:11px;font-weight:700;color:#263238;margin-bottom:4px;">OFICIALES ASIGNADOS</div>
            ${ofHtml}
          </div>
        </div>
      </div>`;
  },

  initFiltros() {
    document.querySelectorAll('[data-filtro-mapa]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('[data-filtro-mapa]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.filtroActual = btn.dataset.filtroMapa;
        this.aplicarFiltro();
      });
    });
  },

  aplicarFiltro() {
    this.markers.forEach(m => {
      const { estado } = m.cuartelData;
      if (this.filtroActual === 'todos') {
        m.setOpacity(1);
      } else if (this.filtroActual === 'deficit') {
        m.setOpacity(estado.includes('deficit') ? 1 : 0.2);
      } else if (this.filtroActual === 'critico') {
        m.setOpacity(estado === 'deficit-critico' ? 1 : 0.2);
      } else if (this.filtroActual === 'completo') {
        m.setOpacity(estado === 'completo' ? 1 : 0.2);
      }
    });
  }
};

// CSS para animación del mapa
const style = document.createElement('style');
style.textContent = `
@keyframes mapaMarkerPulse {
  0%,100% { box-shadow: 0 0 0 0 rgba(198,40,40,0.5); }
  50%      { box-shadow: 0 0 0 10px rgba(198,40,40,0); }
}`;
document.head.appendChild(style);
