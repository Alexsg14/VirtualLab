import {colorIndicador,opacidadIndicador} from '../core/acid-base.ts';
import { SOLUTOS, NOMBRES_RECIPIENTE } from '../data/catalog.ts';
import { labState } from '../state/laboratory.js';
import { getCapacidadMax } from '../app/vessels.js';

export function getColorLiquido(soluteId, masaG, volMl) {
  const s = SOLUTOS.find(x => x.id === soluteId);
  if (!s || masaG <= 0 || volMl <= 0) return 'rgba(100,180,255,0.15)';
  const volL = volMl / 1000;
  const conc = masaG / volL;
  const frac = Math.min(conc / s.solMax, 1);
  const opacidad = 0.15 + frac * 0.75;
  return s.colorBase + opacidad.toFixed(2) + ')';
}

export function getPctLlenado(rec) {
  const cap = getCapacidadMax(rec);
  return cap > 0 ? Math.min((rec.volMl / cap) * 100, 100) : 0;
}

export function renderizarRecipienteSVG(mesaNum) {
  const rec = mesaNum === 1 ? labState.r1 : labState.r2;
  const contenedor = document.getElementById('svg-r' + mesaNum);
  if (!contenedor) return;

  const indicatorColor=colorIndicador(rec);
  const color = indicatorColor ? 'rgba('+indicatorColor.join(',')+','+opacidadIndicador(rec)+')' : getColorLiquido(rec.soluteId, rec.masaG, rec.volMl);
  const pct   = rec.volH2OMl>0?getPctLlenado(rec):0;

  let svgHTML = '';
  switch(rec.tipo) {
    case 'matraz':     svgHTML = svgMatraz(color, pct);     break;
    case 'vaso':       svgHTML = svgVaso(color, pct);       break;
    case 'erlenmeyer': svgHTML = svgErlenmeyer(color, pct); break;
    case 'probeta':    svgHTML = svgProbeta(color, pct);    break;
    case 'bureta':     svgHTML = svgBureta(color, pct);     break;
    case 'pipeta':     svgHTML = svgPipeta(color, pct);     break;
    default:           svgHTML = svgMatraz(color, pct);
  }

  contenedor.innerHTML = svgHTML;
  if (rec.nombreReserva) {
    const svg = contenedor.querySelector('svg');
    const ns = 'http://www.w3.org/2000/svg';
    const label = document.createElementNS(ns, 'g');
    label.classList.add('etiqueta-svg');
    const width = Number(svg.getAttribute('width')), height = Number(svg.getAttribute('height'));
    const y = height * 0.70, cx = width / 2;
    const paper = document.createElementNS(ns, 'path');
    paper.setAttribute('d', 'M'+(cx-30)+','+y+' Q'+cx+','+(y+6)+' '+(cx+30)+','+y+' L'+(cx+28)+','+(y+29)+' Q'+cx+','+(y+35)+' '+(cx-28)+','+(y+29)+' Z');
    paper.setAttribute('fill', '#faf4dc'); paper.setAttribute('stroke', '#d5cbae');
    const text = document.createElementNS(ns, 'text');
    text.setAttribute('x', cx); text.setAttribute('y', y+13); text.setAttribute('text-anchor', 'middle');
    text.setAttribute('font-size', '6'); text.setAttribute('fill', '#173641');
    text.textContent = rec.nombreReserva.length > 21 ? rec.nombreReserva.slice(0,20)+'…' : rec.nombreReserva;
    const volume = document.createElementNS(ns, 'text');
    volume.setAttribute('x', cx); volume.setAttribute('y', y+25); volume.setAttribute('text-anchor', 'middle');
    volume.setAttribute('font-size', '6'); volume.setAttribute('fill', '#173641'); volume.textContent=rec.volMl.toFixed(1)+' mL';
    label.append(paper,text,volume);svg.append(label);
  }

  if (mesaNum === 2) {
    document.getElementById('nombre-r2').textContent = NOMBRES_RECIPIENTE[rec.tipo];
    const cap = getCapacidadMax(rec);
    if (rec.volMl > 0 || rec.masaG > 0) {
      const p = Math.min((rec.volMl / cap) * 100, 100).toFixed(1);
      document.getElementById('vol-r2').textContent = `${rec.volMl.toFixed(1)} mL / ${cap} mL`;
      document.getElementById('pct-r2').textContent = `${p}% lleno`;
      document.getElementById('wrapper-r2').style.opacity = '1';
    } else {
      document.getElementById('vol-r2').textContent = `0 mL / ${cap} mL`;
      document.getElementById('pct-r2').textContent = '';
      document.getElementById('wrapper-r2').style.opacity = '0.5';
    }
  }
}

