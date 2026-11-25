// Punktlandung – kleine UI-Helfer: Symbole, Hinweise, Konfetti, Blätter.

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const P = {
  plan: '<rect x="3.5" y="5" width="17" height="15.5" rx="4"/><path d="M3.5 10h17M8 3v4M16 3v4"/><circle cx="8.5" cy="14.5" r="1.2" fill="currentColor" stroke="none"/>',
  bell: '<path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.6 1.8H4.4z"/><path d="M10 21a2.2 2.2 0 0 0 4 0"/>',
  user: '<circle cx="12" cy="8.5" r="3.8"/><path d="M4.5 20.5c1.4-3.7 4.2-5.6 7.5-5.6s6.1 1.9 7.5 5.6"/>',
  refresh: '<path d="M20 11.5a8 8 0 1 1-2.6-5.9"/><path d="M20 4v5h-5"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  share: '<path d="M12 3.5v11"/><path d="M8 7.2l4-3.9 4 3.9"/><path d="M8 10.5H6.5A1.5 1.5 0 0 0 5 12v7a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 19 19v-7a1.5 1.5 0 0 0-1.5-1.5H16"/>',
  addHome: '<rect x="4" y="4" width="16" height="16" rx="4.5"/><path d="M12 8.5v7M8.5 12h7"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4 4"/>',
  lock: '<rect x="5" y="11" width="14" height="9.5" rx="2.8"/><path d="M8.5 11V8a3.5 3.5 0 0 1 7 0v3"/>',
  key: '<circle cx="8" cy="15" r="4"/><path d="M11 12l8-8M16.5 6.5l2.3 2.3"/>',
  right: '<path d="M9.5 6l6 6-6 6"/>',
  left: '<path d="M14.5 6l-6 6 6 6"/>',
  x: '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',
  school: '<path d="M3 9.5l9-5 9 5-9 5z"/><path d="M7 12v4.3c0 1.5 2.2 3 5 3s5-1.5 5-3V12"/>',
  eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
  eyeOff: '<path d="M3 3l18 18"/><path d="M10.6 5.6A9.7 9.7 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-3 3.8M6.4 6.9A16.6 16.6 0 0 0 2.5 12S6 18.5 12 18.5c1.6 0 3-.4 4.2-1"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
  send: '<path d="M4.5 11.8L20 4.5l-5.6 15.4-2.7-6.2z"/><path d="M11.7 13.7L20 4.5"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.8h.01"/>',
  out: '<path d="M14.5 4H18a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3.5"/><path d="M9.5 16l-4-4 4-4M5.5 12h10"/>',
  spark: '<path d="M12 3.5l1.9 5.1 5.1 1.9-5.1 1.9L12 17.5l-1.9-5.1L5 10.5l5.1-1.9z"/><path d="M18.5 15.5l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z"/>',
  moon: '<path d="M19.5 14.5A8 8 0 0 1 9.5 4.5a8 8 0 1 0 10 10z"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  tasks: '<rect x="4" y="4" width="16" height="16" rx="4.5"/><path d="M8.2 12.4l2.6 2.6 5-5.4"/>',
  grade: '<path d="M5 20V11M12 20V5M19 20v-6"/>',
};

export const icon = (name, cls = '') =>
  `<svg class="ico ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[name] || ''}</svg>`;

