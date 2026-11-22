// Punktlandung – Aufgabenstellung, Lernzettel und tägliche Übung bis zur Klausur (Ansichten).
import { esc, icon } from './ui.js';
import { today, dateLong, dayWord, addDays, daysFromToday } from './lib.js';
import { progress, saveProgress } from './study.js';

export const TASK_CHIPS = [
  'Sachtextanalyse + Erörterung', 'Gedichtinterpretation', 'Dramenszene analysieren', 'Quellenanalyse + Beurteilung',
  'Karikatur / Statistik auswerten', 'Comment / Mediation', 'Rechen- und Anwendungsaufgaben', 'Versuch auswerten',
];

/** Feld „Was kommt dran?“ */
export function taskBlock(S, s) {
  const v = S._taskDraft?.[s.id] ?? s.task ?? '';
  return `<div class="task-block">
    <label class="field"><span>Was kommt in der Klausur dran? (Aufgabenstellung)</span>
      <input class="input" data-in="studyTaskIn" value="${esc(v)}" maxlength="300" placeholder="z. B. Sachtextanalyse + Erörterung, Operatoren: analysieren, beurteilen"></label>
    <div class="chips task-chips">${TASK_CHIPS.map((c) => `<button class="chip ${v === c ? 'on' : ''}" data-act="studyTaskChip" data-v="${esc(c)}">${esc(c)}</button>`).join('')}</div>
  </div>`;
}

/** Knopf / Status für Lernzettel + Tagesübungen (nur mit KI). */
export function prepBlock(S, s) {
  if (!S.study?.ai) {
    if (S.demo || !s.docs.length) return '';
    return `<div class="ai-off"><b>KI-Übungen sind noch aus</b>
      <span>Auf dem Server fehlt der kostenlose Gemini-Schlüssel – deshalb gibt es bisher nur den einfachen Lernplan unten.</span>
      <span>So schaltest du sie ein: Supabase → Projekt <b>Bergauf</b> → <b>Edge Functions</b> → <b>Secrets</b> → Name <code>GEMINI_API_KEY</code>, Wert = dein Schlüssel aus <b>aistudio.google.com</b> („Get API key“). Danach die App neu öffnen – die Übungen entstehen dann von selbst.</span></div>`;
  }
  if (s.prepStatus === 'working') {
    return `<div class="gen-wait"><span class="spin"></span><span><b>Lernzettel und Tagesübungen werden erstellt …</b><small>Meist 1–2 Minuten. Du kannst das Blatt schließen.</small></span></div>`;
  }
  const err = s.prepStatus === 'error' && s.prepError ? `<p class="gen-err">${esc(s.prepError)}</p>` : '';
  return `<button class="btn ${s.plan ? 'soft' : ''}" data-act="studyPrep" ${s.docs.length ? '' : 'disabled'}>${icon('spark')}${s.plan ? 'Lernzettel & Übungen neu erstellen' : 'Lernzettel & tägliche Übung erstellen'}</button>
    ${s.docs.length ? '' : '<p class="muted small-note">Lade zuerst dein Material hoch.</p>'}${err}`;
}

/** Index des heutigen (oder nächsten offenen) Übungstags. */
export function dayIndex(plan, pick) {
  const days = plan?.days || [];
  if (pick) { const i = days.findIndex((d) => d.date === pick); if (i >= 0) return i; }
  const t = today();
  const i = days.findIndex((d) => d.date === t);
  if (i >= 0) return i;
  if (days.length && t < days[0].date) return 0;
  return days.length - 1;
}

/** Übungstage ab heute bis zum Tag vor der Klausur (1–14), ohne Datum 7 – wie auf dem Server. */
export function planDates(exam, from = today()) {
  const n = exam ? Math.max(1, Math.min(14, daysFromToday(exam) - daysFromToday(from))) : 7;
  return Array.from({ length: n }, (_, i) => addDays(from, i));
}

/**
 * Lernplan ohne KI: sofort da, sobald Material hochgeladen ist. Phasen: sichten → zusammenfassen →
 * Karteikarten → Klausuraufgaben üben → Generalprobe. Erledigt-Häkchen nur auf dem Handy.
 */