export function svgMatraz(color, pct) {
  const W = 120, H = 220;
  const yAforo = 65;
  const yBulbTop = 110;
  const yBase = 216;

  let yLiq;
  if (pct <= 0) {
    yLiq = yBase;
  } else if (pct <= 85) {
    yLiq = yBase - (yBase - yBulbTop) * (pct / 85);
  } else {
    yLiq = yBulbTop - (yBulbTop - yAforo) * ((pct - 85) / 15);
  }
  const liquidH = Math.max(0, yBase - yLiq);

  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <clipPath id="matraz-clip-${Date.now()}">
      <path d="M52,20 L68,20 L68,110 C85,120 110,138 110,165 C110,195 88,216 60,216 C32,216 10,195 10,165 C10,138 35,120 52,110 Z"/>
    </clipPath>
  </defs>
  <rect x="0" y="${yLiq}" width="${W}" height="${liquidH + 10}" fill="${color}" clip-path="url(#matraz-clip-${Date.now()})" style="transition:all 0.4s;"/>
  <path d="M52,20 L68,20 L68,110 C85,120 110,138 110,165 C110,195 88,216 60,216 C32,216 10,195 10,165 C10,138 35,120 52,110 Z"
    fill="none" stroke="#8ecae6" stroke-width="2.5" stroke-linejoin="round"/>
  <line x1="47" y1="${yAforo}" x2="73" y2="${yAforo}" stroke="#00bcd4" stroke-width="2" stroke-dasharray="3,2"/>
  <text x="76" y="${yAforo + 3}" font-size="8" fill="#00bcd4" font-family="system-ui" font-weight="bold">aforo</text>
  <ellipse cx="38" cy="145" rx="8" ry="24" fill="rgba(255,255,255,0.08)" transform="rotate(-20 38 145)"/>
</svg>`;
}

export function svgVaso(color, pct) {
  const W = 110, H = 180;
  const marginX = 10;
  const x1 = marginX + 5, y1 = 20;
  const x2 = W - marginX + 5, y2 = 20;
  const x3 = W - marginX, y3 = H - 10;
  const x4 = marginX, y4 = H - 10;

  const hNominal = (H - 30) * 0.90;
  const liquidH = hNominal * (pct / 100);
  const liquidY = H - 10 - liquidH;
  const marcas = [25, 50, 75, 100];

  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <clipPath id="vaso-clip">
      <polygon points="${x1},${y1} ${x2},${y2} ${x3},${y3} ${x4},${y4}"/>
    </clipPath>
  </defs>
  <rect x="${marginX + 1}" y="${liquidY}" width="${W - marginX * 2 - 1}" height="${liquidH + 15}"
    fill="${color}" clip-path="url(#vaso-clip)" style="transition:all 0.4s;"/>
  <path d="M${x1},${y1} L${x2-14},${y2} Q${x2-3},${y2-10} ${x2+3},${y2-5} L${x2-2},${y2+12} L${x3},${y3} L${x4},${y4} Z" fill="none" stroke="#8ecae6" stroke-width="2.5" stroke-linejoin="round"/>
  ${marcas.map(m => {
    const yMarca = H - 10 - hNominal * (m / 100);
    return `<line x1="${x4 + 4}" y1="${yMarca}" x2="${x4 + 14}" y2="${yMarca}" stroke="${m===100 ? '#00bcd4' : '#5c6480'}" stroke-width="1.2"/>
            <text x="${x4 + 16}" y="${yMarca + 3}" font-size="7" fill="${m===100 ? '#00bcd4' : '#5c6480'}" font-family="system-ui">${m}%</text>`;
  }).join('')}
  <rect x="${x1 + 4}" y="${y1 + 10}" width="6" height="80" fill="rgba(255,255,255,0.08)" rx="3"/>
</svg>`;
}

