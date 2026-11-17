import * as THREE from 'three';

/** Laboratory tap with a swept neck, hose connector and inclined green valve. */
export function crearGrifo3D(salidaY,caudal){
 const group=new THREE.Group();group.name='grifo-laboratorio';
 const metal=new THREE.MeshPhysicalMaterial({color:0xbebfb9,metalness:.38,roughness:.29,clearcoat:.4,clearcoatRoughness:.24});
 const trim=new THREE.MeshStandardMaterial({color:0xa8aaa4,metalness:.48,roughness:.32});
 const green=new THREE.MeshPhysicalMaterial({color:0x236738,metalness:.08,roughness:.26,clearcoat:.7});
 const brass=new THREE.MeshStandardMaterial({color:0xb7964d,metalness:.7,roughness:.35});
 const dark=new THREE.MeshStandardMaterial({color:0x26312c,roughness:.7});
 const add=(geometry,material,x,y,z,name)=>{const mesh=new THREE.Mesh(geometry,material);mesh.position.set(x,y,z);mesh.name=name;group.add(mesh);return mesh;};
 const columnX=1.45;
 add(new THREE.CylinderGeometry(.17,.23,.055,40),metal,columnX,.045,0,'base-grifo');
 add(new THREE.CylinderGeometry(.115,.13,.47,32),metal,columnX,.30,0,'cuerpo-grifo');
 const columnTop=salidaY-.10;
 add(new THREE.CylinderGeometry(.079,.079,columnTop-.52,32),metal,columnX,(columnTop+.52)/2,0,'columna-grifo');
 const path=new THREE.CatmullRomCurve3([
  new THREE.Vector3(columnX,salidaY-.10,0),new THREE.Vector3(columnX,salidaY+.28,0),
  new THREE.Vector3(1.35,salidaY+.44,0),new THREE.Vector3(.52,salidaY+.86,0),
  new THREE.Vector3(.18,salidaY+.88,0),new THREE.Vector3(0,salidaY+.72,0),new THREE.Vector3(0,salidaY+.35,0)
 ],false,'centripetal');
 add(new THREE.TubeGeometry(path,72,.079,16,false),metal,0,0,0,'cano-grifo');
 // Stepped hose barb, with a real dark outlet instead of a solid end cap.
 const nozzleProfile=[[.046,0],[.055,.025],[.051,.065],[.061,.105],[.053,.145],[.066,.185],[.058,.225],[.074,.27],[.074,.35]].map(([r,y])=>new THREE.Vector2(r,y));
 add(new THREE.LatheGeometry(nozzleProfile,32),metal,0,salidaY,0,'boquilla-grifo');
 for(const y of [.29,.34]){const ring=add(new THREE.TorusGeometry(.079,.009,8,32),trim,0,salidaY+y,0,'collarin-boquilla');ring.rotation.x=Math.PI/2;}
 const hole=add(new THREE.CircleGeometry(.043,24),dark,0,salidaY-.001,0,'salida-grifo');hole.rotation.x=Math.PI/2;
 // Inclined side valve. The handle rotates around its own axis as flow changes.
 const axis=new THREE.Vector3(.77,.55,.33).normalize(),origin=new THREE.Vector3(columnX,.30,0);
 const socket=add(new THREE.CylinderGeometry(.105,.12,.29,32),metal,0,0,0,'cuerpo-llave-grifo');socket.position.copy(origin).addScaledVector(axis,.12);socket.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),axis);
 const control=new THREE.Group();control.position.copy(origin).addScaledVector(axis,.25);control.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),axis);control.name='mando-grifo';group.add(control);
 const turn=new THREE.Group();turn.name='giro-mando-grifo';turn.rotation.y=Math.PI*.75*Math.max(0,Math.min(1,caudal/50));control.add(turn);
 const gripGeometry=new THREE.CylinderGeometry(.145,.105,.29,64,4);
 const positions=gripGeometry.attributes.position;
 for(let i=0;i<positions.count;i++){const x=positions.getX(i),z=positions.getZ(i),r=Math.hypot(x,z);if(r>0){const ridge=1+.09*Math.cos(Math.atan2(z,x)*8);positions.setXYZ(i,x*ridge,positions.getY(i),z*ridge);}}
 gripGeometry.computeVertexNormals();
 const grip=new THREE.Mesh(gripGeometry,green);grip.position.y=.145;grip.name='puno-verde-grifo';turn.add(grip);
 const cap=new THREE.Mesh(new THREE.CylinderGeometry(.145,.145,.025,40),green);cap.position.y=.297;turn.add(cap);
 const index=new THREE.Mesh(new THREE.BoxGeometry(.018,.006,.085),new THREE.MeshBasicMaterial({color:0xe2e9d9}));index.position.set(.065,.313,0);index.name='indice-llave-grifo';turn.add(index);
 // The threaded fixing passes through the bench beneath the flange.
 add(new THREE.CylinderGeometry(.064,.064,.32,24),brass,columnX,-.16,0,'rosca-fijacion-grifo');
 for(let i=0;i<6;i++){const thread=add(new THREE.TorusGeometry(.067,.005,5,24),brass,columnX,-.035-i*.045,0,'filete-rosca-grifo');thread.rotation.x=Math.PI/2;}
 return group;
}