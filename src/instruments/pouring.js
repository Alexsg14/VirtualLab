import {descargaPipeta,detenerDescargaPipeta} from './pipette.js';
import {puedeCombinar} from '../core/solution.ts';
import {llaveBureta, cerrarLlaveBureta} from './burette.js';
import { labState, fluidPhysics } from '../state/laboratory.js';
import { getCapacidadMax } from '../app/vessels.js';
import { mostrarError, limpiarError } from '../ui/validation.js';
import { guardarSnapshot, agregarAlHistorial } from '../app/history.js';
import { maximoTransferible, transferirAlicuota } from '../core/solution.ts';
import { grifo, cerrarGrifo } from './water.js';
import { refrescarTrasDosificar } from './dosing.js';
import { animarVertido3D } from '../scene/pouring-animation.js';
import { recalcular } from '../ui/results.js';
import { scene3D } from '../scene/engine.js';

export let vertidoActivo=null;

export function bloquearEdicionVertido(bloquear) {
  if(bloquear) {
    document.querySelectorAll('.lab-floating-body input,.lab-floating-body select,.lab-floating-body button,.recipiente-wrapper button,#estante-lista button,#toolbar-3d button,#btn-eso,#btn-bach').forEach(el=>{
      if(el.id==='btn-parar-vertido') return;
      el.dataset.vertidoDisabled=el.disabled ? '1' : '0';el.disabled=true;
    });
  } else document.querySelectorAll('[data-vertido-disabled]').forEach(el=>{el.disabled=el.dataset.vertidoDisabled==='1';delete el.dataset.vertidoDisabled;});
  document.getElementById('btn-parar-vertido').hidden=!bloquear;
  document.getElementById('aviso-vertido').hidden=!bloquear;
}

export function iniciarVertido() {
  if(descargaPipeta.timer!==null)detenerDescargaPipeta();
  if(llaveBureta.timer!==null) cerrarLlaveBureta();
  if(vertidoActivo)return;
  const origen=labState.r1.tipo==='vaso' ? 'r1' : labState.r2.tipo==='vaso' ? 'r2' : null;
  const destino=labState.r1.tipo==='matraz' ? 'r1' : labState.r2.tipo==='matraz' ? 'r2' : null;
  if(!origen || !destino) {mostrarError('err-vertido','Coloca un vaso de precipitados y un matraz aforado en la mesa.');return;}
  const vaso=labState[origen],matraz=labState[destino];
  if(vaso.volH2OMl<=0 || vaso.volMl<=0) {mostrarError('err-vertido','El vaso no contiene líquido para verter.');return;}
  if(!puedeCombinar(vaso,matraz)) {mostrarError('err-vertido','El matraz contiene otro soluto. Usa un matraz vacío para esta preparación.');return;}
  const disponible=maximoTransferible(vaso,matraz,vaso.volMl,getCapacidadMax(matraz));
  const texto=document.getElementById('vertido-ml').value.trim();
  const cantidad=texto==='' ? Math.min(disponible,vaso.volMl) : Number(texto);
  if(!Number.isFinite(cantidad)||cantidad<=0||cantidad>vaso.volMl+1e-9||cantidad>disponible+1e-9) {mostrarError('err-vertido','El volumen debe ser positivo, no superar el contenido del vaso ni el espacio libre del matraz ('+disponible.toFixed(2)+' mL).');return;}
  if(grifo.timer!==null) cerrarGrifo();
  guardarSnapshot();limpiarError('err-vertido');
  const duracion=Math.min(4,Math.max(1.5,cantidad/50));
  vertidoActivo={origen,destino,cantidad:Math.min(cantidad,vaso.volMl,disponible),transferido:0,tiempo:0,ultimo:performance.now(),duracion,timer:null,terminando:false,retorno:0,jet:null};
  bloquearEdicionVertido(true);
  vertidoActivo.timer=setInterval(pasoVertido,50);
  actualizarEstadoVertido();
}

export function actualizarEstadoVertido() {
  if(!vertidoActivo)return;
  const v=vertidoActivo;
  const texto='Vaso → matraz: '+v.transferido.toFixed(2)+' / '+v.cantidad.toFixed(2)+' mL';
  document.getElementById('estado-vertido').textContent=texto;
  document.getElementById('progreso-vertido').textContent=texto;
}

export function pasoVertido() {
  const v=vertidoActivo;if(!v)return;
  const ahora=performance.now(),dt=Math.max(0,Math.min(0.1,(ahora-v.ultimo)/1000));v.ultimo=ahora;
  if(v.terminando) {
    v.retorno+=dt;
    if(!scene3D) animarVertido3D();
    if(v.retorno>=0.65) finalizarVertido();
    return;
  }
  v.tiempo+=dt;
  // Primero acercar e inclinar el vaso; despues comienza el flujo.
  const fraccion=Math.max(0,Math.min(1,(v.tiempo-0.65)/v.duracion));
  const ml=maximoTransferible(labState[v.origen],labState[v.destino],Math.max(0,v.cantidad*fraccion-v.transferido),getCapacidadMax(labState[v.destino]));
  if(ml>0) {
    transferirAlicuota(labState[v.origen],labState[v.destino],ml);v.transferido+=ml;
    fluidPhysics['rippleAmp'+v.destino.slice(1)]=0.025;
    refrescarTrasDosificar();
    // El estante se actualiza al recalcular; sus nuevas tarjetas siguen bloqueadas.
    document.querySelectorAll('#estante-lista button').forEach(el=>{el.dataset.vertidoDisabled='0';el.disabled=true;});
  }
  actualizarEstadoVertido();
  if(!scene3D) animarVertido3D();
  if(fraccion>=1 || (v.tiempo>0.65 && ml===0 && labState[v.destino].volMl>=getCapacidadMax(labState[v.destino])-1e-9)) detenerVertido();
}

export function detenerVertido() {
  if(!vertidoActivo || vertidoActivo.terminando)return;
  vertidoActivo.terminando=true;vertidoActivo.retorno=0;
  document.getElementById('btn-parar-vertido').disabled=true;
}

export function finalizarVertido() {
  const v=vertidoActivo;if(!v)return;
  clearInterval(v.timer);
  if(v.jet && scene3D) {scene3D.remove(v.jet);v.jet.geometry.dispose();v.jet.material.dispose();}
  vertidoActivo=null;
  document.getElementById('btn-parar-vertido').disabled=false;
  bloquearEdicionVertido(false);
  document.getElementById('wrapper-r1').style.transform='';document.getElementById('wrapper-r2').style.transform='';
  if(v.transferido>0) agregarAlHistorial({tipo:'vertido',soluto:'Vaso R'+v.origen.slice(1)+' → matraz R'+v.destino.slice(1),formula:labState[v.destino].soluteId,cantidad:v.transferido.toFixed(3)+' mL',unidad:'mL'});
  document.getElementById('estado-vertido').textContent='Vertidos '+v.transferido.toFixed(2)+' mL. Quedan '+labState[v.origen].volMl.toFixed(2)+' mL en el vaso.';
  refrescarTrasDosificar();
}
