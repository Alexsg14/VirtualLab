import { panelLaboratorioAbierto } from './panels.js';
import { grifo } from '../instruments/water.js';

export function mostrarError(id, msg) {
  const el = document.getElementById(id);
  if (el) {
    if(id==='err-disolvente' && panelLaboratorioAbierto==='grifo') document.querySelector('#flotante-grifo .lab-floating-body').appendChild(el);
    else if(id==='err-disolvente') document.querySelector('#flotante-agua .lab-floating-body').appendChild(el);
    el.textContent = msg;
  }
}

export function limpiarError(id) {
  const el = document.getElementById(id);
  if (el) el.textContent = '';
}

export function validarPositivo(valor, errId) {
  if (isNaN(valor) || valor <= 0) {
    mostrarError(errId, '⚠ Introduce un número mayor que 0');
    return false;
  }
  limpiarError(errId);
  return true;
}

// ============================================================
// GUARDAR SNAPSHOT PARA DESHACER
// ============================================================
