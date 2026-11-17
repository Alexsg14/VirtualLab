import { sincronizarSoluto } from './solute-controls.js';

export let calcExpr = '';

export let calcCurrentVal = '0';

export let calcLastAns = '0';

export let calcNeedReset = false;

export let calcMinimizada = false;

export function toggleCalculadora() {
  const panel = document.getElementById('panel-calculadora');
  if (panel.style.display === 'none' || !panel.style.display) {
    panel.style.display = 'flex';
    actualizarDisplayCalc();
  } else {
    panel.style.display = 'none';
  }
}

export function cerrarCalculadora() {
  document.getElementById('panel-calculadora').style.display = 'none';
}

export function toggleCalcMinimizar() {
  calcMinimizada = !calcMinimizada;
  const body = document.getElementById('calc-body');
  const btn = document.getElementById('btn-calc-min');
  body.style.display = calcMinimizada ? 'none' : 'block';
  btn.textContent = calcMinimizada ? '🗖' : '🗕';
}

export function actualizarDisplayCalc() {
  const exprEl = document.getElementById('calc-expr-display');
  const valEl = document.getElementById('calc-val-display');
  if (exprEl) exprEl.textContent = calcExpr || ' ';
  if (valEl) valEl.textContent = calcCurrentVal || '0';
}

export function calcInput(char) {
  if (calcNeedReset && /[0-9\.]/.test(char)) {
    calcExpr = '';
    calcNeedReset = false;
  } else if (calcNeedReset) {
    calcNeedReset = false;
  }
  calcExpr += char;
  actualizarDisplayCalc();
}

export function calcFn(fn) {
  if (calcNeedReset) {
    calcExpr = calcLastAns;
    calcNeedReset = false;
  }
  if (fn === 'log') {
    calcExpr += 'log(';
  } else if (fn === 'ln') {
    calcExpr += 'ln(';
  } else if (fn === 'sqrt') {
    calcExpr += 'sqrt(';
  } else if (fn === 'pow10') {
    calcExpr += '10^(';
  }
  actualizarDisplayCalc();
}

export function calcAns() {
  if (calcNeedReset) {
    calcExpr = '';
    calcNeedReset = false;
  }
  calcExpr += calcLastAns;
  actualizarDisplayCalc();
}

export function calcInvertSign() {
  if (!calcExpr) {
    calcExpr = '-';
  } else if (calcExpr.startsWith('-(') && calcExpr.endsWith(')')) {
    calcExpr = calcExpr.substring(2, calcExpr.length - 1);
  } else {
    calcExpr = '-(' + calcExpr + ')';
  }
  actualizarDisplayCalc();
}

export function calcReciprocal() {
  if (!calcExpr) calcExpr = calcLastAns;
  calcExpr = '1/(' + calcExpr + ')';
  calcEquals();
}

export function calcClear() {
  calcExpr = '';
  calcCurrentVal = '0';
  calcNeedReset = false;
  actualizarDisplayCalc();
}

export function calcClearEntry() {
  calcExpr = '';
  calcCurrentVal = '0';
  actualizarDisplayCalc();
}

export function calcBackspace() {
  if (calcExpr.length > 0) {
    calcExpr = calcExpr.slice(0, -1);
    actualizarDisplayCalc();
  }
}