// Fächer: abgestimmte Farbpalette (Farbtöne gleichmäßig verteilt) + eigenes Symbol je Fach.
// Erkannt am Kurznamen (z. B. "M", "BI") oder am Langnamen ("Mathematik", "Biologie").
const SUBJ = [
  [/^(M|MA|MAT)$|mathe/i, 248, '📐'], [/^(D|DE|DEU)$|deutsch/i, 22, '📖'], [/^(E|EN|ENG)$|englisch/i, 330, '💬'],
  [/^(BI|BIO)$|biolog/i, 142, '🧬'], [/^(CH)$|chemie/i, 188, '⚗️'], [/^(PH)$|physik/i, 272, '⚛️'],
  [/^(SP|SPO)$|sport/i, 52, '⚽'], [/^(KU|KUN)$|kunst/i, 300, '🎨'], [/^(MU)$|musik/i, 318, '🎵'],
  [/^(GE|GES)$|geschicht/i, 38, '🏛️'], [/^(EK|ERD|GEO)$|erdkunde|geograf/i, 165, '🌍'],
  [/^(SW|PO|PW|SOWI|WI|POL)$|sozialw|politik|wirtschaft/i, 95, '⚖️'], [/^(IF|INF)$|informatik/i, 212, '💻'],
  [/^(F|FR|FRZ)$|französ/i, 230, '🥐'], [/^(S|SPA|SN)$|spanisch/i, 8, '💃'], [/^(L|LA|LAT)$|latein/i, 64, '🏺'],
  [/^(KR|ER|REL|RK|EV)$|religion/i, 285, '🕊️'], [/^(PL|PHI|PPL)$|philosoph/i, 260, '💭'],
  [/^(PK|PJ|PROJ)$|projekt/i, 118, '🚀'], [/^(PA|PÄ|EW)$|pädagog|erziehung/i, 345, '🧸'], [/^(LI)$|literatur/i, 15, '✒️'],
];
function subjInfo(su, sl = '') {
  const k = String(su || '').toUpperCase().replace(/[^A-ZÄÖÜ]/g, '');
  const long = String(sl || su || '').replace(/\s+(LK|GK)\b.*$/i, '');
  for (const [re, h, e] of SUBJ) if (re.test(k) || re.test(long)) return { h, e };
  let h = 7;
  for (const ch of k || long) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return { h: (h % 12) * 30 + 15, e: '✏️' };
}
export const hue = (su, sl) => subjInfo(su, sl).h;
export const symbol = (su, sl) => subjInfo(su, sl).e;

// ---------- Hinweis oben ----------
let toastTimer;
let held = null; // im Fokus-Modus wartet der Hinweis, bis man fertig ist
export function flushToast() {
  if (!held) return;
  const [msg, ms] = held;
  held = null;
  toast(msg, ms);
}
export function toast(msg, ms = 2600) {
  const el = document.getElementById('toast');
  if (!el) return;
  if (document.querySelector('.learn-page.focus')) { held = [msg, ms]; return; }
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), ms);
}

export const haptic = (ms = 8) => {
  try {
    if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return;
    navigator.vibrate && navigator.vibrate(ms);
  } catch { /* nicht unterstützt */ }
};

// ---------- Konfetti ----------
export function confetti({ x = 0.5, y = 0.38, count = 140 } = {}) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const c = document.getElementById('confetti');
  if (!c) return;
  const ctx = c.getContext('2d');
  const dpr = Math.min(devicePixelRatio || 1, 2);
  const W = innerWidth, H = innerHeight;
  c.width = W * dpr;
  c.height = H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#C8F560';
  const colors = [accent, accent, '#FF9BD2', '#84C5FF', '#FFD34D', '#C6B3FF', '#FFFFFF'];
  const parts = Array.from({ length: count }, () => ({
    x: W * x, y: H * y,
    vx: (Math.random() - 0.5) * 13, vy: -Math.random() * 13 - 3,
    s: 5 + Math.random() * 7, r: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.35,
    c: colors[(Math.random() * colors.length) | 0], dot: Math.random() < 0.4,
  }));
  const t0 = performance.now();
  c.style.display = 'block';
  const tick = (t) => {
    const el = t - t0;
    ctx.clearRect(0, 0, W, H);
    for (const p of parts) {
      p.vy += 0.3;
      p.vx *= 0.985;
      p.x += p.vx;
      p.y += p.vy;
      p.r += p.vr;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.r);
      ctx.globalAlpha = Math.max(0, 1 - el / 2600);
      ctx.fillStyle = p.c;
      if (p.dot) {
        ctx.beginPath();
        ctx.arc(0, 0, p.s / 2, 0, Math.PI * 2);
        ctx.fill();
      } else ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2);
      ctx.restore();
    }
    if (el < 2700) requestAnimationFrame(tick);
    else {
      ctx.clearRect(0, 0, W, H);
      c.style.display = 'none';
    }
  };
  requestAnimationFrame(tick);
}

