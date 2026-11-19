// Punktlandung – Grundlagen: Speicher, Server-Anbindung, Mitteilungen, Zeit.

export const API = 'https://ahgjcjkbkvkyedztyory.supabase.co/functions/v1/punktlandung';
export const VERSION = '1.5.0';

// ---------- Speicher (lokal auf dem Gerät) ----------
const read = (k, fb) => {
  try {
    const v = localStorage.getItem(k);
    return v == null ? fb : JSON.parse(v);
  } catch {
    return fb;
  }
};
const write = (k, v) => {
  try {
    if (v == null) localStorage.removeItem(k);
    else localStorage.setItem(k, JSON.stringify(v));
  } catch { /* privater Modus o. Ä. */ }
};

function idb() {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open('punktlandung', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('kv');
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
async function idbPut(key, value) {
  try {
    const db = await idb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction('kv', 'readwrite');
      if (value == null) tx.objectStore('kv').delete(key);
      else tx.objectStore('kv').put(value, key);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  } catch { /* egal */ }
}

// Farben aus Version 1.0 auf die neuen Namen abbilden.
const OLD_ACCENT = { lime: 'koralle', mint: 'gruen', sky: 'blau', lilac: 'lila', sun: 'sonne' };

export const store = {
  get token() { return read('pl.token', null); },
  set token(v) { write('pl.token', v); idbPut('token', v); },
  get state() { return read('pl.state', null); },
  set state(v) { write('pl.state', v); },
  get prefs() {
    const p = { theme: 'light', accent: 'koralle', nick: '', view: 3, ...read('pl.prefs', {}) };
    p.accent = OLD_ACCENT[p.accent] || p.accent;
    // Ab 1.1.1 ist Hell der Standard (Design B). „Automatisch“ aus der Zeit davor wird zu Hell;
    // wer danach selbst „Automatisch“ oder „Dunkel“ wählt, behält das (themeV wird mitgespeichert).
    if (p.themeV !== 2) {
      if (p.theme === 'auto') p.theme = 'light';
      p.themeV = 2;
    }
    return p;
  },
  set prefs(v) { write('pl.prefs', v); },
  get draft() { return read('pl.draft', {}); },
  set draft(v) { write('pl.draft', v); },
  get grades() { return read('pl.grades', null); },
  set grades(v) { write('pl.grades', v); },
  get lastSeenEvent() { return read('pl.lastSeenEvent', 0); },
  set lastSeenEvent(v) { write('pl.lastSeenEvent', v); },
  clear() {
    for (const k of ['pl.token', 'pl.state', 'pl.draft', 'pl.lastSeenEvent']) write(k, null);
    idbPut('token', null);
  },
};

// ---------- Server ----------
export class ApiError extends Error {
  constructor(message, status = 0, data = {}) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

export async function api(action, data = {}, { auth = true, timeout = 45000 } = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeout);
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (auth && store.token) headers.Authorization = 'Bearer ' + store.token;
    const res = await fetch(API, { method: 'POST', headers, body: JSON.stringify({ action, ...data }), signal: ctrl.signal });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new ApiError(json.error || 'Da ist etwas schiefgelaufen.', res.status, json);
    return json;
  } catch (e) {
    if (e instanceof ApiError) throw e;
    if (e && e.name === 'AbortError') throw new ApiError('Das dauert gerade zu lange. Bitte versuch es gleich noch mal.');
    throw new ApiError(navigator.onLine === false ? 'Du bist gerade offline.' : 'Keine Verbindung zum Server.');
  } finally {
    clearTimeout(timer);
  }
}

// ---------- Gerät & Mitteilungen ----------
const ua = navigator.userAgent;
export const isAndroid = /Android/i.test(ua);
export const isIOS = !isAndroid && (/iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));
export const isStandalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
export const platform = () => (isIOS ? 'ios' : isAndroid ? 'android' : 'desktop');
export const pushSupported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
export const permission = () => ('Notification' in window ? Notification.permission : 'unsupported');

