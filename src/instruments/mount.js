import {labState} from '../state/laboratory.js';
import {cerrarLlaveBureta,llaveBureta} from './burette.js';
import {descargaPipeta,detenerDescargaPipeta} from './pipette.js';
import {actualizarEscena3D} from '../scene/engine.js';
export function colocarInstrumento(){
 labState.montajeDosificador={tipo:document.getElementById('dos-tipo').value,destino:document.getElementById('dos-destino').value};
 actualizarEscena3D();
}
export function retirarInstrumento(){
 if(llaveBureta.timer!==null)cerrarLlaveBureta();if(descargaPipeta.timer!==null)detenerDescargaPipeta();
 labState.montajeDosificador=null;actualizarEscena3D();
}
export function cambiarDestinoDosificador(){
 if(llaveBureta.timer!==null)cerrarLlaveBureta('Destino cambiado');if(descargaPipeta.timer!==null)detenerDescargaPipeta();
 if(labState.montajeDosificador)colocarInstrumento();
}