// ---------- Blatt von unten ----------
export function openSheet(html, { onClose } = {}) {
  closeSheet(true);
  const bg = document.createElement('div');
  bg.className = 'sheet-bg';
  const sh = document.createElement('div');
  sh.className = 'sheet';
  sh.setAttribute('role', 'dialog');
  sh.setAttribute('aria-modal', 'true');
  sh.innerHTML = `<div class="grab" aria-hidden="true"></div>${html}`;
  document.body.append(bg, sh);
  sh._onClose = onClose;
  requestAnimationFrame(() => requestAnimationFrame(() => {
    bg.classList.add('open');
    sh.classList.add('open');
  }));
  bg.addEventListener('click', () => closeSheet());
  let y0 = null;
  let dy = 0;
  sh.addEventListener('touchstart', (e) => { y0 = sh.scrollTop <= 0 ? e.touches[0].clientY : null; dy = 0; }, { passive: true });
  sh.addEventListener('touchmove', (e) => {
    if (y0 == null) return;
    dy = Math.max(0, e.touches[0].clientY - y0);
    sh.style.transition = 'none';
    sh.style.transform = `translateY(${dy}px)`;
  }, { passive: true });
  sh.addEventListener('touchend', () => {
    sh.style.transition = '';
    sh.style.transform = '';
    if (y0 != null && dy > 90) closeSheet();
    y0 = null;
  });
  return sh;
}

/** Inhalt des offenen Blatts austauschen (ohne neu aufzuklappen). */
export function updateSheet(html) {
  const sh = document.querySelector('.sheet');
  if (!sh) return openSheet(html);
  const top = sh.scrollTop;
  sh.innerHTML = `<div class="grab" aria-hidden="true"></div>${html}`;
  sh.scrollTop = top;
  return sh;
}

export function closeSheet(instant = false) {
  const sh = document.querySelector('.sheet');
  const bg = document.querySelector('.sheet-bg');
  if (!sh && !bg) return;
  const done = () => { sh?.remove(); bg?.remove(); };
  sh?._onClose?.();
  if (instant) return done();
  sh?.classList.remove('open');
  bg?.classList.remove('open');
  setTimeout(done, 320);
}

// ---------- Klapptafel (wie am Flughafen) ----------
const FLAP_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÜ0123456789';
const flapSeen = new Set();
export const resetFlaps = () => flapSeen.clear();

/** Jeder Buchstabe ein Klappkärtchen. `slots` füllt mit leeren Kärtchen auf (feste Tafelbreite). */
export function flap(text, cls = '', slots = 0) {
  const t = String(text ?? '').toUpperCase();
  const chars = [...t];
  while (slots && chars.length < slots) chars.push(' ');
  const tiles = chars.map((c) => (c === ' ' ? '<i class="sp"></i>' : `<i>${esc(c)}</i>`)).join('');
  return `<span class="flap ${cls}${slots ? ' slots' : ''}" data-flap="${esc(t)}" style="--n:${chars.length}" role="img" aria-label="${esc(text)}">${tiles}</span>`;
}

function flipTo(tile, target, delay, rounds) {
  let n = rounds;
  setTimeout(function step() {
    if (!tile.isConnected) return;
    if (n-- <= 0) {
      tile.textContent = target;
      tile.classList.remove('flip');
      return;
    }
    tile.textContent = FLAP_CHARS[(Math.random() * FLAP_CHARS.length) | 0];
    tile.classList.remove('flip');
    void tile.offsetWidth;
    tile.classList.add('flip');
    setTimeout(step, 62);
  }, delay);
}

/** Lässt neue Klapptafeln einmal durchblättern (gleiche Texte nicht erneut). */
export function runFlaps(scope = document) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  let k = 0;
  scope.querySelectorAll('.flap').forEach((el) => {
    const key = el.dataset.flap + '|' + el.className;
    if (flapSeen.has(key)) return;
    flapSeen.add(key);
    const d0 = k++ * 140;
    el.querySelectorAll('i').forEach((tile, i) => {
      if (tile.classList.contains('sp') && !el.classList.contains('slots')) return;
      flipTo(tile, tile.textContent, d0 + i * 38, 4 + (i % 4));
    });
  });
}

/** Tafel auf neuen Text umblättern (feste Kärtchenzahl). */
export function flapTo(el, text) {
  const t = [...String(text ?? '').toUpperCase()];
  el.querySelectorAll('i').forEach((tile, i) => {
    const target = t[i] && t[i] !== ' ' ? t[i] : '';
    if (tile.textContent === target) return;
    tile.classList.toggle('sp', !target);
    flipTo(tile, target, i * 42, 3 + (i % 4));
  });
  el.setAttribute('aria-label', text);
}