function keyBytes(b64) {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

export async function currentSubscription(vapidKey) {
  if (!pushSupported()) return null;
  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (sub && vapidKey) {
    const want = keyBytes(vapidKey);
    const have = sub.options && sub.options.applicationServerKey ? new Uint8Array(sub.options.applicationServerKey) : null;
    if (!have || have.length !== want.length || have.some((b, i) => b !== want[i])) {
      await sub.unsubscribe().catch(() => {});
      sub = null;
    }
  }
  return sub;
}

/** Fragt (nach Tipp des Nutzers) die Erlaubnis an und meldet das Gerät beim Push-Dienst an. */
export async function enablePush(vapidKey) {
  if (!pushSupported()) {
    throw new Error(isIOS && !isStandalone()
      ? 'Auf dem iPhone klappen Mitteilungen nur, wenn du Punktlandung über den Home-Bildschirm öffnest.'
      : 'Dieser Browser kann leider keine Mitteilungen.');
  }
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') {
    throw new Error(perm === 'denied'
      ? 'Mitteilungen sind blockiert. Erlaube sie in den Einstellungen deines Handys für Punktlandung.'
      : 'Ohne deine Erlaubnis kann Punktlandung dir nichts schicken.');
  }
  const reg = await navigator.serviceWorker.ready;
  let sub = await currentSubscription(vapidKey);
  if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(vapidKey) });
  return sub.toJSON();
}

// ---------- Zeit ----------
export const WD = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
export const WD_LONG = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
const MON = ['Jan.', 'Feb.', 'März', 'Apr.', 'Mai', 'Juni', 'Juli', 'Aug.', 'Sep.', 'Okt.', 'Nov.', 'Dez.'];

export const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const today = () => iso(new Date());
export function parseDay(s) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}
export function addDays(s, n) {
  const d = parseDay(s);
  d.setDate(d.getDate() + n);
  return iso(d);
}
export const weekday = (s) => parseDay(s).getDay();
export const nowMin = () => {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
};
export const hhmm = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
export const daysFromToday = (s) => Math.round((parseDay(s) - parseDay(today())) / 86400000);

export function dayWord(s) {
  const n = daysFromToday(s);
  if (n === 0) return 'Heute';
  if (n === 1) return 'Morgen';
  if (n === 2) return 'Übermorgen';
  if (n === -1) return 'Gestern';
  if (n > 2 && n < 7) return `Am ${WD_LONG[weekday(s)]}`;
  return `Am ${dateShort(s)}`;
}
export function dateLong(s) {
  const d = parseDay(s);
  return `${WD_LONG[d.getDay()]}, ${d.getDate()}. ${MON[d.getMonth()]}`;
}
export function dateShort(s) {
  const d = parseDay(s);
  return `${WD[d.getDay()]}, ${d.getDate()}.${d.getMonth() + 1}.`;
}
export function ago(ts) {
  if (!ts) return 'noch nie';
  const s = (Date.now() - Date.parse(ts)) / 1000;
  if (s < 45) return 'gerade eben';
  if (s < 90) return 'vor 1 Min.';
  if (s < 3600) return `vor ${Math.round(s / 60)} Min.`;
  if (s < 86400) return `vor ${Math.round(s / 3600)} Std.`;
  const d = Math.round(s / 86400);
  return d === 1 ? 'gestern' : `vor ${d} Tagen`;
}
export function until(day, min) {
  const t = parseDay(day);
  t.setMinutes(min);
  const s = (t - Date.now()) / 1000;
  if (s <= 0) return 'läuft';
  if (s < 3600) return `in ${Math.max(1, Math.round(s / 60))} Min.`;
  if (s < 86400) return `in ${Math.round(s / 3600)} Std.`;
  const d = daysFromToday(day);
  return d === 1 ? 'morgen' : `in ${d} Tagen`;
}
export function fmtPeriod(p, short = false) {
  if (!p) return '';
  const parts = String(p).split('–');
  if (parts.every((x) => /^\d+$/.test(x))) return parts.map((x) => x + '.').join('–') + (short ? ' Std.' : ' Stunde');
  return p;
}
