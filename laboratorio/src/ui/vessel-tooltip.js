import {medirAcidez} from '../core/acid-base.ts';
import { SOLUTOS, NOMBRES_RECIPIENTE, formulaSoluto } from '../data/catalog.ts';
import { labState } from '../state/laboratory.js';
import { getCapacidadMax } from '../app/vessels.js';

/** Una ficha compartida por la escena 3D, los dibujos 2D y la reserva. */
export function iniciarFichaRecipientes(buscarMesa3D) {
  const ficha = document.createElement('aside');
  ficha.id = 'ficha-recipiente';
  ficha.setAttribute('role', 'tooltip');
  ficha.hidden = true;
  const titulo = document.createElement('strong');
  const lista = document.createElement('dl');
  ficha.append(titulo, lista);
  document.body.append(ficha);

  let punto = null;
  let arrastrando = false;
  let descrito = null;
  const formato = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 4 });

  function ocultar() {
    ficha.hidden = true;
    if (descrito) descrito.removeAttribute('aria-describedby');
    descrito = null;
  }

  function actualizar() {
    if (!punto || arrastrando || document.hidden) { ocultar(); return; }
    const elemento = document.elementFromPoint(punto.x, punto.y);
    if (!elemento) { ocultar(); return; }
    let rec = null;
    let nombre = '';
    let ancla = elemento;
    const tarjeta = elemento.closest('[data-reserva-index]');
    const dibujo = elemento.closest('#svg-r1, #svg-r2');
    const instrument2d=elemento.closest('#instrumento-2d');
    if(instrument2d){ocultar();return;}
    else if (tarjeta) {
      const reserva = labState.reservas[Number(tarjeta.dataset.reservaIndex)];
      rec = reserva?.rec;
      nombre = reserva?.nombre || '';
      ancla = tarjeta;
    } else if (dibujo && !labState.vista3D) {
      const mesa = dibujo.id === 'svg-r1' ? 1 : 2;
      rec = labState['r' + mesa];
      nombre = 'Recipiente ' + mesa;
      ancla = dibujo;
    } else if (elemento.matches('#canvas-3d-container canvas') && labState.vista3D) {
      const encontrado = buscarMesa3D(punto.x, punto.y);
      if(encontrado?.instrumento){ocultar();return;}
      else if (encontrado?.mesa) { rec = labState['r' + encontrado.mesa]; nombre = 'Recipiente ' + encontrado.mesa; }
      else if (encontrado?.reservaIndex !== undefined) {
        const reserva = labState.reservas[encontrado.reservaIndex];
        rec = reserva?.rec; nombre = reserva?.nombre || '';
      }
    }
    if (!rec) { ocultar(); return; }

    const capacidad = getCapacidadMax(rec);
    const soluto = SOLUTOS.find(s => s.id === rec.soluteId);
    titulo.textContent = (NOMBRES_RECIPIENTE[rec.tipo] || 'Recipiente') + ' · ' + nombre;
    const filas = [
      ['Capacidad total', formato.format(capacidad) + ' mL'],
      ['Volumen ocupado', formato.format(rec.volMl) + ' mL'],
      ['Volumen libre', formato.format(Math.max(0, capacidad - rec.volMl)) + ' mL'],
      [rec.acidBase?'Reactivos aportados':'Soluto', rec.masaG > 0 ? (soluto ? soluto.nombre + ' (' + soluto.formula + ')' : rec.soluteId) : 'Ninguno'],
      ['Cantidad de soluto', formato.format(rec.masaG) + ' g'],
      ['Densidad', rec.modeloVolumen?.densidadGmL?formato.format(rec.modeloVolumen.densidadGmL)+' g/mL':'—'],
      ['Temperatura', formato.format(rec.temperaturaC??25)+' °C'],
    ];
    const medida=medirAcidez(rec);
    if(rec.acidBase && medida)filas.push(['pH',medida.pH.toFixed(2)]);
    if(Object.keys(rec.componentes||{}).length>1)filas[3][1]=Object.keys(rec.componentes).map(formulaSoluto).join(' + ');
    lista.replaceChildren();
    for (const [etiqueta, valor] of filas) {
      const dt = document.createElement('dt');
      const dd = document.createElement('dd');
      dt.textContent = etiqueta;
      dd.textContent = valor;
      lista.append(dt, dd);
    }
    if (descrito !== ancla) {
      if (descrito) descrito.removeAttribute('aria-describedby');
      ancla.setAttribute('aria-describedby', ficha.id);
      descrito = ancla;
    }
    ficha.hidden = false;
    // Mantener la ficha dentro de la ventana y separada del puntero.
    const rect = ficha.getBoundingClientRect();
    const x = punto.x + 16 + rect.width <= window.innerWidth - 10
      ? punto.x + 16 : punto.x - rect.width - 16;
    const y = punto.y + 16 + rect.height <= window.innerHeight - 10
      ? punto.y + 16 : punto.y - rect.height - 16;
    ficha.style.left = Math.max(10, x) + 'px';
    ficha.style.top = Math.max(10, y) + 'px';
  }

  document.addEventListener('pointermove', e => {
    if (e.pointerType === 'touch') return;
    punto = { x: e.clientX, y: e.clientY };
    actualizar();
  });
  document.addEventListener('pointerdown', () => { arrastrando = true; ocultar(); });
  document.addEventListener('pointerup', () => { arrastrando = false; });
  document.addEventListener('pointercancel', () => { arrastrando = false; punto = null; ocultar(); });
  document.addEventListener('pointerout', e => { if (!e.relatedTarget) { punto = null; ocultar(); } });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { punto = null; ocultar(); } });
  window.addEventListener('blur', () => { punto = null; arrastrando = false; ocultar(); });
  // Refrescar aunque el ratón no se mueva mientras cambia el volumen.
  window.setInterval(actualizar, 150);
}
