/* Scroll story layer: chapter rail, scroll-driven hero, section entrances.
   Reads the page only; the content, routing and translations are untouched. */
(() => {
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  const wide = matchMedia('(min-width: 1101px)');
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const home = () => document.querySelector('.page[data-page="home"]');
  const onHome = () => { const h = home(); return !!h && h.classList.contains('active'); };
  const hx = document.querySelector('.hx');

  /* ---- chapters ---- */
  const navText = h => { const a = document.querySelector('.nav a[href="' + h + '"]') || document.querySelector('.mobile-menu a[href="' + h + '"]'); return a ? a.textContent.trim() : ''; };
  const band = document.querySelector('.band');
  const chapters = [
    { el: document.querySelector('.hx'), label: navText('#/') || 'Intro', num: '' },
    { el: document.getElementById('work'), label: navText('#/work') || 'Work', num: '01' },
    { el: band && band.closest('section'), label: 'Impact', num: '02' },
    { el: document.getElementById('experience'), label: navText('#/experience') || 'Experience', num: '03' },
    { el: document.getElementById('services'), label: navText('#/services') || 'Services', num: '04' },
    { el: document.getElementById('faq'), label: navText('#/faq') || 'FAQ', num: '05' }
  ].filter(c => c.el);
  if (!chapters.length) return;

  chapters.forEach(c => {
    if (!c.num) return;
    c.el.classList.add('chapter');
    const wrap = c.el.querySelector(':scope > .wrap');
    if (wrap) { const n = document.createElement('i'); n.className = 'ch-num'; n.setAttribute('aria-hidden', 'true'); n.textContent = c.num; wrap.prepend(n); c.n = n; c.wrap = wrap; }
  });

  /* ---- rail ---- */
  const rail = document.createElement('nav');
  rail.className = 'story-rail'; rail.setAttribute('aria-label', 'Page chapters');
  rail.innerHTML = '<div class="sr-track" aria-hidden="true"><div class="sr-fill"></div></div>';
  chapters.forEach((c, i) => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'sr-dot';
    b.innerHTML = '<span>' + c.label + '</span><i></i>';
    b.addEventListener('click', () => c.el.scrollIntoView({ behavior: reduce.matches ? 'auto' : 'smooth', block: 'start' }));
    rail.appendChild(b); c.btn = b;
  });
  document.body.appendChild(rail);

  const sweep = document.createElement('div'); sweep.className = 'ch-sweep'; sweep.setAttribute('aria-hidden', 'true'); document.body.appendChild(sweep);
  let curIdx = -1;
  const fireSweep = () => { if (reduce.matches) return; sweep.classList.remove('go'); void sweep.offsetWidth; sweep.classList.add('go'); };

  /* ---- scroll loop ---- */
  let ticking = false;
  const update = () => {
    ticking = false;
    const show = onHome() && wide.matches;
    rail.classList.toggle('on', show);
    if (!onHome()) return;
    const vh = innerHeight, mid = vh * .5;

    if (hx && !reduce.matches) hx.style.setProperty('--hp', clamp(scrollY / (vh * .85)).toFixed(3));

    let idx = 0;
    chapters.forEach((c, i) => { if (c.el.getBoundingClientRect().top <= mid) idx = i; });
    if (idx !== curIdx) {
      const first = curIdx === -1; curIdx = idx;
      chapters.forEach((c, i) => { c.btn.setAttribute('aria-current', String(i === idx)); c.btn.classList.toggle('past', i < idx); });
      if (!first && idx > 0) fireSweep();
    }
    const doc = document.documentElement;
    rail.style.setProperty('--sp', clamp(scrollY / Math.max(1, doc.scrollHeight - vh)).toFixed(3));

    if (reduce.matches) return;
    chapters.forEach(c => {
      if (!c.wrap) return;
      const r = c.el.getBoundingClientRect();
      const ent = clamp((vh - r.top) / (vh * .55));                 // 0 when it touches the bottom, 1 once well inside
      const np = clamp((vh - r.top) / (vh + r.height));              // across the whole pass, for the numeral
      if (c.n) { c.n.style.setProperty('--np', np.toFixed(3)); c.n.style.setProperty('--no', (Math.sin(Math.PI * clamp(np * 1.15)) * .95).toFixed(3)); }
      if (c.el.id === 'work' || !wide.matches) { c.wrap.style.removeProperty('transform'); c.wrap.style.removeProperty('opacity'); return; }
      if (ent >= .999) { c.wrap.style.removeProperty('transform'); c.wrap.style.removeProperty('opacity'); }
      else { c.wrap.style.transform = 'translateY(' + ((1 - ent) * 70).toFixed(1) + 'px) scale(' + (.93 + ent * .07).toFixed(4) + ')'; c.wrap.style.opacity = (.12 + ent * .88).toFixed(3); }
    });
  };
  const request = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
  addEventListener('scroll', request, { passive: true });
  addEventListener('resize', request);
  addEventListener('hashchange', () => setTimeout(request, 80));
  new MutationObserver(request).observe(document.querySelector('main') || document.body, { attributes: true, subtree: true, attributeFilter: ['class'] });
  update();
})();
