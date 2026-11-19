// Punktlandung – Start, Zustand und Aktionen.
import {
  store, api, ApiError, enablePush, currentSubscription, pushSupported, permission, platform, isIOS, isStandalone,
  today, nowMin,
  addDays, parseDay,
} from './lib.js';
import * as V from './views.js';
import { toast, confetti, openSheet, updateSheet, closeSheet, haptic, runFlaps, resetFlaps, flapTo } from './ui.js';
import { demoState, demoGrades } from './demo.js';
import * as G from './grades.js';

const root = document.getElementById('app');

const S = {
  state: store.state,
  prefs: store.prefs,
  screen: 'boot',
  tab: 'plan',
  day: null,
  busy: {},
  lastSeenEvent: store.lastSeenEvent,
  grades: store.grades || G.empty(),
  add: { sid: null, hj: 0, kind: 'k' },
  ob: { step: 'welcome', query: '', results: [], tooMany: false, searching: false, searchError: '', school: null, mode: 'password', busy: false, error: '', draft: {}, nameGuess: '' },
};
window.__pl = S; // für die Fehlersuche

// ---------- Darstellung ----------
let lastKey = '';
function render() {
  const key = S.screen === 'ob' ? 'ob:' + S.ob.step : S.screen === 'main' ? 'main:' + S.tab : S.screen;
  const changed = key !== lastKey;
  const scrollY = window.scrollY;
  if (changed) {
    resetFlaps();
    clearInterval(S._wTimer);
  }
  if (S.screen === 'main' && S.tab === 'noten') ensureSubjects();
  root.innerHTML = S.screen === 'ob' ? V.onboarding(S) : S.screen === 'main' ? V.main(S) : V.loading();
  root.classList.toggle('enter', changed);
  root.classList.toggle('day-enter', !changed && !!S._dayChanged);
  S._dayChanged = false;
  if (changed) {
    window.scrollTo(0, 0);
    lastKey = key;
    afterEnter();
  } else {
    window.scrollTo(0, scrollY);
  }
  afterRender(changed);
}

function afterRender(changed) {
  runFlaps(root);
  if (S._calAnim) {
    root.querySelector('.cal')?.animate([{ opacity: 0, transform: `translateX(${S._calAnim * 18}px)` }, { opacity: 1, transform: 'none' }], { duration: 260, easing: 'cubic-bezier(.2,.9,.25,1)' });
    S._calAnim = 0;
  }
  if (S.screen === 'main' && S.tab === 'verlauf') markEventsSeen();
}

function afterEnter() {
  if (S.screen === 'ob' && S.ob.step === 'welcome') {
    const dot = root.querySelector('.ob-brand .wm-dot');
    if (dot && !matchMedia('(prefers-reduced-motion: reduce)').matches) dot.style.opacity = '0';
    setTimeout(landDot, 250);
    const rows = root.querySelectorAll('#wboard .flap');
    const foot = root.querySelector('#wboard .wb-foot');
    let i = 0;
    const show = () => {
      if (!rows[0]?.isConnected) return clearInterval(S._wTimer);
      const [a, b, c, title, body] = V.WELCOME_MSGS[i++ % V.WELCOME_MSGS.length];
      flapTo(rows[0], a);
      flapTo(rows[1], b);
      foot.textContent = c;
      const note = root.querySelector('.wnote');
      if (note) {
        note.querySelector('b').textContent = title;
        note.querySelector('p').textContent = body;
        note.classList.remove('pop');
        void note.offsetWidth;
        note.classList.add('pop');
      }
    };
    setTimeout(show, 1100);
    S._wTimer = setInterval(show, 3600);
  }
  if (S.screen === 'ob' && S.ob.step === 'school') setTimeout(() => root.querySelector('[data-in="schoolq"]')?.focus(), 350);
  if (S.screen === 'ob' && S.ob.step === 'done') setTimeout(() => confetti({ y: 0.3 }), 450);
}

