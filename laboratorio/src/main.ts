import {colocarInstrumento,retirarInstrumento,cambiarDestinoDosificador} from './instruments/mount.js';
import {alternarCurvaValoracion,nuevaCurvaValoracion,actualizarCurvaValoracion,exportarCurvaValoracion} from './ui/titration-curve.js';
import {actualizarMetodoReactivoAB} from './ui/acid-base.js';
import {cambiarModulo} from './app/workspaces.js';
import {prepararReactivoAB,activarMedidorPH,aplicarIndicador} from './ui/acid-base.js';
import {calentarRecipiente,apagarCalentamiento} from './instruments/temperature.js';
import {alternarLlaveBureta, regularLlaveBureta, cerrarLlaveBureta} from './instruments/burette.js';
import {cambiarCapacidadDosificador,cambiarInstrumentoDosificacion} from './instruments/dosing.js';
import './styles/laboratory.css';
import { init } from './app/lifecycle.js';
import { abrirDesafio, cargarRetoCustom, cargarRetoPredefinido, cerrarDesafio, cerrarDesafioOverlay, verificarDesafio } from './education/challenges.js';
import { actualizarDosificador, cargarDosificador, descartarDosificador, dosificar } from './instruments/dosing.js';
import { agitarRecipiente, agregarDisolvente, agregarSoluto, vaciarRecipiente } from './app/preparation.js';
import { alternarGrifo, enrasarHastaCapacidad, enrasarHastaVolumen } from './instruments/water.js';
import { cambiarRenderLiquido, alternarMalla3D, resetearCamara3D, toggleAutoGiro } from './scene/engine.js';
import { alternarPanelLaboratorio, cerrarPanelLaboratorio } from './ui/panels.js';
import { calcAns, calcBackspace, calcClear, calcClearEntry, calcCopiarClipboard, calcEquals, calcFn, calcInput, calcInvertSign, calcPegarEn, calcReciprocal, cerrarCalculadora, toggleCalcMinimizar, toggleCalculadora } from './ui/calculator.js';
import { calcularDilucion } from './education/dilution.js';
import { cambiarCapacidadInput, selRecipiente, seleccionarMesa, setCapacidadRapida, setModo } from './app/vessels.js';
import { deshacerOperacion, exportarTXT } from './app/history.js';
import { detenerVertido, iniciarVertido } from './instruments/pouring.js';
import { guardarDisolucion } from './storage/reserve.js';
import { onRadioUnidad, onSolutoChange, sincronizarSoluto } from './ui/solute-controls.js';

// Puente explícito para conservar las acciones del HTML durante la migración.
// El estado pertenece a los módulos, no a window.
Object.assign(window,{cambiarRenderLiquido,alternarMalla3D,cambiarCapacidadDosificador,colocarInstrumento,retirarInstrumento,cambiarDestinoDosificador,alternarCurvaValoracion,nuevaCurvaValoracion,actualizarCurvaValoracion,exportarCurvaValoracion,actualizarMetodoReactivoAB,cambiarModulo,prepararReactivoAB,activarMedidorPH,aplicarIndicador,calentarRecipiente,apagarCalentamiento,alternarLlaveBureta,regularLlaveBureta,cerrarLlaveBureta,cambiarInstrumentoDosificacion,abrirDesafio, actualizarDosificador, agitarRecipiente, agregarDisolvente, agregarSoluto, alternarGrifo, alternarPanelLaboratorio, calcAns, calcBackspace, calcClear, calcClearEntry, calcCopiarClipboard, calcEquals, calcFn, calcInput, calcInvertSign, calcPegarEn, calcReciprocal, calcularDilucion, cambiarCapacidadInput, cargarDosificador, cargarRetoCustom, cargarRetoPredefinido, cerrarCalculadora, cerrarDesafio, cerrarDesafioOverlay, cerrarPanelLaboratorio, descartarDosificador, deshacerOperacion, detenerVertido, dosificar, enrasarHastaCapacidad, enrasarHastaVolumen, exportarTXT, guardarDisolucion, iniciarVertido, onRadioUnidad, onSolutoChange, resetearCamara3D, selRecipiente, seleccionarMesa, setCapacidadRapida, setModo, sincronizarSoluto, toggleAutoGiro, toggleCalcMinimizar, toggleCalculadora, vaciarRecipiente, verificarDesafio});
function arrancar():void {init();document.documentElement.dataset.laboratorio='listo';}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',arrancar,{once:true});else arrancar();
