/* Language switcher: English (source), French, Spanish, Russian.
   The page is written in English. Each visible text node, and a few attributes, is looked up in
   I18N_DATA by its English text and swapped in place; the English original is kept so switching
   back (or to another language) always starts from the source. */
window.I18N = (() => {
  const LANGS = { en: 'English', fr: 'Français', es: 'Español', ru: 'Русский' };
  const D = window.I18N_DATA || {};
  const MONTHS = {
    fr: ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'],
    es: ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'],
    ru: ['янв.', 'февр.', 'март', 'апр.', 'май', 'июнь', 'июль', 'авг.', 'сент.', 'окт.', 'нояб.', 'дек.']
  };
  const NOW = { fr: 'aujourd’hui', es: 'actualidad', ru: 'по наст. время' };
  const EN_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const RULES = {
    fr: { img: (t, n) => `${t}, image ${n}`, vid: t => `Vidéo du processus de design : ${t}` },
    es: { img: (t, n) => `${t}, imagen ${n}`, vid: t => `Vídeo del proceso de diseño: ${t}` },
    ru: { img: (t, n) => `${t}, изображение ${n}`, vid: t => `Видео о процессе дизайна: ${t}` }
  };
  const ATTRS = ['placeholder', 'aria-label', 'alt', 'title'];
  const SKIP = /^(SCRIPT|STYLE|NOSCRIPT|CANVAS|TEXTAREA)$/;
  const norm = s => s.replace(/\s+/g, ' ').trim();

  let lang = 'en';
  const orig = new WeakMap();        // text node -> English value
  const attrOrig = new WeakMap();    // element -> { attr: English value }

  function lookup(s) {
    const d = D[lang]; if (!d) return null;
    if (d[s] != null) return d[s];
    if (s.startsWith('· ')) { const r = lookup(s.slice(2)); return '· ' + (r || s.slice(2)); }
    if (s.includes(' · ') && s.length < 120) {
      const parts = s.split(' · ').map(p => lookup(p)), any = parts.some(Boolean);
      return any ? s.split(' · ').map((p, i) => parts[i] || p).join(' · ') : null;
    }
    let m;
    if ((m = s.match(/^(.*), image (\d+)$/))) return RULES[lang].img(m[1], m[2]);
    if ((m = s.match(/^Design process video: (.*)$/))) return RULES[lang].vid(m[1]);
    if (/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d{4}/.test(s)) {
      return s.replace(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/g, x => MONTHS[lang][EN_MONTHS.indexOf(x)]).replace('Present', NOW[lang]);
    }
    return null;
  }
  const t = s => (lang === 'en' ? s : lookup(norm(s)) || s);

  function text(n) {
    if (n.parentElement && SKIP.test(n.parentElement.tagName)) return;
    const base = orig.has(n) ? orig.get(n) : n.nodeValue;
    const key = norm(base);
    if (!key) return;
    if (lang === 'en') { if (orig.has(n)) n.nodeValue = base; return; }
    const out = lookup(key);
    if (out == null) return;
    const lead = base.match(/^\s*/)[0], trail = base.match(/\s*$/)[0];
    orig.set(n, base);
    n.nodeValue = lead + out + trail;
  }
  function attrs(el) {
    ATTRS.forEach(a => {
      if (!el.hasAttribute(a)) return;
      const rec = attrOrig.get(el) || {};
      const base = a in rec ? rec[a] : el.getAttribute(a);
      if (lang === 'en') { if (a in rec) el.setAttribute(a, base); return; }
      const out = lookup(norm(base));
      if (out == null) return;
      rec[a] = base; attrOrig.set(el, rec);
      el.setAttribute(a, out);
    });
  }
  function apply(root) {
    root = root || document.body;
    if (root.nodeType === 3) { if (!root.parentElement || !root.parentElement.closest('.split')) text(root); return; }
    if (root.nodeType !== 1 && root.nodeType !== 9) return;
    const scope = root.nodeType === 9 ? root.body : root;
    if (scope.nodeType === 1 && SKIP.test(scope.tagName)) return;
    if (scope.closest && scope.closest('.split') && !scope.classList.contains('split')) return;
    const w = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, {
      acceptNode: n => n.nodeType === 1
        ? (SKIP.test(n.tagName) || (n.classList.contains('split') && n.querySelector('.w')) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_SKIP)
        : NodeFilter.FILTER_ACCEPT
    });
    let n;
    if (scope.nodeType === 1) attrs(scope);
    while ((n = w.nextNode())) text(n);
    scope.querySelectorAll('[placeholder],[aria-label],[alt],[title]').forEach(el => { if (!el.closest('.split .w')) attrs(el); });
  }
  const en = n => (orig.has(n) ? orig.get(n) : n.nodeValue);

  function title(s) { return lang === 'en' ? s : (lookup(norm(s)) || s); }
  function meta() {
    document.documentElement.lang = lang;
    const d = document.querySelector('meta[name="description"]');
    if (d) { d.dataset.en = d.dataset.en || d.content; d.content = lang === 'en' ? d.dataset.en : (D[lang][d.dataset.en] || d.dataset.en); }
    const og = document.querySelector('meta[property="og:description"]');
    if (og) { og.dataset.en = og.dataset.en || og.content; og.content = lang === 'en' ? og.dataset.en : (D[lang][og.dataset.en] || og.dataset.en); }
  }

  function resplit() {
    // Headings were cut into one span per word: rebuild them from the English source, translate, split again
    document.querySelectorAll('.split').forEach(h => {
      if (!h._en) return;
      h.replaceChildren(...h._en.map(n => n.cloneNode(true)));
      h.classList.remove('split', 'split-in');
    });
    apply(document);
    if (window.splitHeadings) window.splitHeadings(document);
  }

  function setLang(l, persist) {
    if (!LANGS[l]) l = 'en';
    lang = l;
    if (persist !== false) { try { localStorage.setItem('lang', l); } catch (_) {} }
    resplit();
    meta();
    document.dispatchEvent(new CustomEvent('langchange', { detail: l }));
    syncUI();
  }

  /* ---------- UI ---------- */
  function syncUI() {
    const code = document.getElementById('langCode');
    if (code) code.textContent = lang.toUpperCase();
    document.querySelectorAll('#langMenu [data-lang]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.lang === lang)));
    const tb = document.getElementById('themeBtn');
    if (tb) tb.setAttribute('aria-label', t(document.documentElement.dataset.theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'));
    const lb = document.getElementById('langBtn');
    if (lb) lb.setAttribute('aria-label', t('Language') + ': ' + LANGS[lang]);
  }
  function bindUI() {
    const btn = document.getElementById('langBtn'), menu = document.getElementById('langMenu');
    if (!btn || !menu) return;
    const close = () => { menu.classList.remove('open'); btn.setAttribute('aria-expanded', 'false'); };
    btn.addEventListener('click', e => { e.stopPropagation(); const o = !menu.classList.contains('open'); menu.classList.toggle('open', o); btn.setAttribute('aria-expanded', String(o)); if (o) menu.querySelector('[aria-selected="true"]')?.focus(); });
    menu.addEventListener('click', e => { const b = e.target.closest('[data-lang]'); if (!b) return; setLang(b.dataset.lang); close(); btn.focus(); });
    document.addEventListener('click', e => { if (!menu.contains(e.target) && e.target !== btn) close(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
    menu.addEventListener('keydown', e => {
      const items = [...menu.querySelectorAll('[data-lang]')], i = items.indexOf(document.activeElement);
      if (e.key === 'ArrowDown') { e.preventDefault(); items[(i + 1) % items.length].focus(); }
      if (e.key === 'ArrowUp') { e.preventDefault(); items[(i - 1 + items.length) % items.length].focus(); }
    });
    const tb = document.getElementById('themeBtn');
    if (tb) tb.addEventListener('click', () => {
      const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      document.documentElement.dataset.theme = next;
      try { localStorage.setItem('theme', next); } catch (_) {}
      const m = document.querySelector('meta[name="theme-color"]'); if (m) m.content = next === 'dark' ? '#0B1F4F' : '#ffffff';
      syncUI();
    });
  }

  /* ---------- Boot ---------- */
  // Keep the English service name as the form value: the email subject must not change with the language
  document.querySelectorAll('select[name="service"] option').forEach(o => { o.value = o.textContent.trim(); });

  // Content added later (project pages, experience card) is translated as it appears
  const mo = new MutationObserver(list => {
    if (lang === 'en') return;
    list.forEach(r => r.addedNodes.forEach(n => { if (n.nodeType === 1 || n.nodeType === 3) apply(n); }));
  });
  mo.observe(document.body, { childList: true, subtree: true });

  const initial = (() => {
    const q = new URLSearchParams(location.search).get('lang');
    if (q && LANGS[q]) return q;
    try { const s = localStorage.getItem('lang'); if (s && LANGS[s]) return s; } catch (_) {}
    const nav = (navigator.language || 'en').slice(0, 2).toLowerCase();
    return LANGS[nav] ? nav : 'en';
  })();
  bindUI();
  syncUI();
  if (initial !== 'en') setLang(initial, false);

  return { t, title, en, apply, setLang, get lang() { return lang; }, LANGS };
})();
