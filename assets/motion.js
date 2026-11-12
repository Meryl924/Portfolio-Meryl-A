/* Motion page: preview videos start when they come into view (muted, looping), and a click opens the full video with sound. */
(() => {
  const cards = [...document.querySelectorAll('.mo-card')];
  const dlg = document.getElementById('moDlg');
  if (!cards.length || !dlg) return;
  const player = document.getElementById('moVideo');
  const cap = document.getElementById('moCap');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  let opener = null, musicWasOn = false;

  // Load a preview only when it is close to the screen, play it while it is visible
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      const v = e.target.querySelector('video');
      if (e.isIntersecting) {
        if (!v.src && v.dataset.src) { v.src = v.dataset.src; v.load(); }
        if (!reduce.matches) { const p = v.play(); if (p && p.catch) p.catch(() => {}); }
      } else if (v.src) v.pause();
    });
  }, { rootMargin: '120px 0px', threshold: 0.25 });
  cards.forEach(c => io.observe(c));

  function open(card) {
    opener = card;
    const src = card.querySelector('video').dataset.src;
    player.src = src;
    player.poster = card.querySelector('video').poster || '';
    cap.textContent = card.dataset.title + ' · ' + card.dataset.meta;
    // Pause the site's background music while a video with sound plays
    musicWasOn = !!(document.getElementById('musicBtn') && document.getElementById('musicBtn').classList.contains('on'));
    if (musicWasOn && window.SiteMusic) window.SiteMusic.set(false);
    if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
    const p = player.play(); if (p && p.catch) p.catch(() => {});
  }
  function close() {
    player.pause(); player.removeAttribute('src'); player.load();
    if (dlg.open) dlg.close();
    if (musicWasOn && window.SiteMusic) window.SiteMusic.set(true);
    musicWasOn = false;
    if (opener) opener.focus({ preventScroll: true });
  }

  cards.forEach(c => c.addEventListener('click', () => open(c)));
  document.getElementById('moClose').addEventListener('click', close);
  dlg.addEventListener('click', e => { if (e.target === dlg) close(); });          // click on the dark backdrop
  dlg.addEventListener('cancel', e => { e.preventDefault(); close(); });             // Escape key
  window.addEventListener('hashchange', () => { if (dlg.open) close(); });
})();
