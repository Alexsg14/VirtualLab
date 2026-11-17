import * as THREE from 'three';
import { SOLUTOS, CAPACIDADES } from '../data/catalog.ts';
import { labState } from '../state/laboratory.js';
import { getCapacidadMax } from '../app/vessels.js';
import { actualizarLiquidoInclinado } from './liquid.js';
import { vertidoActivo } from '../instruments/pouring.js';
import { scene3D, groupVessel1, groupVessel2, liquidContainer1, liquidContainer2 } from './engine.js';

export function animarVertido3D() {
  const v=vertidoActivo;if(!v)return;
  const smooth=t=>t*t*(3-2*t);
  const entrada=smooth(Math.min(1,v.tiempo/0.65));
  const mezcla=v.terminando ? entrada*(1-smooth(Math.min(1,v.retorno/0.65))) : entrada;
  const dir=v.destino==='r2' ? 1 : -1;
  const wrapper=document.getElementById('wrapper-'+v.origen);
  wrapper.style.transform='translate('+dir*mezcla*45+'px,'+(-mezcla*65)+'px) rotate('+(-dir*mezcla*48)+'deg)';
  wrapper.style.transformOrigin='50% 80%';
  if(!scene3D || typeof THREE==='undefined')return;
  const grupo=v.origen==='r1' ? groupVessel1 : groupVessel2;
  const liquido=v.origen==='r1' ? liquidContainer1 : liquidContainer2;
  if(!grupo)return;
  const escala=grupo.scale.x,escalaDestino=Math.cbrt(getCapacidadMax(labState[v.destino])/CAPACIDADES.matraz);
  const xOrigen=v.origen==='r1' ? -2 : 2,xDestino=-xOrigen;
  const angulo=mezcla*0.95;
  grupo.rotation.set(0,-dir*Math.PI/2,-dir*angulo,'ZYX');
  const labio=new THREE.Vector3(0,2.49*escala,-1.13*escala).applyEuler(grupo.rotation);
  const destino=new THREE.Vector3(xDestino-dir*0.04,3.39*escalaDestino+0.65,0);
  grupo.position.set(xOrigen+(destino.x-labio.x-xOrigen)*mezcla,(destino.y-labio.y)*mezcla,-labio.z*mezcla);
  if(liquido) actualizarLiquidoInclinado(liquido,labState[v.origen],angulo);
  const fluyendo=!v.terminando && v.tiempo>0.65 && v.transferido<v.cantidad+1e-9 && labState[v.origen].volMl>0;
  if(!v.jet) {
    v.jet=new THREE.Mesh(new THREE.CylinderGeometry(0.027,0.018,1,16),new THREE.MeshPhysicalMaterial({color:0xa9e6ff,transparent:true,opacity:0.7,roughness:0.1,depthWrite:false}));
    v.jet.renderOrder=1;scene3D.add(v.jet);
  }
  v.jet.visible=fluyendo;
  if(fluyendo) {
    const inicio=labio.clone().add(grupo.position),fin=new THREE.Vector3(xDestino,3.32*escalaDestino,0);
    const delta=fin.clone().sub(inicio);
    v.jet.position.copy(inicio).add(fin).multiplyScalar(0.5);
    v.jet.scale.y=delta.length();v.jet.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());
    const sol=SOLUTOS.find(s=>s.id===labState[v.origen].soluteId);
    if(labState[v.origen].masaG>0)v.jet.material.color.setRGB(...sol.rgb.map(x=>x/255));
  }
}
// Fluido contenido en un vaso inclinado: la superficie sigue horizontal
// en coordenadas del mundo; integrar el cilindro conserva el volumen visible.
