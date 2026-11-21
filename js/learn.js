// Punktlandung – Lernseite wie ein Trainingsplan: Lernzettel → 1. Multiple Choice → 2. Lückentext → 3. Anwenden → Abgabe.
// Jede Stufe ist eine Aufgabenkarte mit Zeit und Anleitung; beim Anwenden gibt es Timer, Wortzähler und eine
// Checkliste, die sich beim Schreiben selbst abhakt. Fortschritt nur auf dem Handy.
import { esc, icon, hue, haptic } from './ui.js';
import { daysFromToday } from './lib.js';
import { progress, saveProgress } from './study.js';
import { sheetHtml } from './plan.js';

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
  if (stage === 'cloze') return (p.mc ?? 0) >= PASS;
  if (stage === 'apply') return (p.cloze ?? 0) >= PASS;
  return true; // Lernzettel, Multiple Choice, Abgabe
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
  erläutern: ['Mit Beispiel oder Begründung veranschaulicht', ['z. b.', 'z.b.', 'zum beispiel', 'beispielsweise', 'etwa', 'weil', 'da ']],
};

/** Checkliste einer Aufgabe: eigene Punkte (q.checks) oder aus dem Erwartungshorizont abgeleitet, plus Form. */
export function checklistOf(q) {
  let items = Array.isArray(q.checks) && q.checks.length
    ? q.checks.map((c) => ({ label: c.label, any: (c.any || []).map(norm) }))
    : String(q.expectation || '').split(/;|\n/).map((x) => x.trim()).filter((x) => x.length > 6).slice(0, 7).map((seg) => {
      const words = (seg.match(/[\p{L}-]{6,}/gu) || []).map(norm).filter((w) => !STOP.has(w));
      const keys = [...new Set(words)].sort((a, b) => b.length - a.length).slice(0, 3).map((w) => w.slice(0, Math.max(6, w.length - 3)));
      const label = seg.replace(/^[^:]{1,30}:\s*/, (m) => m).slice(0, 90) + (seg.length > 90 ? ' …' : '');
      return { label, any: keys };
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
    ok: c.words ? countWords(text) >= c.words : c.paras ? String(text || '').trim().split(/\n\s*\n/).filter((x) => x.trim()).length >= c.paras : c.any.some((k) => t.includes(k)),
  }));
}

function checklistHtml(q, text) {
  const st = checkState(q, text);
  const n = st.filter((x) => x.ok).length;
  return `<div class="lp-cl-head"><b>Checkliste</b><span>${n} von ${st.length} erfüllt</span></div>
    <ul class="lp-cl">${st.map((c) => `<li class="${c.ok ? 'ok' : ''}"><i>${c.ok ? icon('check') : ''}</i><span>${esc(c.label)}</span></li>`).join('')}</ul>`;
}

/** Beim Tippen: Checkliste, Wortzahl und „Gespeichert“ aktualisieren, ohne neu zu zeichnen (Fokus bleibt). */
export function live(S, s, text) {
  const q = s?.material?.questions?.[S.lp?.i ?? 0];
  if (!q) return;
  const box = document.querySelector('.lp-checklist.full');
  if (box) box.innerHTML = checklistHtml(q, text);
  const st = checkState(q, text);
  const n = `${st.filter((x) => x.ok).length}/${st.length}`;
  document.querySelectorAll('.lp-cnt').forEach((el) => { el.textContent = n; });
  document.querySelectorAll('.lp-words').forEach((el) => { el.textContent = `${countWords(text)} / ${wordsOf(q)} Wörter`; });
  const v = document.querySelector('[data-step="apply"] .lp-st-v');
  if (v) v.textContent = String(countWords(text));
  const sv = document.querySelector('.lp-saved');
  if (sv) sv.textContent = `✓ Gespeichert · ${new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}`;
}

