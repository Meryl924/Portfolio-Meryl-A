/* Immersive layer: loader, WebGL particle scene that morphs with the section in view.
   Three.js is loaded from a CDN; if it fails (offline, blocked) the page still opens on the dark gradient. */
(() => {
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const small = matchMedia('(max-width: 760px)');
  const loader = document.getElementById('loader');
  const num = document.getElementById('ldNum');

  /* ---------- Loader ---------- */
  let shown = 0, target = 0, finished = false;
  const seen = (() => { try { return sessionStorage.getItem('intro-seen') === '1'; } catch (_) { return false; } })();
  const setProgress = v => { target = Math.max(target, Math.min(1, v)); };
  const mark = document.querySelector('.nav .logo-svg');
  if (loader && mark) {
    const m = mark.cloneNode(true);
    m.setAttribute('viewBox', '26 30 204 196'); m.setAttribute('class', 'ld-mark'); m.removeAttribute('height');
    loader.querySelector('.ld-mid').prepend(m);
  }
  function open() {
    if (finished) return; finished = true;
    try { sessionStorage.setItem('intro-seen', '1'); } catch (_) {}
    root.classList.remove('loading');
    if (loader) { loader.classList.add('done'); setTimeout(() => loader.classList.add('gone'), 1200); }
    setTimeout(() => root.classList.add('scene-on'), 200);
  }
  if (!loader || seen) { root.classList.remove('loading'); loader && loader.classList.add('gone'); root.classList.add('scene-on'); finished = true; }
  (function tick() {
    if (finished) return;
    shown += (target - shown) * .08;
    if (target - shown < .002) shown = target;
    if (num) num.textContent = String(Math.round(shown * 100)).padStart(3, '0') + '%';
    if (loader) loader.style.setProperty('--ld', shown.toFixed(3));
    if (shown >= 1) { setTimeout(open, reduce.matches ? 0 : 500); return; }
    requestAnimationFrame(tick);
  })();
  setProgress(.12);
  const fonts = document.fonts ? document.fonts.ready : Promise.resolve();
  const loaded = new Promise(r => { if (document.readyState === 'complete') r(); else addEventListener('load', r, { once: true }); });
  const minWait = new Promise(r => setTimeout(r, seen ? 0 : 1500));
  Promise.all([fonts.then(() => setProgress(.35)), loaded.then(() => setProgress(.6))]);
  setTimeout(() => { if (!finished) setProgress(1); }, 6000);   // safety: never trap the visitor
  setTimeout(open, 9000);

  /* ---------- Scene ---------- */
  const THREE_URL = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
  const canvas = document.getElementById('scene');
  const webgl = (() => { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl') || c.getContext('experimental-webgl')); } catch (_) { return false; } })();

  function ready() { Promise.all([minWait]).then(() => { setProgress(1); if (seen) open(); }); }
  if (!canvas || !webgl) { ready(); return; }

  const s = document.createElement('script');
  s.src = THREE_URL; s.async = true;
  s.onerror = ready;
  s.onload = () => { try { start(); } catch (err) { console.warn('scene off', err); } ready(); };
  document.head.appendChild(s);

  function start() {
    const N = small.matches ? 9000 : 26000;
    const SIZE = 512;
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, powerPreference: 'high-performance' });
    renderer.setClearColor(0x000000, 0);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1, .1, 100);
    camera.position.z = 11;
    const group = new THREE.Group(); scene.add(group);

    /* --- shapes drawn on a 2D canvas, then sampled into points --- */
    const cv = document.createElement('canvas'); cv.width = cv.height = SIZE;
    const g = cv.getContext('2d', { willReadFrequently: true });
    const white = '#fff';
    const logoPaths = () => [...document.querySelectorAll('.logo-svg')[0].querySelectorAll('g:first-child > path')].map(p => ({ d: p.getAttribute('d'), c: p.getAttribute('fill') }));
    const draw = {
      logo() {
        const k = SIZE * .8 / 204;
        g.setTransform(k, 0, 0, k, SIZE * .1 - 26 * k, SIZE * .1 - 30 * k);
        logoPaths().forEach(p => { g.fillStyle = /E5383B/i.test(p.c) ? '#f00' : white; g.fill(new Path2D(p.d)); });
        g.setTransform(1, 0, 0, 1, 0, 0);
      },
      screen() {
        g.strokeStyle = white; g.fillStyle = white; g.lineWidth = 9; g.lineJoin = 'round'; g.lineCap = 'round';
        const rr = (x, y, w, h, r) => { g.beginPath(); g.roundRect(x, y, w, h, r); };
        rr(46, 92, 420, 270, 22); g.stroke();
        g.beginPath(); g.moveTo(46, 142); g.lineTo(466, 142); g.stroke();
        [74, 100, 126].forEach(x => { g.beginPath(); g.arc(x, 117, 7, 0, 7); g.fill(); });
        rr(84, 176, 150, 150, 12); g.fill();
        g.lineWidth = 12; g.beginPath(); g.moveTo(268, 190); g.lineTo(430, 190); g.moveTo(268, 236); g.lineTo(400, 236); g.moveTo(268, 282); g.lineTo(430, 282); g.moveTo(268, 322); g.lineTo(350, 322); g.stroke();
        g.lineWidth = 9; g.beginPath(); g.moveTo(256, 362); g.lineTo(256, 412); g.moveTo(180, 414); g.lineTo(332, 414); g.stroke();
      },
      bulb() {
        g.strokeStyle = white; g.fillStyle = white; g.lineWidth = 10; g.lineCap = 'round'; g.lineJoin = 'round';
        g.beginPath(); g.arc(256, 200, 128, Math.PI * .78, Math.PI * 2.22); g.lineTo(312, 330); g.lineTo(200, 330); g.closePath(); g.stroke();
        g.fillStyle = '#f00'; g.beginPath(); g.arc(256, 204, 26, 0, 7); g.fill(); g.fillStyle = white;
        g.lineWidth = 12;
        [350, 380, 410].forEach((y, i) => { g.beginPath(); g.moveTo(206 + i * 8, y); g.lineTo(306 - i * 8, y); g.stroke(); });
        g.lineWidth = 7; g.beginPath(); g.moveTo(226, 330); g.lineTo(236, 250); g.lineTo(256, 270); g.lineTo(276, 250); g.lineTo(286, 330); g.stroke();
      },
      compass() {
        g.strokeStyle = white; g.fillStyle = white; g.lineCap = 'round';
        g.lineWidth = 11; g.beginPath(); g.arc(256, 256, 190, 0, 7); g.stroke();
        g.lineWidth = 5; g.beginPath(); g.arc(256, 256, 162, 0, 7); g.stroke();
        g.lineWidth = 7;
        for (let i = 0; i < 24; i++) { const a = i * Math.PI / 12, r1 = i % 6 ? 170 : 150, r2 = 188; g.beginPath(); g.moveTo(256 + Math.cos(a) * r1, 256 + Math.sin(a) * r1); g.lineTo(256 + Math.cos(a) * r2, 256 + Math.sin(a) * r2); g.stroke(); }
        g.save(); g.translate(256, 256); g.rotate(Math.PI / 4);
        g.beginPath(); g.moveTo(0, -128); g.lineTo(34, 0); g.lineTo(-34, 0); g.closePath(); g.fillStyle = '#f00'; g.fill();
        g.beginPath(); g.moveTo(0, 128); g.lineTo(34, 0); g.lineTo(-34, 0); g.closePath(); g.fillStyle = white; g.fill();
        g.restore();
        g.beginPath(); g.arc(256, 256, 11, 0, 7); g.fillStyle = '#050a1c'; g.fill();
      },
      cube() {
        g.strokeStyle = white; g.lineWidth = 11; g.lineJoin = 'round'; g.lineCap = 'round';
        const cx = 256, cy = 262, r = 170, p = (a) => [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
        const pts = [-90, -30, 30, 90, 150, 210].map(d => p(d * Math.PI / 180));
        g.beginPath(); pts.forEach((q, i) => i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])); g.closePath(); g.stroke();
        g.beginPath(); g.moveTo(cx, cy); g.lineTo(pts[1][0], pts[1][1]); g.moveTo(cx, cy); g.lineTo(pts[3][0], pts[3][1]); g.moveTo(cx, cy); g.lineTo(pts[5][0], pts[5][1]); g.stroke();
        g.fillStyle = '#f00'; g.beginPath(); g.arc(cx, cy, 20, 0, 7); g.fill();
        g.fillStyle = 'rgba(255,255,255,.55)'; g.beginPath(); g.moveTo(pts[5][0], pts[5][1]); g.lineTo(cx, cy); g.lineTo(pts[3][0], pts[3][1]); g.lineTo(pts[4][0], pts[4][1]); g.closePath(); g.fill();
      },
      question() {
        g.fillStyle = white; g.font = '700 470px "Inter", Helvetica, Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
        g.fillText('?', 256, 430);
      }
    };
    const SHAPES = ['logo', 'screen', 'bulb', 'compass', 'cube', 'question', 'sphere'];
    const buffers = {};
    function sample(name) {
      const out = new Float32Array(N * 4);
      if (name === 'sphere') {
        for (let i = 0; i < N; i++) {
          const y = 1 - (i + .5) / N * 2, rad = Math.sqrt(1 - y * y), th = i * 2.399963;
          const r = 2.7 * (.96 + Math.random() * .08);
          out.set([Math.cos(th) * rad * r, y * r, Math.sin(th) * rad * r, Math.random() < .03 ? 1 : 0], i * 4);
        }
        return out;
      }
      g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, SIZE, SIZE);
      draw[name]();
      const px = g.getImageData(0, 0, SIZE, SIZE).data, idx = [];
      for (let y = 0; y < SIZE; y += 2) for (let x = 0; x < SIZE; x += 2) { const a = px[(y * SIZE + x) * 4 + 3]; if (a > 110) idx.push(x, y, px[(y * SIZE + x) * 4 + 1] < 60 ? 1 : 0, a); }
      const cnt = idx.length / 4, S = 6.4, depth = name === 'logo' ? 1.2 : 1.6;
      for (let i = 0; i < N; i++) {
        const j = ((Math.random() * cnt) | 0) * 4;
        const x = idx[j] + (Math.random() - .5) * 2, y = idx[j + 1] + (Math.random() - .5) * 2;
        out.set([(x / SIZE - .5) * S, -(y / SIZE - .5) * S, (Math.random() - .5) * depth, idx[j + 2]], i * 4);
      }
      return out;
    }
    function build(name) { if (!buffers[name]) buffers[name] = sample(name); return buffers[name]; }

    const geo = new THREE.BufferGeometry();
    const aA = new THREE.BufferAttribute(new Float32Array(N * 4), 4), aB = new THREE.BufferAttribute(new Float32Array(N * 4), 4);
    const rnd = new Float32Array(N * 3); for (let i = 0; i < rnd.length; i++) rnd[i] = Math.random();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3));
    geo.setAttribute('aA', aA); geo.setAttribute('aB', aB); geo.setAttribute('aR', new THREE.BufferAttribute(rnd, 3));
    const mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uMix: { value: 1 }, uTime: { value: 0 }, uPx: { value: 1 }, uAlpha: { value: 1 } },
      vertexShader: `
        attribute vec4 aA; attribute vec4 aB; attribute vec3 aR;
        uniform float uMix, uTime, uPx;
        varying vec3 vCol; varying float vA;
        void main(){
          float m = smoothstep(aR.x * .45, aR.x * .45 + .55, uMix);
          vec3 p = mix(aA.xyz, aB.xyz, m);
          float arc = sin(3.14159 * m);
          p += normalize(vec3(aR.y - .5, aR.z - .5, aR.x - .5) + 1e-3) * arc * 2.6;
          p += .05 * vec3(sin(uTime * .8 + aR.x * 40.), cos(uTime * .7 + aR.y * 40.), sin(uTime * .6 + aR.z * 40.));
          vec4 mv = modelViewMatrix * vec4(p, 1.);
          gl_Position = projectionMatrix * mv;
          float red = mix(aA.w, aB.w, m);
          vec3 base = mix(vec3(.38, .62, 1.), vec3(1.), aR.y * aR.y);
          vCol = mix(base, vec3(.95, .2, .22), red);
          gl_PointSize = (2.2 + aR.z * 2.8) * uPx * (10. / -mv.z) * (1. + arc * .5);
          vA = .7 + .3 * aR.y;
        }`,
      fragmentShader: `
        uniform float uAlpha; varying vec3 vCol; varying float vA;
        void main(){
          float d = length(gl_PointCoord - .5);
          if (d > .5) discard;
          gl_FragColor = vec4(vCol, vA * uAlpha * smoothstep(.5, .08, d));
        }`
    });
    const points = new THREE.Points(geo, mat); points.frustumCulled = false; group.add(points);

    /* dust drifting in the distance */
    const D = small.matches ? 160 : 380, dust = new Float32Array(D * 3);
    for (let i = 0; i < D; i++) dust.set([(Math.random() - .5) * 30, (Math.random() - .5) * 18, -4 - Math.random() * 10], i * 3);
    const dg = new THREE.BufferGeometry(); dg.setAttribute('position', new THREE.BufferAttribute(dust, 3));
    const dm = new THREE.PointsMaterial({ color: 0x7aa2ff, size: .06, transparent: true, opacity: .55, depthWrite: false, blending: THREE.AdditiveBlending });
    const dustPts = new THREE.Points(dg, dm); scene.add(dustPts);

    /* --- which shape for which part of the page --- */
    const sectionShapes = () => {
      if (currentPageName() === 'contact') return [[document.querySelector('.page.active'), 'sphere']];
      if (currentPageName() === 'project') return [[document.querySelector('.page.active'), 'screen']];
      if (currentPageName() === 'notfound') return [[document.querySelector('.page.active'), 'question']];
      const bandSec = document.querySelector('.band')?.closest('section');
      return [
        [document.querySelector('.hero'), 'logo'],
        [document.getElementById('work'), 'screen'],
        [bandSec, 'bulb'],
        [document.getElementById('experience'), 'compass'],
        [document.getElementById('services'), 'cube'],
        [document.getElementById('faq'), 'question'],
        [document.querySelector('footer'), 'logo']
      ];
    };
    const currentPageName = () => document.querySelector('.page.active')?.dataset.page || 'home';
    // Where the shape sits and how big: x as a share of half the visible width
    const LAYOUT = { logo: [.62, 1.25, 0], screen: [.7, .6, .45], bulb: [.62, .85, 0], compass: [.78, .62, .3], cube: [.7, .72, .1], question: [.7, .7, .15], sphere: [.1, .5, .5] };
    function pick() {
      const mid = innerHeight * .5;
      let name = 'logo';
      for (const [el, shape] of sectionShapes()) {
        if (!el) continue;
        const r = el.getBoundingClientRect();
        if (r.top <= mid + 40) name = shape;
      }
      return name;
    }

    /* --- state --- */
    let from = 'logo', to = 'logo', mixV = 1, mixT = 1, pending = null;
    aA.array.set(build('logo')); aB.array.set(build('logo')); aA.needsUpdate = aB.needsUpdate = true;
    let layX = LAYOUT.logo[0], layS = LAYOUT.logo[1], layY = LAYOUT.logo[2], tLayX = layX, tLayS = layS, tLayY = layY;
    function morph(name) {
      if (name === to && !pending) return;
      if (mixV < 1) { pending = name; return; }
      from = to; to = name; pending = null;
      aA.array.set(aB.array); aA.needsUpdate = true;
      aB.array.set(build(to)); aB.needsUpdate = true;
      mixV = 0; mixT = 1;
      tLayX = LAYOUT[to][0]; tLayS = LAYOUT[to][1]; tLayY = LAYOUT[to][2];
    }

    let mx = 0, my = 0, smx = 0, smy = 0, sy = scrollY, ssy = scrollY, vis = 1;
    addEventListener('pointermove', e => { mx = e.clientX / innerWidth - .5; my = e.clientY / innerHeight - .5; }, { passive: true });
    addEventListener('scroll', () => { sy = scrollY; }, { passive: true });
    addEventListener('hashchange', () => setTimeout(() => morph(pick()), 60));

    function resize() {
      const w = innerWidth, h = innerHeight, dpr = Math.min(devicePixelRatio || 1, small.matches ? 1.5 : 1.75);
      renderer.setPixelRatio(dpr); renderer.setSize(w, h, false);
      camera.aspect = w / h; camera.updateProjectionMatrix();
      mat.uniforms.uPx.value = dpr * (h / 800);
    }
    addEventListener('resize', resize); resize();

    const clock = new THREE.Clock();
    let lastPick = 0;
    function frame() {
      requestAnimationFrame(frame);
      const dt = Math.min(clock.getDelta(), .05), t = clock.elapsedTime;
      if (t - lastPick > .12) { lastPick = t; morph(pick()); }
      if (mixV < 1) { mixV = Math.min(1, mixV + dt / 1.7); if (mixV >= 1 && pending) { const p = pending; pending = null; morph(p); } }
      mat.uniforms.uMix.value = mixV; mat.uniforms.uTime.value = t;
      smx += (mx - smx) * .05; smy += (my - smy) * .05; ssy += (sy - ssy) * .08;
      layX += (tLayX - layX) * .05; layS += (tLayS - layS) * .05; layY += (tLayY - layY) * .05;
      const hh = Math.tan(camera.fov * Math.PI / 360) * camera.position.z, ww = hh * camera.aspect;
      const phone = camera.aspect < .85;
      const sc = (phone ? .5 : 1) * layS * Math.min(1, camera.aspect / 1.4 + .35);
      group.scale.setScalar(sc);
      group.position.x = phone ? 0 : layX * ww * .8;
      group.position.y = (phone ? hh * .62 : layY * hh) + Math.sin(t * .5) * .12;
      group.rotation.y = smx * .6 + Math.sin(t * .25) * .16 + Math.sin(ssy * .0021) * .38;
      group.rotation.x = -smy * .4;
      const pg = currentPageName(), want = phone ? .5 : pg === 'project' ? .38 : pg === 'contact' ? .6 : 1.0;
      mat.uniforms.uAlpha.value += (want - mat.uniforms.uAlpha.value) * .06;
      dustPts.position.y = (ssy * .004) % 6;
      dustPts.rotation.y = t * .01;
      renderer.render(scene, camera);
    }
    if (reduce.matches) { mixV = 1; resize(); morph(pick()); mixV = 1; aA.array.set(aB.array); renderer.render(scene, camera); addEventListener('scroll', () => { morph(pick()); mixV = 1; renderer.render(scene, camera); }); }
    else frame();
    setProgress(.9);
  }
})();
