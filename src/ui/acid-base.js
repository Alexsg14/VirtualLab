import {describirColorIndicador} from './indicator-description.ts';
import {descargaPipeta,detenerDescargaPipeta} from '../instruments/pipette.js';
import {invalidarValoracion} from '../app/titration.js';
import {labState} from '../state/laboratory.js';
import {SOLUTOS,formulaSoluto} from '../data/catalog.ts';
import {INDICADORES,medirAcidez,colorIndicador} from '../core/acid-base.ts';
import {actualizarVolumen,anadirReactivoPuro,anadirDisolucionPreparada} from '../core/solution.ts';
import {getRecActivo,getCapacidadMax} from '../app/vessels.js';
import {guardarSnapshot,agregarAlHistorial} from '../app/history.js';
import {refrescarTrasDosificar} from '../instruments/dosing.js';
import {grifo,cerrarGrifo} from '../instruments/water.js';
import {llaveBureta,cerrarLlaveBureta} from '../instruments/burette.js';
import {mostrarError,limpiarError} from './validation.js';
export function prepararReactivoAB(){
  if(descargaPipeta.timer!==null)detenerDescargaPipeta();
 if(labState.modulo!=='acidbase')return;
 if(document.getElementById('ab-metodo').value==='cantidad'){agregarReactivoAB();return;}
 const rec=getRecActivo(),id=document.getElementById('ab-reactivo').value,c=Number(document.getElementById('ab-concentracion').value),ml=Number(document.getElementById('ab-volumen').value);
 try {
   const copia=structuredClone(rec);anadirDisolucionPreparada(copia,id,c,ml,getCapacidadMax(rec));
   const s=SOLUTOS.find(s=>s.id===id);
   if(grifo.timer!==null)cerrarGrifo();if(llaveBureta.timer!==null)cerrarLlaveBureta();guardarSnapshot();
   invalidarValoracion(rec);Object.assign(rec,copia);limpiarError('err-reactivos');
   agregarAlHistorial({tipo:'instrumento',soluto:'Disolución añadida de '+s.nombre,formula:s.formula,cantidad:ml+' mL · '+c+' mol/L',unidad:'mL'});refrescarTrasDosificar();
 }catch(e){mostrarError('err-reactivos',e.message);}
}
export function activarMedidorPH(){labState.medidorPH=true;actualizarPanelAcidez();}
export function aplicarIndicador(){
 const rec=getRecActivo();if(!medirAcidez(rec)){mostrarError('err-acidez','Añade líquido. El modelo de pH admite HCl, NaOH, ácido acético, amoniaco, ácido sulfúrico, ácido malónico y NaCl.');return;}
 guardarSnapshot();rec.indicador=document.getElementById('ab-indicador').value||undefined;
 labState.medidorPH=true;limpiarError('err-acidez');
 agregarAlHistorial({tipo:'instrumento',soluto:rec.indicador?'Indicador: '+INDICADORES[rec.indicador].nombre:'Indicador retirado',formula:'',cantidad:'traza',unidad:''});refrescarTrasDosificar();
}
export function actualizarPanelAcidez(){
 const rec=getRecActivo(),m=medirAcidez(rec);document.getElementById('panel-acidez').hidden=!(labState.modulo==='acidbase'||labState.medidorPH);
 document.getElementById('ab-ph').textContent=m?m.pH.toFixed(2):'—';
 document.getElementById('ab-caracter').textContent=m?m.caracter:(rec.volMl>0?'Reactivo fuera del modelo':'Sin líquido');
 document.getElementById('ab-poh').textContent=m?m.pOH.toFixed(2):'—';
 document.getElementById('ab-neutral').textContent=m?m.neutro.toFixed(2):'—';
 document.getElementById('ab-temperatura').textContent=(rec.temperaturaC??25).toFixed(1)+' °C';
 document.getElementById('ab-cursor').style.left=(m?Math.max(0,Math.min(100,m.pH/14*100)):50)+'%';
 const color=colorIndicador(rec),sample=document.getElementById('ab-color');sample.style.background=color?'rgb('+color.join(',')+')':'#bbdef0';
 document.getElementById('ab-indicador-actual').textContent=rec.indicador?INDICADORES[rec.indicador]?.nombre:'Sin indicador';
 document.getElementById('ab-color-text').textContent=describirColorIndicador(rec);
 const mixture=Object.keys(rec.componentes||{}).length>1;document.getElementById('ab-mezcla').textContent=mixture?'Reactivos aportados: '+Object.keys(rec.componentes).map(formulaSoluto).join(' + '):'';
}

export function actualizarMetodoReactivoAB(){
 const cantidad=document.getElementById('ab-metodo').value==='cantidad';
 document.getElementById('ab-cantidad-campos').hidden=!cantidad;
 document.getElementById('ab-concentracion-campos').hidden=cantidad;
 document.getElementById('ab-preparar-boton').textContent=cantidad?'Añadir reactivo':'Preparar disolución';
 const id=document.getElementById('ab-reactivo').value;
 document.getElementById('ab-forma-reactivo').textContent=id==='NaOH'?'NaOH sólido: pesa los gramos o indica los moles y añade agua después.':['HCl','NH3'].includes(id)?'HCl y NH₃ son gases a temperatura ambiente. La cantidad representa soluto puro equivalente, no un sólido ni un volumen de disolución comercial.':'Cantidad de soluto puro. Puedes añadirlo a agua o completar con agua después.';
}
export function agregarReactivoAB(){
  if(descargaPipeta.timer!==null)detenerDescargaPipeta();
 if(labState.modulo!=='acidbase')return;
 const rec=getRecActivo(),id=document.getElementById('ab-reactivo').value,s=SOLUTOS.find(s=>s.id===id);
 const cantidad=Number(document.getElementById('ab-cantidad').value),unidad=document.getElementById('ab-unidad').value;
 const n=unidad==='gramos'?cantidad/s.M:cantidad;
 try {
   const copia=structuredClone(rec);anadirReactivoPuro(copia,id,n,getCapacidadMax(rec));
   if(grifo.timer!==null)cerrarGrifo();if(llaveBureta.timer!==null)cerrarLlaveBureta();guardarSnapshot();
   invalidarValoracion(rec);Object.assign(rec,copia);limpiarError('err-reactivos');
   agregarAlHistorial({tipo:'instrumento',soluto:'Reactivo añadido: '+s.nombre,formula:s.formula,cantidad:cantidad+' '+(unidad==='gramos'?'g':'mol'),unidad});
   refrescarTrasDosificar();
 }catch(e){mostrarError('err-reactivos',e.message);}
}
