// Punktlandung – Start, Zustand und Aktionen.
import {
  store, api, ApiError, idbGet, enablePush, currentSubscription, pushSupported, permission, platform, isIOS, isStandalone,
  today, nowMin, dayWord,
  addDays, parseDay,
} from './lib.js';
import * as V from './views.js';
import { toast, confetti, openSheet, updateSheet, closeSheet, haptic, runFlaps, resetFlaps, flapTo } from './ui.js';
import { demoState, demoGrades } from './demo.js';
import * as G from './grades.js';
import * as ST from './study.js';
import * as CH from './chat.js';

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
  study: null, // { ai, sets, loading }
  chat: { msgs: [], setId: null, title: '', grades: false, busy: false, draft: '' },
  learn: { mode: 'over', ci: 0, flip: false, onlyOpen: false, qi: 0, pick: null, score: 0, ei: null },
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
  logExams(st);
  updateBadge();
}

/** Klausuren aus dem Plan merken (der Plan reicht nur bis Montag zurück), damit später nach der Note gefragt werden kann. */
function logExams(st) {
  const log = store.examLog;
  let changed = false;
  for (const b of st?.snapshot?.blocks || []) {
    if (b.st !== 'exam') continue;
    const k = `${b.d}|${b.sl}`;
    if (!log[k]) { log[k] = { d: b.d, sl: b.sl }; changed = true; }
  }
  const old = addDays(today(), -60);
  for (const [k, v] of Object.entries(log)) if (v.d < old) { delete log[k]; changed = true; }
  if (changed) store.examLog = log;
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

/** Noch keine Kurse gewählt → einmal pro Start das Auswahl-Blatt zeigen. */
function askCoursesOnce() {
  if (S.demo || S._askedCourses || V.coursesChosen(S) || !V.courseOptions(S).length || document.querySelector('.sheet')) return;
  S._askedCourses = true;
  setTimeout(() => { if (S.screen === 'main' && !document.querySelector('.sheet')) actions.openCourses(); }, 600);
}

/** Beim Noteneintragen: Halbjahr auf eines setzen, in dem das Fach belegt ist (nur-Q1-Fächer → Q1.2). */
function fitHj() {
  const sub = S.grades.subjects.find((s) => s.id === S.add.sid);
  const ok = G.hjsOf(sub);
  if (S.add.hj !== 'abi' && !ok.includes(S.add.hj)) S.add.hj = ok[ok.length - 1];
}

const blockByKey = (k) => (S.state?.snapshot?.blocks || []).find((b) => b.ks?.[0] === k);
const hhmmLocal = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

/** Kalenderdatei (iCalendar): Stunden ohne Ausfälle, Klausuren hervorgehoben, offene Hausaufgaben als Ganztagstermine. */
function buildIcs() {
  const blocks = S.state?.snapshot?.blocks || [];
  if (!blocks.length) return '';
  const esc = (t) => String(t || '').replace(/\\/g, '\\\\').replace(/[,;]/g, (c) => '\\' + c).replace(/\n/g, '\\n');
  const utc = (day, min) => { const d = parseDay(day); d.setHours(0, min, 0, 0); return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, ''); };
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const ev = [];
  for (const b of blocks) {
    if (b.st === 'cancel' || b.d < today()) continue;
    const title = (b.st === 'exam' ? 'Klausur: ' : '') + b.sl;
    ev.push(['BEGIN:VEVENT', `UID:pl-${b.ks[0].replace(/[^A-Za-z0-9]/g, '')}@punktlandung`, `DTSTAMP:${stamp}`,
      `DTSTART:${utc(b.d, b.s)}`, `DTEND:${utc(b.d, b.e)}`, `SUMMARY:${esc(title)}`,
      b.ro.length ? `LOCATION:${esc('Raum ' + b.ro.join(', '))}` : '',
      b.notes.length || b.info ? `DESCRIPTION:${esc([...b.notes, b.info].filter(Boolean).join(' · '))}` : '',
      b.st === 'exam' ? 'BEGIN:VALARM\r\nACTION:DISPLAY\r\nDESCRIPTION:Klausur morgen\r\nTRIGGER:-PT15H\r\nEND:VALARM' : '',
      'END:VEVENT'].filter(Boolean).join('\r\n'));
  }
  for (const h of S.state?.homework || []) {
    if (h.done) continue;
    const d = h.due.replace(/-/g, '');
    const e = addDays(h.due, 1).replace(/-/g, '');
    ev.push(['BEGIN:VEVENT', `UID:pl-hw-${h.id}@punktlandung`, `DTSTAMP:${stamp}`, `DTSTART;VALUE=DATE:${d}`, `DTEND;VALUE=DATE:${e}`,
      `SUMMARY:${esc('HA ' + h.subject.replace(/\s+(LK|GK)$/i, '') + ': ' + h.text)}`, 'END:VEVENT'].join('\r\n'));
  }
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Punktlandung//DE', 'CALSCALE:GREGORIAN', 'X-WR-CALNAME:Punktlandung', ...ev, 'END:VCALENDAR'].join('\r\n') + '\r\n';
}

