import * as THREE from 'three';

/** Bench-mounted laboratory tap. Its outlet stays on the existing jet axis. */
export function crearGrifo3D(salidaY,caudal){
 const group=new THREE.Group();group.name='grifo-laboratorio';
 const chrome=new THREE.MeshPhysicalMaterial({color:0xb8cbd3,metalness:.72,roughness:.23,clearcoat:1,clearcoatRoughness:.16});
 const brushed=new THREE.MeshStandardMaterial({color:0x8399a6,metalness:.6,roughness:.35});
 const blue=new THREE.MeshStandardMaterial({color:0x128fbb,roughness:.32,metalness:.12});
 const rubber=new THREE.MeshStandardMaterial({color:0x263641,roughness:.7});
 const add=(geometry,material,x,y,z,name)=>{const mesh=new THREE.Mesh(geometry,material);mesh.position.set(x,y,z);mesh.name=name;group.add(mesh);return mesh;};
 const columnX=-1.5;
 add(new THREE.CylinderGeometry(.19,.23,.09,32),brushed,columnX,.045,0,'base-grifo');
 add(new THREE.CylinderGeometry(.105,.13,.12,24),chrome,columnX,.15,0,'collarin-grifo');
 const columnTop=salidaY+.05;
 add(new THREE.CylinderGeometry(.078,.09,columnTop-.2,24),chrome,columnX,(columnTop+.2)/2,0,'columna-grifo');
 const path=new THREE.CatmullRomCurve3([
  new THREE.Vector3(columnX,salidaY+.05,0),new THREE.Vector3(columnX,salidaY+.42,0),
  new THREE.Vector3(-1.23,salidaY+.64,0),new THREE.Vector3(-.67,salidaY+.64,0),
  new THREE.Vector3(-.15,salidaY+.44,0),new THREE.Vector3(0,salidaY+.25,0),new THREE.Vector3(0,salidaY+.12,0)
 ],false,'centripetal');
 add(new THREE.TubeGeometry(path,64,.073,12,false),chrome,0,0,0,'cano-grifo');
 add(new THREE.CylinderGeometry(.09,.076,.15,28),brushed,0,salidaY+.075,0,'boquilla-grifo');
 const rim=add(new THREE.TorusGeometry(.075,.009,8,28),chrome,0,salidaY+.008,0,'borde-boquilla');rim.rotation.x=Math.PI/2;
 const hole=add(new THREE.CircleGeometry(.056,24),rubber,0,salidaY-.001,0,'salida-grifo');hole.rotation.x=Math.PI/2;
 const valve=add(new THREE.CylinderGeometry(.12,.12,.14,24),brushed,columnX,.68,.11,'cuerpo-llave-grifo');valve.rotation.x=Math.PI/2;
 const control=new THREE.Group();control.position.set(columnX,.68,.2);control.rotation.z=-Math.PI*.35*Math.max(0,Math.min(1,caudal/50));control.name='mando-grifo';group.add(control);
 const hub=new THREE.Mesh(new THREE.CylinderGeometry(.085,.085,.065,24),chrome);hub.rotation.x=Math.PI/2;control.add(hub);
 const lever=new THREE.Mesh(new THREE.CylinderGeometry(.035,.04,.29,16),chrome);lever.position.y=.14;control.add(lever);
 const grip=new THREE.Mesh(new THREE.SphereGeometry(.068,20,12),blue);grip.scale.set(.8,1.45,.7);grip.position.y=.30;control.add(grip);
 // A small blue insert identifies the water control without a floating label.
 const insert=new THREE.Mesh(new THREE.CircleGeometry(.043,20),blue);insert.position.z=.034;control.add(insert);
 return group;
}