export function svgErlenmeyer(color, pct) {
  const W = 120, H = 200;
  const neckX1 = 48, neckX2 = 72;
  const neckYtop = 10, neckYbot = 70;
  const bodyXL = 10, bodyXR = 110;
  const bodyYbot = H - 10;
  const path = `M${neckX1},${neckYtop} L${neckX2},${neckYtop} L${neckX2},${neckYbot} L${bodyXR},${bodyYbot} L${bodyXL},${bodyYbot} L${neckX1},${neckYbot} Z`;

  const liquidH = (H - neckYbot - 10) * (pct / 100);
  const liquidY = bodyYbot - liquidH;

  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
  <defs><clipPath id="erl-clip"><path d="${path}"/></clipPath></defs>
  <rect x="${bodyXL}" y="${liquidY}" width="${bodyXR - bodyXL}" height="${liquidH + 20}"
    fill="${color}" clip-path="url(#erl-clip)" style="transition:all 0.4s;"/>
  <path d="${path}" fill="rgba(100,180,255,0.05)" stroke="#8ecae6" stroke-width="2.5" stroke-linejoin="round"/>
  <line x1="${neckX1 + 6}" y1="${neckYtop + 5}" x2="${bodyXL + 15}" y2="${bodyYbot - 15}"
    stroke="rgba(255,255,255,0.1)" stroke-width="4" stroke-linecap="round"/>
</svg>`;
}

export function svgProbeta(color, pct) {
  const W = 60, H = 220;
  const x = 15, rectW = 30;
  const topY = 10, botY = H - 15;
  const innerH = (botY - topY) * 0.92;
  const liquidH = innerH * (pct / 100);
  const liquidY = botY - liquidH;
  const marcas = [20, 40, 60, 80, 100];

  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
  <defs><clipPath id="prob-clip"><rect x="${x}" y="${topY}" width="${rectW}" height="${botY - topY}" rx="4"/></clipPath></defs>
  <rect x="${x + 1}" y="${liquidY}" width="${rectW - 2}" height="${liquidH + 10}"
    fill="${color}" clip-path="url(#prob-clip)" style="transition:all 0.4s;"/>
  <rect x="${x}" y="${topY}" width="${rectW}" height="${botY - topY}" fill="none" stroke="#8ecae6" stroke-width="2" rx="4"/>
  <ellipse cx="${x + rectW/2}" cy="${botY}" rx="${rectW/2}" ry="6" fill="rgba(100,180,255,0.07)" stroke="#8ecae6" stroke-width="2"/>
  ${marcas.map(m => {
    const yM = botY - innerH * (m / 100);
    return `<line x1="${x - 5}" y1="${yM}" x2="${x}" y2="${yM}" stroke="${m===100?'#00bcd4':'#5c6480'}" stroke-width="1.2"/>
            <text x="${x - 7}" y="${yM + 3}" font-size="7" fill="${m===100?'#00bcd4':'#5c6480'}" text-anchor="end" font-family="system-ui">${m}</text>`;
  }).join('')}
  <rect x="${x + 3}" y="${topY + 5}" width="4" height="${botY - topY - 10}" fill="rgba(255,255,255,0.1)" rx="2"/>
</svg>`;
}

