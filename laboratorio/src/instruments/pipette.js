import {labState,fluidPhysics} from '../state/laboratory.js';
import {getCapacidadMax} from '../app/vessels.js';
import {puedeCombinar,transferirAlicuota,maximoTransferible} from '../core/solution.ts';
import {guardarSnapshot,agregarAlHistorial} from '../app/history.js';
import {mostrarError,limpiarError} from '../ui/validation.js';
import {grifo,cerrarGrifo} from './water.js';
import {llaveBureta,cerrarLlaveBureta} from './burette.js';
import {vertidoActivo} from './pouring.js';
import {refrescarTrasDosificar} from './dosing.js';
export const descargaPipeta={sesion:0,timer:null,cantidad:0,entregado:0,ultimo:0,duracion:0,tiempo:0,destino:'r1',origen:null,receptor:null};
export function iniciarDescargaPipeta(ml){
 if(descargaPipeta.timer!==null || vertidoActivo)return;
 if(document.getElementById('dos-tipo').value!=='pipeta'){mostrarError('err-dosificador','Usa la llave de la bureta.');return;}
 const ins=labState.instrumentos.pipeta,id=document.getElementById('dos-destino').value,destino=labState[id];
 if(!Number.isFinite(ml)||ml<=0||ml>ins.volMl+1e-9){mostrarError('err-dosificador','La dosis debe ser positiva y no superar el volumen de la pipeta.');return;}
 if(!puedeCombinar(ins,destino)){mostrarError('err-dosificador','El destino contiene un soluto incompatible.');return;}
 if(maximoTransferible(ins,destino,ml,getCapacidadMax(destino))<ml-1e-8){mostrarError('err-dosificador','La dosis supera la capacidad del destino.');return;}
 if(grifo.timer!==null)cerrarGrifo();if(llaveBureta.timer!==null)cerrarLlaveBureta();guardarSnapshot();limpiarError('err-dosificador');
 labState.montajeDosificador={tipo:'pipeta',destino:id};
 Object.assign(descargaPipeta,{sesion:descargaPipeta.sesion+1,cantidad:Math.min(ml,ins.volMl),entregado:0,ultimo:performance.now(),duracion:Math.max(0.35,Math.min(2,ml/4)),tiempo:0,destino:id,origen:ins,receptor:destino});
 descargaPipeta.timer=setInterval(pasoDescargaPipeta,40);refrescarTrasDosificar();
}
export function pasoDescargaPipeta(){
 const p=descargaPipeta;if(p.timer===null)return;
 if(labState.instrumentos.pipeta!==p.origen||labState[p.destino]!==p.receptor||document.getElementById('dos-tipo').value!=='pipeta'||document.getElementById('dos-destino').value!==p.destino){detenerDescargaPipeta();return;}
 const ahora=performance.now();p.tiempo+=Math.max(0,Math.min(0.15,(ahora-p.ultimo)/1000));p.ultimo=ahora;
 const deseado=p.cantidad*Math.min(1,p.tiempo/p.duracion);
 const ml=maximoTransferible(p.origen,p.receptor,Math.max(0,deseado-p.entregado),getCapacidadMax(p.receptor));
 if(ml>0){if(!puedeCombinar(p.origen,p.receptor)){detenerDescargaPipeta();return;}transferirAlicuota(p.origen,p.receptor,ml);p.entregado+=ml;fluidPhysics['rippleAmp'+p.destino.slice(1)]=0.015;refrescarTrasDosificar();}
 if(p.tiempo>=p.duracion||p.origen.volMl<=1e-9||p.receptor.volMl>=getCapacidadMax(p.receptor)-1e-9)detenerDescargaPipeta();
}
export function detenerDescargaPipeta(){
 const p=descargaPipeta;if(p.timer===null)return;
 clearInterval(p.timer);p.timer=null;
 if(p.entregado>0)agregarAlHistorial({tipo:'instrumento',soluto:'Pipeta → R'+p.destino.slice(1),formula:p.origen.soluteId,cantidad:p.entregado.toFixed(3)+' mL',unidad:'mL'});
 refrescarTrasDosificar();
}
