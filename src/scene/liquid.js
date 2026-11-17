import {animarLiquidoContenido} from './contained-liquid.js';
import * as THREE from 'three';
import { fluidPhysics } from '../state/laboratory.js';
import { getCapacidadMax } from '../app/vessels.js';

export function animarSuperficie(container,mesa,dt,tiempo) {
  if(!container) return;
  const ax=fluidPhysics['sloshAngleX'+mesa],az=fluidPhysics['sloshAngleZ'+mesa];
  const ripple=fluidPhysics['rippleAmp'+mesa]||0;
  const vortex=fluidPhysics['vortexIntensity'+mesa]||0;
  fluidPhysics['rippleAmp'+mesa]*=Math.exp(-2.6*dt);
  fluidPhysics['vortexIntensity'+mesa]*=Math.exp(-1.2*dt);
  if(container.children.some(m=>m.userData.superficieContenido)){
    animarLiquidoContenido(container,ax,az,ripple,vortex,tiempo);return;
  }
  for(const mesh of container.children) {
    if(!mesh.geometry || !mesh.geometry.attributes) continue;
    const geo=mesh.geometry,pos=geo.attributes.position;
    if(!geo.userData.rest) {
      geo.userData.rest=pos.array.slice();geo.computeBoundingBox();
      geo.userData.top=geo.boundingBox.max.y;
      let radius=0;
      for(let i=0;i<pos.count;i++) if(pos.getY(i)>geo.userData.top-0.001) radius=Math.max(radius,Math.hypot(pos.getX(i),pos.getZ(i)));
      geo.userData.radius=radius;
    }
    const rest=geo.userData.rest,top=geo.userData.top,radius=geo.userData.radius||1;
    const amplitude=Math.min(0.06,Math.max(0.001,(top-0.04)*0.12));
    for(let i=0;i<pos.count;i++) {
      const x=rest[i*3],y=rest[i*3+1],z=rest[i*3+2];
      const weight=Math.max(0,1-(top-y)/0.24);
      const r=Math.hypot(x,z)/radius;
      const wave=Math.sin(tiempo*7)*x/radius+Math.cos(tiempo*8)*z/radius;
      const displacement=az*x-ax*z+Math.min(ripple,0.025)*wave+Math.min(vortex,1)*0.035*(r*r-0.5);
      pos.setY(i,y+weight*Math.max(-amplitude,Math.min(amplitude,displacement)));
    }
    pos.needsUpdate=true;geo.computeVertexNormals();
  }
}

export function actualizarLiquidoInclinado(container,rec,angulo) {
  if(rec.volMl<=1e-9) {container.visible=false;return;}container.visible=true;
  for(const mesh of container.children)if(mesh.userData.superficieContenido)mesh.visible=false;
  const radius=0.85*0.95,bottom=0.03,top=2.39;
  const c=Math.cos(angulo),sn=Math.sin(angulo);
  const targetHeight=2.4*0.9*Math.min(1,rec.volMl/getCapacidadMax(rec));
  const samples=24;
  const averageHeight=h=>{
    let sum=0;
    for(let j=0;j<samples;j++) {
      const r=radius*Math.sqrt((j+0.5)/samples);
      for(let i=0;i<samples;i++) {
        const z=r*Math.sin((i+0.5)*Math.PI*2/samples);
        sum+=Math.max(0,Math.min(top-bottom,(h-sn*z)/c-bottom));
      }
    }
    return sum/(samples*samples);
  };
  let lo=-radius-1,hi=top+radius;
  for(let i=0;i<22;i++) {const mid=(lo+hi)/2;if(averageHeight(mid)<targetHeight)lo=mid;else hi=mid;}
  const level=(lo+hi)/2;
  let mesh=container.children[0];
  if(!mesh)return;
  const rings=12,segments=64;
  if(!mesh.geometry.userData.pouring) {
    const positions=[],indices=[];
    for(let side=0;side<2;side++)for(let j=0;j<=rings;j++)for(let i=0;i<=segments;i++) {
      const a=i/segments*Math.PI*2,r=radius*j/rings;
      positions.push(r*Math.cos(a),bottom,r*Math.sin(a));
    }
    const count=(rings+1)*(segments+1);
    for(let side=0;side<2;side++)for(let j=0;j<rings;j++)for(let i=0;i<segments;i++) {
      const a=side*count+j*(segments+1)+i,b=a+segments+1;
      if(side===0)indices.push(a,a+1,b,a+1,b+1,b);else indices.push(a,b,a+1,a+1,b,b+1);
    }
    for(let i=0;i<segments;i++) {
      const a=rings*(segments+1)+i,b=a+count;
      indices.push(a,a+1,b,a+1,b+1,b);
    }
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setIndex(indices);geo.userData.pouring=true;
    mesh.geometry.dispose();mesh.geometry=geo;
  }
  const pos=mesh.geometry.attributes.position,count=(rings+1)*(segments+1);
  for(let i=0;i<count;i++)pos.setY(i,Math.max(bottom,Math.min(top,(level-sn*pos.getZ(i))/c)));
  pos.needsUpdate=true;mesh.geometry.computeVertexNormals();mesh.geometry.computeBoundingSphere();
}

// ============================================================
// AGITACIÓN DINÁMICA CON FÍSICA (Vórtex y Sloshing)
// ============================================================