/** Der Markenpunkt fliegt im Bogen herein und landet hinter "punktlandung". */
function landDot() {
  const target = root.querySelector('.ob-brand .wm-dot');
  if (!target || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const r = target.getBoundingClientRect();
  const size = r.width;
  const fly = document.createElement('span');
  fly.className = 'fly-dot';
  fly.style.width = fly.style.height = size + 'px';
  document.body.appendChild(fly);
  target.style.opacity = '0';
  const sx = -40, sy = r.top + 140;
  const ex = r.left, ey = r.top;
  const peak = Math.min(sy, ey) - 120;
  const frames = [];
  const N = 16;
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const x = sx + (ex - sx) * t;
    const y = (1 - t) * (1 - t) * sy + 2 * (1 - t) * t * peak + t * t * ey;
    frames.push({ transform: `translate(${x}px, ${y}px)`, offset: t });
  }
  const anim = fly.animate(frames, { duration: 900, easing: 'cubic-bezier(.3,.1,.3,1)', fill: 'forwards' });
  // Spur aus kleinen Punkten
  for (let i = 1; i < 6; i++) {
    setTimeout(() => {
      const t = i / 6;
      const x = sx + (ex - sx) * t;
      const y = (1 - t) * (1 - t) * sy + 2 * (1 - t) * t * peak + t * t * ey;
      const g = document.createElement('span');
      g.className = 'ghost-dot';
      const s = size * (0.3 + t * 0.5);
      g.style.cssText = `width:${s}px;height:${s}px;transform:translate(${x + (size - s) / 2}px, ${y + (size - s) / 2}px)`;
      document.body.appendChild(g);
      setTimeout(() => g.remove(), 900);
    }, 900 * (i / 6) * 0.9);
  }
  anim.onfinish = () => {
    target.style.opacity = '';
    target.animate([{ transform: 'scale(1.5, .6)' }, { transform: 'scale(.9, 1.15)' }, { transform: 'scale(1)' }], { duration: 380, easing: 'ease-out' });
    fly.remove();
    haptic(12);
  };
}

function applyPrefs() {
  const el = document.documentElement;
  const p = S.prefs;
  if (p.theme === 'auto') delete el.dataset.theme;
  else el.dataset.theme = p.theme;
  el.dataset.accent = p.accent || 'lime';
  const dark = p.theme === 'dark' || (p.theme === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.remove());
  const m = document.createElement('meta');
  m.name = 'theme-color';
  m.content = dark ? '#0C0D12' : '#F3F4F8';
  document.head.appendChild(m);
}

function savePrefs(patch) {
  S.prefs = { ...S.prefs, ...patch };
  store.prefs = S.prefs;
  applyPrefs();
}

function setState(st) {
  S.state = st;
  store.state = st;
  updateBadge();
}

function updateBadge() {
  if (!('setAppBadge' in navigator)) return;
  const blocks = S.state?.snapshot?.blocks || [];
  const t = today();
  const n = nowMin();
  const count = blocks.filter((b) => b.st === 'cancel' && (b.d > t || (b.d === t && b.e > n))).length;
  try {
    if (count) navigator.setAppBadge(count);
    else navigator.clearAppBadge();
  } catch { /* egal */ }
}

function markEventsSeen() {
  const maxId = Math.max(0, ...(S.state?.events || []).map((e) => e.id));
  if (maxId > (S.lastSeenEvent || 0)) {
    S.lastSeenEvent = maxId;
    store.lastSeenEvent = maxId;
  }
}

// ---------- Server ----------
async function loadState({ fromFocus = false } = {}) {
  if (S.demo) return;
  try {
    const st = await api('state');
    setState(st);
    if (S.screen === 'main') render();
    const last = st.account?.lastCheckAt ? Date.parse(st.account.lastCheckAt) : 0;
    if (fromFocus && Date.now() - last > 4 * 60_000 && st.account?.status !== 'auth_failed') refresh(true);
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) logoutLocal('Bitte melde dich neu an.');
  }
}

