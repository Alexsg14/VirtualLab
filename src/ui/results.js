import {actualizarCurvaValoracion} from './titration-curve.js';
import {actualizarPanelAcidez} from './acid-base.js';
import {actualizarPanelTemperatura} from '../instruments/temperature.js';
import { calcularConcentraciones } from '../core/solution.ts';
import { SOLUTOS, NOMBRES_RECIPIENTE, formatearTextoQuimico } from '../data/catalog.ts';
import { labState } from '../state/laboratory.js';
import { getRecActivo, getCapacidadMax } from '../app/vessels.js';
import { renderizarHistorial } from '../app/history.js';
import { actualizarVolumen } from '../core/solution.ts';
import { actualizarDosificador } from '../instruments/dosing.js';
import { renderizarReserva } from '../storage/reserve.js';
import { actualizarInsignias } from '../education/achievements.js';

export function recalcular() {
  for(const estado of [labState.r1,labState.r2,...Object.values(labState.instrumentos)])actualizarVolumen(estado);
  renderizarReserva();
  actualizarDosificador();
  const rec = getRecActivo();
  const s = SOLUTOS.find(x => x.id === rec.soluteId);
  if (!s) return;

  actualizarVolumen(rec);
  actualizarPanelAcidez();
  actualizarCurvaValoracion();
  actualizarPanelTemperatura();
  document.getElementById('res-vol-disolucion').textContent = rec.volMl.toFixed(1) + ' mL';
  document.getElementById('res-vol-disolvente').textContent = rec.volH2OMl.toFixed(1) + ' mL';
  const modelo=rec.modeloVolumen;
  document.getElementById('res-delta-v-soluto').textContent = (rec.volMl - modelo.volumenAguaMl).toFixed(2) + ' mL';
  document.getElementById('res-densidad').textContent=modelo.densidadGmL?modelo.densidadGmL.toFixed(5)+' g/mL':'—';
  document.getElementById('modelo-volumen').textContent=modelo.modelo==='laliberte'?'Volumen por densidad · Laliberté (2009)':modelo.modelo==='agua'?'Agua pura · densidad según temperatura':modelo.modelo==='seco'?(rec.masaG<=0?'Recipiente vacío':'Soluto sin disolver · sin volumen de disolución'):'Volumen aproximado';
  document.getElementById('aviso-modelo-volumen').textContent=modelo.avisos.join(' ');
  document.getElementById('modelo-volumen').title=formatearTextoQuimico(modelo.fuente||'');
  const masaG  = rec.masaG;
  const molesN = rec.molesN;
  const volMl  = rec.volMl;
  const volL   = volMl / 1000;

  const {molaridad,masica,pMasa,ppm,molalidad}=calcularConcentraciones(rec);

  let fracSat = 0;
  if (volL > 0 && masaG > 0) {
    fracSat = (masaG / volL) / s.solMax;
  }
  if (fracSat > 1) fracSat = 1;

  document.getElementById('res-molaridad').textContent =
    (molesN > 0 && volL > 0) ? molaridad.toFixed(4) + ' mol/L' : '—';
  document.getElementById('res-masica').textContent =
    (masaG > 0 && volL > 0) ? masica.toFixed(3) + ' g/L' : '—';
  document.getElementById('res-pmasa').textContent =
    (pMasa > 0) ? pMasa.toFixed(3) + ' %' : '—';
  document.getElementById('res-ppm').textContent =
    (ppm > 0) ? ppm.toFixed(1) + ' ppm' : '—';
  document.getElementById('res-molalidad').textContent =
    (molalidad > 0) ? molalidad.toFixed(4) + ' mol/kg' : '—';

  const pctSatDisplay = Math.min(fracSat * 100, 100);
  document.getElementById('sat-bar').style.width = pctSatDisplay.toFixed(1) + '%';
  document.getElementById('pct-sat-label').textContent = pctSatDisplay.toFixed(1) + '%';

  let colorSat = '#4caf50';
  if (fracSat >= 0.75) colorSat = '#f44336';
  else if (fracSat >= 0.5) colorSat = '#ffeb3b';
  document.getElementById('sat-bar').style.background = colorSat;

  const alertSat = document.getElementById('alerta-saturacion');
  const esSaturada = (volL > 0 && masaG > 0) && ((masaG / volL) >= s.solMax);
  alertSat.classList.toggle('visible', esSaturada);

  const capMax = getCapacidadMax(rec);
  const pctLleno = capMax > 0 ? Math.min((volMl / capMax) * 100, 100) : 0;
  const mesaIdx = labState.mesaActiva;
  document.getElementById('nombre-r' + mesaIdx).textContent = NOMBRES_RECIPIENTE[rec.tipo];
  document.getElementById('vol-r'    + mesaIdx).textContent =
    volMl > 0 ? `${volMl.toFixed(1)} mL / ${capMax} mL` : `0 mL / ${capMax} mL`;
  document.getElementById('pct-r'    + mesaIdx).textContent =
    volMl > 0 ? `${pctLleno.toFixed(1)}% lleno` : '0% lleno';

  const cap1 = getCapacidadMax(labState.r1);
  const cap2 = getCapacidadMax(labState.r2);
  document.getElementById('label-r1-quick').textContent = `${labState.r1.volMl.toFixed(0)}/${cap1} mL${labState.mesaActiva===1 ? ' (Activo)' : ''}`;
  document.getElementById('label-r2-quick').textContent = `${labState.r2.volMl.toFixed(0)}/${cap2} mL${labState.mesaActiva===2 ? ' (Activo)' : ''}`;

  renderizarHistorial();
  actualizarInsignias();
  document.getElementById('contador-exp').textContent = labState.contadorExp;
}

// ============================================================
// HISTORIAL / CUADERNO
// ============================================================
