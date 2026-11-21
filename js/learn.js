// Punktlandung – Lernseite wie in einer Lern-App: 1. Multiple Choice → 2. Lückentext → 3. Anwenden.
// Die nächste Stufe wird frei, sobald die vorige zu mindestens 70 % richtig war. Fortschritt nur auf dem Handy.
import { esc, icon, hue } from './ui.js';
import { progress } from './study.js';

export const PASS = 70;
export const STAGES = [
  ['mc', 'Multiple Choice', 'Wissen prüfen'],
  ['cloze', 'Lückentext', 'Begriffe sicher einsetzen'],
  ['apply', 'Anwenden', 'Klausuraufgaben lösen'],
];

const short = (s) => String(s || '').replace(/\s+(LK|GK|ZK)$/i, '');
export const pathOf = (id) => ({ mc: null, cloze: null, apply: {}, ...(progress(id).path || {}) });

export function unlocked(id, stage) {
  const p = pathOf(id);
  if (stage === 'mc') return true;
  if (stage === 'cloze') return (p.mc ?? 0) >= PASS;
  return (p.cloze ?? 0) >= PASS;
}

/** Kann die Lernseite für dieses Set geöffnet werden? */
export const hasPath = (s) => !!(s?.material && (s.material.quiz?.length || s.material.cloze?.length || s.material.questions?.length));

/** Wortauswahl für einen Lückentext: Lösungen + Ablenker, stabil gemischt. */
export function wordBank(c, seed) {
  const words = [...c.gaps, ...(c.distractors || [])];
  let x = seed * 9301 + 49297;
  const rnd = () => ((x = (x * 9301 + 49297) % 233280) / 233280);
  for (let i = words.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [words[i], words[j]] = [words[j], words[i]]; }
  return words;
}
export const same = (a, b) => String(a || '').trim().toLowerCase().replace(/\s+/g, ' ') === String(b || '').trim().toLowerCase().replace(/\s+/g, ' ');

/** Lernseite (ganzer Bildschirm). */
export function learnPage(S, s) {
  const LP = S.lp;
  if (!s || !hasPath(s)) {
    return `<main class="screen learn-page"><header class="lp-head"><button class="icon-btn" data-act="lpClose" aria-label="Zurück">${icon('left')}</button><b>Lernen</b><span></span></header>
      <div class="empty"><b>Noch keine Lernaufgaben</b><span>Die KI erstellt sie aus deinem Material. Das dauert 1–2 Minuten.</span></div></main>`;
  }
  const m = s.material;
  const p = pathOf(s.id);
  const tabs = STAGES.map(([k, l], n) => {
    const open = unlocked(s.id, k);
    const score = k === 'apply' ? Object.keys(p.apply || {}).length : p[k];
    const badge = k === 'apply' ? (score ? `${score}/${m.questions.length}` : '') : score != null ? `${score} %` : '';
    return `<button class="lp-stage ${LP.stage === k ? 'on' : ''} ${open ? '' : 'locked'}" data-act="lpStage" data-v="${k}" ${open ? '' : 'aria-disabled="true"'}>
      <span class="lp-n">${open ? n + 1 : icon('lock')}</span><span>${l}${badge ? `<small>${badge}</small>` : ''}</span></button>`;
  }).join('');
  const body = LP.stage === 'cloze' ? clozeStage(S, s) : LP.stage === 'apply' ? applyStage(S, s) : mcStage(S, s);
  return `<main class="screen learn-page" style="--h:${hue(s.su, s.subject)}">
    <header class="lp-head"><button class="icon-btn" data-act="lpClose" aria-label="Zurück">${icon('left')}</button>
      <span class="lp-title"><small>${esc(short(s.subject))}</small><b>${esc(m.topic || s.title || 'Lernen')}</b></span><span></span></header>
    <nav class="lp-stages">${tabs}</nav>
    <section class="lp-body">${body}</section>
  </main>`;
}

