import {generarCSVValoracion} from '../core/titration-csv.ts';
import {actualizarSpoilerCurva} from './curve-spoiler.js';
import {labState} from '../state/laboratory.js';
import {INDICADORES,medirAcidez} from '../core/acid-base.ts';
import {volumenesEquivalencia,puntosReferencia} from '../core/titration.ts';
import {firmaMuestra,iniciarRegistroValoracion} from '../app/titration.js';
import {llaveBureta,cerrarLlaveBureta} from '../instruments/burette.js';
import {guardarSnapshot} from '../app/history.js';
import {ajustarPanelLaboratorio} from './panels.js';
let cache=null;
export function alternarCurvaValoracion(){
 const panel=document.getElementById('ventana-curva');panel.hidden=!panel.hidden;
 document.getElementById('menu-curva').setAttribute('aria-expanded',String(!panel.hidden));
 if(!panel.hidden){if(!panel.style.left)panel.style.left=Math.max(12,window.innerWidth-690)+'px';ajustarPanelLaboratorio(panel);actualizarCurvaValoracion();}
}
export function nuevaCurvaValoracion(){
 if(llaveBureta.timer!==null)cerrarLlaveBureta();guardarSnapshot();labState.valoracion=null;
 const destino=document.getElementById('dos-destino').value;
 iniciarRegistroValoracion(labState.instrumentos.bureta,labState[destino],destino);
 actualizarCurvaValoracion();
}
export function actualizarCurvaValoracion(){
 const panel=document.getElementById('ventana-curva');if(!panel||panel.hidden)return;
 const r=labState.valoracion,svg=document.getElementById('curva-svg');
 const actual=r?.puntos.at(-1),muestra=r?labState[r.destino]:null;
 const obsoleta=r&&(r.obsoleta||r.firmaActual!==firmaMuestra(muestra));
 document.getElementById('curva-estado').textContent=!r?'Carga la bureta y añade reactivo a una muestra con líquido. El registro comienza automáticamente.':obsoleta?'La muestra ha cambiado fuera de la bureta. Los puntos conservados pertenecen al ensayo anterior; se iniciará otro al abrir la llave.':'Registro en R'+r.destino.slice(1)+' · '+r.puntos.length+' medidas · '+r.volumenMl.toFixed(3)+' mL añadidos · pH '+actual.pH.toFixed(2);
 document.getElementById('curva-equivalencia').textContent=r?.equivalenciaMl!=null?'Equivalencia estequiométrica prevista: '+r.equivalenciaMl.toFixed(3)+' mL':'Equivalencia no determinada: se requiere un valorante fuerte puro y una muestra valorable.';
 const etapas=r?volumenesEquivalencia(r.inicial,r.valorante):[];
 if(etapas.length>1)document.getElementById('curva-equivalencia').textContent='Etapas estequiométricas: '+etapas.map((v,i)=>'Veq'+(i+1)+' = '+v.toFixed(3)+' mL').join(' · ')+' (no siempre producen saltos separados).';
 const eq=r?.equivalenciaMl;
 const xmax=Math.max(5,Math.ceil(Math.max(r?.volumenMl*1.12||0,eq?eq*1.5:10)/5)*5);
 const showOH=document.getElementById('curva-poh').checked;
 document.getElementById('legend-poh').hidden=!showOH;
 const values=r?r.puntos.flatMap(p=>showOH?[p.pH,p.pOH]:[p.pH]):[0,14];
 const ymin=Math.min(0,Math.floor(Math.min(...values))),ymax=Math.max(14,Math.ceil(Math.max(...values)));
 const L=52,T=20,W=602,H=238;
 const x=v=>L+W*v/xmax,y=v=>T+H*(ymax-v)/(ymax-ymin);
 const parts=['<title>Curva de valoración: pH frente a volumen añadido por la bureta</title>'];
 const indicador=muestra?.indicador||r?.inicial.indicador;
 const ind=INDICADORES[indicador];
 document.getElementById('legend-indicator').hidden=!ind;
 if(ind){
  parts.push('<defs><pattern id="indicator-hatch" width="8" height="8" patternUnits="userSpaceOnUse"><path class="indicator-hatch-line" d="M-2 2L2 -2M0 8L8 0M6 10L10 6"/></pattern></defs>');
  parts.push('<rect x="'+L+'" y="'+y(ind.hasta)+'" width="'+W+'" height="'+(y(ind.desde)-y(ind.hasta))+'" fill="url(#indicator-hatch)"/>');
  parts.push('<text class="curve-band-label" x="'+(L+W-6)+'" y="'+Math.max(T+12,y(ind.hasta)-5)+'" text-anchor="end">Viraje: '+ind.desde+'–'+ind.hasta+'</text>');
 }
 for(let i=0;i<=7;i++){
  const v=ymin+(ymax-ymin)*i/7,yy=y(v);
  parts.push('<path d="M'+L+' '+yy+'h'+W+'" stroke="#364252"/><text x="'+(L-10)+'" y="'+(yy+4)+'" text-anchor="end">'+v.toFixed(0)+'</text>');
 }
 for(let i=0;i<=5;i++){
  const v=xmax*i/5,xx=x(v);
  parts.push('<path d="M'+xx+' '+T+'v'+H+'" stroke="#364252"/><text x="'+xx+'" y="'+(T+H+22)+'" text-anchor="middle">'+v.toFixed(xmax<10?1:0)+'</text>');
 }
 parts.push('<text x="'+(L+W/2)+'" y="304" text-anchor="middle">Volumen añadido con bureta (mL)</text><text x="13" y="18">'+(showOH?'pH / pOH':'pH')+'</text>');
 const line=(pts,key,color,dash='')=>{
  if(!pts.length)return;
  const d=pts.map((p,i)=>(i?'L':'M')+x(p.volumenMl).toFixed(2)+' '+y(p[key]).toFixed(2)).join(' ');
  const series=key==='pOH'?'poh':dash?'reference':'ph';
  parts.push(`<path data-series="${series}" aria-label="${series==='poh'?'pOH: trazo y punto':series==='reference'?'Referencia: discontinua':'pH: continua'}" d="${d}" fill="none" stroke="${color}" stroke-width="2.5" ${dash?'stroke-dasharray="'+dash+'"':''}/>`);
 };
 if(r){
  const maxReferencia=Math.min(xmax,Math.max(0,(r.inicial.capacidadMax??Infinity)-r.inicial.volMl));
  if(!cache||cache.registro!==r||cache.max!==maxReferencia){cache={registro:r,max:maxReferencia,puntos:puntosReferencia(r.inicial,r.valorante,maxReferencia)};}
  line(cache.puntos,'pH','#a7b6ca','5 5');
  for(const [i,etapa] of etapas.entries()){if(etapa>xmax)continue;parts.push('<path d="M'+x(etapa)+' '+T+'v'+H+'" stroke="#e7ba55" stroke-dasharray="3 4"/><text x="'+Math.min(L+W-28,x(etapa)+5)+'" y="34" fill="#e7ba55">Veq'+(i+1)+'</text>');}
  const neutro=medirAcidez(r.inicial)?.neutro??7;
  parts.push('<path d="M'+L+' '+y(neutro)+'h'+W+'" stroke="#71b997" stroke-dasharray="2 5"/>');
  parts.push('<text x="'+(L+6)+'" y="'+(y(neutro)-5)+'" class="curve-band-label">pH neutro: '+neutro.toFixed(2)+'</text>');
  line(r.puntos,'pH','#00d1df');if(showOH)line(r.puntos,'pOH','#bba0fb','10 4 2 4');
  if(showOH){const q=r.puntos.at(-1),xx=x(q.volumenMl),yy=y(q.pOH);parts.push('<path data-marker="poh" d="M'+xx+' '+(yy-5)+'l5 5-5 5-5-5Z" fill="var(--curve-oh)"/>');}
  const last=r.puntos.at(-1);parts.push('<circle cx="'+x(last.volumenMl)+'" cy="'+y(last.pH)+'" r="4" fill="#00d1df"/>');
  document.getElementById('curva-condiciones').textContent='Referencia calculada con la composición, concentración y temperatura iniciales. '+(Math.abs((muestra?.temperaturaC??25)-(r.puntos[0].temperaturaC??25))>0.5?'La temperatura ha variado: la medida puede separarse de esa referencia.':'');
 }else document.getElementById('curva-condiciones').textContent='La línea continua será el experimento; la línea discontinua, la referencia del modelo.';
 svg.innerHTML=parts.join('');
 actualizarSpoilerCurva(r);
}
export function exportarCurvaValoracion(){
 const r=labState.valoracion;if(!r)return;
 const text=generarCSVValoracion(r);
 const url=URL.createObjectURL(new Blob([text],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='curva_valoracion.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
export function iniciarCurvaValoracion(){
 const svg=document.getElementById('curva-svg');
 svg.addEventListener('pointermove',e=>{
  const r=labState.valoracion;if(!r?.puntos.length)return;
  const rect=svg.getBoundingClientRect(),px=(e.clientX-rect.left)/rect.width*680;
  const xmin=52,w=602,xmax=Math.max(5,Math.ceil(Math.max(r.volumenMl*1.12,r.equivalenciaMl?r.equivalenciaMl*1.5:10)/5)*5);
  const ml=(px-xmin)/w*xmax;
  const p=r.puntos.reduce((best,p)=>Math.abs(p.volumenMl-ml)<Math.abs(best.volumenMl-ml)?p:best);
  document.getElementById('curva-detalle').textContent=p.volumenMl.toFixed(3)+' mL · pH '+p.pH.toFixed(3)+' · pOH '+p.pOH.toFixed(3)+' · '+p.temperaturaC.toFixed(1)+' °C';
 });
}
