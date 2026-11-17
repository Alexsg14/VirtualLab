import {descargaPipeta,detenerDescargaPipeta} from '../instruments/pipette.js';
import {llaveBureta, cerrarLlaveBureta} from '../instruments/burette.js';
import { calcularConcentraciones } from '../core/solution.ts';
import { SOLUTOS, NOMBRES_RECIPIENTE, formatearTextoQuimico } from '../data/catalog.ts';
import { labState, fluidPhysics } from '../state/laboratory.js';
import { getRecActivo, getCapacidadMax, actualizarBotonesCapacidad } from './vessels.js';
import { grifo, cerrarGrifo } from '../instruments/water.js';
import { guardarReservaPersistente } from '../storage/reserve.js';
import { vertidoActivo, finalizarVertido } from '../instruments/pouring.js';
import { recalcular } from '../ui/results.js';
import { actualizarEscena3D } from '../scene/engine.js';
import { renderizarRecipienteSVG } from '../scene/svg.js';

export function guardarSnapshot() {
  labState.snapshotAnterior = {
    montajeDosificador:structuredClone(labState.montajeDosificador??null),
    valoracion: structuredClone(labState.valoracion??null),
    reservas: JSON.parse(JSON.stringify(labState.reservas)),
    instrumentos: JSON.parse(JSON.stringify(labState.instrumentos)),
    r1: structuredClone(labState.r1),
    r2: structuredClone(labState.r2),
    historial: [...labState.historial]
  };
}

// ============================================================
// AGREGAR SOLUTO
// ============================================================
// Aproximacion didactica: volumen aparente constante por gramo de soluto.

export function deshacerOperacion() {
  if(descargaPipeta.timer!==null)detenerDescargaPipeta();
  if(llaveBureta.timer!==null) cerrarLlaveBureta();
  if(vertidoActivo) finalizarVertido();
  if (!labState.snapshotAnterior) return;
  if(grifo.timer!==null) cerrarGrifo();
  if(labState.snapshotAnterior.instrumentos) labState.instrumentos=JSON.parse(JSON.stringify(labState.snapshotAnterior.instrumentos));
  if(labState.snapshotAnterior.reservas) labState.reservas=JSON.parse(JSON.stringify(labState.snapshotAnterior.reservas));
  guardarReservaPersistente();
  labState.montajeDosificador=structuredClone(labState.snapshotAnterior.montajeDosificador??null);
  labState.valoracion=structuredClone(labState.snapshotAnterior.valoracion??null);
  labState.r1 = structuredClone(labState.snapshotAnterior.r1);
  labState.r2 = structuredClone(labState.snapshotAnterior.r2);
  labState.historial = [...labState.snapshotAnterior.historial];
  labState.snapshotAnterior = null;

  fluidPhysics.currentVol1 = labState.r1.volMl;
  fluidPhysics.targetVol1  = labState.r1.volMl;
  fluidPhysics.currentVol2 = labState.r2.volMl;
  fluidPhysics.targetVol2  = labState.r2.volMl;

  actualizarBotonesCapacidad();
  recalcular();
  renderizarRecipienteSVG(1);
  renderizarRecipienteSVG(2);
  renderizarHistorial();
  actualizarEscena3D();
}

// ============================================================
// RECALCULAR — Actualización del DOM
// ============================================================

export function agregarAlHistorial(entrada) {
  const ahora = new Date();
  const ts = ahora.getHours().toString().padStart(2,'0') + ':' +
             ahora.getMinutes().toString().padStart(2,'0') + ':' +
             ahora.getSeconds().toString().padStart(2,'0');
  labState.historial.push({ ...entrada, timestamp: ts });
}

export function renderizarHistorial() {
  const cuaderno = document.getElementById('cuaderno-hist');
  if (labState.historial.length === 0) {
    cuaderno.innerHTML = '<div class="cuaderno-linea" style="color:#888;font-style:italic;">Las operaciones aparecerán aquí...</div>';
    return;
  }

  const entradas = [...labState.historial].reverse().slice(0, 30);
  cuaderno.innerHTML = entradas.map(e => {
    let desc = '';
    if (e.tipo === 'soluto')    desc = `➕ ${e.cantidad} de ${e.formula}`;
    else if (e.tipo === 'instrumento') desc = e.soluto+' · '+e.cantidad;
    else if (e.tipo === 'disolvente') desc = `💧 ${e.cantidad} de ${e.formula}`;
    else if (e.tipo === 'vaciar')    desc = `🗑️ Recipiente vaciado`;
    else if (e.tipo === 'vertido') desc = e.soluto+' · '+e.cantidad;
    else if (e.tipo === 'mezcla')    desc = `🔄 Mezcla R1+R2`;
    else if (e.tipo === 'cambio_recipiente') desc = `🧫 Cambio: ${e.soluto}`;
    else if (e.tipo === 'agitacion') desc = `🌀 Agitación / Remolino (${e.cantidad})`;
    else                              desc = e.tipo;

    return `<div class="cuaderno-linea">
      <span class="cuaderno-ts">${e.timestamp}</span> ${formatearTextoQuimico(desc)}
    </div>`;
  }).join('');
}