export function parseAndEvalMath(rawExpr) {
  if (!rawExpr || rawExpr.trim() === '') return 0;
  let s = rawExpr;
  s = s.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-');
  s = s.replace(/π/g, String(Math.PI));

  s = s.replace(/log\(/g, 'Math.log10(');
  s = s.replace(/ln\(/g, 'Math.log(');
  s = s.replace(/sqrt\(/g, 'Math.sqrt(');
  s = s.replace(/10\^\(/g, 'Math.pow(10,');
  s = s.replace(/\^/g, '**');

  const safeRegex = /^[0-9\.\+\-\*\/\(\)\s\,eEMathlog10sqrtpowPIabs]+$/;
  if (!safeRegex.test(s)) {
    throw new Error('Sintaxis inválida');
  }

  const result = Function('"use strict"; return (' + s + ')')();
  if (typeof result !== 'number' || isNaN(result)) {
    throw new Error('Error de cálculo');
  }
  if (!isFinite(result)) {
    throw new Error('Infinito / Div 0');
  }
  return result;
}

export function calcEquals() {
  if (!calcExpr) return;
  try {
    const res = parseAndEvalMath(calcExpr);
    let formatted;
    if (Math.abs(res) > 0 && (Math.abs(res) < 0.0001 || Math.abs(res) >= 1000000)) {
      formatted = res.toExponential(4);
    } else {
      formatted = String(parseFloat(res.toFixed(6)));
    }
    calcCurrentVal = formatted;
    calcLastAns = formatted;
    calcNeedReset = true;
  } catch (err) {
    calcCurrentVal = err.message || 'Error';
    calcNeedReset = true;
  }
  actualizarDisplayCalc();
}

export function calcCopiarClipboard() {
  navigator.clipboard.writeText(calcCurrentVal).then(() => {
    const valEl = document.getElementById('calc-val-display');
    const original = valEl.textContent;
    valEl.textContent = '¡Copiado!';
    setTimeout(() => { valEl.textContent = original; }, 700);
  });
}

export function calcPegarEn(campo) {
  const num = parseFloat(calcCurrentVal);
  if (isNaN(num) || num <= 0) return;

  if (campo === 'gramos') {
    document.getElementById('radio-gramos').checked = true;
    document.getElementById('inp-gramos').value = num;
    sincronizarSoluto('gramos');
  } else if (campo === 'moles') {
    document.getElementById('radio-moles').checked = true;
    document.getElementById('inp-moles').value = num;
    sincronizarSoluto('moles');
  } else if (campo === 'disolvente') {
    document.getElementById('inp-disolvente').value = num;
  }
}

export function setupDragCalculadora() {
  const handle = document.getElementById('calc-drag-handle');
  const panel = document.getElementById('panel-calculadora');
  if (!handle || !panel) return;

  let isDragging = false;
  let offsetX = 0, offsetY = 0;

  handle.addEventListener('pointerdown', (e) => {
    if (e.target.tagName === 'BUTTON') return;
    isDragging = true;
    const rect = panel.getBoundingClientRect();
    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;
    handle.setPointerCapture(e.pointerId);
  });

  handle.addEventListener('pointermove', (e) => {
    if (!isDragging) return;
    let left = e.clientX - offsetX;
    let top = e.clientY - offsetY;
    left = Math.max(10, Math.min(window.innerWidth - panel.offsetWidth - 10, left));
    top = Math.max(10, Math.min(window.innerHeight - panel.offsetHeight - 10, top));
    panel.style.left = left + 'px';
    panel.style.top = top + 'px';
    panel.style.right = 'auto';
  });

  handle.addEventListener('pointerup', (e) => {
    isDragging = false;
    try { handle.releasePointerCapture(e.pointerId); } catch(err){}
  });
}

export function setupTecladoCalculadora() {
  window.addEventListener('keydown', (e) => {
    const panel = document.getElementById('panel-calculadora');
    if (!panel || panel.style.display === 'none') return;

    if (['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
      return;
    }

    const k = e.key;
    if (k >= '0' && k <= '9') { calcInput(k); e.preventDefault(); }
    else if (k === '.' || k === ',') { calcInput('.'); e.preventDefault(); }
    else if (['+', '-', '*', '/', '(', ')', '^'].includes(k)) { calcInput(k); e.preventDefault(); }
    else if (k === 'Enter' || k === '=') { calcEquals(); e.preventDefault(); }
    else if (k === 'Backspace') { calcBackspace(); e.preventDefault(); }
    else if (k === 'Escape') { calcClear(); e.preventDefault(); }
  });
}

// ============================================================
// ALTERNAR MODOS DE VISUALIZACIÓN: 3D WEBGL vs 2D TÉCNICO
// ============================================================