async function refresh(silent = false) {
  if (S.demo) return toast('Vorschau – hier wird nichts bei Untis geprüft.');
  if (S.busy.refresh) return;
  S.busy.refresh = true;
  if (S.screen === 'main') render();
  try {
    const r = await api('refresh');
    setState(r.state);
    if (!silent) {
      if (r.result?.ok === false) toast(r.result.error || 'Untis antwortet gerade nicht.');
      else toast(r.result?.notices ? `${r.result.notices} neue Meldung${r.result.notices > 1 ? 'en' : ''}!` : 'Alles geprüft – nichts Neues.');
    }
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) return logoutLocal('Bitte melde dich neu an.');
    if (!silent) toast(e.message);
  } finally {
    S.busy.refresh = false;
    if (S.screen === 'main') render();
  }
}

/** Hält das Push-Abo dieses Geräts aktuell (z. B. nach Neuinstallation oder neuem Schlüssel). */
async function syncPush() {
  if (S.demo) return;
  try {
    if (!pushSupported() || permission() !== 'granted' || !S.state?.vapidPublicKey) return;
    let sub = await currentSubscription(S.state.vapidPublicKey);
    if (!sub) {
      const reg = await navigator.serviceWorker.ready;
      const raw = atob(S.state.vapidPublicKey.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (S.state.vapidPublicKey.length % 4)) % 4));
      sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: Uint8Array.from(raw, (c) => c.charCodeAt(0)) });
    }
    const last = Number(localStorage.getItem('pl.subSync') || 0);
    if (!S.state.device?.push || Date.now() - last > 86400000) {
      await api('subscribe', { subscription: sub.toJSON(), platform: platform() });
      localStorage.setItem('pl.subSync', String(Date.now()));
      if (!S.state.device?.push) loadState();
    }
  } catch { /* still */ }
}

function logoutLocal(msg) {
  store.clear();
  S.state = null;
  S.screen = 'ob';
  S.ob = { ...S.ob, step: 'welcome', error: '', busy: false };
  render();
  if (msg) toast(msg);
}

// ---------- Schulsuche ----------
let searchTimer;
let searchSeq = 0;
function searchSchools(q) {
  S.ob.query = q;
  clearTimeout(searchTimer);
  const box = () => root.querySelector('#results');
  if (q.trim().length < 3) {
    S.ob.results = [];
    S.ob.tooMany = false;
    S.ob.searchError = '';
    if (box()) box().innerHTML = V.schoolResults(S);
    return;
  }
  S.ob.searching = true;
  searchTimer = setTimeout(async () => {
    const seq = ++searchSeq;
    if (box() && !S.ob.results.length) box().innerHTML = V.schoolResults(S);
    try {
      const r = await api('schools', { q: q.trim() }, { auth: false, timeout: 15000 });
      if (seq !== searchSeq) return;
      S.ob.results = r.schools || [];
      S.ob.tooMany = !!r.tooMany;
      S.ob.searchError = '';
    } catch (e) {
      if (seq !== searchSeq) return;
      S.ob.searchError = e.message;
    }
    S.ob.searching = false;
    if (box()) box().innerHTML = V.schoolResults(S);
  }, 320);
}

function guessName(st, user) {
  const raw = (st?.account?.name || '').trim();
  if (raw.includes(',')) return raw.split(',')[1].trim().split(/\s+/)[0];
  if (raw) return raw.split(/\s+/)[0];
  const u = (user || '').split(/[._-]/)[0];
  return u ? u[0].toUpperCase() + u.slice(1).toLowerCase() : '';
}

// ---------- Kalender & Noten ----------
function stepCal(dir) {
  const d = V.stepDay(S, dir);
  if (!d || (dir < 0 && d === V.visibleDays(S).days[0])) return;
  S.day = d;
  S._calAnim = dir;
  haptic(5);
  render();
}

function saveGrades() {
  if (!S.demo) store.grades = S.grades;
}

/** Fächer beim ersten Öffnen aus dem Stundenplan übernehmen. */
function ensureSubjects() {
  if (S.grades.subjects.length || S.grades._seeded) return;
  const subs = G.subjectsFromBlocks(S.state?.snapshot?.blocks);
  if (!subs.length) return;
  S.grades.subjects = subs;
  S.grades._seeded = true;
  saveGrades();
}

