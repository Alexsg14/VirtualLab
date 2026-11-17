import { labState } from '../state/laboratory.js';
import { guardarEnLocalStorage } from '../app/lifecycle.js';

export function verificarLogro_primerExp() {
  if (!labState.logros.primerExp) {
    labState.logros.primerExp = true;
    guardarEnLocalStorage();
  }
}

export function verificarLogro_analista() {
  if (labState.contadorExp >= 10 && !labState.logros.analista) {
    labState.logros.analista = true;
    guardarEnLocalStorage();
  }
}

export function actualizarInsignias() {
  document.getElementById('ins-primer').classList.toggle('bloqueada', !labState.logros.primerExp);
  document.getElementById('ins-precision').classList.toggle('bloqueada', !labState.logros.precisionPerfecta);
  document.getElementById('ins-diluciones').classList.toggle('bloqueada', !labState.logros.maestroDiluciones);
  document.getElementById('ins-analista').classList.toggle('bloqueada', !labState.logros.analista);
  document.getElementById('contador-exp').textContent = labState.contadorExp;
}

// ============================================================
// MODO DESAFÍO
// ============================================================
