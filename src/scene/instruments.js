import * as THREE from 'three';
import {labState} from '../state/laboratory.js';
import {SOLUTOS,CAPACIDADES} from '../data/catalog.ts';
import {colorIndicador,opacidadIndicador} from '../core/acid-base.ts';
import {llaveBureta,caudalBureta,alternarLlaveBureta,regularLlaveBureta} from '../instruments/burette.js';
import {descargaPipeta,iniciarDescargaPipeta,detenerDescargaPipeta} from '../instruments/pipette.js';
import {retirarInstrumento} from '../instruments/mount.js';
import {actualizarDosificador} from '../instruments/dosing.js';
import {vertidoActivo} from '../instruments/pouring.js';
import {liberarGrupo} from './vessel-label.js';
export let instrumento3D=null;
let firma='',panel=null,montaje2D=null;
function actualizarVista2D(m,fraction,rgb,flow){
 const ins=labState.instrumentos[m.tipo];
 if(labState.vista3D){if(montaje2D)montaje2D.remove();montaje2D=null;return null;}
 const parent=document.getElementById('wrapper-'+m.destino);parent.style.position='relative';
 if(!montaje2D||montaje2D.dataset.tipo!==m.tipo||montaje2D.dataset.capacidad!==String(ins.capacidadMax)){
  if(montaje2D)montaje2D.remove();montaje2D=document.createElement('div');montaje2D.id='instrumento-2d';montaje2D.dataset.tipo=m.tipo;montaje2D.dataset.capacidad=String(ins.capacidadMax);
  montaje2D.innerHTML='<svg width="76" height="240" viewBox="0 0 76 240"><rect x="25" y="20" width="18" height="160" rx="3" fill="#182b3c" stroke="#d8eff6"/><rect id="nivel-instrumento-2d" x="28" y="177" width="12" height="0" fill="#79d5ed"/><path d="M29 180L34 234L39 180" fill="none" stroke="#c6e3ed"/>'+[0,1,2,3,4,5].map(i=>'<path d="M40 '+(24+i*30)+'h11" stroke="#d8eff6"/><text x="53" y="'+(27+i*30)+'" fill="#d8eff6" font-size="8">'+(Number((i*ins.capacidadMax/5).toPrecision(6)))+'</text>').join('')+'<g id="accion-instrumento-2d" role="button" tabindex="0" aria-label="Accionar instrumento" style="cursor:pointer">'+(m.tipo==='bureta'?'<rect x="12" y="190" width="44" height="28" fill="transparent"/><path id="palanca-instrumento-2d" d="M14 204h40" stroke="#00cadb" stroke-width="6" stroke-linecap="round"/>':'<ellipse cx="34" cy="11" rx="13" ry="12" fill="#32b8c7"/>')+'</g></svg>';
  const button=montaje2D.querySelector('#accion-instrumento-2d');const action=()=>accionarInstrumento(montaje2D.dataset.tipo==='bureta'?'llave-bureta':'pipeta-dosis');button.addEventListener('click',action);button.addEventListener('keydown',e=>{if(['Enter',' '].includes(e.key)){e.preventDefault();action();}});
 }
 if(montaje2D.parentElement!==parent)parent.appendChild(montaje2D);
 const liquid=montaje2D.querySelector('#nivel-instrumento-2d');liquid.setAttribute('height',157*fraction);liquid.setAttribute('y',177-157*fraction);liquid.setAttribute('fill','rgb('+rgb.join(',')+')');
 const lever=montaje2D.querySelector('#palanca-instrumento-2d');if(lever)lever.setAttribute('transform','rotate('+llaveBureta.apertura*0.9+' 34 204)');
 return montaje2D.getBoundingClientRect();
}
const numberFormatter=new Intl.NumberFormat('es-ES',{minimumFractionDigits:3,maximumFractionDigits:3});
const fmt=n=>numberFormatter.format(n);
function textoControl(id,value){const node=document.getElementById(id);if(node.textContent!==value)node.textContent=value;}
function propiedadControl(id,key,value){const node=document.getElementById(id);if(node[key]!==value)node[key]=value;}
function seleccionarMontaje(){
 const m=labState.montajeDosificador;if(!m)return;
 document.getElementById('dos-tipo').value=m.tipo;document.getElementById('dos-destino').value=m.destino;actualizarDosificador();
}
export function accionarInstrumento(accion){
 if(vertidoActivo)return;
 seleccionarMontaje();
 if(accion==='llave-bureta')alternarLlaveBureta();
 else if(accion==='pipeta-dosis')iniciarDescargaPipeta(Number(document.getElementById('dos-ml').value));
 else if(accion==='pipeta-gota')iniciarDescargaPipeta(Number(document.getElementById('dos-gota').value));
}
function controles(){
 if(panel)return panel;
 panel=document.createElement('section');panel.id='controles-instrumento-escena';panel.hidden=true;panel.setAttribute('aria-label','Control del instrumento colocado');
 panel.innerHTML='<strong id="escena-instrumento-nombre"></strong><div id="escena-instrumento-volumen"></div><div id="escena-bureta-controles"><button id="escena-llave">Abrir llave</button><label for="escena-apertura">Apertura de la llave</label><input id="escena-apertura" type="range" min="0" max="100" step="1" value="0"><span id="escena-apertura-texto"></span></div><div id="escena-pipeta-controles"><label for="escena-dosis">Dosis (mL)</label><input id="escena-dosis" type="number" min="0.001" step="0.05" value="1"><div class="escena-acciones"><button id="escena-descargar">Descargar</button><button id="escena-gota">Una gota</button><button id="escena-parar" hidden>Detener</button></div></div><div id="escena-error" role="status"></div><button id="escena-retirar" class="escena-secundario">Retirar instrumento</button>';
 document.getElementById('panel-central').append(panel);
 document.getElementById('escena-llave').addEventListener('click',()=>accionarInstrumento('llave-bureta'));
 document.getElementById('escena-apertura').addEventListener('input',e=>{seleccionarMontaje();regularLlaveBureta(Number(e.target.value));});
 document.getElementById('escena-dosis').addEventListener('input',e=>{document.getElementById('dos-ml').value=e.target.value;});
 document.getElementById('escena-descargar').addEventListener('click',()=>{document.getElementById('dos-ml').value=document.getElementById('escena-dosis').value;accionarInstrumento('pipeta-dosis');});
 document.getElementById('escena-gota').addEventListener('click',()=>accionarInstrumento('pipeta-gota'));
 document.getElementById('escena-parar').addEventListener('click',()=>detenerDescargaPipeta());
 document.getElementById('escena-retirar').addEventListener('click',retirarInstrumento);
 return panel;
}
function graduaciones(capacidad,altura){
 const canvas=document.createElement('canvas');canvas.width=256;canvas.height=1024;
 const ctx=canvas.getContext('2d');ctx.strokeStyle='#d7ebf5';ctx.fillStyle='#eafaff';ctx.font='38px sans-serif';ctx.lineWidth=3;
 for(let i=0;i<=50;i++){
   const y=32+(960*i/50),major=i%5===0;ctx.beginPath();ctx.moveTo(8,y);ctx.lineTo(major?70:37,y);ctx.stroke();
   if(major)ctx.fillText(String(Number((capacidad*i/50).toPrecision(6))),82,y+12);
 }
 const tex=new THREE.CanvasTexture(canvas);
 const mesh=new THREE.Mesh(new THREE.PlaneGeometry(0.55,altura+0.15),new THREE.MeshBasicMaterial({map:tex,transparent:true,depthWrite:false,side:THREE.DoubleSide}));
 mesh.position.z=0.11;mesh.position.x=0.3;mesh.renderOrder=3;return mesh;
}
function crearModelo(tipo,tipY,escala){
 const group=new THREE.Group();group.name='instrumento-montado';group.userData.tipo=tipo;
 const bureta=tipo==='bureta',base=bureta?0.55:0.42,altura=bureta?2.6:2.2,radio=bureta?0.105:0.075;
 const glass=new THREE.MeshPhysicalMaterial({color:0xcce9f7,metalness:0,roughness:0.12,transparent:true,opacity:0.34,side:THREE.DoubleSide,depthWrite:false});
 const tube=new THREE.Mesh(new THREE.CylinderGeometry(radio,radio,altura,32,1,true),glass);tube.position.y=base+altura/2;tube.renderOrder=2;group.add(tube);
 const rim=new THREE.Mesh(new THREE.TorusGeometry(radio,0.018,8,32),glass);rim.rotation.x=Math.PI/2;rim.position.y=base+altura;group.add(rim);
 const tip=new THREE.Mesh(new THREE.CylinderGeometry(radio*0.62,0.016,0.32,20,1,true),glass);tip.position.y=0.16;tip.userData.instrumentoAccion=bureta?'llave-bureta':'pipeta-gota';group.add(tip);
 const liquid=new THREE.Mesh(new THREE.CylinderGeometry(radio*0.78,radio*0.78,1,24),new THREE.MeshStandardMaterial({color:0x89d8f0,transparent:true,opacity:0.65,metalness:0,roughness:0.12,depthWrite:false}));
 liquid.name='liquido-instrumento';liquid.renderOrder=1;group.add(liquid);
 const meniscus=new THREE.Mesh(new THREE.TorusGeometry(radio*0.8,0.009,6,24),new THREE.MeshBasicMaterial({color:0xa8e6ff}));meniscus.rotation.x=Math.PI/2;meniscus.name='menisco-instrumento';group.add(meniscus);
 const ticks=graduaciones(labState.instrumentos[tipo].capacidadMax,altura);ticks.position.y=base+altura/2;group.add(ticks);
 let lever;
 if(bureta){
   // Glass barrel, white PTFE plug and a separate rotating handle.
   const ptfe=new THREE.MeshStandardMaterial({color:0xf2f0e7,roughness:0.3});
   const accent=new THREE.MeshStandardMaterial({color:0x168ba2,roughness:0.26,metalness:0.12});
   const part=(geo,mat,x,y,z,name)=>{const mesh=new THREE.Mesh(geo,mat);mesh.position.set(x,y,z);if(name)mesh.name=name;mesh.userData.instrumentoAccion='llave-bureta';group.add(mesh);return mesh;};
   part(new THREE.CylinderGeometry(radio,0.045,0.17,28),glass,0,0.48,0);
   const barrel=part(new THREE.CylinderGeometry(0.105,0.105,0.38,28),glass,0,0.37,0);barrel.rotation.z=Math.PI/2;
   const plug=part(new THREE.CylinderGeometry(0.069,0.069,0.43,28),ptfe,0,0.37,0);plug.rotation.z=Math.PI/2;
   for(const x of [-0.2,0.2]){const collar=part(new THREE.TorusGeometry(0.085,0.015,10,28),ptfe,x,0.37,0);collar.rotation.y=Math.PI/2;}
   part(new THREE.CylinderGeometry(0.043,0.033,0.16,24,1,true),glass,0,0.27,0);
   lever=new THREE.Group();lever.position.set(0,0.37,0.12);lever.name='llave-bureta';group.add(lever);
   const hub=new THREE.Mesh(new THREE.CylinderGeometry(0.075,0.075,0.07,24),accent);hub.rotation.x=Math.PI/2;lever.add(hub);
   const handle=new THREE.Mesh(new THREE.BoxGeometry(0.32,0.065,0.07),accent);
   handle.position.x=0.10;handle.userData.instrumentoAccion='llave-bureta';lever.add(handle);
   const grip=new THREE.Mesh(new THREE.SphereGeometry(0.052,16,10),ptfe);grip.scale.set(0.7,1.4,0.8);grip.position.x=0.25;lever.add(grip);
   const hit=part(new THREE.BoxGeometry(0.65,0.32,0.38),new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false}),0,0.37,0.12);hit.name='zona-llave-bureta';
   const metal=new THREE.MeshStandardMaterial({color:0x788895,metalness:0.78,roughness:0.26});
   // Keep the whole stand beyond the vessel envelope, including large vessels.
   const standX=1.3*escala+0.65,standZ=-0.65*escala-0.2,clampY=base+altura*0.78;
   const foot=new THREE.Mesh(new THREE.BoxGeometry(0.65,0.10,0.95),new THREE.MeshStandardMaterial({color:0x354652,roughness:0.6}));foot.position.set(standX,-tipY+0.05,standZ);foot.name='base-soporte-bureta';group.add(foot);
   const rod=new THREE.Mesh(new THREE.CylinderGeometry(0.027,0.027,tipY+3.2,16),metal);rod.position.set(standX,(3.2-tipY)/2,standZ);rod.name='varilla-soporte-bureta';group.add(rod);
   const from=new THREE.Vector3(standX,clampY,standZ),to=new THREE.Vector3(0,clampY,-0.13),axis=to.clone().sub(from);
   const clamp=new THREE.Mesh(new THREE.CylinderGeometry(0.027,0.027,axis.length(),16),metal);clamp.position.copy(from.add(to).multiplyScalar(0.5));clamp.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),axis.normalize());group.add(clamp);
   const jaw=new THREE.Mesh(new THREE.TorusGeometry(radio+0.025,0.023,8,24,Math.PI*1.45),accent);jaw.rotation.x=Math.PI/2;jaw.position.y=clampY;group.add(jaw);
 }else{
   const pump=new THREE.Mesh(new THREE.SphereGeometry(0.18,24,16),new THREE.MeshStandardMaterial({color:0x36b9c4,roughness:0.55}));pump.scale.y=1.5;pump.position.y=base+altura+0.25;pump.userData.instrumentoAccion='pipeta-dosis';pump.name='pulsador-pipeta';group.add(pump);
 }
 const flowMat=new THREE.MeshPhysicalMaterial({color:0xa9e6ff,transparent:true,opacity:0.9,roughness:0.08,metalness:0.08,clearcoat:1,depthWrite:false});
 const jet=new THREE.Mesh(new THREE.CylinderGeometry(0.018,0.012,1,12),flowMat);jet.name='chorro-instrumento';jet.visible=false;group.add(jet);
 const drops=[];const dropGeo=new THREE.SphereGeometry(0.045,16,12);
 for(let i=0;i<32;i++){const drop=new THREE.Mesh(dropGeo,flowMat);drop.scale.y=1.3;drop.renderOrder=4;drop.visible=false;group.add(drop);drops.push(drop);}
 const pendant=new THREE.Mesh(dropGeo,flowMat);pendant.name='gota-en-formacion';pendant.renderOrder=4;pendant.visible=false;group.add(pendant);
 group.userData={...group.userData,base,altura,liquid,meniscus,lever,jet,drops,pendant,dropVolume:0};return group;
}
export function actualizarInstrumento3D(scene,camera,canvas,time,liquidos){
 const m=labState.montajeDosificador;
 if(!m||!labState[m.destino]){
  if(instrumento3D){scene.remove(instrumento3D);liberarGrupo(instrumento3D);instrumento3D=null;firma='';}
  if(panel)panel.hidden=true;if(montaje2D){montaje2D.remove();montaje2D=null;}return false;
 }
 const rec=labState[m.destino],ins=labState.instrumentos[m.tipo];
 const escala=Math.cbrt(rec.capacidadMax/(CAPACIDADES[rec.tipo]||500));
 const apertura=rec.tipo==='matraz'?3.39:rec.tipo==='vaso'?2.4:rec.tipo==='erlenmeyer'?3.075:rec.tipo==='probeta'?3.35:3.4;
 const tipY=apertura*escala+0.22;
 const key=m.tipo+'|'+m.destino+'|'+rec.tipo+'|'+rec.capacidadMax+'|'+ins.capacidadMax;
 let nuevo=false;
 if(!instrumento3D||key!==firma){
  if(instrumento3D){scene.remove(instrumento3D);liberarGrupo(instrumento3D);}
  instrumento3D=crearModelo(m.tipo,tipY,escala);scene.add(instrumento3D);firma=key;nuevo=true;
 }
 const g=instrumento3D,u=g.userData;
 g.position.set(m.destino==='r1'?-2:2,tipY,0);g.visible=!vertidoActivo;
 const fraction=Math.max(0,Math.min(1,ins.volMl/ins.capacidadMax));
 u.liquid.visible=fraction>1e-8;u.liquid.scale.y=Math.max(0.0001,u.altura*fraction);u.liquid.position.y=u.base+u.altura*fraction/2;
 u.meniscus.visible=fraction>1e-8;u.meniscus.position.y=u.base+u.altura*fraction;
 const aguaVisible=document.documentElement.dataset.tema==='light'&&ins.masaG<=1e-12&&!ins.indicador;
 const sol=SOLUTOS.find(s=>s.id===ins.soluteId),rgb=colorIndicador(ins)||(aguaVisible?[45,155,220]:ins.masaG>0?sol?.rgb:[120,205,245])||[120,205,245];
 u.liquid.material.color.setRGB(...rgb.map(x=>x/255));u.liquid.material.opacity=ins.indicador?opacidadIndicador(ins):aguaVisible?0.85:0.65;
 if(u.lever)u.lever.rotation.z=llaveBureta.apertura*Math.PI/200;
 const flow=m.tipo==='bureta'&&llaveBureta.timer!==null?caudalBureta(llaveBureta.apertura):m.tipo==='pipeta'&&descargaPipeta.timer!==null?descargaPipeta.cantidad/descargaPipeta.duracion:0;
 let surface=0.05;const destLiquid=liquidos[m.destino];
 if(destLiquid)for(const mesh of destLiquid.children){if(mesh.geometry){mesh.geometry.computeBoundingBox();surface=Math.max(surface,mesh.geometry.boundingBox.max.y*escala);}}
 const distance=Math.max(0.08,tipY-surface);
 u.jet.visible=flow>0.3&&!vertidoActivo;
 u.jet.position.y=-distance/2;u.jet.scale.y=distance;u.jet.material.color.copy(u.liquid.material.color);
 // Release at exact subframe times. Recycle expired drops before emitting:
 // an exhausted pool must never accumulate a backlog and release it in bursts.
 const dt=Math.max(0,time-(u.lastFlowTime??time));u.lastFlowTime=time;
 const flightTime=Math.sqrt(2*Math.max(0,distance-0.06)/5);
 for(const drop of u.drops)if(drop.userData.born!=null&&time-drop.userData.born>=flightTime)drop.userData.born=null;
 if(flow>0&&flow<=0.3){
  const volume=u.dropVolume+flow*dt,count=Math.floor(volume/0.025);
  // Only recreate droplets still in flight after a delayed frame.
  const first=Math.max(0,count-u.drops.length);
  for(let i=first;i<count;i++){
   const born=time-(volume-(i+1)*0.025)/flow;
   if(time-born>=flightTime)continue;
   const drop=u.drops.find(d=>d.userData.born==null);
   if(drop)drop.userData.born=born;
  }
  u.dropVolume=volume-count*0.025;
 }else u.dropVolume=0;
 u.pendant.visible=flow>0&&flow<=0.3&&!vertidoActivo;
 const growth=Math.cbrt(Math.max(0.015,Math.min(1,u.dropVolume/0.025)));
 u.pendant.scale.set(growth,growth*1.4,growth);u.pendant.position.y=-0.045*growth;
 u.pendant.material.color.copy(u.liquid.material.color);
 u.previousFlow=flow;
 for(const drop of u.drops){
  const born=drop.userData.born,age=born==null?Infinity:time-born,fall=0.5*5*age*age;
  drop.visible=born!=null&&fall<distance-0.06&&!vertidoActivo;
  if(fall>=distance-0.06)drop.userData.born=null;
  if(drop.visible)drop.position.y=-0.06-fall;
  drop.material.color.copy(u.liquid.material.color);
 }
 const rect2d=actualizarVista2D(m,fraction,rgb,flow);
 const ui=controles();if(ui.hidden!==!!vertidoActivo)ui.hidden=!!vertidoActivo;
 if(!ui.hidden){
  textoControl('escena-instrumento-nombre',(m.tipo==='bureta'?'Bureta':'Pipeta')+' → R'+m.destino.slice(1));
  textoControl('escena-instrumento-volumen',fmt(ins.volMl)+' / '+ins.capacidadMax+' mL');
  textoControl('escena-error',document.getElementById('err-dosificador').textContent);
  propiedadControl('escena-bureta-controles','hidden',m.tipo!=='bureta');propiedadControl('escena-pipeta-controles','hidden',m.tipo!=='pipeta');
  const slider=document.getElementById('escena-apertura');if(document.activeElement!==slider&&slider.value!==String(llaveBureta.apertura))slider.value=llaveBureta.apertura;
  textoControl('escena-apertura-texto',llaveBureta.apertura+' % · '+fmt(flow)+' mL/s');
  textoControl('escena-llave',llaveBureta.apertura?'Cerrar llave':'Abrir llave');
  const pressed=String(llaveBureta.apertura>0),key=document.getElementById('escena-llave');if(key.getAttribute('aria-pressed')!==pressed)key.setAttribute('aria-pressed',pressed);
  const dose=document.getElementById('escena-dosis'),value=document.getElementById('dos-ml').value;if(document.activeElement!==dose&&dose.value!==value)dose.value=value;
  const busy=descargaPipeta.timer!==null;propiedadControl('escena-descargar','disabled',busy);propiedadControl('escena-gota','disabled',busy);if(dose.disabled!==busy)dose.disabled=busy;propiedadControl('escena-parar','hidden',!busy);
  const rect=canvas.getBoundingClientRect(),host=document.getElementById('panel-central').getBoundingClientRect();
  // Projection and WebGL rendering must use the same camera pose in this frame.
  // lookAt changes the quaternion; matrixWorldInverse may still hold its previous value.
  camera.updateMatrixWorld(true);
  const anchor=g.localToWorld(new THREE.Vector3(0.25,m.tipo==='bureta'?0.4:u.base+u.altura+0.25,0.15)).project(camera);
  const x=rect2d?rect2d.right-host.left+8:rect.left+(anchor.x+1)*rect.width/2-host.left+20,y=rect2d?rect2d.top-host.top+(m.tipo==='bureta'?180:0):rect.top+(1-anchor.y)*rect.height/2-host.top-24;
  const px=Math.max(8,Math.min(host.width-ui.offsetWidth-8,x)),py=Math.max(54,Math.min(host.height-ui.offsetHeight-60,y));
  // A compositor transform retains fractional pixels and avoids per-frame left/top layout.
  const transform='translate3d('+px+'px,'+py+'px,0)';if(ui.style.transform!==transform)ui.style.transform=transform;
 }
 return nuevo;
}
