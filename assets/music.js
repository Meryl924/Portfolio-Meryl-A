/* Background music: a slow, generated "night sky" ambience, made live with the Web Audio API.
   No audio file, no third-party player, nothing to download and no copyright: soft pads that change chord every
   ~14 seconds, plus a few high notes that twinkle now and then. The sound only starts when the visitor presses the
   music button (browsers block autoplay with sound anyway). */
(() => {
  const btn = document.getElementById('musicBtn');
  if (!btn) return;
  const TITLE = 'Night sky · generated ambience';
  const t = s => (window.I18N ? I18N.t(s) : s);
  const save = v => { try { localStorage.setItem('music', v ? 'on' : 'off'); } catch (_) {} };
  const VOLUME = 0.32;

  let ctx = null, master = null, wet = null, dry = null, wants = false, timers = [], step = 0;

  // D lydian colours: Dmaj9, Bm7, Gmaj7#11, Asus2. Notes in Hz.
  const CHORDS = [
    [73.42, 146.83, 220.00, 329.63, 369.99],   // D2 D3 A3 E4 F#4
    [61.74, 123.47, 185.00, 293.66, 329.63],   // B1 B2 F#3 D4 E4
    [98.00, 196.00, 293.66, 369.99, 440.00],   // G2 G3 D4 F#4 A4
    [55.00, 110.00, 164.81, 220.00, 246.94]    // A1 A2 E3 A3 B3
  ];
  const SPARKLE = [587.33, 659.25, 739.99, 880.00, 987.77, 1174.66, 1479.98]; // D5 E5 F#5 A5 B5 D6 F#6
  const CHORD_LEN = 14;                                                        // seconds

  function label() {
    const on = btn.classList.contains('on');
    const l = t(on ? 'Pause music' : 'Play music');
    btn.setAttribute('aria-label', l);
    btn.setAttribute('title', l + ' · ' + TITLE);
    btn.setAttribute('aria-pressed', String(on));
  }
  function setOn(on) { btn.classList.toggle('on', on); label(); }

  function reverbBuffer(c, seconds) {
    const rate = c.sampleRate, len = Math.floor(rate * seconds), buf = c.createBuffer(2, len, rate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6);
    }
    return buf;
  }

  function build() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0;
    const soften = ctx.createBiquadFilter(); soften.type = 'lowpass'; soften.frequency.value = 2600; soften.Q.value = 0.2;
    const verb = ctx.createConvolver(); verb.buffer = reverbBuffer(ctx, 4.2);
    wet = ctx.createGain(); wet.gain.value = 0.55;
    dry = ctx.createGain(); dry.gain.value = 0.6;
    wet.connect(verb); verb.connect(soften); dry.connect(soften);
    soften.connect(master); master.connect(ctx.destination);
    return true;
  }

  // One pad voice: two slightly detuned oscillators, slow swell in and out, gentle wobble on the filter
  function voice(freq, when, len, level) {
    const o1 = ctx.createOscillator(), o2 = ctx.createOscillator();
    o1.type = 'triangle'; o2.type = 'sine';
    o1.frequency.value = freq; o2.frequency.value = freq;
    o1.detune.value = -5; o2.detune.value = 6;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 0.4;
    lp.frequency.value = 500 + Math.random() * 300;
    const lfo = ctx.createOscillator(), lfoGain = ctx.createGain();
    lfo.frequency.value = 0.05 + Math.random() * 0.07; lfoGain.gain.value = 220;
    lfo.connect(lfoGain); lfoGain.connect(lp.frequency);
    const g = ctx.createGain(); g.gain.value = 0;
    const attack = 4.2, release = 6.5;
    g.gain.setValueAtTime(0, when);
    g.gain.linearRampToValueAtTime(level, when + attack);
    g.gain.setValueAtTime(level, when + len - 1);
    g.gain.linearRampToValueAtTime(0, when + len + release);
    o1.connect(lp); o2.connect(lp); lp.connect(g); g.connect(dry); g.connect(wet);
    const end = when + len + release + 0.2;
    o1.start(when); o2.start(when); lfo.start(when);
    o1.stop(end); o2.stop(end); lfo.stop(end);
  }

  function chord() {
    if (!wants) return;
    const now = ctx.currentTime + 0.05, notes = CHORDS[step % CHORDS.length];
    notes.forEach((f, i) => voice(f, now + i * 0.35, CHORD_LEN, i === 0 ? 0.11 : 0.045));
    step++;
    timers.push(setTimeout(chord, (CHORD_LEN - 2) * 1000));
  }

  // A single bell-like note: sine with a very soft attack and a long fade, played through the reverb
  function twinkle() {
    if (!wants) return;
    const f = SPARKLE[Math.floor(Math.random() * SPARKLE.length)], when = ctx.currentTime + 0.05;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine'; o.frequency.value = f;
    const peak = 0.018 + Math.random() * 0.02;
    g.gain.setValueAtTime(0, when);
    g.gain.linearRampToValueAtTime(peak, when + 0.04);
    g.gain.exponentialRampToValueAtTime(0.0001, when + 4.5);
    o.connect(g); g.connect(wet); g.connect(dry);
    o.start(when); o.stop(when + 4.7);
    timers.push(setTimeout(twinkle, 2200 + Math.random() * 4800));
  }

  function start() {
    if (!ctx && !build()) { btn.hidden = true; wants = false; setOn(false); return; }
    ctx.resume();
    const now = ctx.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(master.gain.value, now);
    master.gain.linearRampToValueAtTime(VOLUME, now + 2.5);
    chord();
    timers.push(setTimeout(twinkle, 3000));
  }

  function stop() {
    timers.forEach(clearTimeout); timers = [];
    if (!ctx) return;
    const now = ctx.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(master.gain.value, now);
    master.gain.linearRampToValueAtTime(0, now + 1.2);
    setTimeout(() => { if (!wants && ctx) ctx.suspend(); }, 1400);
  }

  function toggle(force) {
    wants = typeof force === 'boolean' ? force : !wants;
    save(wants); setOn(wants);
    if (wants) start(); else stop();
  }
  btn.addEventListener('click', () => toggle());
  window.SiteMusic = { set: v => toggle(!!v) };   // used by the entry screen

  // Pause while the tab is hidden, resume when it comes back
  document.addEventListener('visibilitychange', () => {
    if (!ctx || !wants) return;
    if (document.hidden) ctx.suspend(); else ctx.resume();
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