export function localPlan(s) {
  if (!s?.docs?.length) return null;
  const p = progress(s.id);
  // Startdatum merken, damit „Tag 1“ nicht jeden Tag neu beginnt (neu ab heute, wenn sich das Klausurdatum ändert).
  if (!p.localStart || p.localStart > today() || p.localExam !== (s.examDate || '')) {
    p.localStart = today();
    p.localExam = s.examDate || '';
    saveProgress(s.id, p);
  }
  const start = p.localStart;
  const dates = planDates(s.examDate, start);
  const n = dates.length;
  // iPhone-Fotos heißen oft nur nach einer Kennung (z. B. „e8291628-22d6-…“) – dann neutral „Foto 1“ usw.
  const docs = s.docs.map((d, k) => {
    const n = d.name.replace(/\.[^.]+$/, '');
    return /^[0-9a-f]{8}-[0-9a-f]{4}-|^IMG_\d+$|^image\d*$/i.test(n) ? `${d.mime === 'application/pdf' ? 'Dokument' : 'Foto'} ${k + 1}` : n;
  });
  const doc = (i) => docs[i % docs.length];
  const task = s.task ? `im Stil „${s.task}“` : 'wie in der Klausur';
  const days = dates.map((date, i) => {
    const pos = n === 1 ? 1 : i / (n - 1);
    let focus; let minutes; let steps;
    if (i === n - 1 && n > 1) {
      focus = 'Generalprobe'; minutes = 30;
      steps = ['Alle Karteikarten einmal durchgehen – nur die „Nochmal“-Karten wiederholen', `Eine Aufgabe ${task} unter Zeitdruck lösen`, 'Unklare Punkte notieren und morgen früh kurz anschauen'];
    } else if (i === 0) {
      focus = 'Material sichten'; minutes = 20;
      steps = [`Alles Material durchblättern (${docs.length} ${docs.length === 1 ? 'Dokument' : 'Dokumente'})`, 'Überschriften und wichtige Begriffe markieren', 'Notieren: Was kann ich schon? Was ist unklar?'];
    } else if (pos < 0.4) {
      focus = `Zusammenfassen: ${doc(i - 1)}`; minutes = 25;
      steps = [`„${doc(i - 1)}“ in eigenen Worten zusammenfassen`, 'Fachbegriffe mit Erklärung herausschreiben', '3 Karteikarten dazu schreiben'];
    } else if (pos < 0.7) {
      focus = 'Karteikarten lernen'; minutes = 20;
      steps = ['Alle Karten einmal lernen („Gewusst / Nochmal“)', `Neue Karten zu „${doc(i)}“ ergänzen`, 'Schwierige Karten laut erklären'];
    } else {
      focus = 'Klausuraufgaben üben'; minutes = 30;
      steps = [`Eine Übungsaufgabe ${task} schriftlich lösen`, 'Mit dem Material vergleichen und Fehler markieren', 'Nur die offenen Karteikarten wiederholen'];
    }
    return { date, focus, minutes, steps, warmup: [], task: {} };
  });
  return { local: true, start, days, done: p.localDone || {} };
}

/** Der angezeigte Plan: der KI-Plan, sonst der Plan ohne KI. */
export const planOf = (s) => s?.plan || localPlan(s);

export function todayOpen(s) {
  const t = today();
  const plan = planOf(s);
  return !!plan?.days?.some((d) => d.date === t) && !plan?.done?.[t];
}

