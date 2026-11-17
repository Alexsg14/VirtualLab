
export const particulas = [];

export let animFrameId = null;

export function ajustarCanvas() {
  const canvas = document.getElementById('particles-canvas');
  const panel = document.getElementById('panel-central');
  if (canvas && panel) {
    canvas.width = panel.offsetWidth;
    canvas.height = panel.offsetHeight;
  }
}

export function animarParticulas(x, y, colorBase) {
  lanzarAnimacionParticulas(colorBase);
}

export function lanzarAnimacionParticulas(colorBase) {
  const canvas = document.getElementById('particles-canvas');
  if (!canvas) return;
  const cx = canvas.width / 2;
  const cy = canvas.height * 0.3;

  for (let i = 0; i < 20; i++) {
    particulas.push({
      x: cx + (Math.random() - 0.5) * 60,
      y: cy + (Math.random() - 0.5) * 20,
      vx: (Math.random() - 0.5) * 2,
      vy: Math.random() * 3 + 1,
      r: Math.random() * 4 + 2,
      alpha: 1,
      color: colorBase + '0.9)'
    });
  }

  if (!animFrameId) animarLoop();
}

export function animarLoop() {
  const canvas = document.getElementById('particles-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let i = particulas.length - 1; i >= 0; i--) {
    const p = particulas[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.1;
    p.alpha -= 0.025;

    if (p.alpha <= 0) {
      particulas.splice(i, 1);
      continue;
    }

    ctx.globalAlpha = p.alpha;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalAlpha = 1;

  if (particulas.length > 0) {
    animFrameId = requestAnimationFrame(animarLoop);
  } else {
    animFrameId = null;
  }
}

// ============================================================
// ARRANQUE
// ============================================================
