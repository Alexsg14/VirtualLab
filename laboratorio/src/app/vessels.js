import { CAPACIDADES, NOMBRES_RECIPIENTE } from '../data/catalog.ts';
import { labState } from '../state/laboratory.js';
import { panelLaboratorioAbierto, cerrarPanelLaboratorio } from '../ui/panels.js';
import { actualizarInfoSoluto } from '../ui/solute-controls.js';
import { limpiarError } from '../ui/validation.js';
import { guardarSnapshot, agregarAlHistorial } from './history.js';
import { vertidoActivo } from '../instruments/pouring.js';
import { recalcular } from '../ui/results.js';
import { actualizarEscena3D } from '../scene/engine.js';
import { renderizarRecipienteSVG } from '../scene/svg.js';

export function getRecActivo() {
  return labState.mesaActiva === 1 ? labState.r1 : labState.r2;
}

export function getCapacidadMax(rec) {
  return (rec && rec.capacidadMax > 0) ? rec.capacidadMax : (CAPACIDADES[rec ? rec.tipo : 'vaso'] || 500);
}

// ============================================================
// MODO ESO / BACHILLERATO
// ============================================================

export function setModo(modo) {
  labState.modo = modo;
  document.getElementById('btn-eso').classList.toggle('activo', modo === 'ESO');
  document.getElementById('btn-bach').classList.toggle('activo', modo === 'Bachillerato');
  aplicarModo();
  recalcular();
}

export function aplicarModo() {
  const esBach = labState.modo === 'Bachillerato';
  document.getElementById('seccion-dilucion').style.display = esBach ? 'block' : 'none';
  document.getElementById('menu-dilucion').hidden = !esBach;
  if(!esBach && panelLaboratorioAbierto==='dilucion') cerrarPanelLaboratorio(false);
  document.getElementById('row-molalidad').style.display = esBach ? 'flex' : 'none';
}

// ============================================================
// SELECTOR DE RECIPIENTE (CORRECCIÓN PUNTO 2)
// Traspaso seguro de volumen y adaptación de capacidad
// ============================================================

export function selRecipiente(tipo) {
  if(tipo==='pipeta' || tipo==='bureta') return;
  guardarSnapshot();
  const rec = getRecActivo();
  const tipoAnterior = rec.tipo;
  rec.tipo = tipo;
  labState.recipiente = tipo;

  const capDefaultNuevo = CAPACIDADES[tipo] || 500;
  const warnEl = document.getElementById('warn-capacidad');

  if (rec.volMl > 0) {
    if (rec.volMl <= capDefaultNuevo) {
      rec.capacidadMax = capDefaultNuevo;
      if (warnEl) warnEl.textContent = '';
    } else {
      rec.capacidadMax = Math.max(capDefaultNuevo, Math.ceil(rec.volMl / 10) * 10);
      if (warnEl) {
        warnEl.textContent = `ℹ Capacidad de ${NOMBRES_RECIPIENTE[tipo]} adaptada a ${rec.capacidadMax} mL para alojar los ${rec.volMl.toFixed(1)} mL existentes.`;
      }
    }
  } else {
    rec.capacidadMax = capDefaultNuevo;
    if (warnEl) warnEl.textContent = '';
  }

  document.getElementById('inp-capacidad').value = rec.capacidadMax;
  actualizarBotonesCapacidad();

  document.querySelectorAll('.recipiente-btn').forEach(b => b.classList.remove('activo'));
  const btn = document.getElementById('rbtn-' + tipo);
  if (btn) btn.classList.add('activo');

  limpiarError('err-disolvente');
  limpiarError('err-soluto');

  if (rec.volMl > 0 || rec.masaG > 0) {
    agregarAlHistorial({
      tipo: 'cambio_recipiente',
      soluto: `${NOMBRES_RECIPIENTE[tipoAnterior]} ➔ ${NOMBRES_RECIPIENTE[tipo]}`,
      formula: '—',
      cantidad: `${rec.volMl.toFixed(1)} mL`,
      unidad: 'mL'
    });
  }

  recalcular();
  renderizarRecipienteSVG(labState.mesaActiva);
  actualizarEscena3D();
}

// ============================================================
// CONTROL DE CAPACIDAD MÁXIMA DEL RECIPIENTE
// ============================================================

export function setCapacidadRapida(valorMl) {
  document.getElementById('inp-capacidad').value = valorMl;
  cambiarCapacidad(valorMl);
}

export function cambiarCapacidadInput() {
  const val = parseFloat(document.getElementById('inp-capacidad').value);
  if (!isNaN(val) && val > 0) {
    cambiarCapacidad(val);
  }
}

export function cambiarCapacidad(nuevaCap) {
  const rec = getRecActivo();
  nuevaCap = Math.max(10, Math.min(10000, Number(nuevaCap)));
  const warnEl = document.getElementById('warn-capacidad');
  if (rec.volMl > nuevaCap) {
    warnEl.textContent = 'La capacidad no puede ser menor que el volumen existente.';
    document.getElementById('inp-capacidad').value = getCapacidadMax(rec);
    return;
  }
  guardarSnapshot();
  rec.capacidadMax = nuevaCap;
  warnEl.textContent = '';

  actualizarBotonesCapacidad();
  recalcular();
  renderizarRecipienteSVG(labState.mesaActiva);
  actualizarEscena3D();
}

export function actualizarBotonesCapacidad() {
  const rec = getRecActivo();
  const cap = getCapacidadMax(rec);
  document.getElementById('inp-capacidad').value = cap;
  [50, 100, 250, 500, 1000, 2000].forEach(v => {
    const btn = document.getElementById('pcap-' + v);
    if (btn) btn.classList.toggle('activo', cap === v);
  });
}

// ============================================================
// SELECCIONAR RECIPIENTE DE MESA
// ============================================================

export function seleccionarMesa(num) {
  if(vertidoActivo)return;
  labState.mesaActiva = num;
  document.getElementById('wrapper-r1').style.opacity = num === 1 ? '1' : '0.5';
  document.getElementById('wrapper-r2').style.opacity = num === 2 ? '1' : '0.5';

  const pill1 = document.getElementById('pill-r1');
  const pill2 = document.getElementById('pill-r2');
  if (pill1 && pill2) {
    pill1.style.opacity = num === 1 ? '1' : '0.6';
    pill1.style.borderColor = num === 1 ? 'var(--accent-cyan)' : 'var(--border-color)';
    pill2.style.opacity = num === 2 ? '1' : '0.6';
    pill2.style.borderColor = num === 2 ? 'var(--accent-cyan)' : 'var(--border-color)';
  }

  const rec = getRecActivo();
  document.querySelectorAll('.recipiente-btn').forEach(b => b.classList.remove('activo'));
  const btn = document.getElementById('rbtn-' + rec.tipo);
  if (btn) btn.classList.add('activo');
  labState.recipiente = rec.tipo;

  const selSol = document.getElementById('sel-soluto');
  if (selSol && rec.soluteId) {
    selSol.value = rec.soluteId;
    actualizarInfoSoluto();
  }

  actualizarBotonesCapacidad();
  recalcular();
  actualizarEscena3D();
}

// ============================================================
// SOLUTO: INFO Y SINCRONIZACIÓN GRAMOS↔MOLES
// ============================================================
