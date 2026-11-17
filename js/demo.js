// Punktlandung – Beispieldaten für die Vorschau (Aufruf mit ?demo). Spricht nicht mit Untis.
import { today, addDays, weekday } from './lib.js';

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
  const ago = (min) => new Date(Date.now() - min * 60000).toISOString();
  return {
    demo: true,
    account: {
      school: 'demo', schoolName: 'Gymnasium am See', server: 'demo.webuntis.com', user: 'emil.k', name: 'Emil',
      className: 'Q2', authKind: 'password', status: 'ok', lastError: null, lastCheckAt: ago(1), lastSuccessAt: ago(1), settings: { restore: true },
    },
    snapshot: { fetchedAt: ago(1), from: mon, to: addDays(mon, 11), blocks },
    events: [
      { id: 3, kind: 'cancel', title: '😴 Ausschlafen! Englisch LK fällt aus', body: 'Morgen · 1.–2. Stunde · 08:00–09:35 · Dein Tag startet erst um 09:55', date: tomorrow, at: ago(14), sent: 1 },
      { id: 2, kind: 'cancel', title: '🎉 Kunst fällt aus', body: 'Übermorgen · 5.–6. Stunde · 11:50–13:25 · Aufgaben auf Moodle', date: next(2), at: ago(190), sent: 1 },
      { id: 1, kind: 'restore', title: '⚠️ Doch Unterricht: Mathematik', body: 'Fr · 5.–6. Stunde · 11:50–13:25 – der Ausfall wurde zurückgenommen.', date: next(3), at: ago(60 * 26), sent: 1 },
    ],
    device: { push: true, pushError: null, pushOkAt: ago(14), platform: 'ios' },
    pushDevices: 1,
    vapidPublicKey: '',
    serverTime: new Date().toISOString(),
  };
}
