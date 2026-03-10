// ═══════════════════════════════════════════════════════════════
// SIGDOF · Módulo Oficiales (CRUD completo)
// ═══════════════════════════════════════════════════════════════

const Oficiales = {
  data: [], cuarteles: [], filtro: '', tab: 'frontera',

  async cargar() {
    const [{ data: oficiales }, { data: cuarteles }] = await Promise.all([
      sb.from('oficiales').select('*, cuarteles(nombre,region,zona_trat_pct,criticidad)').order('grado').order('nombre'),
      sb.from('cuarteles').select('id,nombre,region,tipo').eq('activo',true).order('nombre')
    ]);
    this.data      = oficiales || [];
    this.cuarteles = cuarteles || [];
    this.renderTabla();
    this.renderBolsa();
    this.poblarSelectores();
  },

  renderTabla() {
    const cont = document.getElementById('tabla-oficiales-body');
    if (!cont) return;
    const activos = this.data.filter(o =>
      ['ACTIVO','PERFECCIONAMIENTO'].includes(o.estado) && o.cuartel_id &&
      (o.nombre?.toLowerCase().includes(this.filtro) || o.grado?.toLowerCase().includes(this.filtro))
    );
    if (!activos.length) {
      cont.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:32px;color:#90A4AE;">Sin resultados</td></tr>`;
      return;
    }
    cont.innerHTML = activos.map(o => {
      const c = o.cuarteles;
      const tiempoGrado  = Utils.aniosMeses(o.fecha_ascenso_grado);
      const tiempoCuartel= Utils.aniosMeses(o.fecha_ingreso_cuartel);
      const limiteRot    = c ? Utils.aniosRotacion(c.zona_trat_pct) : '—';
      const acumRot      = Utils.aniosDecimal(o.fecha_ingreso_cuartel);
      const pctRot       = c ? Math.min(100, (acumRot / limiteRot) * 100) : 0;
      const pctGrado     = ANIOS_MIN_ASCENSO[o.grado]
        ? Math.min(100, (Utils.aniosDecimal(o.fecha_ascenso_grado) / ANIOS_MIN_ASCENSO[o.grado]) * 100) : 100;
      const colorRot = pctRot >= 100 ? 'rojo' : pctRot >= 75 ? 'amarillo' : 'verde';
      const colorGrado= pctGrado >= 90 ? 'rojo' : pctGrado >= 70 ? 'amarillo' : 'verde';

      return `<tr>
        <td data-label="Nombre"><div style="font-weight:600;">${o.nombre}</div><div style="font-size:0.75rem;color:#90A4AE;">${o.rut||''}</div></td>
        <td data-label="Grado">${badgeGrado(o.grado)}</td>
        <td data-label="Cuartel" style="max-width:140px;font-size:0.82rem;">${c?c.nombre:'—'}</td>
        <td data-label="Cargo" style="font-size:0.82rem;">${o.cargo_actual?CARGOS_LABEL[o.cargo_actual]:'—'}</td>
        <td data-label="T. Cuartel">
          <div class="progress-wrap" style="width:90px;"><div class="progress-bar progress-${colorRot}" style="width:${pctRot}%"></div></div>
          <div class="progress-label">${tiempoCuartel.texto} / ${limiteRot}a</div>
        </td>
        <td data-label="T. Grado">
          <div class="progress-wrap" style="width:90px;"><div class="progress-bar progress-${colorGrado}" style="width:${pctGrado}%"></div></div>
          <div class="progress-label">${tiempoGrado.texto}</div>
        </td>
        <td data-label="Especialidad"><span class="badge ${o.especialidad_mof?'badge-verde':'badge-rojo'}">${o.especialidad_mof?'✓ M o F':'✗ Sin esp.'}</span></td>
        <td data-label="Estado"><span class="badge ${o.estado==='ACTIVO'?'badge-verde':o.estado==='PERFECCIONAMIENTO'?'badge-amarillo':'badge-gris'}">${o.estado}</span></td>
        <td data-label="Acciones">
          <div style="display:flex;gap:4px;">
            <button class="btn btn-outline btn-sm" onclick="Oficiales.verFicha('${o.id}')">👁 Ver</button>
            <button class="btn btn-ghost btn-sm" onclick="Oficiales.abrirEditar('${o.id}')">✏️</button>
          </div>
        </td>
      </tr>`;
    }).join('');
  },

  renderBolsa() {
    const cont = document.getElementById('tabla-bolsa-body');
    if (!cont) return;
    const bolsa = this.data.filter(o => o.especialidad_mof && (!o.cuartel_id || o.estado==='PERFECCIONAMIENTO') && !['BAJA','RETIRADO'].includes(o.estado));
    if (!bolsa.length) {
      cont.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:32px;color:#90A4AE;">Sin especialistas en bolsa</td></tr>`;
      return;
    }
    cont.innerHTML = bolsa.map(o => {
      const aniosHastaAsc = Utils.aniosHastaAscenso(o.grado, o.fecha_ascenso_grado);
      const gradoSig = GRADO_SIGUIENTE[o.grado];
      return `<tr>
        <td><div style="font-weight:600;">${o.nombre}</div></td>
        <td>${badgeGrado(o.grado)}</td>
        <td style="font-size:0.82rem;">${o.motivo_fuera_frontera ? MOTIVOS_LABEL[o.motivo_fuera_frontera] : '—'}</td>
        <td><span class="badge ${o.puede_volver==='SI'?'badge-verde':o.puede_volver==='CONDICIONAL'?'badge-amarillo':'badge-rojo'}">${o.puede_volver||'—'}</span></td>
        <td style="font-size:0.82rem;">${o.fecha_disponibilidad ? Utils.fechaStr(o.fecha_disponibilidad) : 'Disponible ahora'}</td>
        <td style="font-size:0.82rem;">${gradoSig?`${GRADOS_LABEL[gradoSig]} en ${aniosHastaAsc.toFixed(1)}a`:'Máximo grado'}</td>
        <td>
          <button class="btn btn-outline btn-sm" onclick="Oficiales.verFicha('${o.id}')">👁 Ver</button>
          <button class="btn btn-primary btn-sm" onclick="Simulador.precargar('${o.id}')">⚡ Simular</button>
        </td>
      </tr>`;
    }).join('');
  },

  verFicha(id) {
    const o = this.data.find(x => x.id === id);
    if (!o) return;
    const c = o.cuarteles;
    const aniosHastaAsc = Utils.aniosHastaAscenso(o.grado, o.fecha_ascenso_grado);
    const gradoSig = GRADO_SIGUIENTE[o.grado];
    const formacion = Array.isArray(o.formacion) ? o.formacion : (o.formacion ? JSON.parse(o.formacion) : []);

    document.getElementById('ficha-content').innerHTML = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">
        <div>
          <h3 style="font-family:'Oswald',sans-serif;color:#1B5E20;margin-bottom:16px;">${o.nombre}</h3>
          <table style="font-size:0.85rem;width:100%;border-collapse:collapse;">
            ${[
              ['Grado', badgeGrado(o.grado)],
              ['Grado siguiente', gradoSig ? `${GRADOS_LABEL[gradoSig]} en ${aniosHastaAsc.toFixed(1)} años` : 'Máximo grado'],
              ['Fecha ascenso grado', Utils.fechaStr(o.fecha_ascenso_grado)],
              ['Antigüedad en grado', Utils.aniosMeses(o.fecha_ascenso_grado).texto],
              ['Estado', `<span class="badge ${o.estado==='ACTIVO'?'badge-verde':'badge-amarillo'}">${o.estado}</span>`],
              ['Cuartel actual', c ? c.nombre : '—'],
              ['Cargo', o.cargo_actual ? CARGOS_LABEL[o.cargo_actual] : '—'],
              ['En cuartel desde', Utils.fechaStr(o.fecha_ingreso_cuartel)],
              ['Tiempo en cuartel', Utils.aniosMeses(o.fecha_ingreso_cuartel).texto],
            ].map(([k,v])=>`<tr><td style="padding:6px 0;color:#546E7A;width:50%;">${k}</td><td style="padding:6px 0;font-weight:600;">${v}</td></tr>`).join('')}
          </table>
        </div>
        <div>
          <div style="background:#E8F5E9;border-radius:8px;padding:16px;margin-bottom:16px;">
            <div style="font-family:'Oswald',sans-serif;color:#1B5E20;font-size:0.85rem;font-weight:600;margin-bottom:8px;">ESPECIALIDAD</div>
            <div style="font-size:0.9rem;">${o.especialidad_mof
              ? `<span style="color:#2E7D32;font-weight:700;">✅ Montaña o Frontera</span><br><small>Egreso Grupo de Montaña: ${o.anio_egreso_grupo_montana||'sin registro'}</small>`
              : `<span style="color:#C62828;font-weight:700;">❌ Sin especialidad</span>${o.motivo_perdida_esp?`<br><small>${o.motivo_perdida_esp}</small>`:''}`
            }</div>
          </div>
          ${o.acipol_inicio ? `
          <div style="background:#FFF8E1;border-radius:8px;padding:16px;margin-bottom:16px;">
            <div style="font-family:'Oswald',sans-serif;color:#E65100;font-size:0.85rem;font-weight:600;margin-bottom:8px;">ACIPOL / PERFECCIONAMIENTO</div>
            <div style="font-size:0.85rem;">Inicio: ${Utils.fechaStr(o.acipol_inicio)}<br>Retorno estimado: ${Utils.fechaStr(o.acipol_retorno)}</div>
          </div>` : ''}
          <div style="background:#F5F5F5;border-radius:8px;padding:16px;">
            <div style="font-family:'Oswald',sans-serif;color:#263238;font-size:0.85rem;font-weight:600;margin-bottom:8px;">FORMACIÓN ACADÉMICA</div>
            ${formacion.length ? formacion.map(f=>`<div style="font-size:0.82rem;padding:4px 0;border-bottom:1px solid #e0e0e0;">
              <span style="font-weight:600;">${f.tipo}</span> — ${f.titulo}<br>
              <small style="color:#666;">${f.institucion}, ${f.anio}${f.duracion?' ('+f.duracion+')':''}</small>
            </div>`).join('') : '<div style="font-size:0.82rem;color:#999;">Sin registros de formación</div>'}
          </div>
        </div>
      </div>
      ${o.observaciones ? `<div style="margin-top:16px;background:#E3F2FD;border-radius:8px;padding:12px;font-size:0.85rem;"><b>Observaciones:</b> ${o.observaciones}</div>` : ''}
    `;
    abrirModal('modal-ficha-oficial');
  },

  abrirNuevo() {
    this.editandoId = null;
    document.getElementById('modal-oficial-title').textContent = 'NUEVO OFICIAL';
    document.getElementById('form-oficial').reset();
    document.getElementById('formacion-lista').innerHTML = '';
    this.formacionItems = [];
    abrirModal('modal-oficial');
  },

  abrirEditar(id) {
    const o = this.data.find(x => x.id === id);
    if (!o) return;
    this.editandoId = id;
    document.getElementById('modal-oficial-title').textContent = 'EDITAR OFICIAL';
    const f = document.getElementById('form-oficial');
    f.of_nombre.value           = o.nombre || '';
    f.of_rut.value              = o.rut || '';
    f.of_grado.value            = o.grado || '';
    f.of_fecha_ascenso.value    = o.fecha_ascenso_grado || '';
    f.of_mof.value              = o.especialidad_mof ? 'true' : 'false';
    f.of_anio_grupo.value       = o.anio_egreso_grupo_montana || '';
    f.of_cuartel.value          = o.cuartel_id || '';
    f.of_cargo.value            = o.cargo_actual || '';
    f.of_fecha_ingreso.value    = o.fecha_ingreso_cuartel || '';
    f.of_estado.value           = o.estado || 'ACTIVO';
    f.of_motivo_fuera.value     = o.motivo_fuera_frontera || '';
    f.of_puede_volver.value     = o.puede_volver || 'SI';
    f.of_fecha_disp.value       = o.fecha_disponibilidad || '';
    f.of_acipol_ini.value       = o.acipol_inicio || '';
    f.of_acipol_ret.value       = o.acipol_retorno || '';
    f.of_observaciones.value    = o.observaciones || '';
    this.formacionItems = Array.isArray(o.formacion) ? [...o.formacion] : [];
    this.renderFormacion();
    abrirModal('modal-oficial');
  },

  formacionItems: [],

  agregarFormacion() {
    const tipo = document.getElementById('form-tipo').value;
    const titulo = document.getElementById('form-titulo').value;
    const inst = document.getElementById('form-inst').value;
    const anio = document.getElementById('form-anio').value;
    const dur  = document.getElementById('form-dur').value;
    if (!titulo || !tipo) return toast('Ingresa al menos tipo y título','warning');
    this.formacionItems.push({ tipo, titulo, institucion:inst, anio, duracion:dur });
    this.renderFormacion();
    ['form-titulo','form-inst','form-anio','form-dur'].forEach(id => document.getElementById(id).value='');
  },

  renderFormacion() {
    const cont = document.getElementById('formacion-lista');
    if (!cont) return;
    cont.innerHTML = this.formacionItems.map((f,i)=>`
      <div style="display:flex;align-items:center;gap:8px;padding:6px 8px;background:#f5f5f5;border-radius:6px;margin-bottom:4px;font-size:0.82rem;">
        <span style="font-weight:600;">${f.tipo}</span> — ${f.titulo} · ${f.institucion} ${f.anio}
        <button onclick="Oficiales.quitarFormacion(${i})" style="margin-left:auto;background:none;border:none;color:#C62828;cursor:pointer;font-size:1rem;">✕</button>
      </div>`).join('');
  },

  quitarFormacion(i) { this.formacionItems.splice(i,1); this.renderFormacion(); },

  async guardar() {
    const f = document.getElementById('form-oficial');
    const payload = {
      nombre:                 f.of_nombre.value.trim(),
      rut:                    f.of_rut.value.trim(),
      grado:                  f.of_grado.value,
      fecha_ascenso_grado:    f.of_fecha_ascenso.value,
      especialidad_mof:       f.of_mof.value === 'true',
      anio_egreso_grupo_montana: f.of_anio_grupo.value ? parseInt(f.of_anio_grupo.value) : null,
      cuartel_id:             f.of_cuartel.value || null,
      cargo_actual:           f.of_cargo.value || null,
      fecha_ingreso_cuartel:  f.of_fecha_ingreso.value || null,
      estado:                 f.of_estado.value,
      motivo_fuera_frontera:  f.of_motivo_fuera.value || null,
      puede_volver:           f.of_puede_volver.value,
      fecha_disponibilidad:   f.of_fecha_disp.value || null,
      acipol_inicio:          f.of_acipol_ini.value || null,
      acipol_retorno:         f.of_acipol_ret.value || null,
      observaciones:          f.of_observaciones.value.trim(),
      formacion:              this.formacionItems,
      updated_at:             new Date().toISOString()
    };

    if (!payload.nombre || !payload.grado || !payload.fecha_ascenso_grado) {
      return toast('Completa nombre, grado y fecha de ascenso', 'error');
    }

    let error;
    if (this.editandoId) {
      ({ error } = await sb.from('oficiales').update(payload).eq('id', this.editandoId));
    } else {
      ({ error } = await sb.from('oficiales').insert(payload));
    }

    if (error) return toast('Error al guardar: ' + error.message, 'error');
    toast('Oficial guardado correctamente');
    cerrarModal('modal-oficial');
    await this.cargar();
    Dashboard.cargar();
  },

  async darDeBaja(id) {
    if (!confirm('¿Confirma dar de baja a este oficial? Se generará la vacante automáticamente.')) return;
    const { error } = await sb.from('oficiales').update({ estado:'BAJA', cuartel_id:null, cargo_actual:null, updated_at:new Date().toISOString() }).eq('id', id);
    if (error) return toast('Error: ' + error.message, 'error');
    toast('Oficial dado de baja. Vacante generada.');
    await this.cargar();
    Dashboard.cargar();
  },

  poblarSelectores() {
    const sel = document.getElementById('of_cuartel');
    if (sel) {
      sel.innerHTML = `<option value="">— Sin cuartel asignado —</option>` +
        this.cuarteles.map(c=>`<option value="${c.id}">${c.nombre} (${c.region})</option>`).join('');
    }
  },

  buscar(q) {
    this.filtro = q.toLowerCase();
    this.renderTabla();
  }
};
