import {crearLiquidoContenido} from './contained-liquid.js';
import {radioMatraz,FONDO_MATRAZ,CUELLO_MATRAZ,BOCA_MATRAZ,AFORO_MATRAZ,RADIO_CUELLO} from './flask-profile.js';
import {actualizarInstrumento3D,instrumento3D,accionarInstrumento} from './instruments.js';
import {colorIndicador,opacidadIndicador} from '../core/acid-base.ts';
import { crearEtiquetaRecipiente, liberarGrupo } from './vessel-label.js';
import { actualizarEstante3D, estante3D } from './reserve-shelf.js';
import { recuperarDisolucion } from '../storage/reserve.js';
import * as THREE from 'three';
import { SOLUTOS, CAPACIDADES } from '../data/catalog.ts';
import { labState, fluidPhysics } from '../state/laboratory.js';
import { getCapacidadMax, seleccionarMesa } from '../app/vessels.js';
import { grifo } from '../instruments/water.js';
import { animarSuperficie } from './liquid.js';
import { vertidoActivo } from '../instruments/pouring.js';
import { animarVertido3D } from './pouring-animation.js';
import { renderizarRecipienteSVG } from './svg.js';

let liquidoMejorado=true;
try{liquidoMejorado=localStorage.getItem('lab_liquido')!=='clasico';}catch{}
export function cambiarRenderLiquido(valor){
 liquidoMejorado=valor==='mejorado';
 try{localStorage.setItem('lab_liquido',valor);}catch{}
 actualizarEscena3D();
}
export function alternarMalla3D() {
 const malla=scene3D?.getObjectByName('malla-referencia');if(!malla)return;
 malla.visible=!malla.visible;
 actualizarBotonMalla(malla.visible);
 try{localStorage.setItem('lab_malla',String(malla.visible));}catch{}
}
function actualizarBotonMalla(visible){
 const boton=document.getElementById('btn-malla');
 boton.classList.toggle('activo',visible);boton.setAttribute('aria-pressed',String(visible));
}
export function toggleAutoGiro() {
  labState.autoGiro = !labState.autoGiro;
  const btn = document.getElementById('btn-autogiro');
  btn.textContent = labState.autoGiro ? '⏸️ Detener giro' : '▶️ Auto-giro';
  btn.classList.toggle('activo', labState.autoGiro);
}

export function resetearCamara3D() {
  camSpherical.radius = 8.5;
  camSpherical.theta = 0.15;
  camSpherical.phi = Math.PI / 3.4;
  camTarget.set(0, 1.2, 0);
  actualizarPosicionCamara();
}

// ============================================================
// MOTOR 3D REAL CON THREE.JS (WebGL + FÍSICAS DE FLUIDO)
// ============================================================

export let scene3D, camera3D, renderer3D;

export let groupVessel1 = null, groupVessel2 = null;

export let liquidContainer1 = null, liquidContainer2 = null;

export let ringHighlight1 = null, ringHighlight2 = null;

export let raycaster3D, mouseVector3D;

export let particles3DList = [];

export const camSpherical = { radius: 8.5, theta: 0.15, phi: Math.PI / 3.4 };

export const camTarget = { x: 0, y: 1.2, z: 0, set(x,y,z){this.x=x;this.y=y;this.z=z;} };

export let isOrbitDragging = false;

export let prevPointerPos = { x: 0, y: 0 };

export function aplicarTemaEscena() {
 if(!scene3D)return;
 const dia=document.documentElement.dataset.tema==='light';
 scene3D.background.setHex(dia?0xe7eff5:0x111520);
 scene3D.fog.color.copy(scene3D.background);
 const bench=scene3D.getObjectByName('bancada');if(bench){bench.material.color.setHex(dia?0x555b61:0x181e2b);bench.material.roughness=dia?0.75:0.25;bench.material.metalness=dia?0.02:0.15;}
 const relleno=scene3D.getObjectByName('luz-relleno');if(relleno)relleno.color.setHex(dia?0xe5ebf0:0x00bcd4);
 if(groupVessel1)actualizarEscena3D();
}
window.addEventListener('laboratorio-tema',aplicarTemaEscena);
export function init3D() {
  document.getElementById('render-liquido').value=liquidoMejorado?'mejorado':'clasico';
  const container = document.getElementById('canvas-3d-container');
  if (!container) return;

  const width = container.clientWidth || 600;
  const height = container.clientHeight || 450;

  scene3D = new THREE.Scene();
  scene3D.background = new THREE.Color(0x111520);
  scene3D.fog = new THREE.FogExp2(0x111520, 0.04);

  camera3D = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
  actualizarPosicionCamara();

  renderer3D = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer3D.setSize(width, height);
  renderer3D.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer3D.shadowMap.enabled = true;
  renderer3D.shadowMap.type = THREE.PCFSoftShadowMap;
  container.innerHTML = '';
  container.appendChild(renderer3D.domElement);

  const ambientLight = new THREE.AmbientLight(0xddeeff, 0.65);
  scene3D.add(ambientLight);

  const keyLight = new THREE.DirectionalLight(0xffffff, 1.1);
  keyLight.position.set(5, 10, 6);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.width = 1024;
  keyLight.shadow.mapSize.height = 1024;
  scene3D.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0x00bcd4, 0.45);
  fillLight.position.set(-6, 6, -3);
  fillLight.name='luz-relleno';
  scene3D.add(fillLight);

  const benchPointLight = new THREE.PointLight(0xffffff, 0.5, 12);
  benchPointLight.position.set(0, 3, 2);
  scene3D.add(benchPointLight);

  // Bancada de laboratorio 3D
  const benchGeo = new THREE.BoxGeometry(10, 0.4, 6);
  const benchMat = new THREE.MeshStandardMaterial({
    color: 0x181e2b,
    roughness: 0.25,
    metalness: 0.15
  });
  const bench = new THREE.Mesh(benchGeo, benchMat);
  bench.name='bancada';
  bench.position.set(0, -0.2, 0);
  bench.receiveShadow = true;
  scene3D.add(bench);
  aplicarTemaEscena();

  // Malla rectangular de 10 × 6, con celdas cuadradas de 0,5 unidades.
  const puntos=[];
  for(let x=-5;x<=5;x+=0.5)puntos.push(x,0.01,-3,x,0.01,3);
  for(let z=-3;z<=3;z+=0.5)puntos.push(-5,0.01,z,5,0.01,z);
  const gridHelper=new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(puntos,3)),new THREE.LineBasicMaterial({color:0x657d91,transparent:true,opacity:0.35,depthWrite:false}));
  gridHelper.name='malla-referencia';gridHelper.visible=false;
  try{gridHelper.visible=localStorage.getItem('lab_malla')==='true';}catch{}
  actualizarBotonMalla(gridHelper.visible);scene3D.add(gridHelper);

  const ringGeo = new THREE.RingGeometry(0.9, 1.05, 32);
  ringGeo.rotateX(-Math.PI / 2);

  ringHighlight1 = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0x00bcd4, side: THREE.DoubleSide, transparent: true, opacity: 0.85 }));
  ringHighlight1.position.set(-2.0, 0.02, 0);
  scene3D.add(ringHighlight1);

  ringHighlight2 = new THREE.Mesh(ringGeo.clone(), new THREE.MeshBasicMaterial({ color: 0x3a4060, side: THREE.DoubleSide, transparent: true, opacity: 0.4 }));
  ringHighlight2.position.set(2.0, 0.02, 0);
  scene3D.add(ringHighlight2);

  raycaster3D = new THREE.Raycaster();
  mouseVector3D = new THREE.Vector2();

  setupControlesOrbita(renderer3D.domElement);
  actualizarEscena3D();
  animarLoop3D();
}

