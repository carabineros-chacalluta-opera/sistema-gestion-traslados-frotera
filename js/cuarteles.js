// ═══════════════════════════════════════════════════════════════
// SIGDOF · Módulo Cuarteles (CRUD)
// ═══════════════════════════════════════════════════════════════

const Cuarteles = {
  data: [], oficiales: [], filtro: '', editandoId: null,

  async cargar() {
    const [{ data:c },{ data:o }] = await Promise.all([
      sb.from('cuarteles').select('*').eq('activo',true).order('region').order('nombre'),
      sb.from('oficiales').select('id,nombre,grado,cargo_actual,cuartel_id,especialidad_mof,estado').in('estado',['ACTIVO','PERFECCIONAMIENTO'])
    ]);
    this.data      = c||[];
    this.oficiales = o||[];
    this.renderTabla();
    this.renderResumen();
  },

  renderResumen() {
    const totalOptimo = this.data.reduce((s,c)=>(s+(c.dot_comisario||0)+(c.dot_subcom_serv||0)+(c.dot_subcom_adm||0)+(c.dot_jefe_ten||0)+(c.dot_of_op||0)),0);
    const totalCubierto = this.oficiales.filter(o=>o.cuartel_id&&o.estado==='ACTIVO').length;
    const deficit = Math.max(0, totalOptimo - totalCubierto);
    const alta = this.data.filter(c=>c.criticidad==='ALTA').length;
    const set = (id,v)=>{ const el=document.getElementById(id); if(el) el.textContent=v; };
    set('crt-total',   this.data.length);
    set('crt-optimo',  totalOptimo);
    set('crt-cubierto',totalCubierto);
    set('crt-deficit', deficit);
    set('crt-alta',    alta);
  },

  renderTabla() {
    const cont = document.getElementById('tabla-cuarteles-body');
    if (!cont) return;
    const filtrados = this.data.filter(c =>
      c.nombre.toLowerCase().includes(this.filtro) ||
      c.region.toLowerCase().includes(this.filtro)
    );
    if (!filtrados.length) {
      cont.innerHTML = `<tr><td colspan="10" style="text-align:center;padding:32px;color:#90A4AE;">Sin resultados</td></tr>`;
      return;
    }
    cont.innerHTML = filtrados.map(c => {
      const asignados   = this.oficiales.filter(o=>o.cuartel_id===c.id&&o.estado==='ACTIVO');
      const especialistas = asignados.filter(o=>o.especialidad_mof);
      const optimo = (c.dot_comisario||0)+(c.dot_subcom_serv||0)+(c.dot_subcom_adm||0)+(c.dot_jefe_ten||0)+(c.dot_of_op||0);
      const deficit = Math.max(0, optimo - asignados.length);
      const pct = optimo > 0 ? Math.min(100, (asignados.length/optimo)*100) : 0;
      const colorBarra = pct >= 100 ? 'verde' : pct >= 60 ? 'amarillo' : 'rojo';
      const rotRegla = Utils.aniosRotacion(c.zona_trat_pct);
      const criticidadColor = c.criticidad==='ALTA'?'rojo':c.criticidad==='MEDIA'?'amarillo':'verde';

      return `<tr>
        <td data-label="Cuartel" style="font-weight:600;font-size:0.85rem;">${c.nombre}</td>
        <td data-label="Región" style="font-size:0.8rem;">${c.region}</td>
        <td data-label="Tipo"><span class="badge badge-gris">${c.tipo}</span></td>
        <td data-label="Criticidad"><span class="badge badge-${criticidadColor}">${c.criticidad}</span></td>
        <td data-label="Zona Trat." style="text-align:center;">
          <span style="font-weight:700;color:${Utils.colorZona(c.zona_trat_pct)};">${c.zona_trat_pct}%</span>
          <div style="font-size:0.7rem;color:#90A4AE;">Rot. ${rotRegla}a</div>
        </td>
        <td data-label="Cobertura" style="min-width:110px;">
          <div class="progress-wrap"><div class="progress-bar progress-${colorBarra}" style="width:${pct}%"></div></div>
          <div class="progress-label">${asignados.length}/${optimo}${deficit>0?` <b style="color:#C62828;">(−${deficit})</b>`:''}</div>
        </td>
        <td data-label="Especialistas" style="text-align:center;">
          <span class="${especialistas.length === asignados.length && asignados.length>0?'badge badge-verde':'badge badge-rojo'}">${especialistas.length}/${asignados.length}</span>
        </td>
        <td data-label="Dotación" style="font-size:0.8rem;">${this.dotacionHtml(c)}</td>
        <td data-label="Acciones" style="text-align:center;">
          <div style="display:flex;gap:4px;justify-content:center;">
            <button class="btn btn-outline btn-sm" onclick="Cuarteles.verDetalle('${c.id}')">👁</button>
            <button class="btn btn-ghost btn-sm" onclick="Cuarteles.abrirEditar('${c.id}')">✏️</button>
          </div>
        </td>
      </tr>`;
    }).join('');
  },

  dotacionHtml(c) {
    const cargos = [
      { k:'dot_comisario',  l:'COM'}, { k:'dot_subcom_serv',l:'S.Serv'},
      { k:'dot_subcom_adm', l:'S.Adm'}, { k:'dot_jefe_ten', l:'J.Ten'},
      { k:'dot_of_op',      l:'Of.Op'}
    ];
    return cargos.filter(x=>c[x.k]>0).map(x=>`<span style="font-size:0.7rem;background:#E8F5E9;padding:1px 5px;border-radius:3px;margin-right:2px;">${x.l}:${c[x.k]}</span>`).join('') || '—';
  },

  verDetalle(id) {
    const c = this.data.find(x=>x.id===id);
    if (!c) return;
    const asignados = this.oficiales.filter(o=>o.cuartel_id===c.id&&o.estado==='ACTIVO');
    const optimo = (c.dot_comisario||0)+(c.dot_subcom_serv||0)+(c.dot_subcom_adm||0)+(c.dot_jefe_ten||0)+(c.dot_of_op||0);
    const rotRegla = Utils.aniosRotacion(c.zona_trat_pct);

    document.getElementById('detalle-cuartel-content').innerHTML = `
      <div style="margin-bottom:20px;">
        <h2 style="font-family:'Oswald',sans-serif;color:#1B5E20;font-size:1.3rem;">${c.nombre}</h2>
        <div style="color:#546E7A;">${c.region} · ${c.tipo}</div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px;">
        <div>
          <div style="font-size:0.75rem;font-weight:700;color:#263238;text-transform:uppercase;margin-bottom:8px;">Datos operativos</div>
          ${[
            ['Criticidad',`<span class="badge badge-${Utils.colorCriticidad(c.criticidad)}">${c.criticidad}</span>`],
            ['Zona tratamiento',`${c.zona_trat_pct}% → rotación cada ${rotRegla} años`],
            ['Tipo comisaría',c.tipo_comisaria||'—'],
            ['Dotación óptima',`${optimo} oficial${optimo!==1?'es':''}`],
            ['Cubiertos',`${asignados.length} / ${optimo}`],
          ].map(([k,v])=>`<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #eee;font-size:0.85rem;"><span style="color:#546E7A;">${k}</span><span style="font-weight:600;">${v}</span></div>`).join('')}
        </div>
        <div>
          <div style="font-size:0.75rem;font-weight:700;color:#263238;text-transform:uppercase;margin-bottom:8px;">Dotación óptima por cargo</div>
          ${[
            ['Comisario',c.dot_comisario],['Subcom. Servicios',c.dot_subcom_serv],
            ['Subcom. Administrativo',c.dot_subcom_adm],['Jefe de Tenencia',c.dot_jefe_ten],
            ['Oficial Operativo',c.dot_of_op]
          ].filter(x=>x[1]>0).map(([k,v])=>`<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #eee;font-size:0.85rem;"><span style="color:#546E7A;">${k}</span><span style="font-weight:600;">${v}</span></div>`).join('')}
        </div>
      </div>
      <div>
        <div style="font-size:0.75rem;font-weight:700;color:#263238;text-transform:uppercase;margin-bottom:8px;">Oficiales asignados actualmente</div>
        ${asignados.length ? asignados.map(o=>`
          <div style="display:flex;align-items:center;gap:10px;padding:8px;border:1px solid #e0e0e0;border-radius:8px;margin-bottom:6px;">
            <span>${o.especialidad_mof?'🟢':'🔴'}</span>
            ${badgeGrado(o.grado)}
            <span style="font-weight:600;font-size:0.85rem;">${o.nombre}</span>
            <span style="margin-left:auto;font-size:0.8rem;color:#546E7A;">${o.cargo_actual?CARGOS_LABEL[o.cargo_actual]:''}</span>
          </div>`).join('') : '<div style="color:#999;font-size:0.85rem;padding:12px 0;">Sin oficiales asignados</div>'}
      </div>`;
    abrirModal('modal-detalle-cuartel');
  },

  abrirNuevo() {
    this.editandoId = null;
    document.getElementById('modal-cuartel-title').textContent = 'NUEVO CUARTEL';
    document.getElementById('form-cuartel').reset();
    abrirModal('modal-cuartel');
  },

  abrirEditar(id) {
    const c = this.data.find(x=>x.id===id);
    if (!c) return;
    this.editandoId = id;
    document.getElementById('modal-cuartel-title').textContent = 'EDITAR CUARTEL';
    const f = document.getElementById('form-cuartel');
    f.crt_nombre.value        = c.nombre||'';
    f.crt_region.value        = c.region||'';
    f.crt_tipo.value          = c.tipo||'';
    f.crt_zona_trat.value     = c.zona_trat_pct||0;
    f.crt_tipo_com.value      = c.tipo_comisaria||'MAYOR_TCOL';
    f.crt_criticidad.value    = c.criticidad||'MEDIA';
    f.crt_dot_com.value       = c.dot_comisario||0;
    f.crt_dot_ss.value        = c.dot_subcom_serv||0;
    f.crt_dot_sa.value        = c.dot_subcom_adm||0;
    f.crt_dot_jt.value        = c.dot_jefe_ten||0;
    f.crt_dot_op.value        = c.dot_of_op||0;
    f.crt_lat.value           = c.latitud||'';
    f.crt_lng.value           = c.longitud||'';
    abrirModal('modal-cuartel');
  },

  async guardar() {
    const f = document.getElementById('form-cuartel');
    const payload = {
      nombre:         f.crt_nombre.value.trim(),
      region:         f.crt_region.value.trim(),
      tipo:           f.crt_tipo.value,
      zona_trat_pct:  parseInt(f.crt_zona_trat.value)||0,
      tipo_comisaria: f.crt_tipo_com.value,
      criticidad:     f.crt_criticidad.value,
      dot_comisario:  parseInt(f.crt_dot_com.value)||0,
      dot_subcom_serv:parseInt(f.crt_dot_ss.value)||0,
      dot_subcom_adm: parseInt(f.crt_dot_sa.value)||0,
      dot_jefe_ten:   parseInt(f.crt_dot_jt.value)||0,
      dot_of_op:      parseInt(f.crt_dot_op.value)||0,
      latitud:        parseFloat(f.crt_lat.value)||null,
      longitud:       parseFloat(f.crt_lng.value)||null,
      updated_at:     new Date().toISOString()
    };
    if (!payload.nombre||!payload.region||!payload.tipo) return toast('Completa nombre, región y tipo','error');
    let error;
    if (this.editandoId) {
      ({ error } = await sb.from('cuarteles').update(payload).eq('id',this.editandoId));
    } else {
      ({ error } = await sb.from('cuarteles').insert({...payload, activo:true}));
    }
    if (error) return toast('Error: '+error.message,'error');
    toast('Cuartel guardado');
    cerrarModal('modal-cuartel');
    await this.cargar();
    Dashboard.cargar();
  },

  buscar(q) { this.filtro = q.toLowerCase(); this.renderTabla(); }
};