export function svgBureta(color, pct) {
  const W = 60, H = 240;
  const x = 20, rectW = 20;
  const topY = 5, botY = H - 35;
  const innerH = botY - topY;
  const liquidH = innerH * (pct / 100);
  const marcas = [0, 25, 50, 75, 100];

  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
  <defs><clipPath id="bur-clip"><rect x="${x}" y="${topY}" width="${rectW}" height="${innerH}"/></clipPath></defs>
  <rect x="${x + 1}" y="${topY}" width="${rectW - 2}" height="${liquidH}"
    fill="${color}" clip-path="url(#bur-clip)" style="transition:all 0.4s;"/>
  <rect x="${x}" y="${topY}" width="${rectW}" height="${innerH}" fill="none" stroke="#8ecae6" stroke-width="2"/>
  <rect x="${x - 5}" y="${botY - 2}" width="${rectW + 10}" height="12" fill="#5c6480" rx="4"/>
  <rect x="${x + rectW/2 - 2}" y="${botY + 10}" width="4" height="20" fill="#8ecae6"/>
  <polygon points="${x + rectW/2 - 3},${botY + 30} ${x + rectW/2 + 3},${botY + 30} ${x + rectW/2},${H - 2}" fill="#8ecae6"/>
  ${marcas.map(m => {
    const yM = topY + innerH * m / 100;
    return `<line x1="${x + rectW}" y1="${yM}" x2="${x + rectW + 6}" y2="${yM}" stroke="#5c6480" stroke-width="1"/>
            <text x="${x + rectW + 8}" y="${yM + 3}" font-size="7" fill="#5c6480" font-family="system-ui">${m}</text>`;
  }).join('')}
  <rect x="${x + 3}" y="${topY + 2}" width="3" height="${innerH - 4}" fill="rgba(255,255,255,0.1)" rx="1"/>
</svg>`;
}

export function svgPipeta(color, pct) {
  const W = 60, H = 200;
  const cx = 30;
  const bulbCY = 90, bulbRX = 20, bulbRY = 35;
  const neckW = 8;
  const liquidH = bulbRY * 2 * (pct / 100);
  const liquidY = bulbCY + bulbRY - liquidH;

  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <clipPath id="pip-clip">
      <rect x="${cx - neckW/2}" y="5" width="${neckW}" height="${bulbCY - bulbRY - 5}"/>
      <ellipse cx="${cx}" cy="${bulbCY}" rx="${bulbRX}" ry="${bulbRY}"/>
      <rect x="${cx - neckW/2 + 2}" y="${bulbCY + bulbRY}" width="${neckW - 4}" height="${H - bulbCY - bulbRY - 15}"/>
    </clipPath>
  </defs>
  <rect x="${cx - bulbRX}" y="${liquidY}" width="${bulbRX * 2}" height="${liquidH + 20}"
    fill="${color}" clip-path="url(#pip-clip)" style="transition:all 0.4s;"/>
  <rect x="${cx - neckW/2}" y="5" width="${neckW}" height="${bulbCY - bulbRY - 5}" fill="none" stroke="#8ecae6" stroke-width="2"/>
  <ellipse cx="${cx}" cy="${bulbCY}" rx="${bulbRX}" ry="${bulbRY}" fill="rgba(100,180,255,0.05)" stroke="#8ecae6" stroke-width="2"/>
  <rect x="${cx - neckW/2 + 2}" y="${bulbCY + bulbRY}" width="${neckW - 4}" height="${H - bulbCY - bulbRY - 15}" fill="none" stroke="#8ecae6" stroke-width="2"/>
  <polygon points="${cx - 4},${H - 15} ${cx + 4},${H - 15} ${cx},${H - 2}" fill="#8ecae6"/>
  <line x1="${cx - neckW/2 - 5}" y1="45" x2="${cx + neckW/2 + 5}" y2="45" stroke="#00bcd4" stroke-width="1.5"/>
  <ellipse cx="${cx - 10}" cy="${bulbCY - 10}" rx="4" ry="10" fill="rgba(255,255,255,0.1)" transform="rotate(-20 ${cx - 10} ${bulbCY - 10})"/>
</svg>`;
}

// ============================================================
// ANIMACIÓN DE PARTÍCULAS 2D (Canvas overlay)
// ============================================================
