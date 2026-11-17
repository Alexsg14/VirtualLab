import {evaluarPreparacion,parsearReto,UNIDADES_RETO} from '../core/challenge.ts';
import {SOLUTOS,RETOS_PREDEFINIDOS} from '../data/catalog.ts';
import {labState} from '../state/laboratory.js';
import {guardarEnLocalStorage} from '../app/lifecycle.js';
import {getRecActivo} from '../app/vessels.js';
import {actualizarInsignias} from './achievements.js';
const numero=n=>Number.isFinite(n)?n.toLocaleString('es-ES',{maximumSignificantDigits:8,useGrouping:false}):'no disponible';
export function abrirDesafio(){
 document.getElementById('modal-desafio').style.display='flex';
 document.getElementById('res-verificacion').replaceChildren();
 labState.desafioPrimerIntento=true;
 cargarReto(labState.desafioActivo||RETOS_PREDEFINIDOS[0]);
}
export function cerrarDesafio(){document.getElementById('modal-desafio').style.display='none';}
export function cerrarDesafioOverlay(e){if(e.target===document.getElementById('modal-desafio'))cerrarDesafio();}
export function cargarRetoPredefinido(){
 const idx=document.getElementById('sel-reto').value;if(idx==='')return;
 cargarReto(RETOS_PREDEFINIDOS[Number(idx)]);
}
export function cargarRetoCustom(){
 const txt=document.getElementById('inp-desafio-custom').value.trim();if(!txt)return;
 try{cargarReto(parsearReto(txt));}catch(e){document.getElementById('res-verificacion').textContent=e.message;}
}
export function cargarReto(reto){
 if(!reto)return;
 labState.desafioActivo=reto;labState.desafioPrimerIntento=true;
 document.getElementById('desafio-texto').textContent=reto.texto;
 document.getElementById('desafio-texto').title='Se exige el volumen final (±0,05 mL) y la concentración en la unidad indicada (±0,2 % relativo).';
 const ayuda=document.getElementById('desafio-unidad-ayuda');
 if(ayuda)ayuda.textContent=UNIDADES_RETO[reto.unidad||'mol/L'].ayuda;
 document.getElementById('res-verificacion').replaceChildren();
}
export function verificarDesafio(){
 if(!labState.desafioActivo)return;
 const reto=labState.desafioActivo,r=evaluarPreparacion(getRecActivo(),reto),descriptor=UNIDADES_RETO[r.unidad];
 const res=document.getElementById('res-verificacion');res.replaceChildren();
 const linea=(texto,color)=>{const el=document.createElement('p');el.textContent=texto;if(color)el.style.color=color;res.append(el);};
 if(r.correcto){
  linea('¡Correcto!','#4caf50');
  linea(`Volumen final: ${numero(r.volumenMl)} mL · ${descriptor.nombre}: ${numero(r.concentracion)} ${r.unidad}.`);
  if(labState.desafioPrimerIntento&&!labState.logros.precisionPerfecta){labState.logros.precisionPerfecta=true;guardarEnLocalStorage();actualizarInsignias();}
  labState.desafioActivo=null;
 }else{
  labState.desafioPrimerIntento=false;
  linea('No es correcto todavía','#f44336');
  if(!r.solutoOk)linea('Necesitas una disolución acuosa de '+(SOLUTOS.find(s=>s.id===reto.soluto)?.nombre||reto.soluto)+', sin otros solutos.');
  if(!r.volumenOk)linea(`Volumen final: ${numero(r.volumenMl)} mL; objetivo: ${reto.volMl} mL. Se comprueba la disolución final, no el agua añadida.`);
  if(!r.concentracionOk)linea(`${descriptor?.nombre||'Concentración'}: ${numero(r.concentracion)} ${r.unidad}; objetivo: ${numero(r.objetivo)} ${r.unidad}. Diferencia: ${numero(r.diferenciaRel*100)} %.`);
  linea('Margen: ±0,05 mL en volumen final y ±0,2 % relativo en concentración.');
 }
}