function patchSubject(sid, patch) {
  const s = S.grades.subjects.find((x) => x.id === sid);
  if (!s) return;
  Object.assign(s, patch);
  saveGrades();
  refreshGradeViews();
}

function refreshGradeViews() {
  if (S._openSubject && document.querySelector('.sheet')) updateSheet(V.subjectSheet(S.grades, S._openSubject));
  if (S.screen === 'main' && S.tab === 'noten') render();
}

// Wischen im Kalender blättert vor und zurück.
let touch = null;
document.addEventListener('touchstart', (e) => {
  touch = e.target.closest('.cal-body') && e.touches.length === 1 ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : null;
}, { passive: true });
document.addEventListener('touchend', (e) => {
  if (!touch) return;
  const dx = e.changedTouches[0].clientX - touch.x;
  const dy = e.changedTouches[0].clientY - touch.y;
  touch = null;
  if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.6) stepCal(dx < 0 ? 1 : -1);
}, { passive: true });

// ---------- Aktionen ----------
const actions = {
  setGoal(el) {
    S.grades.goal = Number(el.dataset.v);
    saveGrades();
    haptic(5);
    render();
  },
  start() {
    S.ob.step = isIOS && !isStandalone() ? 'install' : 'school';
    render();
  },
  browserAnyway() { S.ob.step = 'school'; render(); },
  obBack() {
    const order = { install: 'welcome', school: isIOS && !isStandalone() ? 'install' : 'welcome', login: 'school', push: 'login' };
    S.ob.step = order[S.ob.step] || 'welcome';
    S.ob.error = '';
    render();
  },
  pickSchool(el) {
    S.ob.school = S.ob.results[Number(el.dataset.i)];
    S.ob.step = 'login';
    S.ob.error = '';
    haptic();
    render();
    setTimeout(() => root.querySelector('input[name="user"]')?.focus(), 350);
  },
  changeSchool() { S.ob.step = 'school'; render(); },
  mode(el) {
    const user = root.querySelector('input[name="user"]')?.value || '';
    S.ob.draft = { ...S.ob.draft, user };
    S.ob.mode = el.dataset.v;
    S.ob.error = '';
    render();
  },
  togglePw(el) {
    const input = el.parentElement.querySelector('input');
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    el.setAttribute('aria-label', show ? 'Passwort verbergen' : 'Passwort zeigen');
  },
  async connect(form) {
    if (S.ob.busy) return;
    const fd = new FormData(form);
    const user = String(fd.get('user') || '').trim();
    const password = String(fd.get('password') || '');
    const secret = String(fd.get('secret') || '');
    S.ob.draft = { user };
    S.ob.pw = password; // nur im Speicher, damit es nach einem Fehler nicht neu getippt werden muss
    if (!user || (!password && !secret)) {
      S.ob.error = 'Bitte füll beide Felder aus.';
      return render();
    }
    S.ob.busy = true;
    S.ob.error = '';
    render();
    try {
      const sch = S.ob.school;
      const r = await api('connect', {
        server: sch.server, school: sch.school, schoolName: sch.name, user,
        ...(S.ob.mode === 'secret' ? { secret } : { password }), platform: platform(),
      }, { auth: false, timeout: 60000 });
      store.token = r.token;
      S.ob.pw = '';
      setState(r.state);
      S.ob.nameGuess = guessName(r.state, user);
      S.ob.busy = false;
      S.ob.step = pushSupported() && permission() === 'granted' ? 'done' : 'push';
      if (S.ob.step === 'done') await actions.allowPush(null, true);
      render();
    } catch (e) {
      S.ob.busy = false;
      S.ob.error = e.message;
      render();
      root.querySelector('.form')?.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-8px)' }, { transform: 'translateX(8px)' }, { transform: 'translateX(0)' }], { duration: 280 });
    }
  },
  async allowPush(_el, quiet = false) {
    S.ob.busy = true;
    S.ob.error = '';
    if (!quiet) render();
    try {
      const sub = await enablePush(S.state.vapidPublicKey);
      await api('subscribe', { subscription: sub, platform: platform() });
      localStorage.setItem('pl.subSync', String(Date.now()));
      const st = await api('state');
      setState(st);
      S.ob.step = 'done';
    } catch (e) {
      S.ob.error = e.message;
    }
    S.ob.busy = false;
    if (!quiet) render();
  },
  skipPush() { S.ob.step = 'done'; render(); },
  finish() {
    const nick = root.querySelector('[data-in="nick"]')?.value.trim();
    if (nick) savePrefs({ nick });
    S.screen = 'main';
    S.tab = 'plan';
    render();
  },
  tab(el) {
    S.tab = el.dataset.v;
    if (S.tab === 'noten') ensureSubjects();
    haptic(5);
    render();
  },
  day(el) {
    S.day = el.dataset.v;
    if (S.tab !== 'plan') S.tab = 'plan';
    S._calAnim = 1;
    haptic(5);
    render();
  },
  dayOne(el) {
    S.day = el.dataset.v;
    S.tab = 'plan';
    savePrefs({ view: 1 });
    S._calAnim = 1;
    haptic(5);
    render();
  },
  view(el) {
    const v = Number(el.dataset.v);
    if (v === S.prefs.view) return;
    const vis = V.visibleDays(S).days;
    const pref = V.defaultDay({ ...S, day: null });
    S.day = vis.includes(pref) ? pref : vis.includes(S.day) ? S.day : vis[0];
    savePrefs({ view: v });
    S._calAnim = 1;
    haptic(5);
    render();
  },
  step(el) { stepCal(Number(el.dataset.v)); },

  // ---------- Noten ----------
  abiYear() {
    const y0 = G.defaultAbiYear();
    const opts = [y0 - 1, y0, y0 + 1, y0 + 2];
    const i = opts.indexOf(S.grades.abiYear);
    S.grades.abiYear = opts[(i + 1) % opts.length];
    saveGrades();
    toast(`Abiturjahr ${S.grades.abiYear} – jetzt ${G.currentHj(S.grades.abiYear) < 0 ? 'noch vor der Q1' : G.HJ[G.currentHj(S.grades.abiYear)]}`);
    render();
  },
  subject(el) {
    V.confirmDelete(null);
    S._openSubject = el.dataset.v;
    openSheet(V.subjectSheet(S.grades, el.dataset.v), { onClose: () => { S._openSubject = null; } });
  },
  setLk(el) { patchSubject(el.dataset.sid, { lk: el.dataset.v === '1' }); },
  setAbi(el) {
    const n = Number(el.dataset.v);
    if (n) for (const s of S.grades.subjects) if (s.abi === n && s.id !== el.dataset.sid) s.abi = 0;
    patchSubject(el.dataset.sid, { abi: n });
  },
  delExam(el) {
    delete S.grades.exams[el.dataset.sid];
    saveGrades();
    refreshGradeViews();
  },
  delGrade(el) {
    S.grades.entries = S.grades.entries.filter((e) => e.id !== el.dataset.v);
    saveGrades();
    refreshGradeViews();
  },
  delSubject(el) {
    const sid = el.dataset.v;
    if (S._confirmDel !== sid) {
      S._confirmDel = sid;
      V.confirmDelete(sid);
      return refreshGradeViews();
    }
    S._confirmDel = null;
    V.confirmDelete(null);
    S.grades.subjects = S.grades.subjects.filter((s) => s.id !== sid);
    S.grades.entries = S.grades.entries.filter((e) => e.sid !== sid);
    delete S.grades.exams[sid];
    saveGrades();
    closeSheet();
    render();
  },
  addGrade(el) {
    if (!S.grades.subjects.length) return actions.addSubject();
    const cur = G.currentHj(S.grades.abiYear);
    const hj = el?.dataset.hj === 'abi' ? 'abi' : el?.dataset.hj != null ? Number(el.dataset.hj) : Math.max(0, cur);
    S.add = { sid: el?.dataset.sid || S.add.sid || S.grades.subjects[0].id, hj, kind: S.add.kind || 'k' };
    if (!S.grades.subjects.some((s) => s.id === S.add.sid)) S.add.sid = S.grades.subjects[0].id;
    S._fromSubject = el?.dataset.sid || null;
    openSheet(V.addSheet(S.grades, S.add));
  },
  addSet(el) {
    const k = el.dataset.k;
    const v = el.dataset.v;
    S.add[k] = k === 'hj' ? (v === 'abi' ? 'abi' : Number(v)) : v;
    if (k === 'sid' && S.add.hj === 'abi' && !S.grades.subjects.find((s) => s.id === v)?.abi) S.add.hj = Math.max(0, G.currentHj(S.grades.abiYear));
    updateSheet(V.addSheet(S.grades, S.add));
  },
  saveGrade(el) {
    const pts = Number(el.dataset.v);
    const sub = S.grades.subjects.find((s) => s.id === S.add.sid);
    if (!sub) return;
    if (S.add.hj === 'abi') S.grades.exams[sub.id] = pts;
    else S.grades.entries.push({ id: G.uid(), sid: sub.id, hj: S.add.hj, kind: S.add.kind, pts, at: today() });
    saveGrades();
    haptic(12);
    toast(`${sub.name}: ${pts} ${pts === 1 ? 'Punkt' : 'Punkte'} ${S.add.hj === 'abi' ? '(Abi)' : '· ' + G.KIND[S.add.kind]}`);
    if (pts >= 14) setTimeout(() => confetti({ y: 0.5, count: 90 }), 120);
    if (S._fromSubject) {
      openSheet(V.subjectSheet(S.grades, S._fromSubject), { onClose: () => { S._openSubject = null; } });
      S._openSubject = S._fromSubject;
    } else closeSheet();
    render();
  },
  addSubject() { openSheet(V.newSubjectSheet()); setTimeout(() => document.querySelector('.sheet input[name="name"]')?.focus(), 350); },
  saveSubject(form) {
    const name = String(new FormData(form).get('name') || '').trim();
    if (!name) return;
    S.grades.subjects.push({ id: G.uid(), name, su: name.slice(0, 3).toUpperCase(), lk: false, abi: 0 });
    saveGrades();
    closeSheet();
    render();
  },
  lesson(el) {
    const b = S.state?.snapshot?.blocks?.[Number(el.dataset.i)];
    if (!b) return;
    openSheet(V.lessonSheet(b, S.state?.homework));
    if (b.st === 'cancel' && b.d >= today()) setTimeout(() => confetti({ y: 0.55, count: 70 }), 250);
  },
  closeSheet() { closeSheet(); },
  refresh() { refresh(false); },
  relogin() {
    S.screen = 'ob';
    S.ob.step = 'login';
    S.ob.school = { server: S.state?.account?.server, school: S.state?.account?.school, name: S.state?.account?.schoolName };
    S.ob.mode = S.state?.account?.authKind === 'secret' ? 'secret' : 'password';
    S.ob.draft = { user: S.state?.account?.user || '' };
    render();
  },
  async test() {
    if (S.demo) return toast('Vorschau – Test-Nachricht geht nur mit echtem Konto.');
    if (S.busy.test) return;
    S.busy.test = true;
    render();
    try {
      const r = await api('test');
      toast(r.sent ? 'Unterwegs! Schau auf deinen Sperrbildschirm.' : r.errors?.[0] ? `Ging nicht: ${r.errors[0]}` : 'Auf diesem Gerät sind Mitteilungen noch aus.');
    } catch (e) {
      toast(e.message);
    }
    S.busy.test = false;
    render();
  },
  async pushOn() {
    if (S.demo) return toast('Vorschau – Mitteilungen gehen nur mit echtem Konto.');
    S.busy.push = true;
    render();
    try {
      const sub = await enablePush(S.state.vapidPublicKey);
      await api('subscribe', { subscription: sub, platform: platform() });
      localStorage.setItem('pl.subSync', String(Date.now()));
      await loadState();
      toast('Mitteilungen sind an 🎉');
    } catch (e) {
      toast(e.message, 4200);
    }
    S.busy.push = false;
    render();
  },
  async toggleSetting(el) {
    const k = el.dataset.k;
    const on = el.checked;
    if (S.demo) {
      S.state.account.settings = { ...S.state.account.settings, [k]: on };
      return toast(on ? 'Eingeschaltet (Vorschau)' : 'Ausgeschaltet (Vorschau)');
    }
    try {
      const r = await api('settings', { settings: { [k]: on } });
      setState(r.state);
    } catch (e) {
      el.checked = !on;
      toast(e.message);
    }
  },
  theme(el) { savePrefs({ theme: el.dataset.v }); render(); },
  accent(el) { savePrefs({ accent: el.dataset.v }); haptic(); render(); },
  howInstall() { openSheet(V.installSheet()); },
  logout() { openSheet(V.confirmLogoutSheet()); },
  async logoutConfirm() {
    if (S.demo) { closeSheet(); location.href = location.pathname; return; }
    try {
      await api('logout', { everything: true });
    } catch { /* lokal trotzdem abmelden */ }
    try {
      const sub = pushSupported() ? await (await navigator.serviceWorker.ready).pushManager.getSubscription() : null;
      await sub?.unsubscribe();
    } catch { /* egal */ }
    closeSheet();
    logoutLocal('Abgemeldet – alles gelöscht.');
  },

  // ---------- Hausaufgaben ----------
  hwNew(el) {
    const subject = el?.dataset.subject || '';
    S.hw = { id: null, subject, su: el?.dataset.su || '', text: '', remind: 'eve',
      due: subject ? V.nextLessonDay(S, subject, el?.dataset.from || null) : addDays(today(), 1) };
    openSheet(V.hwSheet(S, S.hw));
    setTimeout(() => document.querySelector('.hw-input')?.focus(), 350);
  },
  hwEdit(el) {
    const h = (S.state?.homework || []).find((x) => x.id === el.dataset.v);
    if (!h) return;
    const r = h.remindAt ? new Date(h.remindAt) : null;
    S.hw = { id: h.id, subject: h.subject, su: h.su, text: h.text, due: h.due, remind: !r ? 'none' : r.getHours() >= 12 ? 'eve' : 'morning' };
    openSheet(V.hwSheet(S, S.hw));
  },
  hwSet(el) {
    S.hw.text = document.querySelector('.hw-input')?.value ?? S.hw.text;
    const k = el.dataset.k;
    S.hw[k] = el.dataset.v;
    if (k === 'subject') {
      S.hw.su = el.dataset.su || '';
      if (!S.hw.id) S.hw.due = V.nextLessonDay(S, S.hw.subject);
    }
    haptic(5);
    updateSheet(V.hwSheet(S, S.hw));
  },
  async hwSave() {
    const A = S.hw;
    A.text = (document.querySelector('.hw-input')?.value || '').trim();
    if (!A.subject) return toast('Bitte wähle ein Fach.');
    if (!A.text) return toast('Was ist die Aufgabe?');
    const at = (day, h, m) => { const d = parseDay(day); d.setHours(h, m, 0, 0); return d; };
    let remind = null;
    if (A.remind === 'eve') remind = at(addDays(A.due, -1), 17, 0);
    if (A.remind === 'morning' || (remind && remind < new Date())) remind = at(A.due, 6, 45);
    if (remind && remind < new Date()) remind = null;
    const body = { id: A.id, subject: A.subject, su: A.su, text: A.text, due: A.due, remindAt: remind ? remind.toISOString() : null };
    const msg = remind ? `Gespeichert – Erinnerung ${V.remindLabel(remind)}` : 'Gespeichert';
    if (S.demo) {
      const list = S.state.homework || (S.state.homework = []);
      if (A.id) Object.assign(list.find((x) => x.id === A.id) || {}, body);
      else list.push({ ...body, id: 'd' + Date.now(), done: false });
      list.sort((a, b) => a.due.localeCompare(b.due));
      closeSheet(); render(); return toast(msg);
    }
    try {
      const r = await api(A.id ? 'hwUpdate' : 'hwAdd', body);
      setState(r.state);
      closeSheet();
      render();
      toast(msg);
    } catch (e) { toast(e.message); }
  },
  async hwDone(el) {
    const id = el.dataset.v;
    const h = (S.state?.homework || []).find((x) => x.id === id);
    if (!h) return;
    h.done = true;
    haptic(12);
    el.closest('.hw-item')?.classList.add('gone');
    setTimeout(render, 380);
    toast('Erledigt – stark!');
    if (S.demo) return;
    try { setState((await api('hwUpdate', { id, done: true })).state); } catch (e) { h.done = false; render(); toast(e.message); }
  },
  async hwDelete() {
    const id = S.hw?.id;
    if (!id) return;
    if (S.demo) { S.state.homework = S.state.homework.filter((x) => x.id !== id); closeSheet(); render(); return; }
    try { setState((await api('hwDelete', { id })).state); closeSheet(); render(); toast('Gelöscht'); } catch (e) { toast(e.message); }
  },
};