export function onWindowResize3D() {
  const container = document.getElementById('canvas-3d-container');
  if (!container || !renderer3D || !camera3D) return;
  const width = container.clientWidth;
  const height = container.clientHeight;
  camera3D.aspect = width / height;
  camera3D.updateProjectionMatrix();
  renderer3D.setSize(width, height);
}

export function actualizarPosicionCamara() {
  camSpherical.phi = Math.max(0.12, Math.min(Math.PI / 2 - 0.05, camSpherical.phi));
  camSpherical.radius = Math.max(3.5, Math.min(18.0, camSpherical.radius));

  camera3D.position.x = camTarget.x + camSpherical.radius * Math.sin(camSpherical.phi) * Math.sin(camSpherical.theta);
  camera3D.position.y = camTarget.y + camSpherical.radius * Math.cos(camSpherical.phi);
  camera3D.position.z = camTarget.z + camSpherical.radius * Math.sin(camSpherical.phi) * Math.cos(camSpherical.theta);
  camera3D.lookAt(camTarget.x, camTarget.y, camTarget.z);
}

export function setupControlesOrbita(canvasEl) {
  canvasEl.style.touchAction = 'none';
  canvasEl.addEventListener('pointermove', e => {
    if (!isOrbitDragging) {const hit=buscarRecipienteBajoCursor(e.clientX,e.clientY);canvasEl.style.cursor=hit?.accion||hit?.reservaIndex!==undefined?'pointer':'grab';}
  });
  let reservaPulsada = null;
  let accionPulsada = null;
  let inicioPulsacion = null;
  canvasEl.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    const encontrado = !e.shiftKey ? buscarRecipienteBajoCursor(e.clientX, e.clientY) : null;
    accionPulsada = encontrado?.accion || null;
    reservaPulsada = encontrado && encontrado.reservaIndex !== undefined ? encontrado.reservaIndex : null;
    inicioPulsacion = {x: e.clientX, y: e.clientY};
    isOrbitDragging = true;
    prevPointerPos = { x: e.clientX, y: e.clientY };

    if (e.shiftKey || reservaPulsada !== null || accionPulsada) { e.preventDefault(); return; }
    const rect = canvasEl.getBoundingClientRect();
    mouseVector3D.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouseVector3D.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster3D.setFromCamera(mouseVector3D, camera3D);
    const objetosClick = [];
    if (groupVessel1) objetosClick.push(groupVessel1);
    if (groupVessel2) objetosClick.push(groupVessel2);

    const intersects = raycaster3D.intersectObjects(objetosClick, true);
    if (intersects.length > 0) {
      let cur = intersects[0].object;
      while (cur.parent && cur !== groupVessel1 && cur !== groupVessel2) {
        cur = cur.parent;
      }
      if (cur === groupVessel1 && labState.mesaActiva !== 1) {
        seleccionarMesa(1);
      } else if (cur === groupVessel2 && labState.mesaActiva !== 2) {
        seleccionarMesa(2);
      }
    }
  });

  window.addEventListener('pointermove', (e) => {
    if (!isOrbitDragging) return;
    const dx = e.clientX - prevPointerPos.x;
    const dy = e.clientY - prevPointerPos.y;

    if (e.shiftKey) {
      // Desplazar en el plano de pantalla, con sensibilidad proporcional al zoom.
      const height = Math.max(1, canvasEl.getBoundingClientRect().height);
      const units = 2 * camSpherical.radius * Math.tan(camera3D.fov * Math.PI / 360) / height;
      const theta = camSpherical.theta, phi = camSpherical.phi;
      camTarget.x += units * (-dx * Math.cos(theta) - dy * Math.cos(phi) * Math.sin(theta));
      camTarget.y += units * dy * Math.sin(phi);
      camTarget.z += units * (dx * Math.sin(theta) - dy * Math.cos(phi) * Math.cos(theta));
      actualizarPosicionCamara();
      prevPointerPos = { x: e.clientX, y: e.clientY };
      return;
    }
    camSpherical.theta -= dx * 0.007;
    camSpherical.phi   -= dy * 0.007;
    actualizarPosicionCamara();

    // Inercia de fluidos (sloshing inducido por movimiento de cámara)
    fluidPhysics.sloshVelX1 += dx * 0.002;
    fluidPhysics.sloshVelZ1 += dy * 0.002;
    fluidPhysics.sloshVelX2 += dx * 0.002;
    fluidPhysics.sloshVelZ2 += dy * 0.002;

    prevPointerPos = { x: e.clientX, y: e.clientY };
  });

  window.addEventListener('pointerup', e => {
    isOrbitDragging = false;
    if(accionPulsada && inicioPulsacion && !e.shiftKey && Math.hypot(e.clientX-inicioPulsacion.x,e.clientY-inicioPulsacion.y)<5)accionarInstrumento(accionPulsada);
    accionPulsada=null;
    if (reservaPulsada !== null && inicioPulsacion && !e.shiftKey && Math.hypot(e.clientX - inicioPulsacion.x, e.clientY - inicioPulsacion.y) < 5) {
      const tipo = labState.reservas[reservaPulsada]?.rec.tipo;
      const mesa = labState.r1.tipo === tipo ? 1 : labState.r2.tipo === tipo ? 2 : labState.mesaActiva;
      recuperarDisolucion(reservaPulsada, mesa);
    }
    reservaPulsada = null; inicioPulsacion = null;
  });
  window.addEventListener('pointercancel', () => { isOrbitDragging = false; reservaPulsada = null; accionPulsada=null; });
  window.addEventListener('blur', () => { isOrbitDragging = false; reservaPulsada = null; });

  canvasEl.addEventListener('wheel', (e) => {
    e.preventDefault();
    camSpherical.radius += e.deltaY * 0.006;
    actualizarPosicionCamara();
  }, { passive: false });
}

