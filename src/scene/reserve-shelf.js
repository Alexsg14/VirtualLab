import * as THREE from 'three';
import { labState } from '../state/laboratory.js';
import { liberarGrupo } from './vessel-label.js';

export let estante3D = null;
let ultimaFirma = '';

/** Solo reconstruir la reserva cuando cambie, no en cada gota del grifo. */
export function actualizarEstante3D(scene, crearRecipiente) {
  const firma = JSON.stringify([labState.reservas,document.documentElement.dataset.tema,document.getElementById('render-liquido')?.value]);
  if (estante3D && firma === ultimaFirma) return false;
  const primeraReserva = !estante3D?.userData.cantidad && labState.reservas.length > 0;
  if (estante3D) { scene.remove(estante3D); liberarGrupo(estante3D); }
  ultimaFirma = firma;
  estante3D = new THREE.Group(); estante3D.name = 'estante-disoluciones';
  estante3D.userData.cantidad = labState.reservas.length;
  const columnas = 4, filas = Math.ceil(labState.reservas.length / columnas);
  for (let fila = 0; fila < filas; fila++) {
    const z = -3.65 - fila * 2.15;
    const plataforma = new THREE.Mesh(new THREE.BoxGeometry(10.2, 0.16, 1.9), new THREE.MeshStandardMaterial({color: 0x344352, roughness: 0.55, metalness: 0.2}));
    plataforma.position.set(0, 0.92, z); plataforma.receiveShadow = true; estante3D.add(plataforma);
    const borde = new THREE.Mesh(new THREE.BoxGeometry(10.2, 0.065, 0.035), new THREE.MeshBasicMaterial({color: 0x168c9c}));
    borde.position.set(0, 0.98, z + 0.95); estante3D.add(borde);
    for (let col = 0; col < Math.min(columnas, labState.reservas.length - fila * columnas); col++) {
      const index = fila * columnas + col, ficha = labState.reservas[index];
      const count = Math.min(columnas, labState.reservas.length - fila * columnas);
      const {group} = crearRecipiente(ficha.rec, 0, false, ficha.nombre);
      const escala = Math.min(0.76, 1.45 / (2.3 * group.scale.x));
      group.scale.multiplyScalar(escala);
      group.position.set((col - (count - 1) / 2) * 2.45, 1.01, z);
      group.userData.reservaIndex = index;
      group.name = 'reserva-' + index;
      estante3D.add(group);
    }
  }
  scene.add(estante3D);
  return primeraReserva;
}
