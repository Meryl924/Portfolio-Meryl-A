/* Agents layer: a small crew of coloured cursors builds the page layer by layer
   (selection box, size tag, the element drawn in), with a progress bar at the bottom.
   Reads the page only. Skipped with reduced motion, and the cross closes it for good. */
(() => {
  const root = document.documentElement;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  try { if (localStorage.getItem('ag-off') === '1') return; } catch (_) {}

  const COLORS = ['#3866F1', '#E5383B', '#F5B83D', '#2FBF71', '#8B5CF6', '#7C8DB8', '#22B8CF', '#F06595', '#E5383B', '#F5B83D', '#2FBF71'];
  const TAGS = ['Layout', 'Copy', 'Type', 'Image', 'Motion', 'Colour', 'Grid', 'Icons', 'Spacing', 'Shadow', 'Radius', 'Fonts'];
  const small = matchMedia('(max-width: 700px)').matches;
  const N = small ? 6 : 12;
  const home = () => document.querySelector('.page[data-page="home"]');
  const onHome = () => { const h = home(); return !!h && h.classList.contains('active'); };
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const rnd = (a, b) => a + Math.random() * (b - a);

  const SEL = 'h1,h2,h3,.eyebrow,p,.btn,.hx-btn,.hx-name,.hx-fig,.tile,.acc-item,.band-eva';
  const SKIP = '.pstack,.bd,nav,footer,.story-rail,.mobile-menu,.hx-bg,[aria-hidden="true"]:not(.hx-name):not(.work-count)';
  const MEDIA = '.tile,.hx-fig,figure,.band-eva,.hx-name,.acc-item';

  const band = document.querySelector('.band');
  const zones = [
    document.querySelector('.hx'),
    document.getElementById('work'),
    band && band.closest('section'),
    document.getElementById('experience'),
    document.getElementById('services'),
    document.getElementById('faq')
  ].filter(Boolean);
  if (!zones.length) return;

  /* ---- DOM ---- */
  const layer = document.createElement('div'); layer.id = 'ag-layer'; layer.setAttribute('aria-hidden', 'true');
  document.body.appendChild(layer);
  const hud = document.createElement('div'); hud.className = 'ag-hud'; hud.setAttribute('role', 'status');
  hud.innerHTML = '<span class="ag-dots" aria-hidden="true">' + COLORS.slice(0, 5).map(c => '<i style="--c:' + c + '"></i>').join('') + '</span>' +
    '<span class="ag-n"></span><span class="ag-l"></span><span class="ag-bar" aria-hidden="true"><i></i></span>' +
    '<button type="button" class="ag-tour">Replay</button><button type="button" class="ag-sp">1x</button><button type="button" class="ag-x" aria-label="Close the agents">&times;</button>';
  document.body.appendChild(hud);
  const elN = hud.querySelector('.ag-n'), elL = hud.querySelector('.ag-l'), elBar = hud.querySelector('.ag-bar');
  elN.textContent = N + ' agents';

  /* ---- targets ---- */
  function collect(zone) {
    let list = [...zone.querySelectorAll(SEL)].filter(el => !el.closest(SKIP) || el.matches('.hx-name,.work-count'));
    list = list.filter(el => !list.some(o => o !== el && o.matches(MEDIA) && o.contains(el)));
    list = list.filter(el => !list.some(o => o !== el && !o.matches(MEDIA) && el.contains(o)));
    return list.filter(el => { const r = el.getBoundingClientRect(); return r.width > 24 && r.height > 8; });
  }
  const queue = [];
  let total = 0, done = 0, speed = 1, off = false, hideTimer = 0;
  const clean = el => { el.classList.remove('ag-hide', 'ag-v', 'ag-in'); el.style.removeProperty('--agd'); };
  // every element is hidden while off screen and rebuilt by the agents each time it comes back into view
  const hideEl = el => { clean(el); el.classList.add('ag-hide'); if (el.matches(MEDIA)) el.classList.add('ag-v'); el.__ag = 'hidden'; };
  function enqueue(el) {
    if (off || el.__ag !== 'hidden') return;
    el.__ag = 'queued';
    if (!running && !queue.length) { done = 0; total = 0; }
    total++; queue.push(el); wake();
  }

  /* ---- agents ---- */
  const arrow = '<svg viewBox="0 0 16 22"><path d="M1.5 1.5v16l4.4-4 3 7.2 2.6-1.1-3-7h6z"/></svg>';
  const crew = [];
  for (let i = 0; i < N; i++) {
    const c = COLORS[i % COLORS.length];
    const cur = document.createElement('div'); cur.className = 'ag-cur ag-out'; cur.style.setProperty('--c', c);
    cur.innerHTML = arrow + '<span class="ag-tag">' + TAGS[i % TAGS.length] + '</span>';
    const ghosts = [];
    for (let g = 0; g < 4; g++) { const d = document.createElement('div'); d.className = 'ag-ghost ag-out'; d.style.setProperty('--c', c); d.style.opacity = String(.34 - g * .08); d.innerHTML = arrow; layer.appendChild(d); ghosts.push(d); }
    layer.appendChild(cur);
    crew.push({ cur, ghosts, hist: [], x: innerWidth / 2, y: innerHeight / 2, tx: innerWidth / 2, ty: innerHeight / 2, ph: rnd(0, 6.28), job: null, state: 'idle', t: 0, box: null, guides: [] });
  }

  function mkBox(r, media) {
    const b = document.createElement('div'); b.className = 'ag-box' + (media ? ' ph' : '');
    b.innerHTML = '<i></i><i></i><i></i><i></i><b>' + Math.round(r.width) + ' × ' + Math.round(r.height) + '</b>';
    layer.appendChild(b); place(b, r); requestAnimationFrame(() => b.classList.add('on'));
    return b;
  }
  function place(b, r) { b.style.left = r.left + 'px'; b.style.top = r.top + 'px'; b.style.width = r.width + 'px'; b.style.height = r.height + 'px'; }
  function guide(kind, pos) {
    const g = document.createElement('div'); g.className = 'ag-guide ' + kind;
    if (kind === 'h') g.style.top = pos + 'px'; else g.style.left = pos + 'px';
    layer.appendChild(g); requestAnimationFrame(() => g.classList.add('on'));
    return g;
  }
  const visible = r => r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth;
  const drop = (n, ms) => setTimeout(() => n.remove(), ms);

  function pick(a) {
    const el = queue.shift();
    if (!el) { a.state = 'idle'; return; }
    a.job = el;
    const r = el.getBoundingClientRect();
    if (!visible(r)) { el.__ag = 'hidden'; total = Math.max(done, total - 1); progress(); a.job = null; a.state = 'wait'; a.t = .02; return; }
    a.state = 'go';
    a.tx = r.left + rnd(0, Math.min(40, r.width * .3)); a.ty = r.top + rnd(0, Math.min(14, r.height * .4));
  }
  function reveal(a, instant) {
    const el = a.job; a.job = null;
    if (!el) return;
    const finish = () => { clean(el); el.__ag = 'shown'; done++; progress(); if (!visible(el.getBoundingClientRect())) hideEl(el); };
    const r = el.getBoundingClientRect();
    const media = el.matches(MEDIA);
    const box = mkBox(r, media);
    a.box = box;
    a.guides = [guide('h', r.top), guide('v', r.left)];
    a.state = 'draw'; a.t = (media ? .45 : .22) / speed;
    el.style.setProperty('--agd', clamp(r.width / 1100, .38, .95) / speed + 's');
    a.after = () => {
      el.classList.add('ag-in');
      const wait = parseFloat(el.style.getPropertyValue('--agd')) * 1000 + 60;
      a.tx = r.right - rnd(0, 30); a.ty = r.bottom - rnd(0, 10);
      a.state = 'draw2'; a.t = wait / 1000;
      a.fin = () => {
        finish();
        box.classList.remove('on'); drop(box, 260);
        a.guides.forEach(g => { g.classList.remove('on'); drop(g, 400); }); a.guides = [];
      };
    };
  }

  /* ---- loop ---- */
  let running = false, last = 0;
  function wake() {
    clearTimeout(hideTimer);
    hud.classList.add('on'); progress();
    crew.forEach(a => { if (a.state === 'gone') { a.state = 'idle'; a.x = a.tx = innerWidth / 2 + rnd(-30, 30); a.y = a.ty = innerHeight / 2 + rnd(-30, 30); } });
    if (!running) { running = true; last = performance.now(); requestAnimationFrame(frame); }
  }
  function progress() {
    elL.textContent = done + ' / ' + total + ' layers';
    hud.style.setProperty('--p', total ? (done / total).toFixed(3) : 0);
    elBar.style.setProperty('--p', total ? (done / total).toFixed(3) : 0);
  }
  function frame(now) {
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    let busy = queue.length > 0;
    crew.forEach((a, i) => {
      if (a.state === 'gone') return;
      if (a.state === 'idle') {
        if (queue.length) { a.cur.classList.remove('ag-out'); a.ghosts.forEach(g => g.classList.remove('ag-out')); pick(a); }
        else if (!a.job) { a.state = 'leave'; a.tx = rnd(0, innerWidth); a.ty = rnd(0, innerHeight); a.t = .9; }
      } else if (a.state === 'wait') { a.t -= dt; if (a.t <= 0) a.state = 'idle'; }
      else if (a.state === 'draw') { a.t -= dt; if (a.t <= 0) a.after(); }
      else if (a.state === 'draw2') { a.t -= dt; if (a.t <= 0) { a.fin(); a.state = 'wait'; a.t = rnd(.05, .25) / speed; } }
      else if (a.state === 'leave') { a.t -= dt; if (queue.length) a.state = 'idle'; else if (a.t <= 0) { a.cur.classList.add('ag-out'); a.ghosts.forEach(g => g.classList.add('ag-out')); a.state = 'gone'; } }
      if (a.state !== 'gone') busy = true;
      if (a.box && a.job) place(a.box, a.job.getBoundingClientRect());
      const k = 1 - Math.exp(-dt * speed * (a.state === 'go' ? 5.2 : 3.2));
      a.x += (a.tx - a.x) * k; a.y += (a.ty - a.y) * k;
      if (a.state === 'go' && Math.hypot(a.tx - a.x, a.ty - a.y) < 14) reveal(a, false);
      const w = Math.sin(now / 160 + a.ph) * 5;
      const px = a.x + w, py = a.y - w;
      a.hist.unshift([px, py]); if (a.hist.length > 12) a.hist.pop();
      a.cur.style.transform = 'translate3d(' + px + 'px,' + py + 'px,0)';
      a.ghosts.forEach((g, gi) => { const h = a.hist[(gi + 1) * 3]; if (h) g.style.transform = 'translate3d(' + h[0] + 'px,' + h[1] + 'px,0)'; });
    });
    if (busy) requestAnimationFrame(frame);
    else { running = false; hideTimer = setTimeout(() => hud.classList.remove('on'), 2600); }
  }

  /* ---- controls ---- */
  hud.querySelector('.ag-sp').addEventListener('click', e => { speed = speed === 1 ? 2.2 : 1; e.currentTarget.textContent = speed === 1 ? '1x' : '2x'; });
  let enterIO = null, leaveIO = null;
  hud.querySelector('.ag-x').addEventListener('click', () => {
    off = true; try { localStorage.setItem('ag-off', '1'); } catch (_) {}
    queue.length = 0; enterIO && enterIO.disconnect(); leaveIO && leaveIO.disconnect();
    document.querySelectorAll('.ag-hide').forEach(clean);
    layer.remove(); hud.remove();
  });
  hud.querySelector('.ag-tour').addEventListener('click', () => {
    if (running || off) return;
    scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => collect(zones[0]).forEach(el => { hideEl(el); enqueue(el); }), 500);
  });

  /* ---- start ---- */
  function begin() {
    if (!onHome()) return;
    const list = []; zones.forEach(z => collect(z).forEach(el => list.push(el)));
    if (!('IntersectionObserver' in window)) return;
    enterIO = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting && onHome()) enqueue(e.target); }), { rootMargin: '0px 0px -8% 0px', threshold: 0.01 });
    leaveIO = new IntersectionObserver(es => es.forEach(e => { if (!e.isIntersecting && e.target.__ag === 'shown' && onHome() && !off) hideEl(e.target); }), { threshold: 0 });
    list.forEach(el => { hideEl(el); enterIO.observe(el); leaveIO.observe(el); });
  }
  if (root.classList.contains('scene-on')) setTimeout(begin, 350);
  else { const mo = new MutationObserver(() => { if (root.classList.contains('scene-on')) { mo.disconnect(); setTimeout(begin, 500); } }); mo.observe(root, { attributes: true, attributeFilter: ['class'] }); }
})();