// Timer: läuft weiter, solange die Seite offen ist.
let tick = null;
const fmt = (ms) => { const s = Math.max(0, Math.round(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
export function startTicker(S) {
  clearInterval(tick);
  tick = setInterval(() => {
    const T = S.lp?.timer;
    if (!T || S.screen !== 'learn') return;
    const left = T.end - Date.now();
    const pct = Math.max(0, Math.min(100, (left / (T.end - T.start)) * 100));
    document.querySelectorAll('.lp-tbar i').forEach((i) => { i.style.width = pct + '%'; });
    document.querySelectorAll('.lp-tleft').forEach((el) => { el.textContent = left > 0 ? `${Math.ceil(left / 60000)} Min.` : 'Zeit um'; });
    document.querySelectorAll('.lp-tbar').forEach((b) => { b.classList.toggle('soon', left > 0 && left <= 120000); b.classList.toggle('over', left <= 0); });
    if (left <= 120000 && left > 0 && !T.warned) { T.warned = true; haptic(40); }
    if (left <= 0 && !T.done) { T.done = true; haptic(120); }
  }, 1000);
}

// ---------- Seite ----------

const steps = (s) => {
  const m = s.material;
  const p = pathOf(s.id);
  const pr = progress(s.id);
  const nq = m.questions?.length || 0;
  const answered = (m.questions || []).filter((_, i) => countWords(pr.answers?.[i]) >= 20).length;
  return [
    { k: 'sheet', n: '·', label: 'Lernzettel', min: 10, v: p.sheet ? '✓' : '' },
    { k: 'mc', n: 1, label: 'Multiple Choice', min: Math.max(5, Math.round((m.quiz?.length || 0) * 0.7)), v: p.mc == null ? '' : p.mc >= PASS ? '✓' : `${p.mc} %` },
    { k: 'cloze', n: 2, label: 'Lückentext', min: Math.max(4, m.cloze?.length || 0), v: p.cloze == null ? '' : p.cloze >= PASS ? '✓' : `${p.cloze} %` },
    { k: 'apply', n: 3, label: 'Anwenden', min: minutesOf(m.questions?.[0] || {}), v: nq ? (answered >= nq ? '✓' : `${answered}/${nq}`) : '' },
    { k: 'done', n: '·', label: 'Abgabe', min: 0, v: p.submitted ? '✓' : '' },
  ];
};

export function learnPage(S, s) {
  const LP = S.lp;
  if (!s || !hasPath(s)) {
    return `<main class="screen learn-page"><header class="lp-head"><button class="icon-btn" data-act="lpClose" aria-label="Zurück">${icon('left')}</button><b>Lernen</b><span></span></header>
      <div class="empty"><b>Noch keine Lernaufgaben</b><span>Schick die Fotos deiner Unterlagen an Claude – dann kommen die Aufgaben hier rein.</span></div></main>`;
  }
  const m = s.material;
  const days = s.examDate ? daysFromToday(s.examDate) : null;
  const list = steps(s).map((st) => {
    const open = unlocked(s.id, st.k);
    return `<button class="lp-st ${LP.stage === st.k ? 'on' : ''} ${open ? '' : 'locked'} ${st.v === '✓' ? 'ok' : ''}" data-act="lpStage" data-v="${st.k}" data-step="${st.k}">
      <span class="lp-st-n">${open ? st.n : icon('lock')}</span><span class="lp-st-l">${st.label}</span><span class="lp-st-v">${esc(st.v)}</span></button>`;
  }).join('');
  const body = LP.stage === 'sheet' ? sheetStage(S, s) : LP.stage === 'cloze' ? clozeStage(S, s) : LP.stage === 'apply' ? applyStage(S, s) : LP.stage === 'done' ? doneStage(S, s) : mcStage(S, s);
  const side = LP.side && LP.stage !== 'sheet' ? `<aside class="lp-side">${s.sheet ? sheetHtml(s.sheet, s) : summaryHtml(s)}</aside>` : '';
  return `<main class="screen learn-page lp2 ${side ? 'with-side' : ''} ${LP.focus && LP.stage === 'apply' ? 'focus' : ''}" style="--h:${hue(s.su, s.subject)}">
    <header class="lp-top">
      <button class="icon-btn" data-act="lpClose" aria-label="Zurück">${icon('left')}</button>
      <span class="lp-title"><small>${esc(short(s.subject))}</small><b>${esc(m.topic || s.title || 'Lernen')}</b></span>
      <span class="lp-tools">
        ${days != null && days >= 0 ? `<span class="lp-pill">${days === 0 ? 'Klausur heute' : days === 1 ? 'Klausur morgen' : `Klausur in ${days} Tagen`}</span>` : ''}
        <button class="lp-pill btn-pill ${LP.side ? 'on' : ''}" data-act="lpSide">Lernzettel daneben</button>
      </span>
    </header>
    <div class="lp-grid">
      <nav class="lp-steps-nav"><small class="lp-kicker">Heute</small>${list}</nav>
      <section class="lp-card">${body}</section>
      ${side}
    </div>
  </main>`;
}

function cardHead(n, title, min, text) {
  return `<header class="lp-ch"><span class="lp-num">${n}</span><span><h2>${esc(title)}</h2>${min ? `<small>${min} Minuten</small>` : ''}</span></header>
    ${text ? `<p class="lp-task">${text}</p>` : ''}`;
}

function summaryHtml(s) {
  const sum = s.material.summary || {};
  return `<div class="lz"><h2 class="lz-title">${esc(s.material.topic)}</h2>${sum.overview ? `<p class="lz-intro">${esc(sum.overview)}</p>` : ''}
    ${(sum.sections || []).map((x) => `<section class="lz-sec"><b>${esc(x.title)}</b><ul>${x.points.map((p) => `<li>${esc(p)}</li>`).join('')}</ul></section>`).join('')}</div>`;
}

function sheetStage(S, s) {
  return `${cardHead('·', 'Lernzettel', 10, 'Lies den Lernzettel einmal ganz durch. Markier dir im Kopf, was du noch nicht sicher kannst – genau das kommt gleich in den Fragen.')}
    ${s.sheet ? sheetHtml(s.sheet, s) : summaryHtml(s)}
    <button class="btn" data-act="lpSheetDone">${icon('check')}Gelesen – weiter zu Multiple Choice</button>`;
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
    <span>${passed ? (next ? `Stark! „${STAGES.find(([k]) => k === next)[1]}“ ist jetzt frei.` : 'Geschafft!') : `Für die nächste Stufe brauchst du ${PASS} %. Schau dir die Erklärungen an und versuch es noch mal.`}</span>
    ${passed && next ? `<button class="btn" data-act="lpStage" data-v="${next}">Weiter zu: ${STAGES.find(([k]) => k === next)[1]}</button>` : ''}
    <button class="btn ${passed && next ? 'soft' : ''}" data-act="lpRestart">Noch mal üben</button>
  </div>`;
}

function mcStage(S, s) {
  const LP = S.lp;
  const quiz = s.material.quiz || [];
  const head = cardHead(1, 'Multiple Choice', Math.max(5, Math.round(quiz.length * 0.7)), `Beantworte alle ${quiz.length} Fragen. Nach jeder Antwort siehst du die Erklärung. Ab ${PASS} % ist der Lückentext frei.`);
  if (!quiz.length) return head + '<p class="muted">Keine Multiple-Choice-Fragen vorhanden.</p>';
  if (LP.i >= quiz.length) return head + finish(S, s, 'mc', Math.round((LP.right / quiz.length) * 100), quiz.length, LP.right);
  const q = quiz[LP.i];
  const picked = LP.pick;
  return `${head}${bar(LP.i, quiz.length)}
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
  const head = cardHead(2, 'Lückentext', Math.max(4, list.length), 'Tippe die Wörter in der richtigen Reihenfolge an. Ein Wort in der Lücke tippst du an, um es wieder herauszunehmen. Achtung: Es sind falsche Wörter dabei.');
  if (!list.length) return head + '<p class="muted">Für dieses Material gibt es noch keine Lückentexte.</p>';
  if (LP.i >= list.length) return head + finish(S, s, 'cloze', Math.round((LP.right / list.length) * 100), list.length, LP.right);
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
  const bank = wordBank(c, LP.i + 1).map((w) => {
    const n = fills.findIndex((f, j) => f === w && !used.has(j));
    const isUsed = n >= 0;
    if (isUsed) used.add(n);
    return `<button class="chip word ${isUsed ? 'used' : ''}" data-act="lpWord" data-v="${esc(w)}" ${isUsed || checked ? 'disabled' : ''}>${esc(w)}</button>`;
  }).join('');
  const full = fills.filter(Boolean).length === c.gaps.length;
  const allRight = checked && c.gaps.every((g, k) => same(fills[k], g));
  return `${head}${bar(LP.i, list.length)}
    <p class="cloze-text">${html}</p>
    <div class="chips word-bank">${bank}</div>
    ${checked ? `<p class="quiz-exp ${allRight ? 'ok' : 'bad'}"><b>${allRight ? 'Richtig!' : `Richtig wäre: ${c.gaps.map(esc).join(' · ')}`}</b> ${esc(c.explanation)}</p>
      <button class="btn" data-act="lpNext">${LP.i + 1 < list.length ? 'Weiter' : 'Ergebnis'}</button>`
      : `<button class="btn" data-act="lpCheck" ${full ? '' : 'disabled'}>Prüfen</button>`}`;
}

function timerBar(LP, i) {
  const T = LP.timer && LP.timer.i === i ? LP.timer : null;
  if (!T) return '';
  const left = T.end - Date.now();
  const pct = Math.max(0, Math.min(100, (left / (T.end - T.start)) * 100));
  return `<div class="lp-tbar ${left <= 0 ? 'over' : left <= 120000 ? 'soon' : ''}"><i style="width:${pct}%"></i></div>`;
}

function applyStage(S, s) {
  const LP = S.lp;
  const qs = s.material.questions || [];
  if (!qs.length) return cardHead(3, 'Anwenden', 0, '') + '<p class="muted">Keine Anwendungsaufgaben vorhanden.</p>';
  const i = Math.min(LP.i, qs.length - 1);
  const q = qs[i];
  const prog = progress(s.id);
  const text = prog.answers?.[i] || '';
  const r = prog.results?.[i];
  const min = minutesOf(q);
  const reviewed = !!pathOf(s.id).review?.[i];
  const st = checkState(q, text);
  const cnt = `${st.filter((x) => x.ok).length}/${st.length}`;
  const T = LP.timer && LP.timer.i === i ? LP.timer : null;
  const left = T ? T.end - Date.now() : 0;
  const strip = qs.map((x, k) => `<button class="day-dot ${countWords(prog.answers?.[k]) >= 20 ? 'done' : ''} ${k === i ? 'on' : ''}" data-act="lpGo" data-v="${k}">${k + 1}</button>`).join('');
  const plan = `${Math.max(1, Math.round(min * 0.15))} Min. planen, ${Math.round(min * 0.7)} Min. schreiben, ${Math.max(1, Math.round(min * 0.15))} Min. Korrekturlesen.`;
  return `<div class="lp-nofocus">${cardHead(3, `Anwenden · Aufgabe ${i + 1}`, min, '')}<div class="day-strip">${strip}</div></div>
    <p class="lp-task lp-q"><span class="op">${esc(q.operator)}</span> ${esc(q.question)}</p>
    <div class="lp-nofocus">
      <p class="lp-hint">Ca. ${wordsOf(q)} Wörter. ${plan}</p>
      ${T ? '' : `<button class="btn soft lp-timer-btn" data-act="lpTimer" data-v="${min}">${icon('clock')}Timer starten · ${min} Min.</button>`}
    </div>
    ${timerBar(LP, i)}
    ${reviewed ? `<div class="lp-checklist full">${checklistHtml(q, text)}</div>` : ''}
    <textarea class="input exam-input lp-paper" data-in="examAnswer" rows="12" maxlength="6000" placeholder="Schreib so, wie du es in der Klausur schreiben würdest …">${esc(text)}</textarea>
    <div class="lp-meta"><span class="lp-words">${countWords(text)} / ${wordsOf(q)} Wörter</span><span class="lp-saved">${text ? '✓ Gespeichert' : ''}</span></div>
    <div class="lp-fbar">
      ${T ? `<span class="lp-tleft">${left > 0 ? `${Math.ceil(left / 60000)} Min.` : 'Zeit um'}</span>` : ''}
      <span class="lp-words">${countWords(text)} / ${wordsOf(q)} Wörter</span>
      <span class="lp-cnt-wrap">${icon('check')}<span class="lp-cnt">${cnt}</span></span>
      ${reviewed ? '' : `<button class="lp-fdone" data-act="lpFinish">Fertig</button>`}
      <button class="lp-fx" data-act="lpFocusOff" aria-label="Fokus beenden">${icon('x')}</button>
    </div>
    <div class="lp-nofocus">
      ${reviewed ? '' : `<button class="btn" data-act="lpFinish">${icon('check')}Fertig – Checkliste und Erwartungshorizont ansehen</button>
        <p class="lp-hint center">Die Checkliste (gerade <b class="lp-cnt">${cnt}</b>) siehst du erst nach dem Schreiben – wie bei einer echten Korrektur.</p>`}
      ${S.study?.ai && reviewed ? `<button class="btn" data-act="lpCheckApply" ${S.busy.check ? 'disabled' : ''}>${S.busy.check ? '<span class="spin"></span>Wird bewertet …' : `${icon('spark')}Antwort bewerten lassen`}</button>` : ''}
      ${r ? `<div class="exam-res"><div class="er-top"><b class="pt big ${r.points >= 13 ? 'g1' : r.points >= 10 ? 'g2' : r.points >= 5 ? 'g3' : 'g4'}">${r.points}</b><span>${esc(r.verdict)}</span></div>
        ${r.good?.length ? `<b class="er-h ok">Gut</b><ul>${r.good.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
        ${r.missing?.length ? `<b class="er-h bad">Fehlt noch</b><ul>${r.missing.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
        ${r.tip ? `<p class="er-tip">${icon('spark')}${esc(r.tip)}</p>` : ''}</div>` : ''}
      ${reviewed ? `<details class="expect" open><summary>Erwartungshorizont</summary><p>${esc(q.expectation)}</p></details>` : ''}
      ${i + 1 < qs.length ? `<button class="btn soft" data-act="lpGo" data-v="${i + 1}">Nächste Aufgabe</button>` : `<button class="btn soft" data-act="lpStage" data-v="done">Zur Abgabe</button>`}
    </div>`;
}

/** Fokus-Modus an/aus ohne Neuzeichnen (der Cursor bleibt im Textfeld). */
export function setFocus(S, on) {
  if (!S.lp || S.lp.stage !== 'apply') return;
  S.lp.focus = on;
  document.querySelector('.learn-page')?.classList.toggle('focus', on);
}

function doneStage(S, s) {
  const p = pathOf(s.id);
  const prog = progress(s.id);
  const qs = s.material.questions || [];
  const rows = qs.map((q, i) => {
    const st = checkState(q, prog.answers?.[i] || '');
    const n = st.filter((x) => x.ok).length;
    return `<li><span>${i + 1}. ${esc(q.operator)}</span><b>${countWords(prog.answers?.[i])} Wörter · ${n}/${st.length} ✓</b></li>`;
  }).join('');
  return `${cardHead('·', 'Abgabe', 0, 'Dein Stand für heute. Was noch nicht sitzt, wiederholst du morgen zuerst.')}
    <ul class="lp-sum">
      <li><span>Lernzettel</span><b>${p.sheet ? 'gelesen ✓' : 'noch offen'}</b></li>
      <li><span>Multiple Choice</span><b>${p.mc == null ? 'noch offen' : `${p.mc} %`}</b></li>
      <li><span>Lückentext</span><b>${p.cloze == null ? 'noch offen' : `${p.cloze} %`}</b></li>
      ${rows}
    </ul>
    <button class="btn" data-act="lpSubmit">${icon('check')}${p.submitted ? 'Erneut abgeben' : 'Für heute abgeben'}</button>
    ${p.submitted ? `<p class="lp-hint">Zuletzt abgegeben: ${esc(new Date(p.submitted).toLocaleString('de-DE', { weekday: 'short', hour: '2-digit', minute: '2-digit' }))}</p>` : ''}`;
}

/** Karte im Lernset, die die Lernseite öffnet. */
export function startCard(S, s) {
  if (!hasPath(s)) return '';
  const p = pathOf(s.id);
  const next = !unlocked(s.id, 'cloze') ? 0 : !unlocked(s.id, 'apply') ? 1 : 2;
  return `<button class="lp-start" data-act="lpOpen" data-v="${esc(s.id)}">
    <span class="lp-steps">${STAGES.map(([k, l], n) => `<i class="${n < next ? 'done' : n === next ? 'now' : ''}">${n < next ? '✓' : n + 1}</i>`).join('<em></em>')}</span>
    <b>${next === 0 && p.mc == null ? 'Lernen starten' : 'Weiterlernen'}</b>
    <small>Lernzettel → Multiple Choice → Lückentext → Anwenden</small></button>`;
}

export { saveProgress };
