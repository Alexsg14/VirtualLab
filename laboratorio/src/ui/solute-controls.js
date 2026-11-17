import { SOLUTOS } from '../data/catalog.ts';

export function actualizarInfoSoluto() {
  const id = document.getElementById('sel-soluto').value;
  const s = SOLUTOS.find(x => x.id === id);
  if (!s) return;
  document.getElementById('info-M').textContent = s.M.toFixed(2);
  document.getElementById('info-solmax').textContent = s.solMax;
}

export function onSolutoChange() {
  actualizarInfoSoluto();
  document.getElementById('inp-gramos').value = '';
  document.getElementById('inp-moles').value = '';
}

export function onRadioUnidad() {}

export function sincronizarSoluto(origen) {
  const id = document.getElementById('sel-soluto').value;
  const s = SOLUTOS.find(x => x.id === id);
  if (!s) return;

  const inpG = document.getElementById('inp-gramos');
  const inpM = document.getElementById('inp-moles');

  if (origen === 'gramos') {
    const g = parseFloat(inpG.value);
    if (!isNaN(g) && g >= 0) {
      inpM.value = (g / s.M).toFixed(5);
    } else {
      inpM.value = '';
    }
  } else {
    const m = parseFloat(inpM.value);
    if (!isNaN(m) && m >= 0) {
      inpG.value = (m * s.M).toFixed(4);
    } else {
      inpG.value = '';
    }
  }
}

// ============================================================
// VALIDACIÓN DE INPUTS
// ============================================================
