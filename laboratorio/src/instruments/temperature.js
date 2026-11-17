import {labState} from '../state/laboratory.js';
import {getRecActivo} from '../app/vessels.js';
import {guardarSnapshot} from '../app/history.js';
import {refrescarTrasDosificar} from './dosing.js';
export function esAforado(rec){return ['matraz','bureta','pipeta'].includes(rec.tipo);}
export function actualizarPanelTemperatura(){
 const rec=getRecActivo(),aforado=esAforado(rec);
 document.getElementById('temp-actual').textContent=(rec.temperaturaC??25).toFixed(1)+' °C';
 document.getElementById('temp-aviso-aforo').hidden=!aforado;
 document.getElementById('temp-calentar').disabled=aforado;
 document.getElementById('temp-objetivo').disabled=aforado;
 document.getElementById('temp-estado').textContent=aforado?'Calentamiento bloqueado':rec.objetivoTemperatura?'Placa encendida · objetivo '+rec.objetivoTemperatura+' °C':'Placa apagada';
 document.getElementById('temperatura-resumen').textContent=(rec.temperaturaC??25).toFixed(1)+' °C';
}
export function calentarRecipiente(){
 const rec=getRecActivo();
 if(esAforado(rec)){document.getElementById('temp-aviso-aforo').hidden=false;return;}
 const t=Number(document.getElementById('temp-objetivo').value);
 if(!Number.isFinite(t)||t<25||t>95||rec.volH2OMl<=0){document.getElementById('temp-estado').textContent='Añade líquido y elige una temperatura de 25 a 95 °C.';return;}
 guardarSnapshot();rec.objetivoTemperatura=t;actualizarPanelTemperatura();refrescarTrasDosificar();
}
export function apagarCalentamiento(){const rec=getRecActivo();guardarSnapshot();rec.objetivoTemperatura=undefined;refrescarTrasDosificar();}
export function pasoTemperatura(dt=0.5){
 let cambio=false;
 for(const rec of [labState.r1,labState.r2]){
  const actual=rec.temperaturaC??25;
  if((esAforado(rec)||rec.volH2OMl<=0)&&rec.objetivoTemperatura){rec.objetivoTemperatura=undefined;cambio=true;}
  if(rec.volH2OMl<=0)continue;
  const target=rec.objetivoTemperatura??25;
  const rate=rec.objetivoTemperatura?Math.min(2,0.8*Math.sqrt(100/Math.max(1,rec.volH2OMl))):Math.abs(actual-25)*0.015;
  const siguiente=actual+Math.sign(target-actual)*Math.min(Math.abs(target-actual),rate*dt);
  if(Math.abs(siguiente-actual)>0.001){rec.temperaturaC=siguiente;cambio=true;}
 }
 if(cambio)refrescarTrasDosificar();
}
export function iniciarTemperatura(){setInterval(()=>pasoTemperatura(),500);}