const inputs = {
  schoolq(el) { searchSchools(el.value); },
  hwDate(el) {
    if (!el.value) return;
    S.hw.text = document.querySelector('.hw-input')?.value ?? S.hw.text;
    S.hw.due = el.value;
    updateSheet(V.hwSheet(S, S.hw));
  },
  nick(el) {
    clearTimeout(inputs._t);
    inputs._t = setTimeout(() => savePrefs({ nick: el.value.trim() }), 300);
  },
};

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]');
  if (!el || el.disabled) return;
  const fn = actions[el.dataset.act];
  if (!fn) return;
  if (el.tagName !== 'INPUT') e.preventDefault();
  fn(el, e);
});
document.addEventListener('input', (e) => {
  const el = e.target.closest('[data-in]');
  if (el && inputs[el.dataset.in]) inputs[el.dataset.in](el, e);
});
document.addEventListener('submit', (e) => {
  const f = e.target.closest('form[data-submit]');
  if (!f) return;
  e.preventDefault();
  actions[f.dataset.submit]?.(f, e);
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeSheet();
});

// ---------- Start ----------
function openFromUrl(url) {
  try {
    const u = new URL(url, location.href);
    if (u.searchParams.has('d')) {
      S.day = u.searchParams.get('d');
      S.tab = 'plan';
    } else if (u.searchParams.has('ich')) S.tab = 'ich';
    else if (u.searchParams.has('noten')) S.tab = 'noten';
  } catch { /* egal */ }
}