// ============================================================
// RESOLVER MATEMÁTICO: ALTURA DE CASQUETE ESFÉRICO
// V(h) = (pi * h^2 / 3) * (3R - h)
// ============================================================

export function calcularAlturaCasqueteEsferico(V, R) {
  const V_total = (4 / 3) * Math.PI * Math.pow(R, 3);
  if (V <= 0) return 0;
  if (V >= V_total) return 2 * R;

  let h = 2 * R * Math.cbrt(V / V_total);
  for (let i = 0; i < 6; i++) {
    const f = Math.PI * R * h * h - (Math.PI / 3) * h * h * h - V;
    const fPrime = Math.PI * h * (2 * R - h);
    if (Math.abs(fPrime) < 1e-6) break;
    h = h - f / fPrime;
    h = Math.max(0.001, Math.min(2 * R, h));
  }
  return h;
}

// ============================================================
// CONSTRUCCIÓN 3D DE CRISTALERÍA Y CASQUETE DE FLUIDO
// El líquido reposa en el fondo por gravedad y tiene superficie horizontal
// ============================================================

export function actualizarEscena3D() {
  if (!scene3D) return;

  for(const old of [groupVessel1,groupVessel2]) if(old) {
    scene3D.remove(old);
    liberarGrupo(old);
  }

  const res1 = crearGrupoRecipiente3D(labState.r1, -2.0, labState.mesaActiva === 1);
  groupVessel1 = res1.group;
  liquidContainer1 = res1.liquidContainer;

  const res2 = crearGrupoRecipiente3D(labState.r2,  2.0, labState.mesaActiva === 2);
  groupVessel2 = res2.group;
  liquidContainer2 = res2.liquidContainer;

  scene3D.add(groupVessel1);
  scene3D.add(groupVessel2);
  actualizarMontajeDosificador();
  if (actualizarEstante3D(scene3D, crearGrupoRecipiente3D)) {
    camSpherical.radius = Math.max(camSpherical.radius, 11.8);
    if(labState.montajeDosificador){camSpherical.radius=Math.max(camSpherical.radius,14);camTarget.set(0,2.5,-0.35);}else camTarget.set(0, 1.35, -0.65);
    actualizarPosicionCamara();
  }

  if (ringHighlight1 && ringHighlight2) {
    ringHighlight1.material.color.setHex(labState.mesaActiva === 1 ? 0x00bcd4 : 0x3a4060);
    ringHighlight1.material.opacity = labState.mesaActiva === 1 ? 0.9 : 0.25;

    ringHighlight2.material.color.setHex(labState.mesaActiva === 2 ? 0x00bcd4 : 0x3a4060);
    ringHighlight2.material.opacity = labState.mesaActiva === 2 ? 0.9 : 0.25;
  }
}

/** Construye el recipiente 3D con casquete de fluido físico en el fondo */

