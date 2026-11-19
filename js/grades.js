// Punktlandung – Noten und Abi-Hochrechnung (NRW, Punkte 0–15). Alles bleibt auf dem Gerät.
//
// Datenform (localStorage „pl.grades“):
//   { abiYear: 2027,
//     subjects: [{ id, name, su, lk: bool, abi: 0–4 }],
//     entries:  [{ id, sid, hj: 0–3, kind: 'k' | 's' | 'z', pts, at }],   // Klausur, Sonstige Mitarbeit, Zeugnis
//     exams:    { [sid]: pts } }                                          // Abiturprüfung

export const HJ = ['Q1.1', 'Q1.2', 'Q2.1', 'Q2.2'];
export const KIND = { k: 'Klausur', s: 'Mitarbeit', z: 'Zeugnis' };
const NOTE = ['6', '5-', '5', '5+', '4-', '4', '4+', '3-', '3', '3+', '2-', '2', '2+', '1-', '1', '1+'];
export const noteOf = (p) => NOTE[p] ?? '';
export const tone = (p) => (p >= 13 ? 'g1' : p >= 10 ? 'g2' : p >= 5 ? 'g3' : 'g4');
export const fmt1 = (x) => (x == null || Number.isNaN(x) ? '–' : x.toFixed(1).replace('.', ','));

export const uid = () => Math.random().toString(36).slice(2, 10);

export function defaultAbiYear(now = new Date()) {
  return now.getMonth() >= 7 ? now.getFullYear() + 1 : now.getFullYear();
}

/** Laufendes Halbjahr der Qualifikationsphase (0–3) oder -1 davor. */
export function currentHj(abiYear, now = new Date()) {
  const y = now.getFullYear();
  const m = now.getMonth(); // 0 = Jan
  const sy = m >= 7 ? y : y - 1; // Schuljahr beginnt im August
  const firstHalf = m >= 7 || m === 0; // Aug–Jan
  const q1Start = abiYear - 2;
  if (sy < q1Start) return -1;
  if (sy === q1Start) return firstHalf ? 0 : 1;
  if (sy === q1Start + 1) return firstHalf ? 2 : 3;
  return 3;
}

export function empty(abiYear = defaultAbiYear()) {
  return { abiYear, subjects: [], entries: [], exams: {} };
}

/** Fächer aus dem Stundenplan übernehmen (einmal, beim ersten Öffnen). */
export function subjectsFromBlocks(blocks) {
  const seen = new Map();
  for (const b of blocks || []) {
    const key = (b.sl || b.su || '').trim();
    if (!key || seen.has(key)) continue;
    seen.set(key, { id: uid(), name: key.replace(/\s+(LK|GK)$/i, ''), su: b.su || key, lk: /\bLK\b|leistungs/i.test(`${b.sl} ${b.su}`), abi: 0 });
  }
  return [...seen.values()].sort((a, b) => Number(b.lk) - Number(a.lk) || a.name.localeCompare(b.name, 'de'));
}

/**
 * Noten-Fächer an die Kurswahl anpassen: gewählte Kurse ergänzen (LK erkannt),
 * leere Fächer ohne passenden Kurs entfernen. Fächer mit eingetragenen Noten bleiben immer.
 */
export function syncSubjects(G, courses) {
  const clean = (n) => String(n || '').replace(/\s+(LK|GK|ZK)$/i, '').trim();
  const key = (n) => clean(n).toLowerCase();
  const want = new Map();
  for (const c of courses) {
    const k = key(c.sl);
    if (!k || want.has(k)) continue;
    want.set(k, { name: clean(c.sl), su: c.su, lk: /\bLK$/i.test(c.sl) || /\sL\d*$/.test(c.su) });
  }
  const used = (s) => G.entries.some((e) => e.sid === s.id) || G.exams?.[s.id] != null;
  const keep = [];
  for (const s of G.subjects) {
    const w = want.get(key(s.name)) || [...want.values()].find((x) => x.su === s.su);
    if (w) {
      Object.assign(s, { name: w.name, su: w.su, lk: s.lk || w.lk });
      want.delete(key(w.name));
      keep.push(s);
    } else if (used(s)) keep.push(s);
  }
  for (const w of want.values()) keep.push({ id: uid(), name: w.name, su: w.su, lk: w.lk, abi: 0 });
  G.subjects = keep.sort((a, b) => Number(b.lk) - Number(a.lk) || a.name.localeCompare(b.name, 'de'));
  G._seeded = true;
  return G;
}

const avg = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

/** Punkte eines Fachs in einem Halbjahr: Zeugnisnote, sonst aus Klausuren + Mitarbeit geschätzt. */
export function hjResult(G, sid, hj) {
  const es = G.entries.filter((e) => e.sid === sid && e.hj === hj);
  const z = es.filter((e) => e.kind === 'z');
  if (z.length) return { pts: z[z.length - 1].pts, est: false };
  const k = avg(es.filter((e) => e.kind === 'k').map((e) => e.pts));
  const s = avg(es.filter((e) => e.kind === 's').map((e) => e.pts));
  if (k == null && s == null) return null;
  const v = k != null && s != null ? (k + s) / 2 : (k ?? s);
  return { pts: Math.round(v), est: true };
}