async function boot() {
  applyPrefs();
  matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', applyPrefs);
  const demo = new URLSearchParams(location.search).has('demo');
  if ('serviceWorker' in navigator) {
    if (!demo) navigator.serviceWorker.register('./sw.js').catch(() => {});
    // Neue Version installiert → einmal neu laden, damit nicht alte und neue Dateien gemischt laufen.
    const hadController = !!navigator.serviceWorker.controller;
    let reloaded = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!hadController || reloaded) return;
      reloaded = true;
      location.reload();
    });
    navigator.serviceWorker.addEventListener('message', (e) => {
      if (e.data?.type === 'push') loadState();
      if (e.data?.type === 'open') {
        openFromUrl(e.data.url);
        if (S.screen === 'main') render();
        loadState();
      }
    });
  }
  if (location.search) {
    openFromUrl(location.href);
    if (!demo) history.replaceState(null, '', location.pathname);
  }
  if (demo) {
    S.demo = true;
    S.state = demoState();
    S.grades = demoGrades(S.state);
    S.prefs = { ...S.prefs, nick: S.prefs.nick || 'Emil' };
    S.screen = 'main';
    render();
    return;
  }
  if (store.token) {
    S.screen = 'main';
    render();
    await loadState();
    syncPush();
  } else {
    S.screen = 'ob';
    render();
  }
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && store.token && S.screen === 'main') loadState({ fromFocus: true });
  });
  setInterval(() => {
    if (document.visibilityState === 'visible' && S.screen === 'main' && !document.querySelector('.sheet')) render();
  }, 60_000);
}

boot();
