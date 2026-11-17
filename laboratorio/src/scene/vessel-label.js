import {radioMatraz} from './flask-profile.js';
import {medirAcidez} from '../core/acid-base.ts';
import * as THREE from 'three';
import { SOLUTOS } from '../data/catalog.ts';

/** Etiqueta de papel mallada sobre la superficie, no un cartel flotante. */
export function crearEtiquetaRecipiente(rec, nombre) {
  if (!nombre) return null;
  const canvas = document.createElement('canvas');
  canvas.width = 1024; canvas.height = 512;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#faf4dc'; ctx.fillRect(0, 0, 1024, 512);
  ctx.fillStyle = '#117d8b'; ctx.fillRect(0, 0, 1024, 22);
  ctx.strokeStyle = '#dbd3b8'; ctx.lineWidth = 6; ctx.strokeRect(8, 8, 1008, 496);
  ctx.fillStyle = '#173641'; ctx.textAlign = 'center';
  const words = String(nombre).split(/\s+/); const lines = []; let line = '';
  ctx.font = 'bold 68px sans-serif';
  for (const word of words) {
    const candidate = line ? line + ' ' + word : word;
    if (ctx.measureText(candidate).width > 920 && line) { lines.push(line); line = word; }
    else line = candidate;
  }
  if (line) lines.push(line);
  for (let i = 0; i < Math.min(2, lines.length); i++) {
    let text = lines[i];
    if (i === 1 && lines.length > 2) text += '…';
    ctx.fillText(text, 512, 110 + i * 82, 920);
  }
  const soluto = SOLUTOS.find(s => s.id === rec.soluteId);
  ctx.font = '52px sans-serif';
  ctx.fillText(Object.keys(rec.componentes||{}).length>1 ? 'Mezcla ácido-base' : rec.masaG > 0 ? (soluto?.formula || rec.soluteId) : 'Agua destilada', 512, 302, 920);
  ctx.font = 'bold 56px sans-serif';
  ctx.fillText(rec.volMl.toLocaleString('es-ES', {maximumFractionDigits: 2}) + ' mL', 512, 390, 920);
  ctx.font = '42px sans-serif';
  const molaridad = rec.volMl > 0 ? rec.molesN / rec.volMl * 1000 : 0;
  const medida=rec.acidBase?medirAcidez(rec):null;
  ctx.fillText(medida?'pH '+medida.pH.toFixed(2):molaridad.toFixed(4)+' mol/L',512,462,920);

  const texture = new THREE.CanvasTexture(canvas);
  texture.encoding = THREE.sRGBEncoding;
  texture.anisotropy = 4;
  const material = new THREE.MeshBasicMaterial({map: texture, side: THREE.FrontSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2});
  const limits = rec.tipo === 'matraz' ? [0.25, 0.78, 1.5] : rec.tipo === 'erlenmeyer' ? [0.5, 1.12, 1.5] : rec.tipo === 'probeta' ? [0.8, 1.7, 1.8] : [0.7, 1.38, 1.6];
  const radiusAt = y => {
    if (rec.tipo === 'matraz') return radioMatraz(y);
    if (rec.tipo === 'erlenmeyer') return 1.15 - (1.15 - 0.36) * y / 2;
    if (rec.tipo === 'probeta') return 0.32;
    return 0.85 * 0.96 + 0.85 * 0.04 * y / 2.4;
  };
  const positions = [], uvs = [], indices = [];
  const columns = 48, rows = 16;
  for (let j = 0; j <= rows; j++) {
    const y = limits[0] + (limits[1] - limits[0]) * j / rows;
    const radius = radiusAt(y) + 0.014;
    for (let i = 0; i <= columns; i++) {
      const angle = (i / columns - 0.5) * limits[2];
      positions.push(radius * Math.sin(angle), y, radius * Math.cos(angle));
      uvs.push(i / columns, j / rows);
    }
  }
  for (let j = 0; j < rows; j++) for (let i = 0; i < columns; i++) {
    const a = j * (columns + 1) + i, b = a + columns + 1;
    indices.push(a, a + 1, b, a + 1, b + 1, b);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices); geometry.computeVertexNormals();
  const label = new THREE.Mesh(geometry, material);
  label.name = 'etiqueta-recipiente'; label.renderOrder = 4;
  label.userData.texto = nombre;
  return label;
}

export function liberarGrupo(grupo) {
  const geometries = new Set(), materials = new Set(), textures = new Set();
  grupo.traverse(obj => {
    if (obj.geometry) geometries.add(obj.geometry);
    for (const mat of obj.material ? (Array.isArray(obj.material) ? obj.material : [obj.material]) : []) {
      materials.add(mat); if (mat.map) textures.add(mat.map);
    }
  });
  geometries.forEach(g => g.dispose()); textures.forEach(t => t.dispose()); materials.forEach(m => m.dispose());
}