export function subjectAvg(G, sid) {
  return avg(HJ.map((_, i) => hjResult(G, sid, i)).filter(Boolean).map((r) => r.pts));
}

/**
 * Hochrechnung nach APO-GOSt NRW (vereinfacht):
 * Block I = P / S × 40 (LK-Kurse doppelt in P und S, max. 600), eingebracht werden alle LK-Kurse,
 * alle Kurse der Abifächer und die besten übrigen – anteilig zu den Halbjahren mit Noten (40 Kurse bei 4).
 * Block II = 4 Abiturprüfungen × 5 (max. 300); fehlt eine Prüfung, zählt der Fachschnitt.
 * Note = 17/3 − E/180, auf eine Nachkommastelle abgeschnitten.
 */
export function abi(G) {
  const courses = [];
  for (const sub of G.subjects) {
    HJ.forEach((_, hj) => {
      const r = hjResult(G, sub.id, hj);
      if (r) courses.push({ sid: sub.id, hj, pts: r.pts, est: r.est, lk: sub.lk, must: sub.lk || sub.abi > 0 });
    });
  }
  if (!courses.length) return null;
  const hjs = new Set(courses.map((c) => c.hj)).size;
  const cap = Math.max(1, Math.round((40 * hjs) / 4));
  const must = courses.filter((c) => c.must);
  const rest = courses.filter((c) => !c.must).sort((a, b) => b.pts - a.pts);
  const chosen = [...must, ...rest].slice(0, Math.max(cap, must.length));
  const P = chosen.reduce((s, c) => s + c.pts * (c.lk ? 2 : 1), 0);
  const Sn = chosen.reduce((s, c) => s + (c.lk ? 2 : 1), 0);
  const block1 = Math.min(600, Math.round((P / Sn) * 40));
  const deficits = chosen.filter((c) => c.pts < 5).length;

  const abiSubs = G.subjects.filter((s) => s.abi > 0).sort((a, b) => a.abi - b.abi).slice(0, 4);
  const overall = avg(courses.map((c) => c.pts));
  let exEst = false;
  const exams = [0, 1, 2, 3].map((i) => {
    const sub = abiSubs[i];
    if (sub && G.exams?.[sub.id] != null) return G.exams[sub.id];
    exEst = true;
    return Math.round(sub ? (subjectAvg(G, sub.id) ?? overall) : overall);
  });
  const block2 = Math.min(300, exams.reduce((a, b) => a + b, 0) * 5);
  const total = block1 + block2;
  const passed = total >= 300 && block1 >= 200 && block2 >= 100;
  const note = Math.max(1, Math.floor((17 / 3 - total / 180) * 10 + 1e-9) / 10);
  return {
    block1, block2, total, passed, deficits, note: passed ? note : null,
    est: hjs < 4 || exEst || chosen.some((c) => c.est), hjs, abiCount: abiSubs.length, examsMissing: exEst,
  };
}

/** Mindestpunktzahl (Block I + II) für eine Abiturnote nach NRW-Tabelle, z. B. 1,5 → 733. */
export const pointsFor = (note) => (note <= 1.0 ? 823 : Math.max(300, Math.floor((17 / 3 - note - 0.1) * 180 + 1e-9) + 1));

/**
 * Ziel-Rechner: Was schon eingetragen ist, zählt. Für alles noch Offene – leere Halbjahre ab jetzt
 * (bei Fächern, die noch laufen) und fehlende Abiprüfungen – wird der kleinste Punkteschnitt x gesucht,
 * mit dem die Zielnote erreicht wird.
 */
export function goal(G, target, curHj = currentHj(G.abiYear), running = null) {
  const need = pointsFor(target);
  const from = Math.max(0, curHj);
  const open = [];
  for (const s of G.subjects) {
    const own = G.entries.filter((e) => e.sid === s.id);
    const last = own.length ? Math.max(...own.map((e) => e.hj)) : -1;
    HJ.forEach((_, hj) => {
      if (hj < from || own.some((e) => e.hj === hj)) return;
      if (last >= 0 && last < hj - 1) return; // Fach ist schon vorbei (z. B. nur in der Q1)
      if (running?.size && !running.has(s.name) && own.length) return; // nicht mehr im Stundenplan
      open.push({ sid: s.id, hj });
    });
  }
  const openEx = G.subjects.filter((s) => s.abi > 0 && G.exams?.[s.id] == null).map((s) => s.id);
  const total = (x) => {
    const H = {
      ...G,
      entries: [...G.entries, ...open.map((o) => ({ id: 'g', sid: o.sid, hj: o.hj, kind: 'z', pts: x }))],
      exams: { ...G.exams, ...Object.fromEntries(openEx.map((id) => [id, x])) },
    };
    return abi(H)?.total ?? 0;
  };
  const base = { need, open: open.length, exams: openEx.length };
  if (!open.length && !openEx.length) return { ...base, done: true, reached: total(0) >= need };
  for (let x = 0; x <= 15; x++) if (total(x) >= need) return { ...base, x, safe: x === 0 };
  return { ...base, x: null, best: total(15) };
}