export function crearGrupoRecipiente3D(rec, posX, esActivo, nombreEtiqueta = rec.nombreReserva) {
  const group = new THREE.Group();
  group.position.set(posX, 0, 0);

  const liquidContainer = new THREE.Group();
  group.add(liquidContainer);

  const tipo = rec.tipo;
  const cap = getCapacidadMax(rec);
  const capBase = CAPACIDADES[tipo] || 500;

  const factorEscala = Math.cbrt(cap / capBase);
  group.scale.set(factorEscala, factorEscala, factorEscala);

  const pctLleno = cap > 0 && rec.volH2OMl > 0 ? Math.max(0, Math.min(rec.volMl / cap, 1.25)) : 0;

  const dia=document.documentElement.dataset.tema==='light';
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: dia?0x7299ae:0xf5fbff,
    metalness: 0.05,
    roughness: 0.1,
    transmission: 0.88,
    transparent: true,
    opacity: esActivo ? 0.38 : 0.22,
    reflectivity: 0.9,
    clearcoat: 1.0,
    clearcoatRoughness: 0.1,
    side: THREE.DoubleSide,
    depthWrite: false
  });

  const s = SOLUTOS.find(x => x.id === rec.soluteId);
  const aguaVisible=dia && rec.masaG<=1e-12 && !rec.indicador;
  let rgbColor = colorIndicador(rec) || (aguaVisible ? [45,155,220] : rec.acidBase ? [170,220,255] : s ? s.rgb : [100, 180, 255]);
  let fracSat = 0;
  if (rec.volMl > 0 && rec.masaG > 0 && s) {
    fracSat = Math.min((rec.masaG / (rec.volMl / 1000)) / s.solMax, 1.0);
  }
  const opacidadLiq = (rec.volMl > 0) ? (rec.indicador ? opacidadIndicador(rec) : aguaVisible ? 0.78 : rec.acidBase ? 0.3 : 0.28 + fracSat * 0.62) : 0;
  const liquidColor = new THREE.Color(rgbColor[0]/255, rgbColor[1]/255, rgbColor[2]/255);

  const liquidMat = new THREE.MeshStandardMaterial({
    color: liquidColor,
    metalness: 0,
    roughness: 0.08,
    transparent: true,
    opacity: opacidadLiq,
    side: THREE.FrontSide,
    depthWrite: false
  });

  const markMat = new THREE.MeshBasicMaterial({ color: 0x00bcd4 });
  const scaleTickMat = new THREE.MeshBasicMaterial({ color: dia?0x445e73:0x9fa8c0, transparent: true, opacity: dia?0.85:0.65 });

  switch(tipo) {
    case 'matraz': {
      // Un unico perfil continuo para vidrio y liquido evita esferas cerradas
      // dentro del cuello y superficies diagonales al alcanzar el aforo.
      const yBottom=FONDO_MATRAZ,yNeckBase=CUELLO_MATRAZ;
      const neckR=RADIO_CUELLO,yTop=BOCA_MATRAZ,yAforo=AFORO_MATRAZ;
      const radiusAt=radioMatraz;
      // Base plana cerrada y cuello de radio constante.
      const profile=[new THREE.Vector2(0,yBottom),new THREE.Vector2(radiusAt(yBottom),yBottom)];
      for(let i=1;i<=96;i++){
        const y=yBottom+(yNeckBase-yBottom)*i/96;
        profile.push(new THREE.Vector2(radiusAt(y),y));
      }
      profile.push(new THREE.Vector2(neckR,yTop));
      const glass = new THREE.Mesh(new THREE.LatheGeometry(profile,64),glassMat);
      glass.renderOrder = 2;
      group.add(glass);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(neckR,0.025,12,64),glassMat);
      rim.rotation.x = Math.PI/2;
      rim.position.y = yTop;
      group.add(rim);
      const mark = new THREE.Mesh(new THREE.TorusGeometry(neckR+0.012,0.012,12,64),markMat);
      mark.rotation.x = Math.PI/2;
      mark.position.y = yAforo;
      mark.renderOrder = 3;
      group.add(mark);

      // Integrar el mismo perfil y buscar la altura correspondiente al volumen.
      const volumeAt = top => {
        const n=256, step=(top-yBottom)/n;
        let sum=0;
        for(let i=0;i<n;i++) sum += Math.PI * radiusAt(yBottom+(i+0.5)*step) ** 2 * step;
        return sum;
      };
      if (pctLleno > 0) {
        const target=volumeAt(yAforo)*Math.min(pctLleno,1);
        let lo=yBottom, hi=yAforo;
        for(let i=0;i<40;i++) {
          const mid=(lo+hi)/2;
          if(volumeAt(mid)<target) lo=mid; else hi=mid;
        }
        const ySurface=pctLleno>=1 ? yAforo : (lo+hi)/2;
        const pts=[new THREE.Vector2(0,yBottom)];
        // Incluir cada cambio de perfil para conservar hombro y cuello vertical.
        const levels=profile.map(p=>p.y).filter(y=>y>yBottom && y<ySurface);
        levels.push(ySurface);
        for(const y of levels) pts.push(new THREE.Vector2(radiusAt(y)*0.97,y));
        pts.push(new THREE.Vector2(0,ySurface));
        const mesh=new THREE.Mesh(new THREE.LatheGeometry(pts,64),liquidMat);
        mesh.renderOrder=1;
        liquidMat.depthWrite=false;
        liquidMat.side=THREE.FrontSide;
        liquidContainer.add(mesh);
      }
      break;
    }

    case 'vaso': {
      const radio = 0.85, altura = 2.4;
      const hNominal = altura * 0.90;

      const lipAngle=-Math.PI/2;
      const deformLip = (x,z,blend) => {
        const angle=Math.atan2(z,x);
        const delta=Math.atan2(Math.sin(angle-lipAngle),Math.cos(angle-lipAngle));
        const lip=Math.exp(-Math.pow(delta/0.23,2))*blend;
        return {x:x*(1+0.33*lip),z:z*(1+0.33*lip),raise:0.09*lip};
      };
      const wall=new THREE.CylinderGeometry(radio,radio*0.96,altura,96,16,true);
      const positions=wall.attributes.position;
      for(let i=0;i<positions.count;i++) {
        const y=positions.getY(i),blend=Math.pow(Math.max(0,(y+altura/2)/altura),10);
        const p=deformLip(positions.getX(i),positions.getZ(i),blend);
        positions.setXYZ(i,p.x,y+p.raise,p.z);
      }
      wall.computeVertexNormals();
      const glassCyl=new THREE.Mesh(wall,glassMat);glassCyl.position.y=altura/2;glassCyl.renderOrder=2;group.add(glassCyl);
      const baseDisc=new THREE.Mesh(new THREE.CircleGeometry(radio*0.96,64),glassMat);
      baseDisc.rotation.x=-Math.PI/2;group.add(baseDisc);
      const rimPoints=[];
      for(let i=0;i<160;i++) {
        const angle=i/160*Math.PI*2;
        const p=deformLip(radio*Math.cos(angle),radio*Math.sin(angle),1);
        rimPoints.push(new THREE.Vector3(p.x,altura+p.raise,p.z));
      }
      const rimCurve=new THREE.CatmullRomCurve3(rimPoints,true);
      const rim=new THREE.Mesh(new THREE.TubeGeometry(rimCurve,160,0.025,8,true),glassMat);
      rim.renderOrder=2;group.add(rim);

      [0.25, 0.5, 0.75, 1.0].forEach(m => {
        const tickRing = new THREE.Mesh(new THREE.TorusGeometry(radio * 0.98, 0.015, 8, 32), m === 1.0 ? markMat : scaleTickMat);
        tickRing.rotation.x = Math.PI / 2;
        tickRing.position.y = hNominal * m;
        group.add(tickRing);
      });

      if (pctLleno > 0.005) {
        const hLiq = hNominal * pctLleno;
        const pts = [
          new THREE.Vector2(0, 0.03),
          new THREE.Vector2(radio * 0.95, 0.03),
          new THREE.Vector2(radio * 0.95, 0.03 + hLiq),
          new THREE.Vector2(0, 0.03 + hLiq)
        ];
        const liqMesh = new THREE.Mesh(new THREE.LatheGeometry(pts, 32), liquidMat);
        liquidContainer.add(liqMesh);
      }
      break;
    }

    case 'erlenmeyer': {
      // Continuous rounded heel, conical body and a long, narrow neck.
      const outline=new THREE.CatmullRomCurve3([
        new THREE.Vector3(.76,.045,0),new THREE.Vector3(.97,.065,0),
        new THREE.Vector3(1.065,.14,0),new THREE.Vector3(1.085,.25,0),
        new THREE.Vector3(1.055,.36,0),new THREE.Vector3(.88,.76,0),
        new THREE.Vector3(.64,1.29,0),new THREE.Vector3(.39,1.83,0),
        new THREE.Vector3(.285,2.08,0),new THREE.Vector3(.27,2.24,0),
        new THREE.Vector3(.27,2.96,0),new THREE.Vector3(.29,3.05,0)
      ],false,'centripetal');
      const outer=outline.getPoints(180).map(p=>new THREE.Vector2(p.x,p.y));
      const inner=outer.map(p=>new THREE.Vector2(Math.max(0,p.x-.028),Math.max(.09,p.y)));
      const wall=new THREE.Mesh(new THREE.LatheGeometry([...outer,...inner.slice().reverse(),outer[0]],96),glassMat);
      wall.name='cristal-erlenmeyer';group.add(wall);
      const floor=new THREE.Mesh(new THREE.CylinderGeometry(.94,.94,.055,64),glassMat);floor.position.y=.065;group.add(floor);
      const lip=new THREE.Mesh(new THREE.TorusGeometry(.29,.025,12,64),glassMat);lip.rotation.x=Math.PI/2;lip.position.y=3.05;group.add(lip);
      // Integrate the actual inner profile: equal volume does not mean equal height.
      const bottom=.09,nominal=1.90;
      const radiusAt=y=>{
        let lo=0,hi=inner.length-1;
        while(lo<hi){const mid=Math.ceil((lo+hi)/2);if(inner[mid].y<=y)lo=mid;else hi=mid-1;}
        const a=inner[lo],b=inner[Math.min(lo+1,inner.length-1)];
        return a.x+(b.x-a.x)*Math.max(0,Math.min(1,(y-a.y)/Math.max(1e-9,b.y-a.y)));
      };
      const volumeAt=h=>{
        let v=0,y=bottom,r=radiusAt(bottom);
        for(const p of inner){if(p.y<=bottom)continue;const top=Math.min(h,p.y),rt=radiusAt(top);v+=Math.PI*(top-y)*(r*r+r*rt+rt*rt)/3;y=top;r=rt;if(y>=h)break;}
        return v;
      };
      if(pctLleno>0){
        const target=volumeAt(nominal)*Math.min(pctLleno,1.25);let lo=bottom,hi=3.02;
        for(let i=0;i<36;i++){const mid=(lo+hi)/2;if(volumeAt(mid)<target)lo=mid;else hi=mid;}
        const h=(lo+hi)/2,pts=[new THREE.Vector2(0,bottom),new THREE.Vector2(radiusAt(bottom),bottom)];
        for(const p of inner)if(p.y>bottom&&p.y<h)pts.push(p.clone());
        pts.push(new THREE.Vector2(radiusAt(h),h),new THREE.Vector2(0,h));
        liquidContainer.add(new THREE.Mesh(new THREE.LatheGeometry(pts,96),liquidMat));
      }
      break;
    }
    case 'probeta': {
      const baseFoot = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.8, 0.14, 6), glassMat);
      baseFoot.position.y = 0.07;
      group.add(baseFoot);

      const probR = 0.35, probH = 3.2;
      const probCyl = new THREE.Mesh(new THREE.CylinderGeometry(probR, probR, probH, 24, 1, true), glassMat);
      probCyl.position.y = probH / 2 + 0.14;
      group.add(probCyl);

      const hNominalProb = probH * 0.92;
      for (let i = 1; i <= 10; i++) {
        const isTop = (i === 10);
        const ring = new THREE.Mesh(new THREE.TorusGeometry(probR + 0.005, 0.012, 8, 24), isTop ? markMat : scaleTickMat);
        ring.rotation.x = Math.PI / 2;
        ring.position.y = 0.14 + (hNominalProb * i / 10);
        group.add(ring);
      }

      if (pctLleno > 0.005) {
        const hLiq = hNominalProb * pctLleno;
        const pts = [
          new THREE.Vector2(0, 0.14),
          new THREE.Vector2(probR * 0.94, 0.14),
          new THREE.Vector2(probR * 0.94, 0.14 + hLiq),
          new THREE.Vector2(0, 0.14 + hLiq)
        ];
        const liqMesh = new THREE.Mesh(new THREE.LatheGeometry(pts, 24), liquidMat);
        liquidContainer.add(liqMesh);
      }
      break;
    }

    case 'bureta': {
      const burR = 0.22, burH = 3.6;
      const burCyl = new THREE.Mesh(new THREE.CylinderGeometry(burR, burR, burH, 20, 1, true), glassMat);
      burCyl.position.y = burH / 2 + 0.6;
      group.add(burCyl);

      const valve = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.7, 16), new THREE.MeshStandardMaterial({ color: 0x3a4060, roughness: 0.3 }));
      valve.rotation.z = Math.PI / 2;
      valve.position.y = 0.45;
      group.add(valve);

      const tip = new THREE.Mesh(new THREE.ConeGeometry(burR, 0.4, 16, 1, true), glassMat);
      tip.rotation.x = Math.PI;
      tip.position.y = 0.2;
      group.add(tip);

      const hNominalBur = burH * 0.92;
      if (pctLleno > 0.005) {
        const hLiq = hNominalBur * pctLleno;
        const pts = [
          new THREE.Vector2(0, 0.60),
          new THREE.Vector2(burR * 0.93, 0.60),
          new THREE.Vector2(burR * 0.93, 0.60 + hLiq),
          new THREE.Vector2(0, 0.60 + hLiq)
        ];
        const liqMesh = new THREE.Mesh(new THREE.LatheGeometry(pts, 20), liquidMat);
        liquidContainer.add(liqMesh);
      }
      break;
    }

    case 'pipeta': {
      const stemR = 0.1, lowerH = 1.0, bulbH = 1.2, bulbR = 0.48, upperH = 1.1;

      const lowerStem = new THREE.Mesh(new THREE.CylinderGeometry(stemR, stemR * 0.5, lowerH, 16, 1, true), glassMat);
      lowerStem.position.y = lowerH / 2 + 0.1;
      group.add(lowerStem);

      const bulb = new THREE.Mesh(new THREE.SphereGeometry(bulbR, 24, 16), glassMat);
      bulb.scale.set(1.0, 1.35, 1.0);
      bulb.position.y = lowerH + bulbH / 2 + 0.1;
      group.add(bulb);

      const upperStem = new THREE.Mesh(new THREE.CylinderGeometry(stemR, stemR, upperH, 16, 1, true), glassMat);
      upperStem.position.y = lowerH + bulbH + upperH / 2 + 0.1;
      group.add(upperStem);

      const yAforoPip = lowerH + bulbH + upperH * 0.55 + 0.1;
      const aforoPip = new THREE.Mesh(new THREE.TorusGeometry(stemR + 0.015, 0.015, 8, 16), markMat);
      aforoPip.rotation.x = Math.PI / 2;
      aforoPip.position.y = yAforoPip;
      group.add(aforoPip);

      if (pctLleno > 0.005) {
        const hTotalNominal = (yAforoPip - 0.1);
        const hLiq = hTotalNominal * Math.min(pctLleno, 1.0);
        const pts = [
          new THREE.Vector2(0, 0.1),
          new THREE.Vector2(stemR * 0.9, 0.1)
        ];
        if (hLiq > lowerH) {
          pts.push(new THREE.Vector2(bulbR * 0.9, lowerH + (bulbH / 2)));
        }
        pts.push(new THREE.Vector2(stemR * 0.9, 0.1 + hLiq));
        pts.push(new THREE.Vector2(0, 0.1 + hLiq));

        const liqMesh = new THREE.Mesh(new THREE.LatheGeometry(pts, 16), liquidMat);
        liquidContainer.add(liqMesh);
      }
      break;
    }

    default:
      break;
  }

  if(liquidoMejorado){
    if(rec.masaG<=1e-12&&!rec.indicador){liquidColor.setHex(dia?0x42accf:0x5aabc7);liquidMat.color.copy(liquidColor);}
    crearLiquidoContenido(liquidContainer,liquidColor,opacidadLiq,dia);
    glassMat.side=THREE.FrontSide;glassMat.transmission=0;glassMat.opacity=dia?0.15:0.13;glassMat.roughness=0.2;
  }
  if(dia){
    // Contorno de Fresnel: resalta la silueta suave sin dibujar la triangulación.
    const borde=new THREE.ShaderMaterial({
      uniforms:{tinta:{value:new THREE.Color(0x31576c)}},
      vertexShader:'varying vec3 n; varying vec3 v; void main(){vec4 p=modelViewMatrix*vec4(position,1.0);n=normalize(normalMatrix*normal);v=-p.xyz;gl_Position=projectionMatrix*p;}',
      fragmentShader:'uniform vec3 tinta; varying vec3 n; varying vec3 v; void main(){float edge=pow(1.0-abs(dot(normalize(n),normalize(v))),3.0);gl_FragColor=vec4(tinta,0.025+0.8*edge);}',
      transparent:true,depthWrite:false,side:THREE.FrontSide,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1
    });
    for(const vidrio of [...group.children].filter(o=>o.isMesh&&o.material===glassMat)){
      const contorno=new THREE.Mesh(vidrio.geometry,borde);contorno.position.copy(vidrio.position);contorno.quaternion.copy(vidrio.quaternion);contorno.scale.copy(vidrio.scale);contorno.renderOrder=4;contorno.name='contorno-vidrio';group.add(contorno);
    }
  }
  if(rec.objetivoTemperatura && !['matraz','bureta','pipeta'].includes(rec.tipo)) {
    const plate=new THREE.Mesh(new THREE.CylinderGeometry(1.1,1.1,0.08,32),new THREE.MeshStandardMaterial({color:0x583328,emissive:0x682411,emissiveIntensity:0.7,roughness:0.6}));
    plate.position.y=0.01;group.add(plate);
  }
  if(rec.volH2OMl<=0 && rec.masaG>0 && ['NaOH','NaCl'].includes(rec.soluteId)) {
    const grainGeometry=new THREE.IcosahedronGeometry(0.03,0);
    const grainMaterial=new THREE.MeshStandardMaterial({color:0xe8eff4,roughness:0.9});
    for(let i=0;i<40;i++){
      const grain=new THREE.Mesh(grainGeometry,grainMaterial);
      const angle=i*2.39996,r=0.12+0.25*Math.sqrt(i/40);
      grain.position.set(Math.cos(angle)*r,0.06+0.025*(i%3),Math.sin(angle)*r);group.add(grain);
    }
  }
  const etiqueta = crearEtiquetaRecipiente(rec, nombreEtiqueta);
  if (etiqueta) group.add(etiqueta);
  const mesa = rec===labState.r1 ? 1 : rec===labState.r2 ? 2 : null;
  if(grifo.timer!==null && grifo.mesa===mesa) {
    const flow=Number(document.getElementById('grifo-caudal').value)||0;
    if(flow>0) {
      let surface=0.06;
      for(const child of liquidContainer.children) {
        child.geometry.computeBoundingBox();
        surface=Math.max(surface,child.geometry.boundingBox.max.y);
      }
      const outlet=tipo==='matraz' ? 3.85 : Math.max(3.6,surface+0.5);
      const jetMaterial=new THREE.MeshPhysicalMaterial({color:0xa9e6ff,transparent:true,opacity:0.55,roughness:0.05,metalness:0,depthWrite:false});
      const radius=0.012+Math.sqrt(flow/50)*0.035;
      const jet=new THREE.Mesh(new THREE.CylinderGeometry(radius*0.7,radius,outlet-surface,16),jetMaterial);
      jet.position.y=(outlet+surface)/2;jet.renderOrder=1;group.add(jet);
      const tap=new THREE.Mesh(new THREE.CylinderGeometry(0.07,0.07,0.65,16),new THREE.MeshStandardMaterial({color:0x9eafbd,metalness:0.85,roughness:0.22}));
      tap.rotation.z=Math.PI/2;tap.position.set(-0.27,outlet+0.04,0);group.add(tap);
    }
  }
  return { group, liquidContainer };
}

