import {descargaPipeta,detenerDescargaPipeta} from '../instruments/pipette.js';
import {labState} from '../state/laboratory.js';
import {grifo,cerrarGrifo} from '../instruments/water.js';
import {llaveBureta,cerrarLlaveBureta} from '../instruments/burette.js';
import {vertidoActivo,finalizarVertido} from '../instruments/pouring.js';
import {seleccionarMesa} from './vessels.js';
import {cerrarPanelLaboratorio} from '../ui/panels.js';
import {guardarReservaPersistente,cargarReservaPersistente} from '../storage/reserve.js';
import {recalcular} from '../ui/results.js';
const keys=['r1','r2','reservas','instrumentos','historial','snapshotAnterior','mesaActiva','recipiente','medidorPH','valoracion','montajeDosificador'];
const sesiones=new Map();
function guardarSesion(){sesiones.set(labState.modulo,Object.fromEntries(keys.map(k=>[k,structuredClone(labState[k]??null)])));}
function recipiente(tipo,capacidad,acidBase=false){return {tipo,capacidadMax:capacidad,soluteId:'NaCl',masaG:0,molesN:0,volH2OMl:0,volMl:0,volSolucionMl:0,temperaturaC:25,acidBase};}
export function iniciarModulos(){labState.modulo='disoluciones';labState.valoracion=null;labState.medidorPH=false;actualizarNavegacionModulos();}
export function actualizarNavegacionModulos(){
 const ab=labState.modulo==='acidbase';
 document.getElementById('menu-curva').hidden=!ab;
 if(!ab)document.getElementById('ventana-curva').hidden=true;document.getElementById('modulo-laboratorio').value=labState.modulo;
 document.getElementById('menu-reactivos').hidden=!ab;document.getElementById('menu-soluto').hidden=ab;
 document.getElementById('ab-preparacion').hidden=!ab;document.getElementById('resultados-disoluciones').hidden=ab;
 document.getElementById('etiqueta-modulo').textContent=ab?'Ácido-base':'Disoluciones';
}
export function cambiarModulo(modulo){
  if(descargaPipeta.timer!==null)detenerDescargaPipeta();
 if(modulo===labState.modulo)return;
 if(!['disoluciones','acidbase'].includes(modulo))return;
 if(grifo.timer!==null)cerrarGrifo();if(llaveBureta.timer!==null)cerrarLlaveBureta();if(vertidoActivo)finalizarVertido();
 cerrarPanelLaboratorio(false);guardarReservaPersistente();guardarSesion();
 labState.modulo=modulo;
 if(!sesiones.has(modulo)){
   labState.r1=recipiente('vaso',600,true);labState.r2=recipiente('matraz',500,true);
   labState.montajeDosificador=null;labState.valoracion=null;labState.reservas=[];labState.historial=[];labState.snapshotAnterior=null;labState.mesaActiva=1;labState.recipiente='vaso';labState.medidorPH=true;
   labState.instrumentos={pipeta:recipiente('pipeta',25,true),bureta:recipiente('bureta',50,true)};
   cargarReservaPersistente();
 }else Object.assign(labState,structuredClone(sesiones.get(modulo)));
 actualizarNavegacionModulos();seleccionarMesa(labState.mesaActiva);recalcular();
}