// ---------- 1.8: Lernen ----------
function chatScroll() {
  requestAnimationFrame(() => {
    const sh = document.querySelector('.sheet');
    if (sh) sh.scrollTop = sh.scrollHeight;
  });
}
async function chatSendText(q) {
  const C = S.chat;
  if (C.busy || !q) return;
  C.msgs.push({ role: 'user', content: q });
  C.busy = true;
  C.draft = '';
  CH.saveChat(C.setId, C.msgs);
  updateSheet(CH.chatSheet(S));
  chatScroll();
  let answer;
  if (S.demo) {
    await new Promise((r) => setTimeout(r, 700));
    answer = { text: 'Das ist die **Vorschau** – mit echtem Konto antworte ich hier richtig.\n- Ich kenne deinen Stundenplan, deine Hausaufgaben und Klausuren\n- Noten nur, wenn du sie oben mitschickst' };
  } else {
    try {
      answer = await api('chat', {
        messages: C.msgs.map((m) => ({ role: m.role, content: m.content })),
        setId: C.setId,
        ...(C.grades && !C.setId ? { grades: CH.gradesText(S.grades) } : {}),
      }, { timeout: 120000 });
    } catch (e) {
      answer = null;
      toast(e.message, 4000);
      C.msgs.pop();
      C.draft = q;
    }
  }
  if (answer) C.msgs.push({ role: 'assistant', content: answer.text, web: !!answer.web });
  C.busy = false;
  CH.saveChat(C.setId, C.msgs);
  if (document.querySelector('.chat-sheet')) {
    updateSheet(CH.chatSheet(S));
    chatScroll();
  }
}

const curSet = () => S.study?.sets?.find((x) => x.id === S._studyOpen);
function refreshSetSheet() {
  if (S._studyOpen && document.querySelector('.study-sheet')) updateSheet(ST.setSheet(S, curSet(), V));
}
function setStudy(r) {
  S.study = { ai: !!r.ai, sets: r.sets || [], loading: false };
  if (S.screen === 'main' && S.tab === 'aufgaben' && !document.querySelector('.sheet')) render();
  refreshSetSheet();
  pollStudy();
}
async function loadStudy() {
  if (S.demo) {
    if (!S.study) S.study = ST.demoStudy(S.state?.snapshot?.blocks || []);
    return;
  }
  if (!S.study) S.study = { ai: false, sets: [], loading: true };
  try { setStudy(await api('studyList')); } catch (e) { S.study.loading = false; if (!(e instanceof ApiError && e.status === 401)) toast(e.message); }
}
let studyTimer = null;
function pollStudy() {
  const working = S.study?.sets?.some((x) => x.status === 'working');
  if (!working || studyTimer || S.demo) return;
  studyTimer = setTimeout(async () => {
    studyTimer = null;
    const was = new Set(S.study.sets.filter((x) => x.status === 'working').map((x) => x.id));
    await loadStudy();
    for (const x of S.study.sets) {
      if (!was.has(x.id) || x.status === 'working') continue;
      haptic(15);
      toast(x.status === 'ready' ? `Lernhilfe für ${x.material?.topic || x.subject} ist fertig 🎉` : x.error || 'Lernhilfe ging schief.', 3800);
    }
  }, 4000);
}
const learnReset = () => { S.learn = { mode: S.learn.mode || 'over', ci: 0, flip: false, onlyOpen: false, qi: 0, pick: null, score: 0, ei: null }; };

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