// ============================================================
// SISTEMA DE BURBUJAS Y TURBULENCIA DE FLUIDO
// ============================================================

export function spawnBubbles(mesaNum, count) {
  if (!scene3D || !labState.vista3D) return;

  const posX = mesaNum === 1 ? -2.0 : 2.0;
  const bubbleGeo = new THREE.SphereGeometry(0.025, 8, 8);
  const bubbleMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    transmission: 0.9,
    transparent: true,
    opacity: 0.8,
    roughness: 0.05
  });

  for (let i = 0; i < count; i++) {
    const mesh = new THREE.Mesh(bubbleGeo, bubbleMat);
    mesh.position.set(
      posX + (Math.random() - 0.5) * 0.3,
      0.1 + Math.random() * 0.2,
      (Math.random() - 0.5) * 0.3
    );
    scene3D.add(mesh);

    fluidPhysics.bubbles.push({
      mesh,
      mesaNum,
      vy: 0.025 + Math.random() * 0.025,
      angle: Math.random() * Math.PI * 2,
      radiusWobble: 0.05 + Math.random() * 0.05,
      life: 1.0
    });
  }
}

// ============================================================
// PARTÍCULAS 3D AL AÑADIR SOLUTO
// ============================================================

export function lanzarParticulas3D(rgb) {
  if (!scene3D || !labState.vista3D) return;

  const posX = labState.mesaActiva === 1 ? -2.0 : 2.0;
  const partColor = new THREE.Color(rgb[0]/255, rgb[1]/255, rgb[2]/255);
  const partGeo = new THREE.SphereGeometry(0.045, 8, 8);

  for (let i = 0; i < 28; i++) {
    const pMat = new THREE.MeshBasicMaterial({ color: partColor, transparent: true, opacity: 0.95 });
    const pMesh = new THREE.Mesh(partGeo, pMat);
    pMesh.position.set(
      posX + (Math.random() - 0.5) * 0.35,
      3.2 + Math.random() * 0.6,
      (Math.random() - 0.5) * 0.35
    );
    scene3D.add(pMesh);

    particles3DList.push({
      mesh: pMesh,
      vy: -(0.04 + Math.random() * 0.05),
      vx: (Math.random() - 0.5) * 0.015,
      vz: (Math.random() - 0.5) * 0.015,
      life: 1.0
    });
  }
}