// ============================================================
// EXPORTAR TXT
// ============================================================

export function exportarTXT() {
  const rec = getRecActivo();
  const s = SOLUTOS.find(x => x.id === rec.soluteId);
  const c=calcularConcentraciones(rec);
  const hayLiquido=rec.volMl>0 && rec.masaG>0;
  const molaridad=hayLiquido?c.molaridad.toFixed(4):'-';
  const masica=hayLiquido?c.masica.toFixed(3):'-';
  const pMasa=rec.masaG>0?c.pMasa.toFixed(3):'-';
  const ppm=rec.masaG>0?c.ppm.toFixed(1):'-';

  const lineas = [
    '================================================',
    '   LABORATORIO VIRTUAL DE SOLUCIONES QUÍMICAS',
    '================================================',
    `Fecha: ${new Date().toLocaleString('es-ES')}`,
    `Modo educativo: ${labState.modo}`,
    '',
    '--- RECIPIENTE ACTIVO ---',
    `Tipo: ${NOMBRES_RECIPIENTE[rec.tipo]}`,
    `Capacidad máxima: ${getCapacidadMax(rec)} mL`,
    `Soluto: ${s ? s.nombre : rec.soluteId} (${s ? s.formula : ''})`,
    `Masa de soluto: ${rec.masaG.toFixed(4)} g`,
    `Moles de soluto: ${rec.molesN.toFixed(5)} mol`,
    `Temperatura: ${(rec.temperaturaC??25).toFixed(1)} °C`,
    `Componentes: ${Object.keys(rec.componentes||{}).join(", ") || rec.soluteId}`,
    `Agua equivalente a 25 °C: ${rec.volH2OMl.toFixed(3)} mL`,
    `Densidad calculada: ${rec.modeloVolumen?.densidadGmL?.toFixed(6)??"n.d."} g/mL`,
    `Modelo de volumen: ${rec.modeloVolumen?.modelo??"n.d."}`,
    `Fuente: ${rec.modeloVolumen?.fuente??"Aproximación sin datos específicos"}`,
    `Avisos: ${rec.modeloVolumen?.avisos?.join(" ")||"Sin avisos"}`,
    `Volumen final de disolucion: ${rec.volMl.toFixed(1)} mL`,
    '',
    '--- CONCENTRACIONES CALCULADAS ---',
    `Molaridad (C): ${molaridad} mol/L`,
    `Concentración másica (Cm): ${masica} g/L`,
    `% masa: ${pMasa} %`,
    `ppm: ${ppm} ppm`,
    '',
    '--- HISTORIAL DE OPERACIONES ---',
    ...labState.historial.map(e => {
      if (e.tipo === 'soluto')    return `[${e.timestamp}] + ${e.cantidad} de ${e.formula}`;
      if (e.tipo === 'instrumento') return '['+e.timestamp+'] '+e.soluto+' '+e.cantidad;
      if (e.tipo === 'disolvente') return `[${e.timestamp}] + ${e.cantidad} de H2O`;
      if (e.tipo === 'vaciar')    return `[${e.timestamp}] Recipiente vaciado`;
      if (e.tipo === 'vertido') return '['+e.timestamp+'] '+e.soluto+' '+e.cantidad;
      if (e.tipo === 'mezcla')    return `[${e.timestamp}] Mezcla R1 + R2`;
      if (e.tipo === 'cambio_recipiente') return `[${e.timestamp}] Cambio: ${e.soluto}`;
      if (e.tipo === 'agitacion') return `[${e.timestamp}] Agitación: ${e.cantidad}`;
      return `[${e.timestamp}] ${e.tipo}`;
    }),
    '',
    '================================================'
  ];

  const blob = new Blob([formatearTextoQuimico(lineas.join('\n'))], { type: 'text/plain;charset=utf-8' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'experimento_quimica_' + Date.now() + '.txt';
  a.click();
  window.URL.revokeObjectURL(url);
}

// ============================================================
// CALCULADORA DE DILUCIÓN
// ============================================================
