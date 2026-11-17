import {labState} from '../state/laboratory.js';
import {medirAcidez} from '../core/acid-base.ts';
import {componentesDe} from '../core/solution.ts';
import {volumenEquivalencia} from '../core/titration.ts';
export function firmaMuestra(rec){
 const c=componentesDe(rec);return JSON.stringify([rec.volH2OMl.toPrecision(12),Object.keys(c).sort().filter(id=>c[id].molesN>1e-14).map(id=>[id,c[id].molesN.toPrecision(12),c[id].masaG.toPrecision(12)])]);
}
function firmaValorante(rec){return JSON.stringify(Object.entries(componentesDe(rec)).filter(([,c])=>c.molesN>1e-14).sort(([a],[b])=>a.localeCompare(b)).map(([id,c])=>[id,(c.molesN/rec.volMl).toPrecision(10)]));}
export function iniciarRegistroValoracion(valorante,muestra,destino){
 if(labState.modulo!=='acidbase'||!medirAcidez(muestra)||!medirAcidez(valorante))return;
 const previo=labState.valoracion;
 if(previo&&!previo.obsoleta&&previo.destino===destino&&previo.firmaActual===firmaMuestra(muestra)&&previo.firmaValorante===firmaValorante(valorante))return;
 const m=medirAcidez(muestra);
 labState.valoracion={destino,inicial:structuredClone(muestra),valorante:structuredClone(valorante),volumenMl:0,firmaActual:firmaMuestra(muestra),firmaValorante:firmaValorante(valorante),obsoleta:false,puntos:[{volumenMl:0,pH:m.pH,pOH:m.pOH,temperaturaC:muestra.temperaturaC??25}],equivalenciaMl:volumenEquivalencia(muestra,valorante)};
}
export function registrarAdicionBureta(ml,muestra,destino){
 const r=labState.valoracion;if(!r||r.destino!==destino||r.obsoleta)return;
 const m=medirAcidez(muestra);if(!m)return;
 r.volumenMl+=ml;r.firmaActual=firmaMuestra(muestra);
 r.puntos.push({volumenMl:r.volumenMl,pH:m.pH,pOH:m.pOH,temperaturaC:muestra.temperaturaC??25});
 if(r.puntos.length>2500)r.puntos=r.puntos.filter((p,i)=>i===0||i%2===1||i===r.puntos.length-1);
}
export function invalidarValoracion(rec){const r=labState.valoracion;if(r&&labState[r.destino]===rec)r.obsoleta=true;}