/** Ansicht „Heute“: Übung des Tages. */
export function todayView(S, s, L) {
  const plan = planOf(s);
  const days = plan.days || [];
  const i = dayIndex(plan, L.pd);
  const d = days[i];
  if (!d) return '<p class="muted">Kein Übungstag gefunden.</p>';
  const done = !!plan.done?.[d.date];
  const doneN = days.filter((x) => plan.done?.[x.date]).length;
  const p = progress(s.id);
  const res = p.dayResults?.[d.date];
  const t = today();
  const strip = days.map((x, k) => `<button class="day-dot ${plan.done?.[x.date] ? 'done' : ''} ${x.date === t ? 'today' : ''} ${k === i ? 'on' : ''}" data-act="dayPick" data-v="${x.date}" aria-label="Tag ${k + 1}">${k + 1}</button>`).join('');
  return `<div class="day-strip">${strip}</div>
    <div class="cards-top"><span>Tag ${i + 1} von ${days.length} · ${esc(d.date === t ? 'heute' : dayWord(d.date))}</span><span>${doneN} erledigt</span></div>
    <div class="pbar"><i style="width:${(doneN / Math.max(1, days.length)) * 100}%"></i></div>
    <h4 class="day-focus">${esc(d.focus)}${d.minutes ? `<small> · ca. ${d.minutes} Min.</small>` : ''}</h4>
    ${plan.local ? `<ol class="day-steps">${d.steps.map((x) => `<li>${esc(x)}</li>`).join('')}</ol>
      ${S.study?.ai ? (s.prepStatus === 'working' ? '<p class="muted small-note"><span class="spin"></span> Die KI erstellt gerade passende Übungen und einen Lernzettel – sie ersetzen dann diesen Plan.</p>' : '') : '<p class="muted small-note">Dein Lernplan bis zur Klausur. Tipp: Trag oben das Klausurdatum und die Aufgabenstellung ein.</p>'}` : ''}
    ${d.warmup.length ? `<div class="warmup"><b>Aufwärmen</b>${d.warmup.map((w, k) => `<details class="wq"><summary>${k + 1}. ${esc(w.q)}</summary><p>${esc(w.a)}</p></details>`).join('')}</div>` : ''}
    ${d.task.prompt ? `<div class="day-task"><b>Klausur-Übung${d.task.minutes ? ` · ca. ${d.task.minutes} Min.` : ''}</b>
      <p class="quiz-q">${d.task.operator ? `<span class="op">${esc(d.task.operator)}</span> ` : ''}${esc(d.task.prompt)}</p>
      <textarea class="input exam-input" data-in="dayAnswer" rows="6" maxlength="6000" placeholder="Deine Antwort …">${esc(p.dayAnswers?.[d.date] || '')}</textarea>
      ${S.study?.ai ? `<button class="btn soft" data-act="dayCheck" ${S.busy.check ? 'disabled' : ''}>${S.busy.check ? '<span class="spin"></span>Wird bewertet …' : `${icon('spark')}Antwort bewerten lassen`}</button>` : ''}
      ${res ? `<div class="exam-res"><div class="er-top"><b class="pt big ${res.points >= 13 ? 'g1' : res.points >= 10 ? 'g2' : res.points >= 5 ? 'g3' : 'g4'}">${res.points}</b><span>${esc(res.verdict)}</span></div>
        ${res.good?.length ? `<b class="er-h ok">Gut</b><ul>${res.good.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
        ${res.missing?.length ? `<b class="er-h bad">Fehlt noch</b><ul>${res.missing.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
        ${res.tip ? `<p class="er-tip">${icon('spark')}${esc(res.tip)}</p>` : ''}</div>` : ''}
      <details class="expect"><summary>Erwartungshorizont zeigen</summary><p>${esc(d.task.expectation)}</p></details></div>` : ''}
    <button class="btn ${done ? 'soft' : ''}" data-act="dayDone" data-v="${d.date}" data-done="${done ? '0' : '1'}">${icon('check')}${done ? 'Erledigt – rückgängig machen' : plan.local ? 'Heute gelernt' : 'Übung erledigt'}</button>
    ${plan.local ? '' : reminderRow(s)}`;
}

/** Tägliche Erinnerung an die Übung (Tagesplan und Abgabe der Lernseite). */
export function reminderRow(s) {
  const hour = s.remindHour ?? 17;
  return `<label class="row remind-row"><span class="label">Tägliche Erinnerung<small>Push an jedem Übungstag, bis du sie erledigt hast</small></span>
      <select class="input inline" data-in="remindHour">${[[-1, 'aus'], [7, '7 Uhr'], [13, '13 Uhr'], [15, '15 Uhr'], [16, '16 Uhr'], [17, '17 Uhr'], [18, '18 Uhr'], [19, '19 Uhr'], [20, '20 Uhr']]
        .map(([h, l]) => `<option value="${h}" ${hour === h ? 'selected' : ''}>${l}</option>`).join('')}</select></label>`;
}

/** Ansicht „Lernzettel“. */
export function sheetHtml(sh, s) {
  return `<div class="lz">
    <h2 class="lz-title">${esc(sh.title)}</h2>
    <p class="lz-meta">${esc(String(s.subject || '').replace(/\s+(LK|GK|ZK)$/i, ''))}${s.examDate ? ' · Klausur ' + esc(dateLong(s.examDate)) : ''}${s.task ? ' · ' + esc(s.task) : ''}</p>
    ${sh.intro ? `<p class="lz-intro">${esc(sh.intro)}</p>` : ''}
    ${sh.sections.map((x) => `<section class="lz-sec"><b>${esc(x.title)}</b><ul>${x.points.map((p) => `<li>${esc(p)}</li>`).join('')}</ul></section>`).join('')}
    ${sh.terms.length ? `<section class="lz-sec"><b>Fachbegriffe</b><dl class="terms">${sh.terms.map((k) => `<div><dt>${esc(k.term)}</dt><dd>${esc(k.def)}</dd></div>`).join('')}</dl></section>` : ''}
    ${sh.taskGuide.length ? `<section class="lz-sec lz-guide"><b>So gehst du die Aufgabe an</b><ol>${sh.taskGuide.map((p) => `<li>${esc(p.replace(/^\d+[.)]\s*/, ''))}</li>`).join('')}</ol></section>` : ''}
    ${sh.mistakes.length ? `<section class="lz-sec lz-warn"><b>Typische Fehler</b><ul>${sh.mistakes.map((p) => `<li>${esc(p)}</li>`).join('')}</ul></section>` : ''}
    ${sh.checklist.length ? `<section class="lz-sec"><b>Das musst du am Klausurtag können</b><ul class="lz-check">${sh.checklist.map((p) => `<li>${esc(p)}</li>`).join('')}</ul></section>` : ''}
  </div>`;
}

export function sheetView(s) {
  return `${sheetHtml(s.sheet, s)}<button class="btn soft" data-act="sheetPrint">${icon('share')}Drucken oder als PDF sichern</button>`;
}

/** Vorschau-Daten. */
export function demoPlan() {
  const t = today();
  return {
    task: 'Gedichtinterpretation',
    remindHour: 17,
    sheet: {
      title: 'Lyrik der Romantik', intro: 'Gedichte der Romantik (ca. 1795–1835) drücken Sehnsucht, Naturerleben und Fernweh aus.',
      sections: [{ title: 'Merkmale der Romantik', points: ['Sehnsucht nach dem Unendlichen', 'Natur als Spiegel der Seele', 'Nacht, Traum, Wandern'] },
        { title: 'Formale Analyse', points: ['Metrum und Reimschema bestimmen', 'Stilmittel mit Wirkung nennen'] }],
      terms: [{ term: 'Enjambement', def: 'Der Satz geht über das Versende hinaus.' }, { term: 'Synästhesie', def: 'Verbindung mehrerer Sinneseindrücke.' }],
      taskGuide: ['Einleitung: Autor, Titel, Jahr, Thema', 'Inhalt kurz wiedergeben', 'Form und Sprache analysieren – immer mit Wirkung', 'Deutung in Bezug zur Epoche', 'Schluss: Deutungshypothese bestätigen'],
      mistakes: ['Stilmittel nur aufzählen statt deuten', 'Lyrisches Ich mit dem Autor gleichsetzen'],
      checklist: ['5 Merkmale der Romantik nennen', 'Metrum sicher bestimmen'],
    },
    plan: {
      start: t, done: {},
      days: [0, 1, 2].map((k) => ({
        date: addDays(t, k), focus: ['Begriffe & Merkmale', 'Formanalyse üben', 'Generalprobe'][k],
        warmup: [{ q: 'Was ist ein Enjambement?', a: 'Ein Zeilensprung: Der Satz geht über das Versende hinaus.' }, { q: 'Nenne zwei Motive der Romantik.', a: 'Sehnsucht und Nacht.' }],
        task: { operator: 'analysieren', prompt: 'Analysiere die erste Strophe von Eichendorffs „Mondnacht“ hinsichtlich Form und Wirkung.', expectation: 'Kreuzreim, Jambus, Personifikation „Himmel küsst Erde“, Wirkung: Einheit von Himmel und Erde, Sehnsucht.', minutes: 20 },
      })),
    },
  };
}