function bar(i, n) {
  return `<div class="cards-top"><span>${Math.min(i + 1, n)} / ${n}</span><span>${Math.round((i / Math.max(1, n)) * 100)} %</span></div><div class="pbar"><i style="width:${(i / Math.max(1, n)) * 100}%"></i></div>`;
}

function finish(S, s, stage, pct, total, right) {
  const next = stage === 'mc' ? 'cloze' : stage === 'cloze' ? 'apply' : null;
  const passed = pct >= PASS;
  return `<div class="learn-done lp-done ${passed ? 'ok' : ''}">
    <div class="lp-score">${pct}<small>%</small></div>
    <b>${right} von ${total} richtig</b>
    <span>${passed ? (next ? `Stark! Die nächste Stufe „${STAGES.find(([k]) => k === next)[1]}“ ist jetzt frei.` : 'Alle Stufen geschafft!') : `Für die nächste Stufe brauchst du ${PASS} %. Schau dir die Erklärungen an und versuch es noch mal.`}</span>
    ${passed && next ? `<button class="btn" data-act="lpStage" data-v="${next}">Weiter zu: ${STAGES.find(([k]) => k === next)[1]}</button>` : ''}
    <button class="btn ${passed && next ? 'soft' : ''}" data-act="lpRestart">Noch mal üben</button>
  </div>`;
}

function mcStage(S, s) {
  const LP = S.lp;
  const quiz = s.material.quiz || [];
  if (!quiz.length) return '<p class="muted">Keine Multiple-Choice-Fragen vorhanden.</p>';
  if (LP.i >= quiz.length) return finish(S, s, 'mc', Math.round((LP.right / quiz.length) * 100), quiz.length, LP.right);
  const q = quiz[LP.i];
  const picked = LP.pick;
  return `${bar(LP.i, quiz.length)}
    <p class="quiz-q">${esc(q.question)}</p>
    <div class="quiz-opts">${q.options.map((o, i) => {
      const cls = picked == null ? '' : i === q.correct ? 'right' : i === picked ? 'wrong' : 'dim';
      return `<button class="qopt ${cls}" data-act="lpPick" data-v="${i}" ${picked != null ? 'disabled' : ''}><span>${'ABCD'[i] || i + 1}</span>${esc(o)}</button>`;
    }).join('')}</div>
    ${picked != null ? `<p class="quiz-exp ${picked === q.correct ? 'ok' : 'bad'}"><b>${picked === q.correct ? 'Richtig!' : 'Leider falsch.'}</b> ${esc(q.explanation)}</p>
      <button class="btn" data-act="lpNext">${LP.i + 1 < quiz.length ? 'Weiter' : 'Ergebnis'}</button>` : ''}`;
}

function clozeStage(S, s) {
  const LP = S.lp;
  const list = s.material.cloze || [];
  if (!list.length) return '<p class="muted">Für dieses Material gibt es noch keine Lückentexte – erstell die Lernhilfe neu, dann kommen sie dazu.</p>';
  if (LP.i >= list.length) return finish(S, s, 'cloze', Math.round((LP.right / list.length) * 100), list.length, LP.right);
  const c = list[LP.i];
  const parts = c.text.split(/_{3,}/);
  const fills = LP.fills || [];
  const checked = LP.checked;
  let html = '';
  parts.forEach((t, k) => {
    html += esc(t);
    if (k < c.gaps.length) {
      const v = fills[k];
      const state = !checked ? '' : same(v, c.gaps[k]) ? 'right' : 'wrong';
      html += `<button class="gap ${v ? 'filled' : ''} ${state}" data-act="lpGap" data-v="${k}" ${checked ? 'disabled' : ''}>${v ? esc(v) : '&nbsp;'}</button>`;
    }
  });
  const used = new Set();
  const bank = wordBank(c, LP.i + 1).map((w, k) => {
    const n = fills.findIndex((f, j) => f === w && !used.has(j));
    const isUsed = n >= 0;
    if (isUsed) used.add(n);
    return `<button class="chip word ${isUsed ? 'used' : ''}" data-act="lpWord" data-v="${esc(w)}" ${isUsed || checked ? 'disabled' : ''}>${esc(w)}</button>`;
  }).join('');
  const full = fills.filter(Boolean).length === c.gaps.length;
  const allRight = checked && c.gaps.every((g, k) => same(fills[k], g));
  return `${bar(LP.i, list.length)}
    <p class="cloze-text">${html}</p>
    <div class="chips word-bank">${bank}</div>
    ${checked ? `<p class="quiz-exp ${allRight ? 'ok' : 'bad'}"><b>${allRight ? 'Richtig!' : `Richtig wäre: ${c.gaps.map(esc).join(' · ')}`}</b> ${esc(c.explanation)}</p>
      <button class="btn" data-act="lpNext">${LP.i + 1 < list.length ? 'Weiter' : 'Ergebnis'}</button>`
      : `<button class="btn" data-act="lpCheck" ${full ? '' : 'disabled'}>Prüfen</button>`}`;
}