// ============================================================
// BUCLE DE RENDER 3D + MOTOR DE FÍSICA DE FLUIDOS
// ============================================================

export let ultimoFrameLiquido = 0;

export function animarLoop3D() {
  requestAnimationFrame(animarLoop3D);

  const ahoraFrame=performance.now();
  const dt=ultimoFrameLiquido ? Math.min((ahoraFrame-ultimoFrameLiquido)/1000,0.04) : 0.016;
  ultimoFrameLiquido=ahoraFrame;

  if (labState.autoGiro && !isOrbitDragging) {
    camSpherical.theta += 0.0035;
    actualizarPosicionCamara();
  }

  // --- FÍSICA: Sloshing (oscilación de péndulo amortiguado) ---
  const omega2 = 24.0;
  const gamma = 2.4;

  // Recipiente 1
  const accelX1 = -omega2 * fluidPhysics.sloshAngleX1 - gamma * fluidPhysics.sloshVelX1;
  const accelZ1 = -omega2 * fluidPhysics.sloshAngleZ1 - gamma * fluidPhysics.sloshVelZ1;
  fluidPhysics.sloshVelX1 += accelX1 * dt;
  fluidPhysics.sloshAngleX1 += fluidPhysics.sloshVelX1 * dt;
  fluidPhysics.sloshVelZ1 += accelZ1 * dt;
  fluidPhysics.sloshAngleZ1 += fluidPhysics.sloshVelZ1 * dt;

  if(!vertidoActivo || vertidoActivo.origen!=='r1') animarSuperficie(liquidContainer1,1,dt,performance.now()/1000);

  // Recipiente 2
  const accelX2 = -omega2 * fluidPhysics.sloshAngleX2 - gamma * fluidPhysics.sloshVelX2;
  const accelZ2 = -omega2 * fluidPhysics.sloshAngleZ2 - gamma * fluidPhysics.sloshVelZ2;
  fluidPhysics.sloshVelX2 += accelX2 * dt;
  fluidPhysics.sloshAngleX2 += fluidPhysics.sloshVelX2 * dt;
  fluidPhysics.sloshVelZ2 += accelZ2 * dt;
  fluidPhysics.sloshAngleZ2 += fluidPhysics.sloshVelZ2 * dt;

  if(!vertidoActivo || vertidoActivo.origen!=='r2') animarSuperficie(liquidContainer2,2,dt,performance.now()/1000);
  animarVertido3D();

  // --- FÍSICA: Animación de burbujas dinámicas ---
  for (let i = fluidPhysics.bubbles.length - 1; i >= 0; i--) {
    const b = fluidPhysics.bubbles[i];
    b.mesh.position.y += b.vy;
    b.angle += 0.08;
    b.mesh.position.x += Math.sin(b.angle) * 0.003;
    b.mesh.position.z += Math.cos(b.angle) * 0.003;
    b.life -= 0.02;

    if (b.life <= 0 || b.mesh.position.y >= 2.5) {
      scene3D.remove(b.mesh);
      fluidPhysics.bubbles.splice(i, 1);
    }
  }

  // --- FÍSICA: Partículas de soluto ---
  for (let i = particles3DList.length - 1; i >= 0; i--) {
    const p = particles3DList[i];
    p.mesh.position.y += p.vy;
    p.mesh.position.x += p.vx;
    p.mesh.position.z += p.vz;
    p.life -= 0.018;
    p.mesh.material.opacity = p.life;

    if (p.life <= 0 || p.mesh.position.y <= 0.2) {
      scene3D.remove(p.mesh);
      particles3DList.splice(i, 1);
    }
  }

  if(!labState.vista3D) actualizarMontajeDosificador();
  if (renderer3D && scene3D && camera3D && labState.vista3D) {
    actualizarMontajeDosificador();
    renderer3D.render(scene3D, camera3D);
  }
}

