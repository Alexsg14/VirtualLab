import {evaluarPreparacion} from '../core/challenge.ts';
import { SOLUTOS, RETOS_PREDEFINIDOS } from '../data/catalog.ts';
import { labState } from '../state/laboratory.js';
import { guardarEnLocalStorage } from '../app/lifecycle.js';
import { getRecActivo } from '../app/vessels.js';
import { actualizarInsignias } from './achievements.js';

export function abrirDesafio() {
  document.getElementById('modal-desafio').style.display = 'flex';
  document.getElementById('res-verificacion').innerHTML = '';
  labState.desafioPrimerIntento = true;

  if (!labState.desafioActivo) {
    cargarReto(RETOS_PREDEFINIDOS[0]);
  }
}

export function cerrarDesafio() {
  document.getElementById('modal-desafio').style.display = 'none';
}

export function cerrarDesafioOverlay(e) {
  if (e.target === document.getElementById('modal-desafio')) cerrarDesafio();
}

export function cargarRetoPredefinido() {
  const idx = document.getElementById('sel-reto').value;
  if (idx === '') return;
  cargarReto(RETOS_PREDEFINIDOS[parseInt(idx)]);
}

export function cargarRetoCustom() {
  const txt = document.getElementById('inp-desafio-custom').value.trim();
  if (!txt) return;

  const match = txt.match(/(\d+(?:\.\d+)?)\s*mL\s+(\S+)\s+(\d+(?:\.\d+)?)\s*M/i);
  if (!match) {
    document.getElementById('res-verificacion').innerHTML =
      '<span style="color:#f44336;">⚠ Formato incorrecto. Usa: "250 mL NaCl 0.5 M"</span>';
    return;
  }

  const volMl = parseFloat(match[1]);
  const soluteId = match[2];
  const molL = parseFloat(match[3]);

  const s = SOLUTOS.find(x => x.id === soluteId);
  if (!s) {
    document.getElementById('res-verificacion').innerHTML =
      `<span style="color:#f44336;">⚠ Soluto "${soluteId}" no encontrado. IDs válidos: ${SOLUTOS.map(x=>x.id).join(', ')}</span>`;
    return;
  }

  cargarReto({
    texto: `Prepara ${volMl} mL de ${s.nombre} a ${molL} mol/L`,
    soluto: soluteId,
    volMl,
    molL
  });
}

export function cargarReto(reto) {
  labState.desafioActivo = reto;
  labState.desafioPrimerIntento = true;
  document.getElementById('desafio-texto').textContent = reto.texto;
  document.getElementById('desafio-texto').title='Se exige el volumen final de disolución (±0,05 mL) y la concentración objetivo (±0,2 %).';
  document.getElementById('res-verificacion').innerHTML = '';
}

export function verificarDesafio() {
  if (!labState.desafioActivo) return;
  const reto = labState.desafioActivo;
  const rec = getRecActivo();

  const resultado=evaluarPreparacion(rec,reto);
  const {correcto,solutoOk:soluteOk,volumenMl:volActualMl,molaridad:molaridadActual}=resultado;
  const difVol=Math.abs(volActualMl-reto.volMl)/reto.volMl;
  const difMol=Math.abs(molaridadActual-reto.molL)/reto.molL;
  const resEl = document.getElementById('res-verificacion');

  if (correcto) {
    resEl.innerHTML = `
      <div class="success-anim" style="color:#4caf50;font-size:28px;text-align:center;">✅ 🎉</div>
      <div style="color:#4caf50;font-weight:800;font-size:16px;text-align:center;">¡Correcto! ¡Excelente trabajo!</div>
    `;
    resEl.innerHTML += '<p>Volumen final: '+volActualMl.toFixed(3)+' mL · Concentración: '+molaridadActual.toFixed(4)+' mol/L.</p>';
    if (labState.desafioPrimerIntento && !labState.logros.precisionPerfecta) {
      labState.logros.precisionPerfecta = true;
      guardarEnLocalStorage();
      actualizarInsignias();
    }
    labState.desafioActivo = null;
  } else {
    labState.desafioPrimerIntento = false;
    let pistas = [];
    if (!soluteOk) {
      const s = SOLUTOS.find(x => x.id === reto.soluto);
      pistas.push(`💊 Soluto incorrecto: necesitas <strong>${s ? s.nombre : reto.soluto}</strong>`);
    }
    if (!resultado.volumenOk) {
      pistas.push(`📏 Volumen: tienes ${volActualMl.toFixed(3)} mL, necesitas ${reto.volMl} mL. Se comprueba el volumen final de disolución, no el agua añadida; completa por enrase.`);
    }
    if (!resultado.molaridadOk) {
      pistas.push(`🧪 Molaridad: tienes ${molaridadActual.toFixed(4)} mol/L, necesitas ${reto.molL} mol/L (diferencia: ${(difMol*100).toFixed(1)}%)`);
    }

    resEl.innerHTML = `
      <p>Margen: ±0,05 mL en volumen final y ±0,2 % en concentración.</p>
      <div style="color:#f44336;font-weight:700;margin-bottom:8px;">❌ No es correcto todavía</div>
      <div style="font-size:12px;text-align:left;color:var(--text-secondary);">
        ${pistas.map(p => `<div style="margin-bottom:4px;">• ${p}</div>`).join('')}
      </div>
    `;
  }
}

// ============================================================
// CALCULADORA CIENTÍFICA INTEGRADA
// ============================================================
