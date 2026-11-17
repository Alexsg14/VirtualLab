import * as THREE from 'three';

/** Superficie libre mallada; pared y fondo fijos. No cambia el estado químico. */
export function crearLiquidoContenido(container,color,opacity,dia){
 const body=container.children.find(m=>m.isMesh);if(!body)return;
 const geo=body.geometry;geo.computeBoundingBox();
 const top=geo.boundingBox.max.y,bottom=geo.boundingBox.min.y,pos=geo.attributes.position;
 let radius=0;for(let i=0;i<pos.count;i++)if(Math.abs(pos.getY(i)-top)<1e-5)radius=Math.max(radius,Math.hypot(pos.getX(i),pos.getZ(i)));
 if(radius<0.01||top-bottom<0.001)return;
 // Quitar solo los triángulos de la tapa: la superficie nueva la sustituye.
 if(geo.index){const indices=[];for(let i=0;i<geo.index.count;i+=3){const a=geo.index.getX(i),b=geo.index.getX(i+1),c=geo.index.getX(i+2);if([a,b,c].every(k=>Math.abs(pos.getY(k)-top)<1e-5))continue;indices.push(a,b,c);}geo.setIndex(indices);}
 body.name='cuerpo-liquido';body.userData.cuerpoContenido=true;
 body.material.opacity=Math.min(0.68,Math.max(0.26,opacity));body.material.depthWrite=true;body.material.roughness=0.22;body.material.side=THREE.FrontSide;body.renderOrder=1;
 const rings=24,sectors=96,positions=[],indices=[];
 for(let j=0;j<=rings;j++)for(let i=0;i<=sectors;i++){
  const a=i/sectors*Math.PI*2,r=radius*j/rings;positions.push(r*Math.cos(a),top,r*Math.sin(a));
 }
 for(let j=0;j<rings;j++)for(let i=0;i<sectors;i++){
  const a=j*(sectors+1)+i,b=a+sectors+1;indices.push(a,b,a+1,a+1,b,b+1);
 }
 const surfaceGeo=new THREE.BufferGeometry();surfaceGeo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));surfaceGeo.setIndex(indices);surfaceGeo.computeVertexNormals();
 const mat=new THREE.MeshPhysicalMaterial({color:color.clone().lerp(new THREE.Color(0xbfe2eb),0.16),roughness:0.23,metalness:0,clearcoat:0.8,clearcoatRoughness:0.18,transparent:true,opacity:Math.max(0.34,Math.min(0.72,opacity)),depthWrite:false,side:THREE.DoubleSide});
 const surface=new THREE.Mesh(surfaceGeo,mat);surface.name='superficie-libre';surface.renderOrder=1.1;surface.userData.superficieContenido={top,bottom,radius,rings,sectors};container.add(surface);
}

export function animarLiquidoContenido(container,ax,az,ripple,vortex,time){
 const surface=container.children.find(m=>m.userData.superficieContenido);if(!surface)return;
 surface.visible=true;
 const {top,bottom,radius}=surface.userData.superficieContenido,pos=surface.geometry.attributes.position;
 const limit=Math.min(0.035,(top-bottom)*0.16),values=[];
 let sum=0,weight=0;
 // Modos de oleaje amortiguados; el desplazamiento se anula en la pared.
 for(let i=0;i<pos.count;i++){
  const x=pos.getX(i),z=pos.getZ(i),r=Math.min(1,Math.hypot(x,z)/radius),w=(1-r*r)**2;
  const d=w*(az*x-ax*z+Math.min(ripple,0.025)*(Math.cos(time*7)*Math.sin(x/radius*3)+Math.sin(time*6.1)*Math.sin(z/radius*3))-Math.min(vortex,1)*0.025*(1-r*r));
  values.push(d);sum+=d*r;weight+=w*r;
 }
 const mean=weight>0?sum/weight:0;
 let max=0;for(let i=0;i<pos.count;i++){const r=Math.min(1,Math.hypot(pos.getX(i),pos.getZ(i))/radius);values[i]-=mean*(1-r*r)**2;max=Math.max(max,Math.abs(values[i]));}
 const scale=max>limit?limit/max:1;
 for(let i=0;i<pos.count;i++)pos.setY(i,top+values[i]*scale);
 pos.needsUpdate=true;surface.geometry.computeVertexNormals();surface.geometry.computeBoundingSphere();
}
