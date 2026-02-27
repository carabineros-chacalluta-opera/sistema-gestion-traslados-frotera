// ═══════════════════════════════════════════════════════════════
// SIGDOF · Simulador de Traslados + Planes
// ═══════════════════════════════════════════════════════════════

const Simulador = {
  cuarteles: [], oficiales: [],
  selOficial: null, selCuartel: null, selCargo: null,

  async cargar() {
    const [{ data:c },{ data:o }] = await Promise.all([
      sb.from('cuarteles').select('*').eq('activo',true).order('nombre'),
      sb.from('oficiales').select('*').in('estado',['ACTIVO','PERFECCIONAMIENTO']).order('nombre')
    ]);
    this.cuarteles = c||[];
    this.oficiales = o||[];
    this.poblarSelectores();
  },

  poblarSelectores() {
    const selOf = document.getElementById('sim-oficial');
    if (selOf) selOf.innerHTML = `<option value="">— Seleccionar oficial —</option>` +
      this.oficiales.map(o=>`<option value="${o.id}">${GRADOS_LABEL[o.grado]} ${o.nombre}${o.especialidad_mof?' ⭐':''}</option>`).join('');

    const selC = document.getElementById('sim-cuartel');
    if (selC) selC.innerHTML = `<option value="">— Seleccionar cuartel destino —</option>` +
      this.cuarteles.map(c=>`<option value="${c.id}">${c.nombre} · ${c.region} (${c.criticidad})</option>`).join('');
  },

  seleccionarOficial(id) {
    this.selOficial = this.oficiales.find(o=>o.id===id)||null;
    this.renderPanelOficial();
    this.calcular();
  },

  seleccionarCuartel(id) {
    this.selCuartel = this.cuarteles.find(c=>c.id===id)||null;
    this.renderCargosDisponibles();
    this.calcular();
  },

  seleccionarCargo(cargo) {
    this.selCargo = cargo;
    this.calcular();
  },

  renderPanelOficial() {
    const cont = document.getElementById('sim-panel-oficial');
    if (!cont || !this.selOficial) return;
    const o = this.selOficial;
    const aniosHastaAsc = Utils.aniosHastaAscenso(o.grado, o.fecha_ascenso_grado);
    const gradoSig = GRADO_SIGUIENTE[o.grado];
    const pctGrado = ANIOS_MIN_ASCENSO[o.grado] ? Math.min(100,(Utils.aniosDecimal(o.fecha_ascenso_grado)/ANIOS_MIN_ASCENSO[o.grado])*100) : 100;
    cont.innerHTML = `
      <div style="background:#E8F5E9;border-radius:8px;padding:14px;">
        <div style="font-weight:700;font-size:0.95rem;margin-bottom:8px;">${o.nombre}</div>
        <div style="font-size:0.82rem;margin-bottom:6px;">${badgeGrado(o.grado)}</div>
        <div style="font-size:0.8rem;color:#546E7A;margin-bottom:8px;">
          Antigüedad en grado: ${Utils.aniosMeses(o.fecha_ascenso_grado).texto}
        </div>
        <div class="progress-wrap"><div class="progress-bar progress-${pctGrado>=90?'rojo':pctGrado>=70?'amarillo':'verde'}" style="width:${pctGrado}%"></div></div>
        <div class="progress-label">Próximo ascenso (${GRADOS_LABEL[gradoSig]||'—'}): ${aniosHastaAsc>90?'sin proyección':aniosHastaAsc.toFixed(1)+' años'}</div>
        <div style="margin-top:10px;">
          <span class="badge ${o.especialidad_mof?'badge-verde':'badge-rojo'}">${o.especialidad_mof?'✅ Especialidad M o F':'❌ Sin especialidad'}</span>
        </div>
      </div>`;
  },

  renderCargosDisponibles() {
    const cont = document.getElementById('sim-cargos');
    if (!cont || !this.selCuartel) return;
    const c = this.selCuartel;
    const cargosOptimos = [
      { key:'COMISARIO',   num: c.dot_comisario  },
      { key:'SUBCOM_SERV', num: c.dot_subcom_serv},
      { key:'SUBCOM_ADM',  num: c.dot_subcom_adm },
      { key:'JEFE_TEN',    num: c.dot_jefe_ten   },
      { key:'OF_OP',       num: c.dot_of_op      }
    ].filter(x=>x.num>0);

    cont.innerHTML = `
      <div style="font-size:0.8rem;font-weight:700;color:#1B5E20;margin-bottom:8px;text-transform:uppercase;letter-spacing:0.05em;">Cargos en dotación óptima</div>
      ${cargosOptimos.map(x=>`
        <div onclick="Simulador.seleccionarCargo('${x.key}')" style="
          padding:8px 12px;margin-bottom:4px;border-radius:6px;cursor:pointer;
          border:2px solid ${this.selCargo===x.key?'#2E7D32':'#e0e0e0'};
          background:${this.selCargo===x.key?'#E8F5E9':'white'};
          transition:all 0.15s;font-size:0.85rem;font-weight:${this.selCargo===x.key?'700':'400'};
        ">${CARGOS_LABEL[x.key]} <small style="color:#999">(${x.num} cargo${x.num>1?'s':''})</small></div>
      `).join('')}`;
  },

  calcular() {
    const cont = document.getElementById('sim-resultado');
    if (!cont) return;
    if (!this.selOficial || !this.selCuartel || !this.selCargo) {
      cont.innerHTML = `<div class="empty-state" style="padding:32px;"><div class="empty-icon">⚡</div><p>Selecciona un oficial, cuartel destino y cargo para ver el análisis.</p></div>`;
      return;
    }
    const resultado = Utils.validarAsignacion(this.selOficial, this.selCargo, { ...this.selCuartel, fecha_ingreso_cuartel: null });
    const permanencia = resultado.permanencia;
    const colorPerm = permanencia >= 4 ? '#2E7D32' : permanencia >= 2 ? '#F9A825' : '#C62828';
    const justif = Utils.generarJustificacion(this.selOficial, this.selCargo, this.selCuartel, 'SE_TRASLADA');

    cont.innerHTML = `
      <div class="simulador-panel ${resultado.valido?'resultado-valido':'resultado-invalido'}" style="height:100%;">
        <div class="simulador-panel-header">${resultado.valido?'✅ ASIGNACIÓN VÁLIDA':'❌ ASIGNACIÓN INVÁLIDA'}</div>
        <div class="simulador-panel-body">
          <div style="text-align:center;margin-bottom:16px;">
            <div style="font-family:'Oswald',sans-serif;font-size:3rem;font-weight:700;color:${colorPerm};line-height:1;">${permanencia.toFixed(1)}</div>
            <div style="font-size:0.8rem;color:#546E7A;">años de permanencia proyectada</div>
          </div>
          ${resultado.errores.map(e=>`<div class="validacion-item validacion-err">❌ ${e}</div>`).join('')}
          ${resultado.advertencias.map(a=>`<div class="validacion-item" style="color:#E65100;">⚠️ ${a}</div>`).join('')}
          ${resultado.valido && !resultado.errores.length ? `<div class="validacion-item validacion-ok">✅ Grado compatible con cargo</div>
          <div class="validacion-item validacion-ok">${this.selOficial.especialidad_mof?'✅ Especialidad Montaña o Frontera vigente':'❌ Sin especialidad'}</div>
          <div class="validacion-item validacion-ok">✅ Proyección de ascenso compatible</div>` : ''}
          <div style="margin-top:12px;">
            <div style="font-size:0.75rem;font-weight:700;color:#263238;text-transform:uppercase;margin-bottom:6px;">Justificación automática</div>
            <div class="justificacion-box" id="justif-text" contenteditable="true">${justif}</div>
          </div>
          ${resultado.valido ? `
          <div style="margin-top:12px;display:flex;gap:8px;">
            <button class="btn btn-primary" style="flex:1;" onclick="Planes.agregarMovimiento()">➕ Agregar al Plan</button>
          </div>` : `
          <div style="margin-top:12px;">
            <button class="btn btn-outline" style="width:100%;" onclick="Simulador.aplicarExcepcion()">⚠️ Aplicar excepción operativa</button>
          </div>`}
        </div>
      </div>`;
  },

  aplicarExcepcion() {
    const motivo = prompt('Justificación de excepción operativa (obligatorio):');
    if (!motivo?.trim()) return toast('Debe ingresar una justificación para la excepción','error');
    toast('Excepción operativa registrada. Puede agregar al plan.','warning');
    document.getElementById('sim-resultado')?.querySelector('.btn-outline')?.remove();
    Planes.agregarMovimiento(true, motivo);
  },

  precargar(oficialId) {
    navegarA('simulador');
    setTimeout(() => {
      const sel = document.getElementById('sim-oficial');
      if (sel) { sel.value = oficialId; Simulador.seleccionarOficial(oficialId); }
    }, 300);
  }
};

