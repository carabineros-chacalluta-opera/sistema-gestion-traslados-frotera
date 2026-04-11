// ═══════════════════════════════════════════════════════════════
// SIGDOF · Módulo Fiscalizador v2.0
// ═══════════════════════════════════════════════════════════════

const Fiscalizador = {
  _chartDona: null,

  async cargar() {
    const [{ data:cuarteles },{ data:oficiales }] = await Promise.all([
      sb.from('cuarteles').select('*').eq('activo',true).order('region'),
      sb.from('oficiales').select('*').in('estado',['ACTIVO','PERFECCIONAMIENTO'])
    ]);

    this.renderTabla(cuarteles||[], oficiales||[]);
    this.renderGraficoRegiones(cuarteles||[], oficiales||[]);
    this.renderGraficoDona(oficiales||[]);
  },

  renderTabla(cuarteles, oficiales) {
    const cont = document.getElementById('tabla-fisc-body');
    if (!cont) return;
    cont.innerHTML = cuarteles.map(c => {
      const asignados    = oficiales.filter(o=>o.cuartel_id===c.id&&o.estado==='ACTIVO');
      const especialistas = asignados.filter(o=>o.especialidad_mof);
      const optimo = Utils.dotacionOptima(c);
      const rotRegla = Utils.aniosRotacion(c.zona_trat_pct);
      const pct = optimo>0?Math.round((asignados.length/optimo)*100):0;
      let estado, color;
      if (pct>=100 && especialistas.length===asignados.length) { estado='✅ Completo'; color='#E8F5E9'; }
      else if (pct>0) { estado='⚠️ Parcial'; color='#FFFDE7'; }
      else { estado='🔴 Sin dotación'; color='#FFEBEE'; }
      return `<tr style="background:${color};">
        <td style="font-weight:600;">${c.nombre}</td>
        <td style="font-size:0.82rem;">${c.region}</td>
        <td><span class="badge badge-${Utils.colorCriticidad(c.criticidad)}">${c.criticidad}</span></td>
        <td style="text-align:center;font-weight:700;color:${Utils.colorZona(c.zona_trat_pct)};">${c.zona_trat_pct}%</td>
        <td style="text-align:center;">${optimo}</td>
        <td style="text-align:center;font-weight:700;">${asignados.length}</td>
        <td style="text-align:center;"><span class="${especialistas.length===asignados.length&&asignados.length>0?'badge badge-verde':'badge badge-rojo'}">${especialistas.length}/${asignados.length}</span></td>
        <td style="text-align:center;">${rotRegla} años</td>
        <td>${estado}</td>
      </tr>`;
    }).join('');
  },

  renderGraficoRegiones(cuarteles, oficiales) {
    Charts.renderBarrasRegion(cuarteles, oficiales);
  },

  renderGraficoDona(oficiales) {
    const ctx = document.getElementById('chart-dona-fisc');
    if (!ctx) return;
    if (this._chartDona) this._chartDona.destroy();
    const enF = oficiales.filter(o=>o.especialidad_mof&&o.cuartel_id&&o.estado==='ACTIVO').length;
    const bol = oficiales.filter(o=>Utils.esEnBolsa(o)).length;
    const prf = oficiales.filter(o=>o.especialidad_mof&&o.estado==='PERFECCIONAMIENTO').length;
    this._chartDona = new Chart(ctx, {
      type:'doughnut',
      data: {
        labels:['En frontera','Bolsa','Perfeccionamiento'],
        datasets:[{ data:[enF,bol,prf], backgroundColor:['#2E7D32','#4CAF50','#F9A825'], borderWidth:2 }]
      },
      options:{ responsive:true, plugins:{ legend:{ position:'bottom' } } }
    });
  }
};
