// Punktlandung – Beispieldaten für die Vorschau (Aufruf mit ?demo). Spricht nicht mit Untis.
import { today, addDays, weekday, hhmm, dayWord, fmtPeriod } from './lib.js';
import { uid, defaultAbiYear } from './grades.js';

const U = { 1: [480, 525], 2: [530, 575], 3: [595, 640], 4: [645, 690], 5: [710, 755], 6: [760, 805], 7: [825, 870], 8: [875, 920] };
const WEEK = [
  // Mo … Fr: [Kurzname, Fach, Raum, Lehrkraft, ab Stunde]
  [['E', 'Englisch LK', 'A12', 'MÜL', 1], ['M', 'Mathematik', 'B03', 'SCH', 3], ['BI', 'Biologie', 'N1', 'KRA', 5]],
  [['D', 'Deutsch', 'A04', 'BEC', 1], ['SP', 'Sport LK', 'TH1', 'WEB', 3], ['EK', 'Erdkunde', 'B11', 'HOF', 5]],
  [['M', 'Mathematik', 'B03', 'SCH', 1], ['E', 'Englisch LK', 'A12', 'MÜL', 3], ['KU', 'Kunst', 'K1', 'LAN', 5], ['PK', 'Projektkurs', 'A21', 'MÜL', 7]],
  [['KR', 'Religion', 'A07', 'PAU', 1], ['SP', 'Sport LK', 'TH1', 'WEB', 3], ['D', 'Deutsch', 'A04', 'BEC', 5]],
  [['BI', 'Biologie', 'N1', 'KRA', 1], ['E', 'Englisch LK', 'A12', 'MÜL', 3], ['M', 'Mathematik', 'B03', 'SCH', 5]],
];

export function demoState() {
  const t = today();
  const wd = weekday(t);
  const mon = addDays(t, wd === 0 ? 1 : wd === 6 ? 2 : 1 - wd);
  const blocks = [];
  for (let w = 0; w < 2; w++) {
    for (let d = 0; d < 5; d++) {
      const day = addDays(mon, w * 7 + d);
      for (const [su, sl, ro, te, p] of WEEK[d]) {
        blocks.push({ ks: [`${day}|${p}`, `${day}|${p + 1}`], d: day, s: U[p][0], e: U[p + 1][1], p: `${p}–${p + 1}`, su, sl, te: [te], ro: [ro], kl: ['Q2'], st: 'ok', notes: [] });
      }
    }
  }
  const find = (day, p) => blocks.find((b) => b.d === day && b.p.startsWith(String(p)));
  const next = (n) => {
    let d = t;
    for (let i = 0; i < n;) { d = addDays(d, 1); if (weekday(d) % 6) i++; }
    return d;
  };
  const tomorrow = wd >= 1 && wd <= 4 ? addDays(t, 1) : next(1);
  const set = (b, patch) => b && Object.assign(b, patch);
  set(find(tomorrow, 1), { st: 'cancel', info: 'Lehrkraft krank' });
  set(find(next(2), 5), { st: 'cancel', info: 'Aufgaben auf Moodle' });
  set(find(next(6), 5), { st: 'cancel' });
  set(find(wd >= 1 && wd <= 5 ? t : next(1), 3), { st: 'change', ro: ['B12'], notes: ['Raum B12 statt ' + (find(wd >= 1 && wd <= 5 ? t : next(1), 3)?.ro[0] || 'A12')] });
  set(find(next(4), 5), { st: 'exam', lt: 'Klausur Q2.1' });
  return demoBuild(blocks, mon, tomorrow, next);
}

function demoBuild(blocks, mon, tomorrow, next) {
  const ago = (min) => new Date(Date.now() - min * 60000).toISOString();
  return {
    demo: true,
    account: {
      school: 'demo', schoolName: 'Gymnasium am See', server: 'demo.webuntis.com', user: 'emil.k', name: 'Emil',
      className: 'Q2', authKind: 'password', status: 'ok', lastError: null, lastCheckAt: ago(1), lastSuccessAt: ago(1), settings: { restore: true },
    },
    snapshot: { fetchedAt: ago(1), from: mon, to: addDays(mon, 11), blocks },
    homework: demoHomework(blocks),
    stats: {
      since: addDays(mon, -42), total: 23, upcoming: 3, days: 14, sleepIn: 4, fullDays: 1, earlyEnd: 3,
      top: [['Mathematik', 7], ['Englisch LK', 5], ['Religion', 4], ['Kunst', 4], ['Erdkunde', 3]], weekday: [0, 5, 3, 6, 4, 5, 0],
    },
    events: demoEvents(blocks, tomorrow, next),
    device: { push: true, pushError: null, pushOkAt: ago(14), platform: 'ios' },
    pushDevices: 1,
    vapidPublicKey: '',
    serverTime: new Date().toISOString(),
  };
}

