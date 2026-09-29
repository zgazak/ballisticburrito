// Ballistic burrito: drag back from the burrito and release to launch it.
(() => {
  const canvas = document.getElementById('sky');
  const ctx = canvas.getContext('2d');
  const hint = document.getElementById('hint');
  const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  const G = 900;          // px/s^2
  const POWER = 4.2;      // drag distance -> launch speed
  const MAX_DRAG = 130;
  const REST = 0.55;      // bounce restitution

  let W, H, dpr, groundY, home, stars = [];
  const b = { x: 0, y: 0, vx: 0, vy: 0, rot: 0, flying: false };
  let trail = [];
  let drag = null;

  function resize() {
    dpr = window.devicePixelRatio || 1;
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    groundY = H - 36;
    home = { x: Math.min(110, W * 0.15), y: groundY - 16 };
    if (!b.flying) { b.x = home.x; b.y = home.y; }
    stars = Array.from({ length: Math.round(W * H / 5000) }, () => ({
      x: Math.random() * W, y: Math.random() * groundY, r: Math.random() * 1.4 + 0.3,
    }));
  }

  function pos(e) {
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  canvas.addEventListener('pointerdown', (e) => {
    const p = pos(e);
    if (Math.hypot(p.x - b.x, p.y - b.y) > 50) return;
    canvas.setPointerCapture(e.pointerId);
    b.flying = false; b.vx = b.vy = 0; trail = [];
    drag = p;
    canvas.style.cursor = 'grabbing';
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drag) return;
    drag = pos(e);
    let dx = drag.x - home.x, dy = drag.y - home.y;
    const d = Math.hypot(dx, dy);
    if (d > MAX_DRAG) { dx *= MAX_DRAG / d; dy *= MAX_DRAG / d; }
    b.x = home.x + dx; b.y = Math.min(home.y + dy, groundY - 16);
  });
  const release = () => {
    if (!drag) return;
    drag = null;
    canvas.style.cursor = 'grab';
    b.vx = (home.x - b.x) * POWER;
    b.vy = (home.y - b.y) * POWER;
    if (Math.hypot(b.vx, b.vy) < 40) { b.x = home.x; b.y = home.y; return; }
    b.flying = true;
    hint.style.opacity = 0;
  };
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);

  let last = performance.now();
  function frame(now) {
    const dt = Math.min((now - last) / 1000, 0.03);
    last = now;

    if (b.flying) {
      b.vy += G * dt;
      b.x += b.vx * dt; b.y += b.vy * dt;
      b.rot += b.vx * dt * 0.02;
      trail.push({ x: b.x, y: b.y });
      if (trail.length > 400) trail.shift();
      if (b.x < 12) { b.x = 12; b.vx = Math.abs(b.vx) * REST; }
      if (b.x > W - 12) { b.x = W - 12; b.vx = -Math.abs(b.vx) * REST; }
      if (b.y > groundY - 16) {
        b.y = groundY - 16;
        b.vy = -b.vy * REST;
        b.vx *= 0.85;
        if (Math.abs(b.vy) < 60) { b.vy = 0; b.vx *= 0.9; }
        if (Math.abs(b.vx) < 8 && b.vy === 0) {
          // settle, then go back to the launch pad after a moment
          b.flying = false;
          setTimeout(() => { if (!b.flying && !drag) { b.x = home.x; b.y = home.y; b.rot = 0; trail = []; } }, 1800);
        }
      }
    }

    draw();
    requestAnimationFrame(frame);
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);

    ctx.fillStyle = css('--star');
    for (const s of stars) { ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 6.283); ctx.fill(); }

    ctx.fillStyle = css('--ground');
    ctx.fillRect(0, groundY, W, H - groundY);

    // launch pad marker
    ctx.strokeStyle = css('--muted'); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(home.x - 22, groundY); ctx.lineTo(home.x + 22, groundY); ctx.stroke();

    // trail
    ctx.fillStyle = css('--trail');
    trail.forEach((p, i) => {
      if (i % 4) return;
      ctx.globalAlpha = i / trail.length;
      ctx.beginPath(); ctx.arc(p.x, p.y, 2.5, 0, 6.283); ctx.fill();
    });
    ctx.globalAlpha = 1;

    // aim preview + band
    if (drag) {
      const vx = (home.x - b.x) * POWER, vy = (home.y - b.y) * POWER;
      ctx.fillStyle = css('--accent');
      for (let t = 0.04; t < 3; t += 0.06) {
        const x = b.x + vx * t, y = b.y + vy * t + 0.5 * G * t * t;
        if (y > groundY) break;
        ctx.globalAlpha = 1 - t / 3;
        ctx.beginPath(); ctx.arc(x, y, 2.5, 0, 6.283); ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.strokeStyle = css('--muted'); ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(home.x, home.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }

    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(b.rot);
    ctx.font = '34px serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('🌯', 0, 2);
    ctx.restore();
  }

  window.addEventListener('resize', resize);
  resize();
  requestAnimationFrame(frame);

  // ---- live GitHub star counts (silently skipped if the API is unavailable) ----
  document.getElementById('yr').textContent = new Date().getFullYear();
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