// ─────────────────────────────────────────────────────────────────
const Planes = {
  planActual: null, movimientos: [], cuarteles: [], oficiales: [],

  async cargar() {
    const anio = new Date().getFullYear();
    const [{ data:planes },{ data:c },{ data:o }] = await Promise.all([
      sb.from('planes_traslado').select('*').order('created_at', {ascending:false}),
      sb.from('cuarteles').select('*').eq('activo',true),
      sb.from('oficiales').select('*').in('estado',['ACTIVO','PERFECCIONAMIENTO'])
    ]);
    this.cuarteles = c||[];
    this.oficiales = o||[];
    this.renderListaPlanes(planes||[]);

    const borrador = (planes||[]).find(p=>p.anio===anio&&p.estado==='BORRADOR');
    if (borrador) {
      this.planActual = borrador;
      await this.cargarMovimientos(borrador.id);
    }
    this.renderPlanActual();
  },

  async cargarMovimientos(planId) {
    const { data } = await sb.from('movimientos').select('*, oficiales(nombre,grado), cuarteles_destino:cuartel_destino_id(nombre)').eq('plan_id', planId);
    this.movimientos = data||[];
  },

  renderListaPlanes(planes) {
    const cont = document.getElementById('lista-planes');
    if (!cont) return;
    if (!planes.length) { cont.innerHTML = '<p style="color:#999;font-size:0.85rem;">Sin planes anteriores</p>'; return; }
    cont.innerHTML = planes.map(p=>`
      <div style="display:flex;align-items:center;justify-content:space-between;padding:10px;border:1px solid #e0e0e0;border-radius:8px;margin-bottom:8px;">
        <div><b>Plan ${p.anio}</b> <span class="badge ${p.estado==='EJECUTADO'?'badge-verde':'badge-amarillo'}" style="margin-left:6px;">${p.estado}</span></div>
        <button class="btn btn-ghost btn-sm" onclick="Planes.verPlan('${p.id}')">Ver →</button>
      </div>`).join('');
  },

  async nuevoPlan() {
    const anio = new Date().getFullYear();
    const { data, error } = await sb.from('planes_traslado').insert({ anio, estado:'BORRADOR' }).select().single();
    if (error) return toast('Error: '+error.message,'error');
    this.planActual = data;
    this.movimientos = [];
    this.renderPlanActual();
    toast('Plan '+anio+' creado');
  },

  agregarMovimiento(esExcepcion=false, justifExcepcion='') {
    if (!Simulador.selOficial || !Simulador.selCuartel || !Simulador.selCargo) return toast('Selecciona oficial, cuartel y cargo','error');
    if (!this.planActual) { toast('Primero crea un plan para el año','warning'); return; }
    const justif = document.getElementById('justif-text')?.innerText || '';
    const permanencia = Utils.permanenciaProyectada(Simulador.selOficial, Simulador.selCargo, Simulador.selCuartel);
    this.movimientos.push({
      _local: true,
      oficial: Simulador.selOficial,
      cuartel_destino: Simulador.selCuartel,
      cargo_destino: Simulador.selCargo,
      tipo: 'SE_MUEVE',
      justificacion: justif,
      es_excepcion: esExcepcion,
      justif_excepcion: justifExcepcion,
      permanencia_proyectada: permanencia
    });
    this.renderPlanActual();
    toast('Movimiento agregado al plan');
  },

  renderPlanActual() {
    const cont = document.getElementById('plan-actual-body');
    if (!cont) return;
    if (!this.planActual) {
      cont.innerHTML = `<div class="empty-state"><div class="empty-icon">📋</div><p>No hay plan activo para ${new Date().getFullYear()}.</p><button class="btn btn-primary" onclick="Planes.nuevoPlan()">+ Crear Plan ${new Date().getFullYear()}</button></div>`;
      return;
    }
    if (!this.movimientos.length) {
      cont.innerHTML = `<div class="empty-state"><div class="empty-icon">📋</div><p>Plan ${this.planActual.anio} creado. Sin movimientos aún.</p><p style="margin-top:8px;font-size:0.85rem;">Usa el Simulador para agregar movimientos.</p></div>`;
      return;
    }
    cont.innerHTML = this.movimientos.map((m,i) => {
      const o = m.oficial || m.oficiales || {};
      const cd = m.cuartel_destino || m.cuarteles_destino || {};
      return `
      <div class="plan-oficial-card plan-decision-${m.tipo==='SE_MUEVE'?'mueve':'mantiene'}">
        <div style="flex:1;">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
            <span class="badge ${m.tipo==='SE_MUEVE'?'badge-azul':'badge-verde'}">${m.tipo.replace('_',' ')}</span>
            ${badgeGrado(o.grado||'')}
            <b>${o.nombre||''}</b>
            ${m.es_excepcion?'<span class="badge badge-amarillo">⚠️ Excepción operativa</span>':''}
          </div>
          <div style="font-size:0.82rem;color:#546E7A;margin-bottom:8px;">
            → ${CARGOS_LABEL[m.cargo_destino]||''} · ${cd.nombre||''} · Permanencia: <b>${(m.permanencia_proyectada||0).toFixed(1)} años</b>
          </div>
          <div class="justificacion-box" style="font-size:0.78rem;padding:8px;">${m.justificacion||''}</div>
          ${m.justif_excepcion?`<div style="margin-top:6px;font-size:0.78rem;background:#FFF8E1;padding:6px 8px;border-radius:6px;"><b>Justificación excepción:</b> ${m.justif_excepcion}</div>`:''}
        </div>
        <button onclick="Planes.quitarMovimiento(${i})" class="btn btn-ghost btn-sm btn-icon" title="Quitar">✕</button>
      </div>`;
    }).join('');
  },

  quitarMovimiento(i) {
    this.movimientos.splice(i,1);
    this.renderPlanActual();
  },

  async ejecutarPlan() {
    if (!this.planActual) return;
    if (!this.movimientos.length) return toast('El plan no tiene movimientos','warning');
    if (!confirm('¿Confirmar ejecución del plan? Esta acción es irreversible.')) return;

    for (const m of this.movimientos) {
      const mov = {
        plan_id: this.planActual.id,
        oficial_id: m.oficial?.id || m.oficial_id,
        tipo: m.tipo,
        cuartel_origen_id: m.oficial?.cuartel_id || null,
        cuartel_destino_id: m.cuartel_destino?.id || m.cuartel_destino_id,
        cargo_destino: m.cargo_destino,
        justificacion: m.justificacion,
        es_excepcion: m.es_excepcion||false,
        justif_excepcion: m.justif_excepcion||null,
        permanencia_proyectada: m.permanencia_proyectada||null
      };
      await sb.from('movimientos').insert(mov);
      if (m.tipo === 'SE_MUEVE') {
        await sb.from('oficiales').update({
          cuartel_id: mov.cuartel_destino_id,
          cargo_actual: m.cargo_destino,
          fecha_ingreso_cuartel: new Date().toISOString().split('T')[0],
          updated_at: new Date().toISOString()
        }).eq('id', mov.oficial_id);
      }
    }
    await sb.from('planes_traslado').update({ estado:'EJECUTADO', fecha_ejec: new Date().toISOString().split('T')[0] }).eq('id', this.planActual.id);
    toast('Plan ejecutado correctamente ✅');
    this.cargar();
    Dashboard.cargar();
  },

  async exportarPDF() {
    if (typeof jsPDF === 'undefined') return toast('jsPDF no disponible','error');
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation:'portrait', unit:'mm', format:'a4' });
    const anio = this.planActual?.anio || new Date().getFullYear();
    doc.setFillColor(27,94,32);
    doc.rect(0,0,210,30,'F');
    doc.setTextColor(255,255,255);
    doc.setFontSize(16); doc.setFont('helvetica','bold');
    doc.text('CARABINEROS DE CHILE', 105, 11, {align:'center'});
    doc.setFontSize(11);
    doc.text(`SIGDOF · PLAN DE TRASLADOS ${anio}`, 105, 20, {align:'center'});
    doc.setFontSize(9);
    doc.text(`Generado: ${new Date().toLocaleDateString('es-CL')}`, 105, 27, {align:'center'});
    let y = 38;
    doc.setTextColor(0,0,0);
    this.movimientos.forEach((m, i) => {
      if (y > 260) { doc.addPage(); y = 20; }
      const o = m.oficial || {};
      const cd = m.cuartel_destino || {};
      doc.setFillColor(m.tipo==='SE_MUEVE'?232:232, m.tipo==='SE_MUEVE'?244:245, m.tipo==='SE_MUEVE'?253:232);
      doc.rect(10, y, 190, 7, 'F');
      doc.setFontSize(10); doc.setFont('helvetica','bold');
      doc.text(`${i+1}. ${m.tipo.replace('_',' ')} — ${GRADOS_LABEL[o.grado]||''} ${o.nombre||''}`, 12, y+5);
      y += 9;
      doc.setFontSize(8); doc.setFont('helvetica','normal');
      const justLines = doc.splitTextToSize(m.justificacion||'', 185);
      doc.text(justLines, 12, y+3);
      y += justLines.length * 4 + 6;
    });
    doc.save(`SIGDOF_Plan_Traslados_${anio}.pdf`);
  }
};