// Meldungen passend zu den Beispiel-Ausfällen (nicht mit festen Fächernamen).
function demoEvents(blocks, tomorrow, next) {
  const ago = (min) => new Date(Date.now() - min * 60000).toISOString();
  const at = (d, p) => blocks.find((b) => b.d === d && b.p.startsWith(String(p)));
  const a = at(tomorrow, 1);
  const first = blocks.filter((b) => b.d === tomorrow && b.st !== 'cancel').reduce((m, b) => Math.min(m, b.s), 9999);
  const b = at(next(2), 5);
  const c = at(next(3), 5);
  const line = (x) => `${dayWord(x.d)} · ${fmtPeriod(x.p)} · ${hhmm(x.s)}–${hhmm(x.e)}`;
  const out = [];
  if (a) out.push({ id: 3, kind: 'cancel', title: `😴 Ausschlafen! ${a.sl} fällt aus`, body: `${line(a)} · Dein Tag startet erst um ${hhmm(first)}`, date: a.d, at: ago(14), sent: 1 });
  if (b) out.push({ id: 2, kind: 'cancel', title: `🎉 ${b.sl} fällt aus`, body: `${line(b)}${b.info ? ' · ' + b.info : ''}`, date: b.d, at: ago(190), sent: 1 });
  if (c) out.push({ id: 1, kind: 'restore', title: `⚠️ Doch Unterricht: ${c.sl}`, body: `${line(c)} – der Ausfall wurde zurückgenommen.`, date: c.d, at: ago(60 * 26), sent: 1 });
  return out;
}

// Beispielnoten für die Vorschau (werden nicht gespeichert).
export function demoGrades(state) {
  const names = [...new Map((state.snapshot.blocks || []).map((b) => [b.sl, b])).values()];
  const pts = { 'Englisch LK': [12, 13, 12], 'Sport LK': [11, 12, 13], Mathematik: [9, 10, 8], Deutsch: [10, 9, 11], Biologie: [11, 11, 12], Erdkunde: [10, 12, 11], Religion: [13, 12, 13], Kunst: [12, 11], Projektkurs: [13, 13] };
  const abi = { 'Englisch LK': 1, 'Sport LK': 2, Mathematik: 3, Deutsch: 4 };
  const subjects = names.map((b) => ({ id: uid(), name: b.sl, su: b.su, lk: / LK$/.test(b.sl), abi: abi[b.sl] || 0 }));
  const entries = [];
  for (const s of subjects) {
    (pts[s.name] || []).forEach((p, hj) => {
      if (hj < 2) entries.push({ id: uid(), sid: s.id, hj, kind: 'z', pts: p, at: '' });
      else {
        entries.push({ id: uid(), sid: s.id, hj, kind: 'k', pts: p, at: '' });
        entries.push({ id: uid(), sid: s.id, hj, kind: 's', pts: Math.min(15, p + 1), at: '' });
      }
    });
  }
  return { abiYear: defaultAbiYear(), subjects, entries, exams: {}, _seeded: true };
}

// Beispiel-Hausaufgaben passend zum Plan (fällig zur nächsten Stunde des Fachs).
function demoHomework(blocks) {
  const t = today();
  const next = (sl) => blocks.find((b) => b.sl === sl && b.d > t && b.st !== 'cancel')?.d || addDays(t, 2);
  const at = (d, h) => { const x = new Date(d + 'T00:00:00'); x.setDate(x.getDate() - 1); x.setHours(h, 0, 0, 0); return x.toISOString(); };
  return [
    { id: 'h1', subject: 'Mathematik', su: 'M', text: 'S. 112, Nr. 4 a–d und 7', due: next('Mathematik'), remindAt: at(next('Mathematik'), 17), done: false },
    { id: 'h2', subject: 'Englisch LK', su: 'E', text: 'Read chapter 3 of the novel, write a short summary (150 words)', due: next('Englisch LK'), remindAt: at(next('Englisch LK'), 17), done: false },
    { id: 'h3', subject: 'Deutsch', su: 'D', text: 'Gedichtanalyse fertigstellen', due: addDays(t, -1), remindAt: null, done: false },
  ].sort((a, b) => a.due.localeCompare(b.due));
}
