import { labState } from '../state/laboratory.js';
import { guardarEnLocalStorage } from '../app/lifecycle.js';
import { mostrarError, limpiarError } from '../ui/validation.js';
import { actualizarInsignias } from './achievements.js';

export function calcularDilucion() {
  const c1 = parseFloat(document.getElementById('dil-c1').value);
  const v1 = parseFloat(document.getElementById('dil-v1').value);
  const c2 = parseFloat(document.getElementById('dil-c2').value);
  const v2 = parseFloat(document.getElementById('dil-v2').value);

  const campos = [
    { id:'dil-c1', val:c1, nombre:'C₁' },
    { id:'dil-v1', val:v1, nombre:'V₁' },
    { id:'dil-c2', val:c2, nombre:'C₂' },
    { id:'dil-v2', val:v2, nombre:'V₂' }
  ];
  const vacios = campos.filter(c => isNaN(c.val) || document.getElementById(c.id).value.trim() === '');

  limpiarError('err-dilucion');
  document.getElementById('res-dilucion').textContent = '';

  if (vacios.length !== 1) {
    mostrarError('err-dilucion', '⚠ Deja exactamente UN campo vacío para calcularlo');
    return;
  }

  const incognita = vacios[0];
  let resultado;

  if (incognita.id === 'dil-c1') {
    resultado = (c2 * v2) / v1;
    document.getElementById('dil-c1').value = resultado.toFixed(4);
  } else if (incognita.id === 'dil-v1') {
    resultado = (c2 * v2) / c1;
    document.getElementById('dil-v1').value = resultado.toFixed(4);
  } else if (incognita.id === 'dil-c2') {
    resultado = (c1 * v1) / v2;
    document.getElementById('dil-c2').value = resultado.toFixed(4);
  } else {
    resultado = (c1 * v1) / c2;
    document.getElementById('dil-v2').value = resultado.toFixed(4);
  }

  document.getElementById('res-dilucion').textContent =
    `✅ ${incognita.nombre} = ${resultado.toFixed(4)} ${incognita.nombre.startsWith('C') ? 'mol/L' : 'mL'}`;

  labState.usoDilucion++;
  if (labState.usoDilucion >= 3 && !labState.logros.maestroDiluciones) {
    labState.logros.maestroDiluciones = true;
    guardarEnLocalStorage();
    actualizarInsignias();
  }
  guardarEnLocalStorage();
}

// ============================================================
// LOGROS / GAMIFICACIÓN
// ============================================================