function applyStage(S, s) {
  const LP = S.lp;
  const qs = s.material.questions || [];
  const p = pathOf(s.id);
  const prog = progress(s.id);
  if (!qs.length) return '<p class="muted">Keine Anwendungsaufgaben vorhanden.</p>';
  const i = Math.min(LP.i, qs.length - 1);
  const q = qs[i];
  const r = prog.results?.[i];
  const strip = qs.map((_, k) => `<button class="day-dot ${p.apply?.[k] != null ? 'done' : ''} ${k === i ? 'on' : ''}" data-act="lpGo" data-v="${k}">${k + 1}</button>`).join('');
  return `<div class="day-strip">${strip}</div>
    <p class="quiz-q"><span class="op">${esc(q.operator)}</span> ${esc(q.question)}</p>
    <textarea class="input exam-input" data-in="examAnswer" rows="8" maxlength="6000" placeholder="Deine Antwort – so, wie du sie in der Klausur schreiben würdest …">${esc(prog.answers?.[i] || '')}</textarea>
    ${S.study?.ai ? `<button class="btn" data-act="lpCheckApply" ${S.busy.check ? 'disabled' : ''}>${S.busy.check ? '<span class="spin"></span>Wird bewertet …' : `${icon('spark')}Antwort bewerten lassen`}</button>` : ''}
    ${r ? `<div class="exam-res"><div class="er-top"><b class="pt big ${r.points >= 13 ? 'g1' : r.points >= 10 ? 'g2' : r.points >= 5 ? 'g3' : 'g4'}">${r.points}</b><span>${esc(r.verdict)}</span></div>
      ${r.good?.length ? `<b class="er-h ok">Gut</b><ul>${r.good.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
      ${r.missing?.length ? `<b class="er-h bad">Fehlt noch</b><ul>${r.missing.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
      ${r.tip ? `<p class="er-tip">${icon('spark')}${esc(r.tip)}</p>` : ''}</div>` : ''}
    <details class="expect"><summary>Erwartungshorizont zeigen</summary><p>${esc(q.expectation)}</p></details>
    ${i + 1 < qs.length ? `<button class="btn soft" data-act="lpGo" data-v="${i + 1}">Nächste Aufgabe</button>` : ''}`;
}

/** Karte im Lernset, die die Lernseite öffnet. */
export function startCard(S, s) {
  if (!hasPath(s)) return '';
  const p = pathOf(s.id);
  const next = !unlocked(s.id, 'cloze') ? 0 : !unlocked(s.id, 'apply') ? 1 : 2;
  return `<button class="lp-start" data-act="lpOpen" data-v="${esc(s.id)}">
    <span class="lp-steps">${STAGES.map(([k, l], n) => `<i class="${n < next ? 'done' : n === next ? 'now' : ''}">${n < next ? '✓' : n + 1}</i>`).join('<em></em>')}</span>
    <b>${next === 0 && p.mc == null ? 'Lernen starten' : 'Weiterlernen'}</b>
    <small>Multiple Choice → Lückentext → Anwenden</small></button>`;
}
