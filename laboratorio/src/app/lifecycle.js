import {iniciarTema} from '../ui/theme.js';
import {iniciarCurvaValoracion} from '../ui/titration-curve.js';
import {iniciarModulos} from './workspaces.js';
import {iniciarTemperatura} from '../instruments/temperature.js';
import { iniciarFichaRecipientes } from '../ui/vessel-tooltip.js';
import { buscarRecipienteBajoCursor } from '../scene/engine.js';
import { RETOS_PREDEFINIDOS } from '../data/catalog.ts';
import { labState, fluidPhysics } from '../state/laboratory.js';
import { iniciarPanelesLaboratorio } from '../ui/panels.js';
import { aplicarModo, actualizarBotonesCapacidad } from './vessels.js';
import { actualizarInfoSoluto } from '../ui/solute-controls.js';
import { cargarReservaPersistente } from '../storage/reserve.js';
import { recalcular } from '../ui/results.js';
import { actualizarInsignias } from '../education/achievements.js';
import { setupDragCalculadora, setupTecladoCalculadora } from '../ui/calculator.js';
import { init3D, onWindowResize3D } from '../scene/engine.js';
import { renderizarRecipienteSVG } from '../scene/svg.js';
import { ajustarCanvas } from '../scene/particles.js';

export function init() {
  iniciarTema();
  iniciarPanelesLaboratorio();
  iniciarCurvaValoracion();
  iniciarFichaRecipientes(buscarRecipienteBajoCursor);
  cargarDesdeLocalStorage();
  cargarReservaPersistente();
  iniciarModulos();

  const selReto = document.getElementById('sel-reto');
  RETOS_PREDEFINIDOS.forEach((r, i) => {
    const opt = document.createElement('option');
    opt.value = i;
    opt.textContent = r.texto;
    selReto.appendChild(opt);
  });

  ajustarCanvas();
  window.addEventListener('resize', () => {
    ajustarCanvas();
    onWindowResize3D();
  });

  aplicarModo();
  actualizarInfoSoluto();
  actualizarBotonesCapacidad();
  recalcular();
  renderizarRecipienteSVG(1);
  renderizarRecipienteSVG(2);
  actualizarInsignias();

  // Sincronizar volúmenes de física con el estado inicial
  fluidPhysics.currentVol1 = labState.r1.volMl;
  fluidPhysics.targetVol1  = labState.r1.volMl;
  fluidPhysics.currentVol2 = labState.r2.volMl;
  fluidPhysics.targetVol2  = labState.r2.volMl;

  // Inicializar motor 3D
  init3D();
  iniciarTemperatura();

  // Inicializar arrastre y teclado de calculadora
  setupDragCalculadora();
  setupTecladoCalculadora();
}

// ============================================================
// PERSISTENCIA localStorage
// ============================================================

export function guardarEnLocalStorage() {
  try {
    localStorage.setItem('labState_logros', JSON.stringify(labState.logros));
    localStorage.setItem('labState_contadorExp', labState.contadorExp);
    localStorage.setItem('labState_usoDilucion', labState.usoDilucion);
  } catch(e) {}
}

export function cargarDesdeLocalStorage() {
  try {
    const logros = localStorage.getItem('labState_logros');
    if (logros) labState.logros = JSON.parse(logros);
    const cnt = localStorage.getItem('labState_contadorExp');
    if (cnt) labState.contadorExp = parseInt(cnt) || 0;
    const usoD = localStorage.getItem('labState_usoDilucion');
    if (usoD) labState.usoDilucion = parseInt(usoD) || 0;
  } catch(e) {}
}
