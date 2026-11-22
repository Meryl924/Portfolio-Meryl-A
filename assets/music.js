/* Site sound: four generated ambiences, interface sound effects and a small settings panel.
   Everything is made live with the Web Audio API: no audio file, nothing to download, no copyright.
   Browsers block sound until the visitor acts, so it starts from the entry screen choice or the first tap or key press. */
(() => {
  const btn = document.getElementById('musicBtn');
  if (!btn) return;
  const t = s => (window.I18N ? I18N.t(s) : s);
  const KEY = 'sound-v2';
  const TRACKS = [
    { id: 'brume', name: 'Mist', desc: 'Low pad that breathes' },
    { id: 'cristal', name: 'Crystal', desc: 'Distant bells and echo' },
    { id: 'pulsation', name: 'Pulse', desc: 'Soft beat, 70 per minute' },
    { id: 'abysse', name: 'Abyss', desc: 'Deep swell and breath' }
  ];
  const prefs = { on: false, track: 0, music: 0.6, fx: 0.8 };
  try { Object.assign(prefs, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (_) {}
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(prefs)); } catch (_) {} };
  const NOTES = [220, 261.63, 293.66, 329.63, 392, 440, 523.25, 587.33, 659.25, 784];   // A minor pentatonic

  const S = {
    ctx: null, master: null, musicBus: null, fx: null, verb: null, noise: null, cur: null, timer: 0,

    init() {
      if (this.ctx) return true;
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      const ctx = this.ctx = new AC();
      this.master = ctx.createGain(); this.master.gain.value = 0; this.master.connect(ctx.destination);
      this.musicBus = ctx.createGain(); this.musicBus.gain.value = prefs.music * 0.7; this.musicBus.connect(this.master);
      this.fx = ctx.createGain(); this.fx.gain.value = prefs.fx; this.fx.connect(this.master);
      const rl = ctx.sampleRate * 2.4, ir = ctx.createBuffer(2, rl, ctx.sampleRate);
      for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < rl; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / rl, 3); }
      this.verb = ctx.createConvolver(); this.verb.buffer = ir;
      const vg = ctx.createGain(); vg.gain.value = 0.35; this.verb.connect(vg); vg.connect(this.master);
      const len = ctx.sampleRate * 2; this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
      const ch = this.noise.getChannelData(0); for (let i = 0; i < len; i++) ch[i] = Math.random() * 2 - 1;
      this.timer = setInterval(() => { if (this.cur && this.cur.tick) this.cur.tick(this.ctx.currentTime); }, 120);
      return true;
    },
    // first gesture of the visitor: sound can finally start
    unlock() {
      if (this.ctx && this.ctx.state === 'running') return;
      if (!prefs.on || !this.init()) return;
      this.ctx.resume();
      if (!this.cur) this.startTrack(prefs.track);
      this.master.gain.setTargetAtTime(0.9, this.ctx.currentTime, 0.6);
    },
    setOn(on, silent) {
      if (!this.init()) { btn.hidden = true; return; }
      this.ctx.resume();
      prefs.on = on; save();
      if (!this.cur) this.startTrack(prefs.track);
      this.master.gain.setTargetAtTime(on ? 0.9 : 0, this.ctx.currentTime, 0.25);
      sync();
      if (on && !silent) this.play('click');
    },
    setVolume(kind, v) {
      prefs[kind] = v; save();
      if (!this.ctx) return;
      (kind === 'music' ? this.musicBus : this.fx).gain.setTargetAtTime(kind === 'music' ? v * 0.7 : v, this.ctx.currentTime, 0.08);
    },
    setTrack(i) {
      prefs.track = i; save();
      if (!this.init()) return;
      this.ctx.resume();
      this.startTrack(i);
      if (!prefs.on) this.setOn(true); else sync();
    },
    startTrack(i) {
      const ctx = this.ctx, now = ctx.currentTime;
      if (this.cur) { const old = this.cur; old.out.gain.setTargetAtTime(0, now, 0.6); setTimeout(() => old.stop(), 3500); }
      const out = ctx.createGain(); out.gain.value = 0; out.connect(this.musicBus);
      out.gain.setTargetAtTime(1, now + 0.2, 1.2);
      this.cur = this['_' + TRACKS[i].id](out);
      this.cur.out = out;
    },

    /* ---------- ambiences ---------- */
    _pad(out, freqs, { type = 'sine', cutoff = 600, gains, lfoRate = 0.05, sweep = 0 } = {}) {
      const ctx = this.ctx, nodes = [];
      const filt = ctx.createBiquadFilter(); filt.type = 'lowpass'; filt.frequency.value = cutoff; filt.Q.value = 0.6; filt.connect(out);
      if (sweep) { const l = ctx.createOscillator(), lg = ctx.createGain(); l.frequency.value = 0.03; lg.gain.value = sweep; l.connect(lg); lg.connect(filt.frequency); l.start(); nodes.push(l); }
      freqs.forEach((f, i) => {
        const o = ctx.createOscillator(); o.type = Array.isArray(type) ? type[i % type.length] : type; o.frequency.value = f; o.detune.value = (i - freqs.length / 2) * 5;
        const g = ctx.createGain(); g.gain.value = gains ? gains[i] : 0.08;
        const lfo = ctx.createOscillator(); lfo.frequency.value = lfoRate + i * 0.021;
        const lg = ctx.createGain(); lg.gain.value = g.gain.value * 0.55; lfo.connect(lg); lg.connect(g.gain); lfo.start();
        o.connect(g); g.connect(filt); o.start(); nodes.push(o, lfo);
      });
      return nodes;
    },
    _stopper(nodes) { return () => nodes.forEach(n => { try { n.stop(); } catch (_) {} }); },
    _bell(out, f, when, peak = 0.05, dec = 3.2, delay) {
      const ctx = this.ctx;
      [[1, 1], [2.76, 0.25], [5.4, 0.08]].forEach(([m, a]) => {
        const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.value = f * m;
        this._env(g, when, 0.004, peak * a, dec / m);
        o.connect(g); g.connect(out); if (delay) g.connect(delay);
        const w = ctx.createGain(); w.gain.value = 0.6; g.connect(w); w.connect(this.verb);
        o.start(when); o.stop(when + dec + 0.1);
      });
    },
    _brume(out) {
      const nodes = this._pad(out, [55, 82.4, 110.2, 164.8], { type: ['triangle', 'sine'], cutoff: 480, gains: [0.2, 0.1, 0.075, 0.04], sweep: 140 });
      return { stop: this._stopper(nodes) };
    },
    _cristal(out) {
      const ctx = this.ctx;
      const nodes = this._pad(out, [110, 164.8, 220], { cutoff: 700, gains: [0.07, 0.04, 0.025], lfoRate: 0.04 });
      const delay = ctx.createDelay(2); delay.delayTime.value = 0.46;
      const fb = ctx.createGain(); fb.gain.value = 0.42; const dg = ctx.createGain(); dg.gain.value = 0.5;
      delay.connect(fb); fb.connect(delay); delay.connect(dg); dg.connect(out);
      let next = ctx.currentTime + 0.8;
      return {
        stop: this._stopper(nodes),
        tick: now => {
          while (next < now + 0.3) {
            const f = NOTES[3 + Math.floor(Math.random() * 7)];
            this._bell(out, f, next, 0.045, 3.4, delay);
            if (Math.random() < 0.3) this._bell(out, f * 1.5, next + 0.23, 0.02, 2.6, delay);
            next += 1.1 + Math.random() * 2.2;
          }
        }
      };
    },
    _pulsation(out) {
      const ctx = this.ctx;
      const nodes = this._pad(out, [110, 130.81, 164.81, 220], { type: 'sawtooth', cutoff: 700, gains: [0.03, 0.022, 0.02, 0.012], sweep: 450, lfoRate: 0.06 });
      const beat = 60 / 70; let next = ctx.currentTime + 0.4, n = 0;
      return {
        stop: this._stopper(nodes),
        tick: now => {
          while (next < now + 0.3) {
            const when = next;
            const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine';
            o.frequency.setValueAtTime(110, when); o.frequency.exponentialRampToValueAtTime(42, when + 0.22);
            this._env(g, when, 0.004, 0.32, 0.5); o.connect(g); g.connect(out); o.start(when); o.stop(when + 0.6);
            const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), hg = ctx.createGain();
            s.buffer = this.noise; f.type = 'highpass'; f.frequency.value = 7000;
            this._env(hg, when + beat / 2, 0.002, 0.025, 0.07); s.connect(f); f.connect(hg); hg.connect(out); s.start(when + beat / 2, Math.random()); s.stop(when + beat / 2 + 0.12);
            if (n % 4 === 0) {
              const b = ctx.createOscillator(), bg = ctx.createGain(); b.type = 'triangle'; b.frequency.value = n % 8 === 0 ? 55 : 41.2;
              this._env(bg, when, 0.05, 0.12, beat * 3.6); b.connect(bg); bg.connect(out); b.start(when); b.stop(when + beat * 4);
            }
            n++; next += beat;
          }
        }
      };
    },
    _abysse(out) {
      const ctx = this.ctx;
      const nodes = this._pad(out, [41.2, 55, 82.4], { cutoff: 260, gains: [0.22, 0.12, 0.05], lfoRate: 0.03 });
      const s = ctx.createBufferSource(); s.buffer = this.noise; s.loop = true;
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 450; f.Q.value = 0.4;
      const l = ctx.createOscillator(), lg = ctx.createGain(); l.frequency.value = 0.11; lg.gain.value = 320; l.connect(lg); lg.connect(f.frequency);
      const g = ctx.createGain(); g.gain.value = 0.09;
      const l2 = ctx.createOscillator(), lg2 = ctx.createGain(); l2.frequency.value = 0.11; lg2.gain.value = 0.06; l2.connect(lg2); lg2.connect(g.gain);
      s.connect(f); f.connect(g); g.connect(out); s.start(); l.start(); l2.start();
      nodes.push(s, l, l2);
      let next = ctx.currentTime + 4;
      return {
        stop: this._stopper(nodes),
        tick: now => {
          while (next < now + 0.3) {
            [220, 329.63, 392].forEach((fr, i) => {
              const o = ctx.createOscillator(), og = ctx.createGain(); o.type = 'triangle'; o.frequency.value = fr * (Math.random() < 0.5 ? 1 : 0.5);
              og.gain.setValueAtTime(0.0001, next); og.gain.linearRampToValueAtTime(0.018 - i * 0.004, next + 3); og.gain.exponentialRampToValueAtTime(0.0001, next + 8.5);
              o.connect(og); og.connect(out); const w = ctx.createGain(); w.gain.value = 0.8; og.connect(w); w.connect(this.verb);
              o.start(next); o.stop(next + 9);
            });
            next += 9 + Math.random() * 6;
          }
        }
      };
    },

    /* ---------- synthesis bricks ---------- */
    _env(g, when, a, peak, d) { g.gain.setValueAtTime(0.0001, when); g.gain.linearRampToValueAtTime(peak, when + a); g.gain.exponentialRampToValueAtTime(0.0001, when + a + d); },
    _tone(type, f0, f1, when, a, peak, d, wet = 0) {
      const ctx = this.ctx, o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type; o.frequency.setValueAtTime(f0, when); if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, when + a + d);
      this._env(g, when, a, peak, d); o.connect(g); g.connect(this.fx);
      if (wet) { const w = ctx.createGain(); w.gain.value = wet; g.connect(w); w.connect(this.verb); }
      o.start(when); o.stop(when + a + d + 0.05);
    },
    _noise(type, f0, f1, q, when, a, peak, d, wet = 0) {
      const ctx = this.ctx, s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
      s.buffer = this.noise; s.playbackRate.value = 0.8 + Math.random() * 0.4;
      f.type = type; f.Q.value = q; f.frequency.setValueAtTime(f0, when); if (f1 !== f0) f.frequency.exponentialRampToValueAtTime(f1, when + a + d);
      this._env(g, when, a, peak, d);
      s.connect(f); f.connect(g); g.connect(this.fx);
      if (wet) { const w = ctx.createGain(); w.gain.value = wet; g.connect(w); w.connect(this.verb); }
      s.start(when, Math.random()); s.stop(when + a + d + 0.1);
    },
    play(name) {
      if (!prefs.on || !this.ctx || this.ctx.state !== 'running') return;
      const when = this.ctx.currentTime + 0.005;
      switch (name) {
        case 'hover':   // tiny dry grain
          this._noise('highpass', 5200, 5200, 0.7, when, 0.002, 0.05, 0.03);
          this._tone('sine', 2400, 2100, when, 0.002, 0.018, 0.05);
          break;
        case 'click':   // low, clean click
          this._tone('sine', 220, 58, when, 0.003, 0.32, 0.16, 0.15);
          this._noise('bandpass', 2600, 1200, 1.4, when, 0.001, 0.14, 0.04);
          break;
        case 'whoosh':  // moving from one page to another
          this._noise('bandpass', 180, 2400, 1.1, when, 0.32, 0.16, 0.55, 0.4);
          this._tone('sine', 90, 42, when + 0.05, 0.05, 0.18, 0.9, 0.3);
          break;
        case 'open':    // a project opens
          this._tone('sine', 70, 38, when, 0.01, 0.34, 1.1, 0.4);
          this._noise('lowpass', 900, 5200, 0.6, when, 0.12, 0.09, 0.6, 0.5);
          this._tone('triangle', 880, 880, when + 0.08, 0.01, 0.03, 0.9, 0.6);
          break;
      }
    }
  };

  /* ---------- settings panel ---------- */
  const css = document.createElement('style');
  css.id = 'sound-css';
  css.textContent = `
  .sp { position: fixed; z-index: 90; left: 50%; bottom: 92px; width: min(340px, calc(100vw - 32px)); padding: 20px 20px 18px; border-radius: 22px; max-height: calc(100vh - 112px); max-height: calc(100svh - 112px); overflow-y: auto; overscroll-behavior: contain; color: var(--ink, #0b1f4f);
    background: rgba(255,255,255,.96); border: 1px solid rgba(56,102,241,.18); box-shadow: 0 24px 60px rgba(16,42,110,.24);
    opacity: 0; transform: translate(-50%, 12px); transition: opacity 260ms ease, transform 360ms cubic-bezier(.23,1,.32,1); }
  .sp[hidden] { display: none; }
  .sp.is-open { opacity: 1; transform: translate(-50%, 0); }
  html[data-theme="dark"] .sp { background: rgba(8,16,46,.96); color: #fff; border-color: rgba(255,255,255,.16); box-shadow: 0 24px 60px rgba(0,0,0,.5); }
  .sp-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
  .sp-title { font-size: 12px; font-weight: 600; letter-spacing: .16em; text-transform: uppercase; }
  .sp-switch { position: relative; width: 44px; height: 24px; border-radius: 24px; background: rgba(11,31,79,.2); transition: background 220ms ease; }
  html[data-theme="dark"] .sp-switch { background: rgba(255,255,255,.22); }
  .sp-switch i { position: absolute; left: 3px; top: 3px; width: 18px; height: 18px; border-radius: 50%; background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,.25); transition: transform 280ms cubic-bezier(.23,1,.32,1); }
  .sp-switch[aria-checked="true"] { background: var(--blue, #3866f1); }
  .sp-switch[aria-checked="true"] i { transform: translateX(20px); }
  .sp-label { display: flex; justify-content: space-between; margin: 14px 0 8px; font-size: 11px; font-weight: 500; letter-spacing: .14em; text-transform: uppercase; opacity: .6; }
  .sp-label output { letter-spacing: .06em; opacity: 1; }
  .sp-tracks { display: grid; gap: 4px; }
  .sp-track { display: grid; grid-template-columns: 26px 1fr; column-gap: 10px; text-align: left; padding: 8px 10px; border-radius: 12px; transition: background 180ms ease; }
  .sp-track:hover { background: rgba(56,102,241,.08); }
  .sp-track[aria-pressed="true"] { background: rgba(56,102,241,.14); }
  .sp-eq { grid-row: 1 / 3; display: flex; align-items: flex-end; gap: 2px; height: 16px; align-self: center; }
  .sp-eq i { width: 3px; height: 30%; border-radius: 2px; background: rgba(11,31,79,.35); }
  html[data-theme="dark"] .sp-eq i { background: rgba(255,255,255,.4); }
  .sp-track[aria-pressed="true"] .sp-eq i { background: var(--blue, #3866f1); animation: spEq 1.1s ease-in-out infinite; }
  html[data-theme="dark"] .sp-track[aria-pressed="true"] .sp-eq i { background: #7195ff; }
  .sp-track[aria-pressed="true"] .sp-eq i:nth-child(2) { animation-delay: -.4s; } .sp-track[aria-pressed="true"] .sp-eq i:nth-child(3) { animation-delay: -.75s; }
  .sp.is-off .sp-eq i { animation: none !important; height: 30% !important; }
  @keyframes spEq { 0%, 100% { height: 25%; } 50% { height: 100%; } }
  .sp-name { font-size: 14px; font-weight: 600; }
  .sp-desc { grid-column: 2; font-size: 12px; opacity: .65; }
  .sp-range { -webkit-appearance: none; appearance: none; width: 100%; height: 4px; border-radius: 4px; outline: none; background: linear-gradient(90deg, var(--blue, #3866f1) var(--v, 50%), rgba(11,31,79,.16) var(--v, 50%)); }
  html[data-theme="dark"] .sp-range { background: linear-gradient(90deg, #7195ff var(--v, 50%), rgba(255,255,255,.2) var(--v, 50%)); }
  .sp-range::-webkit-slider-thumb { -webkit-appearance: none; width: 16px; height: 16px; border-radius: 50%; background: #fff; box-shadow: 0 0 0 1px rgba(11,31,79,.25), 0 2px 6px rgba(0,0,0,.25); }
  .sp-range::-moz-range-thumb { width: 16px; height: 16px; border: 0; border-radius: 50%; background: #fff; box-shadow: 0 0 0 1px rgba(11,31,79,.25), 0 2px 6px rgba(0,0,0,.25); }
  .sp.is-off .sp-tracks, .sp.is-off .sp-range { opacity: .45; }
  @media (prefers-reduced-motion: reduce) { .sp, .sp-switch i { transition: none; } .sp-track[aria-pressed="true"] .sp-eq i { animation: none; height: 60%; } }`;
  document.head.appendChild(css);

  const panel = document.createElement('section');
  panel.className = 'sp'; panel.id = 'soundPanel'; panel.hidden = true;
  panel.setAttribute('role', 'dialog');
  panel.innerHTML = `
    <div class="sp-head"><p class="sp-title" data-k="Sound">Sound</p><button class="sp-switch" id="spOn" type="button" role="switch" aria-checked="false"><i></i></button></div>
    <p class="sp-label"><span data-k="Ambience">Ambience</span></p>
    <div class="sp-tracks" id="spTracks"></div>
    <label class="sp-label" for="spMusic"><span data-k="Music">Music</span><output id="spMusicOut"></output></label>
    <input class="sp-range" type="range" id="spMusic" min="0" max="100" step="1">
    <label class="sp-label" for="spFx"><span data-k="Effects">Effects</span><output id="spFxOut"></output></label>
    <input class="sp-range" type="range" id="spFx" min="0" max="100" step="1">`;
  document.body.appendChild(panel);
  const sw = panel.querySelector('#spOn'), list = panel.querySelector('#spTracks');
  const music = panel.querySelector('#spMusic'), fx = panel.querySelector('#spFx');
  const musicOut = panel.querySelector('#spMusicOut'), fxOut = panel.querySelector('#spFxOut');
  btn.setAttribute('aria-haspopup', 'dialog'); btn.setAttribute('aria-controls', 'soundPanel'); btn.setAttribute('aria-expanded', 'false');

  function renderTracks() {
    list.innerHTML = TRACKS.map((k, i) => `<button class="sp-track" type="button" data-i="${i}" aria-pressed="${i === prefs.track}"><span class="sp-eq" aria-hidden="true"><i></i><i></i><i></i></span><span class="sp-name">${t(k.name)}</span><span class="sp-desc">${t(k.desc)}</span></button>`).join('');
    panel.setAttribute('aria-label', t('Sound settings'));
    sw.setAttribute('aria-label', t('Sound on or off'));
    panel.querySelectorAll('[data-k]').forEach(n => { n.textContent = t(n.dataset.k); });
  }
  function sync() {
    sw.setAttribute('aria-checked', String(prefs.on));
    list.querySelectorAll('.sp-track').forEach((b, i) => b.setAttribute('aria-pressed', String(i === prefs.track)));
    panel.classList.toggle('is-off', !prefs.on);
    music.value = Math.round(prefs.music * 100); fx.value = Math.round(prefs.fx * 100);
    musicOut.textContent = music.value + ' %'; fxOut.textContent = fx.value + ' %';
    music.style.setProperty('--v', music.value + '%'); fx.style.setProperty('--v', fx.value + '%');
    btn.classList.toggle('on', prefs.on);
    const l = t('Sound settings');
    btn.setAttribute('aria-label', l); btn.setAttribute('title', l);
    btn.setAttribute('aria-pressed', String(prefs.on));
  }
  function open(o) {
    panel.hidden = !o; btn.setAttribute('aria-expanded', String(o));
    requestAnimationFrame(() => panel.classList.toggle('is-open', o));
  }

  btn.addEventListener('click', e => { e.stopPropagation(); open(panel.hidden); });
  document.addEventListener('pointerdown', e => { if (!panel.hidden && !panel.contains(e.target) && !btn.contains(e.target)) open(false); });
  addEventListener('keydown', e => { if (e.key === 'Escape' && !panel.hidden) { open(false); btn.focus({ preventScroll: true }); } });
  panel.addEventListener('wheel', e => e.stopPropagation(), { passive: true });
  sw.addEventListener('click', () => S.setOn(!prefs.on));
  list.addEventListener('click', e => { const b = e.target.closest('.sp-track'); if (b) S.setTrack(+b.dataset.i); });
  music.addEventListener('input', () => { S.setVolume('music', music.value / 100); sync(); });
  fx.addEventListener('input', () => { S.setVolume('fx', fx.value / 100); sync(); });
  document.addEventListener('langchange', () => { renderTracks(); sync(); });

  /* ---------- interface sound effects ---------- */
  ['pointerdown', 'keydown', 'touchstart'].forEach(ev => addEventListener(ev, () => S.unlock(), { passive: true, capture: true }));
  let lastEl = null;
  document.addEventListener('pointerover', e => {
    const el = e.target.closest && e.target.closest('a, button');
    if (el === lastEl) return;
    lastEl = el;
    if (el && e.pointerType === 'mouse' && !panel.contains(el)) S.play('hover');
  });
  document.addEventListener('click', e => {
    const el = e.target.closest && e.target.closest('a, button');
    if (el && el !== btn && !panel.contains(el)) S.play('click');
  });
  addEventListener('hashchange', () => S.play(/^#\/project\//.test(location.hash) ? 'open' : 'whoosh'));

  // Pause while the tab is hidden, resume when it comes back
  document.addEventListener('visibilitychange', () => {
    if (!S.ctx || !prefs.on) return;
    if (document.hidden) S.ctx.suspend(); else S.ctx.resume();
  });

  // used by the entry screen and by the video player (silent: no click sound, state restored by the caller)
  window.SiteMusic = { set: v => S.setOn(!!v, true), open: () => open(true) };

  renderTracks(); sync();
})();