// ============================================================
// SVG DE CRISTALERÍA — MODO 2D (Técnico / Fallback)
// Enrase de matraz riguroso en línea de aforo a 100% de llenado
// ============================================================

/** Identifica el recipiente bajo el cursor sin seleccionarlo. */
export function buscarRecipienteBajoCursor(clientX, clientY) {
  if (!renderer3D || !camera3D || !raycaster3D || isOrbitDragging) return null;
  const rect = renderer3D.domElement.getBoundingClientRect();
  const puntero = new THREE.Vector2(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
  camera3D.updateMatrixWorld();
  const grupos = [groupVessel1, groupVessel2, estante3D,instrumento3D].filter(Boolean);
  grupos.forEach(grupo => grupo.updateMatrixWorld(true));
  raycaster3D.setFromCamera(puntero, camera3D);
  for (const impacto of raycaster3D.intersectObjects(grupos, true)) {
    let objeto = impacto.object;
    while (objeto) {
      if(objeto.userData.instrumentoAccion)return {instrumento:labState.montajeDosificador?.tipo,accion:objeto.userData.instrumentoAccion};
      if(objeto===instrumento3D)return {instrumento:labState.montajeDosificador?.tipo};
      if (objeto === groupVessel1) return {mesa: 1};
      if (objeto === groupVessel2) return {mesa: 2};
      if (objeto.userData.reservaIndex !== undefined) return {reservaIndex: objeto.userData.reservaIndex};
      objeto = objeto.parent;
    }
  }
  return null;
}
export function buscarMesaBajoCursor(clientX, clientY) {
  return buscarRecipienteBajoCursor(clientX, clientY)?.mesa || null;
}

function actualizarMontajeDosificador(){
 if(!scene3D||!camera3D||!renderer3D)return;
 const nuevo=actualizarInstrumento3D(scene3D,camera3D,renderer3D.domElement,performance.now()/1000,{r1:liquidContainer1,r2:liquidContainer2});
 if(nuevo){camSpherical.radius=Math.max(camSpherical.radius,14);camTarget.set(0,2.5,-0.35);actualizarPosicionCamara();}
}
