/* Universe: a living night sky behind the page.
   Three layers of twinkling stars that drift with the scroll and the pointer, soft nebulae, a planet with the
   logo's red point as its moon, shooting stars, and constellations that draw themselves around the pointer.
   Dark theme: the full sky. Light theme: a pale daytime version in the brand blue. */
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const small = matchMedia('(max-width: 760px)');
  const cv = document.createElement('canvas');
  cv.id = 'universe'; cv.setAttribute('aria-hidden', 'true');
  document.body.prepend(cv);
  const g = cv.getContext('2d');
  if (!g) return;
  const root = document.documentElement;
  const rnd = (a, b) => a + Math.random() * (b - a);
  let W = 0, H = 0, dpr = 1, dark = true, stars = [], neb = null;
  let mx = 0, my = 0, smx = 0, smy = 0, px = -999, py = -999, pTouch = 0, sy = scrollY, ssy = scrollY;
  let shoot = null, nextShoot = 2.5, t0 = performance.now(), last = 0;

  const LAYERS = [{ n: 260, depth: .12, size: [.6, 1.2], a: [.4, .8] }, { n: 130, depth: .3, size: [1, 1.9], a: [.55, 1] }, { n: 50, depth: .62, size: [1.5, 3], a: [.75, 1] }];
  function seed() {
    const k = small.matches ? .45 : 1;
    stars = [];
    LAYERS.forEach((L, li) => {
      for (let i = 0; i < Math.round(L.n * k); i++) {
        const warm = Math.random();
        stars.push({ l: li, x: Math.random(), y: Math.random(), r: rnd(...L.size), a: rnd(...L.a), p: rnd(0, 6.28), s: rnd(.4, 1.6),
          c: warm < .1 ? 'r' : warm < .5 ? 'b' : 'w', f: li === 2 && Math.random() < .35 });
      }
    });
  }
  function nebulae() {
    neb = document.createElement('canvas'); neb.width = Math.ceil(W / 2); neb.height = Math.ceil(H / 2);
    const n = neb.getContext('2d'), w = neb.width, h = neb.height;
    const blob = (x, y, r, rgb, a) => { const gr = n.createRadialGradient(x * w, y * h, 0, x * w, y * h, r * Math.max(w, h)); gr.addColorStop(0, `rgba(${rgb},${a})`); gr.addColorStop(1, `rgba(${rgb},0)`); n.fillStyle = gr; n.fillRect(0, 0, w, h); };
    if (dark) { blob(.82, .1, .5, '56,102,241', .34); blob(.12, .9, .45, '229,56,59', .14); blob(.5, .55, .6, '30,60,160', .16); blob(.08, .18, .32, '110,80,230', .13); }
    else { blob(.85, .08, .45, '110,150,255', .2); blob(.1, .92, .4, '255,150,160', .1); blob(.5, .5, .55, '150,180,255', .1); }
  }
  function resize() {
    dpr = Math.min(devicePixelRatio || 1, small.matches ? 1.25 : 1.5);
    W = innerWidth; H = innerHeight;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    nebulae(); if (!stars.length) seed();
    if (reduce.matches) draw(0);
  }
  function theme() { dark = root.dataset.theme === 'dark'; nebulae(); if (reduce.matches) draw(0); }

  const col = (c, a) => dark ? (c === 'r' ? `rgba(255,150,160,${a})` : c === 'b' ? `rgba(170,200,255,${a})` : `rgba(255,255,255,${a})`)
                             : (c === 'r' ? `rgba(229,56,59,${a * .8})` : `rgba(56,102,241,${a * .75})`);

  function draw(t) {
    g.clearRect(0, 0, W, H);
    // nebulae drift slowly against the scroll
    if (neb) { g.globalAlpha = dark ? .95 : .85; const ox = smx * -14, oy = -ssy * .03 % (H * .1) + smy * -10; g.drawImage(neb, -20 + ox, -20 + oy, W + 40, H + 40); g.globalAlpha = 1; }
    // planet and its moon, far away in the lower right
    planet(t);
    // stars
    const near = [];
    for (const s of stars) {
      const L = LAYERS[s.l];
      let x = (s.x * W + smx * L.depth * 46 + t * 1.4 * L.depth) % W; if (x < 0) x += W;
      let y = (s.y * H - ssy * L.depth * .22 + smy * L.depth * 34) % H; if (y < 0) y += H;
      const tw = reduce.matches ? 1 : .55 + .45 * Math.sin(t * s.s + s.p);
      const a = s.a * tw;
      g.fillStyle = col(s.c, a);
      g.beginPath(); g.arc(x, y, s.r, 0, 6.2832); g.fill();
      if (s.f && tw > .8) { const q = s.r * 5 * tw; g.strokeStyle = col(s.c, a * .55); g.lineWidth = .8; g.beginPath(); g.moveTo(x - q, y); g.lineTo(x + q, y); g.moveTo(x, y - q); g.lineTo(x, y + q); g.stroke(); }
      if (s.l === 2) near.push(x, y);
    }
    // constellations around the pointer
    if (!reduce.matches && px > -900) {
      const R = 190, pts = [];
      for (let i = 0; i < near.length; i += 2) { const d = Math.hypot(near[i] - px, near[i + 1] - py); if (d < R) pts.push([near[i], near[i + 1], 1 - d / R]); }
      for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) {
        const d = Math.hypot(pts[i][0] - pts[j][0], pts[i][1] - pts[j][1]);
        if (d < 120) { g.strokeStyle = dark ? `rgba(160,195,255,${.32 * Math.min(pts[i][2], pts[j][2]) * (1 - d / 120)})` : `rgba(56,102,241,${.3 * Math.min(pts[i][2], pts[j][2]) * (1 - d / 120)})`; g.lineWidth = .8; g.beginPath(); g.moveTo(pts[i][0], pts[i][1]); g.lineTo(pts[j][0], pts[j][1]); g.stroke(); }
      }
    }
    // shooting star
    if (shoot) {
      const k = (t - shoot.t) / shoot.d;
      if (k >= 1) shoot = null;
      else {
        const e = k * k * (3 - 2 * k), x = shoot.x + shoot.dx * e, y = shoot.y + shoot.dy * e, tx = x - shoot.dx * .1 * (1 - k * .4), ty = y - shoot.dy * .1 * (1 - k * .4);
        const gr = g.createLinearGradient(tx, ty, x, y);
        gr.addColorStop(0, dark ? 'rgba(160,195,255,0)' : 'rgba(56,102,241,0)'); gr.addColorStop(1, dark ? 'rgba(255,255,255,.95)' : 'rgba(229,56,59,.85)');
        g.strokeStyle = gr; g.lineWidth = 1.8; g.lineCap = 'round'; g.beginPath(); g.moveTo(tx, ty); g.lineTo(x, y); g.stroke();
        g.fillStyle = dark ? '#fff' : '#e5383b'; g.beginPath(); g.arc(x, y, 1.8, 0, 6.2832); g.fill();
      }
    }
  }
  function planet(t) {
    const r = Math.min(W, H) * (small.matches ? .17 : .21);
    const cx = W * (small.matches ? .92 : .9) + smx * -10, cy = H * (small.matches ? .96 : .92) + ssy * -.02 % 40 + smy * -8;
    g.save(); g.globalAlpha = dark ? .92 : .5;
    const gr = g.createRadialGradient(cx - r * .35, cy - r * .4, r * .1, cx, cy, r);
    if (dark) { gr.addColorStop(0, '#6f95ff'); gr.addColorStop(.55, '#2c55d6'); gr.addColorStop(1, '#0a1a5c'); }
    else { gr.addColorStop(0, '#dbe6ff'); gr.addColorStop(.6, '#a9c0ff'); gr.addColorStop(1, '#7d9ef5'); }
    g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, r, 0, 6.2832); g.fill();
    // ring, tilted, passing in front then behind
    g.strokeStyle = dark ? 'rgba(190,210,255,.45)' : 'rgba(255,255,255,.8)'; g.lineWidth = r * .05;
    g.beginPath(); g.ellipse(cx, cy, r * 1.55, r * .36, -.35, 0, 6.2832); g.stroke();
    g.lineWidth = r * .02; g.beginPath(); g.ellipse(cx, cy, r * 1.78, r * .42, -.35, 0, 6.2832); g.stroke();
    // the red point is the moon
    const a = t * .35, mxp = cx + Math.cos(a) * r * 1.55, myp = cy + Math.sin(a) * r * .36;
    const rx = Math.cos(-.35), ry = Math.sin(-.35);
    const ox = cx + (Math.cos(a) * r * 1.55) * rx - (Math.sin(a) * r * .36) * ry, oy = cy + (Math.cos(a) * r * 1.55) * ry + (Math.sin(a) * r * .36) * rx;
    g.fillStyle = '#e5383b'; g.shadowColor = 'rgba(229,56,59,.7)'; g.shadowBlur = dark ? 14 : 4;
    g.beginPath(); g.arc(ox, oy, Math.max(4, r * .07), 0, 6.2832); g.fill();
    g.restore();
  }

  function frame(now) {
    requestAnimationFrame(frame);
    if (document.hidden) return;
    const t = (now - t0) / 1000;
    if (small.matches && now - last < 33) return;
    last = now;
    smx += (mx - smx) * .05; smy += (my - smy) * .05; ssy += (sy - ssy) * .08;
    if (!shoot && t > nextShoot) { const ang = rnd(.25, .6), len = rnd(260, 420), dir = Math.random() < .5 ? 1 : -1; shoot = { t, d: rnd(.7, 1.1), x: rnd(W * .15, W * .85), y: rnd(0, H * .4), dx: Math.cos(ang) * len * dir, dy: Math.sin(ang) * len }; nextShoot = t + rnd(5, 10); }
    draw(t);
  }
  addEventListener('pointermove', e => { mx = e.clientX / innerWidth - .5; my = e.clientY / innerHeight - .5; if (e.pointerType === 'mouse') { px = e.clientX; py = e.clientY; } }, { passive: true });
  document.addEventListener('pointerleave', () => { px = py = -999; });
  addEventListener('scroll', () => { sy = scrollY; if (reduce.matches) { ssy = sy; draw(0); } }, { passive: true });
  addEventListener('resize', resize);
  new MutationObserver(theme).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
  dark = root.dataset.theme === 'dark';
  resize();
  if (!reduce.matches) requestAnimationFrame(frame);
})();