// Ganz oben im Plan nach unten ziehen → bei Untis nachschauen.
let pull = null;
const pullEl = document.createElement('div');
pullEl.className = 'pull';
document.body.append(pullEl);
document.addEventListener('touchstart', (e) => {
  pull = S.screen === 'main' && S.tab === 'plan' && !S.demo && window.scrollY <= 0 && e.touches.length === 1 && !e.target.closest('.sheet')
    ? { y: e.touches[0].clientY, d: 0 } : null;
}, { passive: true });
document.addEventListener('touchmove', (e) => {
  if (!pull) return;
  pull.d = Math.max(0, e.touches[0].clientY - pull.y);
  const p = Math.min(1, pull.d / 90);
  pullEl.style.setProperty('--p', p.toFixed(2));
  pullEl.classList.toggle('show', pull.d > 12);
  pullEl.classList.toggle('ready', pull.d > 90);
  pullEl.textContent = pull.d > 90 ? 'Loslassen zum Prüfen' : 'Ziehen zum Prüfen';
}, { passive: true });
document.addEventListener('touchend', () => {
  if (!pull) return;
  const go = pull.d > 90;
  pull = null;
  pullEl.classList.remove('show', 'ready');
  if (go) { haptic(10); refresh(false); }
}, { passive: true });

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
    askCoursesOnce();
  },
  tab(el) {
    S.tab = el.dataset.v;
    if (S.tab === 'aufgaben') loadStudy();
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
    fitHj();
    S._fromSubject = el?.dataset.sid || null;
    openSheet(V.addSheet(S.grades, S.add));
  },
  addSet(el) {
    const k = el.dataset.k;
    const v = el.dataset.v;
    S.add[k] = k === 'hj' ? (v === 'abi' ? 'abi' : Number(v)) : v;
    if (k === 'sid' && S.add.hj === 'abi' && !S.grades.subjects.find((s) => s.id === v)?.abi) S.add.hj = Math.max(0, G.currentHj(S.grades.abiYear));
    if (k === 'sid') fitHj();
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
  // ---------- 1.9: Chat ----------
  chatOpen(el) {
    const setId = el?.dataset.set || null;
    const set = setId ? S.study?.sets?.find((x) => x.id === setId) : null;
    S.chat = { ...S.chat, setId, title: set ? `Fragen zu ${set.material?.topic || set.subject}` : '', msgs: CH.loadChat(setId), busy: false, draft: '' };
    if (!S.study && !S.demo) loadStudy();
    openSheet(CH.chatSheet(S), { onClose: () => { S.chat.busy = false; } });
    chatScroll();
  },
  chatAsk(el) { chatSendText(el.dataset.v); },
  chatSend(form) {
    const q = String(new FormData(form).get('q') || '').trim();
    if (q) chatSendText(q);
  },
  chatClear() {
    S.chat.msgs = [];
    CH.saveChat(S.chat.setId, []);
    updateSheet(CH.chatSheet(S));
  },
  chatGrades(el) { S.chat.grades = el.checked; },

  // ---------- 1.8: Lernen für Klausuren ----------
  studyNew(el) {
    S.newSet = { subject: el?.dataset.subject || '', su: el?.dataset.su || '', title: '', examDate: el?.dataset.date || '' };
    openSheet(ST.newSetSheet(S, S.newSet));
  },
  studySet(el) {
    S.newSet.subject = el.dataset.v;
    S.newSet.su = el.dataset.su || '';
    updateSheet(ST.newSetSheet(S, S.newSet));
  },
  async studyCreate() {
    const A = S.newSet;
    if (!A?.subject || S.busy.study) return;
    if (S.demo) {
      const id = 'demo' + Date.now();
      S.study.sets.unshift({ id, subject: A.subject, su: A.su, title: A.title, examDate: A.examDate || null, status: 'new', docs: [], material: null });
      return actions.studyOpen({ dataset: { v: id } });
    }
    S.busy.study = true;
    updateSheet(ST.newSetSheet(S, A));
    try {
      const r = await api('studyCreate', { subject: A.subject, su: A.su, title: A.title, examDate: A.examDate });
      S.busy.study = false;
      setStudy(r);
      actions.studyOpen({ dataset: { v: r.id } });
    } catch (e) {
      S.busy.study = false;
      updateSheet(ST.newSetSheet(S, A));
      toast(e.message);
    }
  },
  studyOpen(el) {
    S._studyOpen = el.dataset.v;
    S._studyDel = null;
    learnReset();
    S.learn.mode = 'over';
    openSheet(ST.setSheet(S, curSet(), V), { onClose: () => { S._studyOpen = null; if (S.tab === 'aufgaben') render(); } });
  },
  studyUpload() {
    const set = curSet();
    if (!set || S.busy.upload) return;
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = 'image/*,application/pdf,text/plain,.pdf,.txt';
    input.onchange = async () => {
      const files = [...(input.files || [])];
      let done = 0;
      for (const f of files) {
        S.busy.upload = `Lade ${done + 1} von ${files.length} …`;
        refreshSetSheet();
        try {
          const doc = await ST.prepareFile(f);
          if (S.demo) set.docs.push({ id: 'd' + Date.now() + done, name: doc.name, mime: doc.mime, size: Math.round(doc.data.length * 0.75) });
          else setStudy(await api('studyUpload', { setId: set.id, ...doc }, { timeout: 120000 }));
          done++;
        } catch (e) {
          toast(e.message, 4000);
        }
      }
      S.busy.upload = null;
      refreshSetSheet();
      if (done) toast(`${done} ${done === 1 ? 'Dokument' : 'Dokumente'} hochgeladen${S.study?.ai ? ' – jetzt „Lernhilfe mit KI erstellen“' : ''}.`, 3200);
    };
    input.click();
  },
  async studyDocDel(el) {
    const set = curSet();
    if (S.demo) { set.docs = set.docs.filter((d) => d.id !== el.dataset.v); return refreshSetSheet(); }
    try { setStudy(await api('studyDocDelete', { id: el.dataset.v })); } catch (e) { toast(e.message); }
  },
  async studyGen() {
    const set = curSet();
    if (!set) return;
    if (S.demo) return toast('Vorschau – die KI läuft nur mit echtem Konto.');
    try {
      setStudy(await api('studyGenerate', { id: set.id }, { timeout: 30000 }));
      haptic(10);
    } catch (e) { toast(e.message, 4000); }
  },
  async studyDel(el) {
    const id = el.dataset.v;
    if (S._studyDel !== id) { S._studyDel = id; return refreshSetSheet(); }
    S._studyDel = null;
    try { localStorage.removeItem('pl.study.' + id); } catch { /* egal */ }
    if (S.demo) S.study.sets = S.study.sets.filter((x) => x.id !== id);
    else { try { setStudy(await api('studyDelete', { id })); } catch (e) { return toast(e.message); } }
    closeSheet();
    render();
  },
  learnMode(el) {
    learnReset();
    S.learn.mode = el.dataset.v;
    haptic(5);
    refreshSetSheet();
  },
  cardFlip() { S.learn.flip = !S.learn.flip; haptic(5); refreshSetSheet(); },
  cardKnown() {
    const set = curSet();
    const order = ST.cardOrder(set, S.learn.onlyOpen);
    const pos = Math.min(S.learn.ci, order.length - 1);
    const p = ST.progress(set.id);
    if (!p.known.includes(order[pos])) p.known.push(order[pos]);
    ST.saveProgress(set.id, p);
    S.learn.flip = false;
    if (!S.learn.onlyOpen) S.learn.ci = pos + 1 >= order.length ? 0 : pos + 1;
    else if (pos >= order.length - 1) S.learn.ci = 0;
    if (p.known.length >= (set.material?.cards?.length || 0)) confetti({ y: 0.5, count: 80 });
    haptic(10);
    refreshSetSheet();
  },
  cardAgain() {
    const set = curSet();
    const order = ST.cardOrder(set, S.learn.onlyOpen);
    const p = ST.progress(set.id);
    const pos = Math.min(S.learn.ci, order.length - 1);
    p.known = p.known.filter((i) => i !== order[pos]);
    ST.saveProgress(set.id, p);
    S.learn.flip = false;
    const n = ST.cardOrder(set, S.learn.onlyOpen).length;
    S.learn.ci = S.learn.onlyOpen ? (pos + 1 < n ? pos + 1 : 0) : (pos + 1) % Math.max(1, n);
    refreshSetSheet();
  },
  cardsOnlyOpen(el) { S.learn.onlyOpen = el.checked; S.learn.ci = 0; S.learn.flip = false; refreshSetSheet(); },
  cardsReset() {
    const set = curSet();
    const p = ST.progress(set.id);
    p.known = [];
    ST.saveProgress(set.id, p);
    S.learn.ci = 0;
    S.learn.flip = false;
    refreshSetSheet();
  },
  quizPick(el) {
    if (S.learn.pick != null) return;
    const q = curSet().material.quiz[S.learn.qi];
    S.learn.pick = Number(el.dataset.v);
    if (S.learn.pick === q.correct) { S.learn.score++; haptic(10); } else haptic(25);
    refreshSetSheet();
  },
  quizNext() {
    const set = curSet();
    S.learn.qi++;
    S.learn.pick = null;
    if (S.learn.qi >= set.material.quiz.length) {
      const p = ST.progress(set.id);
      p.best = Math.max(p.best ?? 0, S.learn.score);
      ST.saveProgress(set.id, p);
      if (S.learn.score === set.material.quiz.length) setTimeout(() => confetti({ y: 0.5, count: 110 }), 150);
    }
    refreshSetSheet();
  },
  quizRestart() { S.learn.qi = 0; S.learn.pick = null; S.learn.score = 0; refreshSetSheet(); },
  examOpen(el) { S.learn.ei = Number(el.dataset.v); refreshSetSheet(); },
  examBack() { S.learn.ei = null; refreshSetSheet(); },
  async examCheck() {
    const set = curSet();
    const i = S.learn.ei;
    const answer = (document.querySelector('.exam-input')?.value || '').trim();
    if (answer.length < 3) return toast('Schreib erst eine Antwort.');
    const p = ST.progress(set.id);
    p.answers[i] = answer;
    ST.saveProgress(set.id, p);
    if (S.demo) {
      p.results[i] = { points: 10, verdict: 'Solide Antwort mit klarer Struktur (Vorschau).', good: ['Richtige Fachbegriffe'], missing: ['Ein konkretes Beispiel aus dem Material'], tip: 'Beim Operator „assess“ brauchst du ein begründetes eigenes Urteil am Ende.' };
      ST.saveProgress(set.id, p);
      return refreshSetSheet();
    }
    S.busy.check = true;
    refreshSetSheet();
    try {
      const r = await api('studyCheck', { id: set.id, index: i, answer }, { timeout: 90000 });
      const q = ST.progress(set.id);
      q.results[i] = r;
      ST.saveProgress(set.id, q);
      if (r.points >= 13) setTimeout(() => confetti({ y: 0.5, count: 80 }), 150);
    } catch (e) { toast(e.message, 4000); }
    S.busy.check = false;
    refreshSetSheet();
  },

  // ---------- 1.7: Lernen, Teilen, Kalender, Countdown ----------
  async examStudy(el) {
    const b = blockByKey(el.dataset.i);
    if (!b) return;
    const list = S.state?.homework || [];
    if (list.some((h) => !h.done && h.subject === b.sl && h.due === b.d && /lernen/i.test(h.text))) return toast('Die Lern-Erinnerung gibt es schon.');
    const at = (day, h, m) => { const d = parseDay(day); d.setHours(h, m, 0, 0); return d; };
    let remind = at(addDays(b.d, -3), 17, 0);
    if (remind < new Date()) remind = at(addDays(b.d, -1), 17, 0);
    if (remind < new Date()) remind = null;
    const body = { subject: b.sl, su: b.su, text: 'Für die Klausur lernen', due: b.d, remindAt: remind ? remind.toISOString() : null };
    const msg = remind ? `Erinnerung ${V.remindLabel(remind)} – steht jetzt unter Aufgaben` : 'Steht jetzt unter Aufgaben';
    if (S.demo) {
      list.push({ ...body, id: 'd' + Date.now(), done: false });
      S.state.homework = list;
    } else {
      try { setState((await api('hwAdd', body)).state); } catch (e) { return toast(e.message); }
    }
    closeSheet();
    haptic(12);
    render();
    toast(msg, 3200);
  },
  async shareCancel(el) {
    const b = blockByKey(el.dataset.i);
    if (!b) return;
    const w0 = dayWord(b.d);
    const w = /^(Heute|Morgen|Übermorgen)$/.test(w0) ? w0.toLowerCase() : w0.replace(/^Am /, 'am ');
    const when = `${w}${b.p ? ` in der ${b.p.replace(/(\d+)/g, '$1.')} Stunde` : ` um ${hhmmLocal(b.s)}`}`;
    const text = `${b.sl} fällt ${when} aus (laut Untis)${b.info ? ` – ${b.info}` : ''}.`;
    try {
      if (navigator.share) await navigator.share({ text: text + ' – gesehen mit Punktlandung', url: location.origin + location.pathname });
      else { await navigator.clipboard.writeText(text); toast('Text kopiert – jetzt einfach einfügen.'); }
    } catch (e) { if (e?.name !== 'AbortError') toast('Teilen ging nicht.'); }
  },
  async exportIcs() {
    const ics = buildIcs();
    if (!ics) return toast('Noch kein Stundenplan geladen.');
    const file = new File([ics], 'punktlandung.ics', { type: 'text/calendar' });
    try {
      if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], title: 'Punktlandung – Stundenplan' });
      else {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(file);
        a.download = 'punktlandung.ics';
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      }
      toast('Öffne die Datei und tippe „Alle hinzufügen“. Ausfälle sind schon herausgenommen.', 4200);
    } catch (e) { if (e?.name !== 'AbortError') toast('Export ging nicht: ' + (e?.message || e)); }
  },
  abiDate() { openSheet(V.abiDateSheet(S.grades)); },
  abiDateClear() {
    delete S.grades.abiDate;
    saveGrades();
    closeSheet();
    render();
  },

  // ---------- Noten sichern ----------
  async backup() {
    const data = { app: 'punktlandung', v: 1, at: new Date().toISOString(), grades: S.grades };
    const name = `punktlandung-noten-${today()}.json`;
    const file = new File([JSON.stringify(data, null, 1)], name, { type: 'application/json' });
    try {
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Punktlandung – Noten' });
      } else {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(file);
        a.download = name;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      }
      savePrefs({ lastBackup: today() });
      toast('Gesichert – heb die Datei gut auf (z. B. in „Dateien“ oder iCloud).', 3800);
      render();
    } catch (e) {
      if (e?.name !== 'AbortError') toast('Sichern ging nicht: ' + (e?.message || e));
    }
  },
  restore() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.onchange = async () => {
      const f = input.files?.[0];
      if (!f) return;
      try {
        const d = JSON.parse(await f.text());
        const g = d?.grades;
        if (d?.app !== 'punktlandung' || !Array.isArray(g?.subjects) || !Array.isArray(g?.entries)) throw new Error('Das ist keine Punktlandung-Sicherung.');
        localStorage.setItem('pl.grades.prev', JSON.stringify(S.grades));
        S.grades = { ...G.empty(), ...g, exams: g.exams || {} };
        saveGrades();
        toast(`Wiederhergestellt: ${g.subjects.length} Fächer, ${g.entries.length} Noten (Stand ${String(d.at || '').slice(0, 10)}).`, 4000);
        S.tab = 'noten';
        render();
      } catch (e) {
        toast(e.message || 'Datei konnte nicht gelesen werden.', 4000);
      }
    };
    input.click();
  },
  examGrade(el) {
    const sub = S.grades.subjects.find((s) => s.id === el.dataset.sid);
    if (!sub) return;
    S.add = { sid: sub.id, hj: Math.max(0, G.currentHj(S.grades.abiYear)), kind: 'k' };
    fitHj();
    S._fromSubject = null;
    openSheet(V.addSheet(S.grades, S.add));
  },
  examSkip(el) {
    S.grades.examSkip = { ...(S.grades.examSkip || {}), [el.dataset.v]: 1 };
    saveGrades();
    render();
  },

  // ---------- Besondere Lernleistung ----------
  bllOpen() {
    if (!S.grades.bll?.on) {
      S.grades.bll = { on: true, title: S.grades.bll?.title || '', pts: S.grades.bll?.pts ?? null };
      saveGrades();
      render();
    }
    openSheet(V.bllSheet(S.grades));
  },
  bllPts(el) {
    S.grades.bll.pts = el.dataset.v === '' ? null : Number(el.dataset.v);
    saveGrades();
    haptic(10);
    updateSheet(V.bllSheet(S.grades));
    render();
  },
  bllRemove() {
    S.grades.bll = { ...S.grades.bll, on: false };
    saveGrades();
    closeSheet();
    toast('Besondere Lernleistung entfernt');
    render();
  },
  addSubject() {
    S.newSub = { name: '', q1: true };
    openSheet(V.newSubjectSheet(S.newSub));
    setTimeout(() => document.querySelector('.sheet input[name="name"]')?.focus(), 350);
  },
  subjIdea(el) {
    const input = document.querySelector('.sheet input[name="name"]');
    if (input) input.value = el.dataset.v;
    haptic(5);
  },
  newQ1(el) {
    S.newSub = { name: document.querySelector('.sheet input[name="name"]')?.value || '', q1: el.dataset.v === '1' };
    updateSheet(V.newSubjectSheet(S.newSub));
  },
  setQ1(el) {
    patchSubject(el.dataset.sid, { q1: el.dataset.v === '1' });
  },
  saveSubject(form) {
    const name = String(new FormData(form).get('name') || '').trim();
    if (!name) return;
    S.grades.subjects.push({ id: G.uid(), name, su: name.slice(0, 3).toUpperCase(), lk: false, abi: 0, q1: S.newSub?.q1 !== false, manual: true });
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
  // ---------- 1.5: Kurswahl ----------
  openCourses() {
    S.cs = V.coursesChosen(S) ? [...S.state.account.settings.courses] : V.defaultCourses(S);
    S._askedCourses = true;
    openSheet(V.coursesSheet(S, S.cs));
  },
  courseToggle(el) {
    const su = el.dataset.v;
    S.cs = el.checked ? [...new Set([...S.cs, su])] : S.cs.filter((x) => x !== su);
    haptic(5);
    const btn = document.querySelector('.courses-sheet [data-act="saveCourses"]');
    if (btn) {
      btn.disabled = !S.cs.length;
      btn.textContent = `${S.cs.length} ${S.cs.length === 1 ? 'Kurs' : 'Kurse'} übernehmen`;
    }
  },
  async saveCourses() {
    if (S.busy.courses || !S.cs?.length) return;
    const opts = V.courseOptions(S);
    const chosen = opts.filter((c) => S.cs.includes(c.su));
    if (S.demo) {
      S.state.account.settings = { ...S.state.account.settings, courses: [...S.cs] };
      S.state.snapshot.blocks = S.state.snapshot.blocks.filter((b) => S.cs.includes(b.su));
    } else {
      S.busy.courses = true;
      updateSheet(V.coursesSheet(S, S.cs));
      try {
        const r = await api('settings', { settings: { courses: S.cs } }, { timeout: 60000 });
        setState(r.state);
      } catch (e) {
        S.busy.courses = false;
        updateSheet(V.coursesSheet(S, S.cs));
        return toast(e.message);
      }
      S.busy.courses = false;
    }
    G.syncSubjects(S.grades, chosen.filter((c) => !c.ag));
    saveGrades();
    closeSheet();
    haptic(12);
    toast(`Gespeichert – ab jetzt nur noch deine ${chosen.length} Kurse.`);
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
    S.hw = { id: null, subject, su: el?.dataset.su || '', text: '', remind: 'eve', from: el?.dataset.from || null,
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
      if (!S.hw.id) S.hw.due = V.nextLessonDay(S, S.hw.subject, S.hw.from);
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
  openHistory() {
    openSheet(V.historySheet(S));
    markEventsSeen();
  },
  async hwUndo(el) {
    const id = el.dataset.v;
    const h = (S.state?.homework || []).find((x) => x.id === id);
    if (!h) return;
    h.done = false;
    render();
    if (S.demo) return;
    try { setState((await api('hwUpdate', { id, done: false })).state); render(); } catch (e) { h.done = true; render(); toast(e.message); }
  },
  async hwDelete() {
    const id = S.hw?.id;
    if (!id) return;
    if (S.demo) { S.state.homework = S.state.homework.filter((x) => x.id !== id); closeSheet(); render(); return; }
    try { setState((await api('hwDelete', { id })).state); closeSheet(); render(); toast('Gelöscht'); } catch (e) { toast(e.message); }
  },
};

const inputs = {
  studyTitle(el) { if (S.newSet) S.newSet.title = el.value; },
  studyDate(el) { if (S.newSet) S.newSet.examDate = el.value; },
  examAnswer(el) {
    const set = curSet();
    if (!set || S.learn.ei == null) return;
    const p = ST.progress(set.id);
    p.answers[S.learn.ei] = el.value;
    ST.saveProgress(set.id, p);
  },
  abiDate(el) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(el.value)) return;
    S.grades.abiDate = el.value;
    saveGrades();
    render();
  },
  bllTitle(el) {
    S.grades.bll.title = el.value.trim();
    saveGrades();
  },
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
  // Im Chat: Enter schickt, Umschalt+Enter macht eine neue Zeile.
  if (e.key === 'Enter' && !e.shiftKey && e.target.matches?.('.chat-input textarea')) {
    e.preventDefault();
    e.target.form?.requestSubmit();
  }
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
    else if (u.searchParams.has('hw') || u.searchParams.has('aufgaben')) S.tab = 'aufgaben';
    else if (u.searchParams.get('neu') === 'hw') { S.tab = 'aufgaben'; S._newHw = true; }
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
  if (!demo && !store.grades) {
    const g = await idbGet('grades');
    if (g?.subjects?.length) {
      S.grades = g;
      store.grades = g;
    }
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
    if (S._newHw) { S._newHw = false; actions.hwNew({ dataset: {} }); }
    if (S.tab === 'aufgaben') loadStudy();
    syncPush();
    askCoursesOnce();
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

// Statusleiste abdecken, sobald gescrollt wird (sonst laufen Inhalte unter Uhrzeit und Akku durch).
addEventListener('scroll', () => document.documentElement.classList.toggle('scrolled', scrollY > 24), { passive: true });

boot();
