// Punktlandung – reine Lernlogik ohne Bildschirm und Speicher (lokal testbar: _Werkstatt/tests/learn.test.mts).

export const PASS = 70;

/** Wortauswahl für einen Lückentext: Lösungen + Ablenker, stabil gemischt. */
export function wordBank(c, seed) {
  const words = [...c.gaps, ...(c.distractors || [])];
  let x = seed * 9301 + 49297;
  const rnd = () => ((x = (x * 9301 + 49297) % 233280) / 233280);
  for (let i = words.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [words[i], words[j]] = [words[j], words[i]]; }
  return words;
}
const flat = (s) => String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');
export const same = (a, b) => flat(a) === flat(b);

/** Frei, wenn die Stufe davor geschafft ist. Stufen ohne Aufgaben sperren nichts. */
export function isUnlocked(material, path, stage) {
  const passed = (k, items) => !items?.length || (path[k] ?? 0) >= PASS;
  if (stage === 'cloze') return passed('mc', material?.quiz);
  if (stage === 'apply') return passed('mc', material?.quiz) && passed('cloze', material?.cloze) || (path.cloze ?? 0) >= PASS;
  return true;
}

/** Reihenfolge einer Runde: was beim letzten Mal falsch war, zuerst – dann der Rest in Originalreihenfolge. */
export function roundOrder(n, wrongBefore = []) {
  const first = [...new Set(wrongBefore)].filter((i) => Number.isInteger(i) && i >= 0 && i < n);
  return [...first, ...Array.from({ length: n }, (_, i) => i).filter((i) => !first.includes(i))];
}

// ---------- Anwenden: Zeit, Wörter, Checkliste ----------

const OP_MIN = { nennen: 6, beschreiben: 10, erläutern: 15, erklären: 15, analysieren: 20, vergleichen: 20, beurteilen: 20, bewerten: 20, erörtern: 25, diskutieren: 25 };
export const minutesOf = (q) => q.minutes || OP_MIN[String(q.operator || '').toLowerCase()] || 15;
export const wordsOf = (q) => q.words || Math.round(minutesOf(q) * 7 / 10) * 10;
export const countWords = (t) => (String(t || '').match(/[\p{L}\p{N}][\p{L}\p{N}'’.-]*/gu) || []).length;
const norm = (t) => String(t || '').toLowerCase().normalize('NFC');
const STOP = new Set(['zwischen', 'werden', 'wird', 'durch', 'einer', 'eines', 'nicht', 'sowie', 'damit', 'deshalb', 'weniger', 'mehr', 'immer', 'bezug', 'beispiel']);

const OP_CHECK = {
  erörtern: ['Eigenes begründetes Fazit', ['fazit', 'abschließend', 'insgesamt', 'meiner meinung', 'überwieg', 'daher bin ich']],
  diskutieren: ['Eigenes begründetes Fazit', ['fazit', 'abschließend', 'insgesamt', 'meiner meinung', 'überwieg']],
  beurteilen: ['Begründetes Urteil', ['fazit', 'insgesamt', 'daher', 'somit', 'meiner meinung']],
  vergleichen: ['Gemeinsamkeiten und Unterschiede verknüpft', ['im gegensatz', 'während', 'dagegen', 'hingegen', 'beide', 'gemeinsam', 'ebenso']],
  analysieren: ['Zusammenhänge mit Folgen erklärt', ['dadurch', 'führt zu', 'somit', 'folglich', '→', 'weil', 'sodass']],
  erläutern: ['Mit Beispiel oder Begründung veranschaulicht', ['z. b.', 'z.b.', 'zum beispiel', 'beispielsweise', 'etwa bei', 'weil', ', da ']],
};

/** Checkliste einer Aufgabe: eigene Punkte (q.checks) oder aus dem Erwartungshorizont abgeleitet, plus Operator und Form. */
export function checklistOf(q) {
  const items = Array.isArray(q.checks) && q.checks.length
    ? q.checks.map((c) => ({ label: c.label, any: (c.any || []).map(norm) }))
    : String(q.expectation || '').split(/;|\n/).map((x) => x.trim()).filter((x) => x.length > 6).slice(0, 7).map((seg) => {
      const words = (seg.match(/[\p{L}-]{6,}/gu) || []).map(norm).filter((w) => !STOP.has(w));
      const keys = [...new Set(words)].sort((a, b) => b.length - a.length).slice(0, 3).map((w) => w.slice(0, Math.max(6, w.length - 3)));
      return { label: seg.slice(0, 90) + (seg.length > 90 ? ' …' : ''), any: keys };
    }).filter((x) => x.any.length);
  const op = OP_CHECK[String(q.operator || '').toLowerCase()];
  if (op) items.push({ label: op[0], any: op[1] });
  const w = wordsOf(q);
  items.push({ label: `mindestens ${w} Wörter`, words: w });
  if (w >= 120) items.push({ label: 'Absätze (Leerzeile dazwischen)', paras: 2 });
  return items;
}

export function checkState(q, text) {
  const t = norm(text);
  return checklistOf(q).map((c) => ({
    ...c,
    ok: c.words ? countWords(text) >= c.words
      : c.paras ? String(text || '').trim().split(/\n\s*\n/).filter((x) => x.trim()).length >= c.paras
      : c.any.some((k) => t.includes(k)),
  }));
}
