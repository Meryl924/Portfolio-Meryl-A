/* Background music: a YouTube track played through YouTube's own embedded player.
   Nothing from YouTube loads until the visitor presses the music button, and the sound only starts on that press
   (browsers block autoplay with sound anyway). */
(() => {
  const btn = document.getElementById('musicBtn');
  if (!btn) return;
  const VIDEO = '6lf9hjuY8EQ';
  const TITLE = 'KC and the Sunshine Band · I’m Your Boogie Man';
  const t = s => (window.I18N ? I18N.t(s) : s);
  let player = null, ready = false, wants = false, loading = false, broken = false;
  const save = v => { try { localStorage.setItem('music', v ? 'on' : 'off'); } catch (_) {} };

  function label() {
    const on = btn.classList.contains('on');
    const l = t(on ? 'Pause music' : 'Play music');
    btn.setAttribute('aria-label', l);
    btn.setAttribute('title', l + ' · ' + TITLE);
    btn.setAttribute('aria-pressed', String(on));
  }
  function setOn(on) { btn.classList.toggle('on', on); label(); }

  function boot() {
    if (loading) return; loading = true;
    const host = document.createElement('div');
    host.id = 'ytMusicHost'; host.setAttribute('aria-hidden', 'true');
    host.innerHTML = '<div id="ytMusic"></div>';
    document.body.appendChild(host);
    const make = () => {
      player = new YT.Player('ytMusic', {
        host: 'https://www.youtube-nocookie.com', width: 200, height: 200, videoId: VIDEO,
        playerVars: { controls: 0, disablekb: 1, fs: 0, loop: 1, playlist: VIDEO, playsinline: 1, rel: 0, modestbranding: 1, origin: location.origin },
        events: {
          onReady: () => { ready = true; player.setVolume(35); if (wants) player.playVideo(); },
          onStateChange: e => { if (e.data === YT.PlayerState.ENDED) player.playVideo(); },
          onError: () => { broken = true; wants = false; setOn(false); btn.hidden = true; }
        }
      });
    };
    if (window.YT && YT.Player) make();
    else {
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => { if (prev) prev(); make(); };
      const s = document.createElement('script'); s.src = 'https://www.youtube.com/iframe_api'; s.async = true;
      s.onerror = () => { broken = true; wants = false; setOn(false); btn.hidden = true; };
      document.head.appendChild(s);
    }
  }

  function toggle(force) {
    if (broken) return;
    wants = typeof force === 'boolean' ? force : !wants;
    save(wants); setOn(wants);
    if (!player) { if (wants) boot(); return; }
    if (!ready) return;
    if (wants) player.playVideo(); else player.pauseVideo();
  }
  btn.addEventListener('click', () => toggle());

  // Pause while the tab is hidden, resume when it comes back
  document.addEventListener('visibilitychange', () => {
    if (!ready || !wants) return;
    if (document.hidden) player.pauseVideo(); else player.playVideo();
  });
  document.addEventListener('langchange', label);

  // Came back after turning the music on: browsers need a gesture, so start with the first touch or key press
  let saved = null; try { saved = localStorage.getItem('music'); } catch (_) {}
  label();
  if (saved === 'on') {
    const once = e => {
      if (btn.contains(e.target)) { cleanup(); return; }
      cleanup(); toggle(true);
    };
    const cleanup = () => ['pointerdown', 'keydown'].forEach(ev => removeEventListener(ev, once, true));
    ['pointerdown', 'keydown'].forEach(ev => addEventListener(ev, once, true));
  }
})();
