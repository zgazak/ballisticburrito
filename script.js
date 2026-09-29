// Ballistic Burrito: set the angle and power, mind the wind, hit the car.
(() => {
  const $ = (id) => document.getElementById(id);
  const canvas = $('sky');
  const ctx = canvas.getContext('2d');
  const angleIn = $('angle'), powerIn = $('power'), fireBtn = $('fire');
  const angleOut = $('angleOut'), powerOut = $('powerOut');
  const windEl = $('wind'), scoreEl = $('score'), msgEl = $('hint');
  const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();

  const G = 9.8;            // m/s^2
  const CAR_W = 8, CAR_H = 3.4;
  const CAN_X = 5, CAN_Y = 1.2, BARREL = 3.6;
  const STEP = 1 / 120;

  let W, H, dpr, scale, worldW, groundY;
  let carX = 60, wind = 0, shots = 0, hits = 0;
  let b = null;             // burrito in flight: {x, y, vx, vy, rot}
  let trail = [], lastTrail = [];
  let celebrate = 0;        // seconds of victory sparkle left
  let streaks = [];

  const mph = () => Math.round(Math.abs(wind) * 2.5);

  function newScenario() {
    carX = worldW * (0.45 + Math.random() * 0.4);
    carX = Math.min(carX, worldW - CAR_W - 3);
    wind = (Math.random() < 0.5 ? -1 : 1) * (0.5 + Math.random() * 4.5);
    lastTrail = []; trail = [];
    const w = mph();
    windEl.textContent = 'Wind ' + (wind < 0 ? '← ' : '→ ') + w + ' mph';
    say('New traffic jam. Get that burrito into the car.');
  }

  function say(text) { msgEl.textContent = text; msgEl.style.opacity = 1; }
  function updateScore() { scoreEl.textContent = 'Delivered ' + hits + ' / ' + shots; }

  function resize() {
    dpr = window.devicePixelRatio || 1;
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    groundY = H - 36;
    scale = Math.max(5, Math.min(9, W / 110));   // px per metre
    const oldW = worldW;
    worldW = W / scale;
    if (oldW) carX = Math.min(carX, worldW - CAR_W - 3);
    streaks = Array.from({ length: Math.round(W / 40) }, () => ({
      x: Math.random() * W, y: Math.random() * groundY, len: 12 + Math.random() * 28,
    }));
  }

  const sx = (m) => m * scale;
  const sy = (m) => groundY - m * scale;

  function fire() {
    if (b) return;
    const a = angleIn.value * Math.PI / 180, v = +powerIn.value;
    b = {
      x: CAN_X + Math.cos(a) * BARREL, y: CAN_Y + Math.sin(a) * BARREL,
      vx: v * Math.cos(a), vy: v * Math.sin(a), rot: 0,
    };
    trail = [];
    shots++; updateScore();
    fireBtn.disabled = true;
    say('...');
  }

  function land(hit, xLand) {
    b = null;
    fireBtn.disabled = false;
    lastTrail = trail; trail = [];
    if (hit) {
      hits++; updateScore();
      celebrate = 1.6;
      say(pick([
        'Direct hit! Fresh burrito, delivered.',
        'Nothing but sunroof. Nice.',
        'Guac is extra, but you earned it.',
        'Right in the cupholder!',
      ]));
      setTimeout(newScenario, 1800);
    } else {
      const off = xLand - (carX + CAR_W / 2);
      const d = Math.abs(Math.round(off));
      say(off < 0 ? 'Short by ' + d + ' m. More power, or a higher arc.' : 'Long by ' + d + ' m. Ease off.');
    }
  }
  const pick = (a) => a[Math.floor(Math.random() * a.length)];

  function step(dt) {
    b.vx += wind * dt;
    b.vy -= G * dt;
    b.x += b.vx * dt; b.y += b.vy * dt;
    b.rot += dt * 8;
    if (b.x >= carX && b.x <= carX + CAR_W && b.y <= CAR_H && b.y > 0) return land(true, b.x);
    if (b.y <= 0) return land(false, b.x);
    if (b.x < -20 || b.x > worldW + 40) return land(false, b.x);
  }

  let last = performance.now(), acc = 0;
  function frame(now) {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    if (b) {
      acc += dt;
      while (b && acc >= STEP) { step(STEP); acc -= STEP; if (b && (trail.length === 0 || Math.round(b.x * 4) !== trail._k)) { trail.push({ x: b.x, y: b.y }); trail._k = Math.round(b.x * 4); } }
    }
    if (celebrate > 0) celebrate -= dt;
    for (const s of streaks) {                // wind streaks drift with the wind
      s.x += wind * dt * scale * 3;
      if (s.x > W + 40) s.x = -40;
      if (s.x < -40) s.x = W + 40;
    }
    draw();
    requestAnimationFrame(frame);
  }

  function drawTrail(t, alpha) {
    ctx.fillStyle = css('--trail');
    ctx.globalAlpha = alpha;
    for (const p of t) { ctx.beginPath(); ctx.arc(sx(p.x), sy(p.y), 2.5, 0, 6.283); ctx.fill(); }
    ctx.globalAlpha = 1;
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);

    ctx.strokeStyle = css('--muted'); ctx.lineWidth = 1.5; ctx.globalAlpha = 0.35;
    for (const s of streaks) {
      ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x + Math.sign(wind) * s.len, s.y); ctx.stroke();
    }
    ctx.globalAlpha = 1;

    ctx.fillStyle = css('--ground');
    ctx.fillRect(0, groundY, W, H - groundY);

    // cannon
    const a = angleIn.value * Math.PI / 180;
    ctx.save();
    ctx.translate(sx(CAN_X), sy(CAN_Y));
    ctx.rotate(-a);
    ctx.fillStyle = css('--fg');
    ctx.fillRect(-sx(0.6), -sx(0.8), sx(BARREL + 0.6), sx(1.6));
    ctx.restore();
    ctx.fillStyle = css('--fg');
    ctx.beginPath(); ctx.arc(sx(CAN_X), sy(CAN_Y), sx(1.6), 0, 6.283); ctx.fill();
    ctx.fillStyle = css('--bg');
    ctx.beginPath(); ctx.arc(sx(CAN_X), sy(CAN_Y), sx(0.6), 0, 6.283); ctx.fill();

    // car
    ctx.font = Math.round(sx(CAR_W) * 0.95) + 'px serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    const bounce = celebrate > 0 ? Math.abs(Math.sin(celebrate * 14)) * 6 : 0;
    ctx.fillText('🚗', sx(carX + CAR_W / 2), groundY + sx(0.6) - bounce);
    if (celebrate > 0) {
      ctx.font = '28px serif';
      ctx.fillText('🎉', sx(carX + CAR_W / 2), groundY - sx(CAR_H) - 14 - bounce);
    }

    drawTrail(lastTrail, 0.25);
    drawTrail(trail, 0.9);

    if (b) {
      ctx.save();
      ctx.translate(sx(b.x), sy(b.y));
      ctx.rotate(b.rot);
      ctx.font = '30px serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('🌯', 0, 2);
      ctx.restore();
    }
  }

  // controls
  const sync = () => { angleOut.textContent = angleIn.value + '°'; powerOut.textContent = powerIn.value; };
  angleIn.addEventListener('input', sync);
  powerIn.addEventListener('input', sync);
  fireBtn.addEventListener('click', fire);
  document.querySelectorAll('.step').forEach((btn) => {
    const input = $(btn.dataset.target);
    let timer;
    const bump = () => {
      input.value = Math.max(+input.min, Math.min(+input.max, +input.value + +btn.dataset.d));
      sync();
    };
    const stop = () => { clearInterval(timer); clearTimeout(timer); };
    btn.addEventListener('pointerdown', () => {        // tap = 1 step, hold = repeat
      bump();
      timer = setTimeout(() => { timer = setInterval(bump, 60); }, 350);
    });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach((e) => btn.addEventListener(e, stop));
    btn.addEventListener('keydown', (e) => { if (e.key === 'Enter') bump(); });
  });
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && e.target.tagName !== 'BUTTON') { e.preventDefault(); fire(); }
  });
  window.addEventListener('resize', resize);

  sync(); resize(); newScenario(); updateScore();
  requestAnimationFrame(frame);

  // ---- live GitHub star counts (silently skipped if the API is unavailable) ----
  $('yr').textContent = new Date().getFullYear();
  document.querySelectorAll('.repo[data-repo]').forEach(async (el) => {
    try {
      const key = 'gh:' + el.dataset.repo;
      let n = sessionStorage.getItem(key);
      if (n === null) {
        const r = await fetch('https://api.github.com/repos/' + el.dataset.repo);
        if (!r.ok) return;
        n = (await r.json()).stargazers_count;
        sessionStorage.setItem(key, n);
      }
      if (+n > 0) el.querySelector('.stars').textContent = n;
    } catch (_) { /* offline or rate-limited: fine */ }
  });
})();
