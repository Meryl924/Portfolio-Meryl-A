/* Hero: backdrop switcher, letters that react to the pointer, light parallax. */
(() => {
  const hx = document.querySelector('.hx');
  if (!hx) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const fine = matchMedia('(hover: hover) and (pointer: fine)');

  /* Backdrop */
  const buttons = [...hx.querySelectorAll('.hx-bdsw [data-bd]')];
  const setBd = (bd, save) => {
    hx.dataset.bd = bd;
    buttons.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.bd === bd)));
    if (save) { try { localStorage.setItem('hero-bd', bd); } catch (_) {} }
  };
  let saved = null;
  try { saved = localStorage.getItem('hero-bd'); } catch (_) {}
  if (saved && buttons.some(b => b.dataset.bd === saved)) setBd(saved, false);
  buttons.forEach(b => b.addEventListener('click', () => setBd(b.dataset.bd, true)));

  /* Pointer: letters light up near the cursor, portrait drifts slightly */
  if (reduce.matches || !fine.matches) return;
  const letters = [...hx.querySelectorAll('.hx-l')];
  let px = -999, py = -999, tx = 0, ty = 0, cx = 0, cy = 0, raf = 0, inside = false;
  hx.addEventListener('pointermove', e => { px = e.clientX; py = e.clientY; tx = px / innerWidth - .5; ty = py / innerHeight - .5; inside = true; if (!raf) raf = requestAnimationFrame(tick); }, { passive: true });
  hx.addEventListener('pointerleave', () => { inside = false; px = py = -999; tx = ty = 0; if (!raf) raf = requestAnimationFrame(tick); });
  function tick() {
    raf = 0;
    cx += (tx - cx) * .1; cy += (ty - cy) * .1;
    hx.style.setProperty('--hx', cx.toFixed(3)); hx.style.setProperty('--hy', cy.toFixed(3));
    const R = Math.max(130, innerWidth * .11);
    letters.forEach(l => {
      const r = l.getBoundingClientRect();
      const d = Math.hypot(px - (r.left + r.width / 2), py - (r.top + r.height / 2));
      const p = Math.max(0, 1 - d / R);
      l.style.setProperty('--p', (p * p).toFixed(3));
    });
    if (inside || Math.abs(tx - cx) > .002 || Math.abs(ty - cy) > .002) raf = requestAnimationFrame(tick);
  }
})();
