// Punktlandung – Lernen für Klausuren: Lernsets, Dokumente, KI-Lernhilfe (Überblick, Karten, Quiz, Prüfung).
import { esc, icon, hue } from './ui.js';
import { today, daysFromToday, dateLong, addDays } from './lib.js';
import * as PL from './plan.js';

const short = (s) => String(s || '').replace(/\s+(LK|GK|ZK)$/i, '');
const count = (n, one, many) => `${n} ${n === 1 ? one : many}`;

/** Lernfortschritt je Set (nur auf dem Handy): gewusste Karten, Quiz-Bestwert, eigene Antworten + Bewertungen. */
export function progress(id) {
  try { return { known: [], best: null, answers: {}, results: {}, ...JSON.parse(localStorage.getItem('pl.study.' + id) || '{}') }; } catch { return { known: [], best: null, answers: {}, results: {} }; }
}
export function saveProgress(id, p) {
  try { localStorage.setItem('pl.study.' + id, JSON.stringify(p)); } catch { /* egal */ }
}

/** Eigene Karteikarten (ohne KI) – nur auf dem Handy, je Lernset. */
export function ownCards(id) {
  try { return JSON.parse(localStorage.getItem('pl.cards.' + id) || '[]'); } catch { return []; }
}
export function saveOwnCards(id, cards) {
  try { localStorage.setItem('pl.cards.' + id, JSON.stringify(cards)); } catch { /* egal */ }
}
/** Alle Karten eines Sets: zuerst die der KI (falls vorhanden), dann die eigenen. */
export const cardsOf = (s) => [...(s?.material?.cards || []), ...ownCards(s?.id)];

function statusChip(s) {
  if (s.status === 'working' || s.prepStatus === 'working') return '<span class="st-chip work"><span class="spin"></span>Wird erstellt</span>';
  if (PL.todayOpen(s)) return '<span class="st-chip today">Übung heute</span>';
  if (s.status === 'error') return '<span class="st-chip bad">Fehler</span>';
  const n = cardsOf(s).length;
  if (n) {
    const p = progress(s.id);
    return `<span class="st-chip ok">${Math.min(p.known.length, n)}/${n} Karten</span>`;
  }
  if (s.status === 'ready') return '<span class="st-chip ok">Bereit</span>';
  return `<span class="st-chip">${count(s.docs.length, 'Dokument', 'Dokumente')}</span>`;
}

function examWhen(d) {
  if (!d) return '';
  const n = daysFromToday(d);
  return n < 0 ? 'Klausur vorbei' : n === 0 ? 'Klausur heute' : n === 1 ? 'Klausur morgen' : `Klausur in ${n} Tagen`;
}

/** Abschnitt im Aufgaben-Tab. */
export function studySection(S, blocks) {
  const st = S.study;
  const sets = st?.sets || [];
  const t = today();
  // Kommende Klausuren aus dem Plan, für die es noch kein Lernset gibt
  const seen = new Set();
  const exams = blocks.filter((b) => b.st === 'exam' && b.d >= t).filter((b) => {
    const k = b.d + b.sl;
    if (seen.has(k)) return false;
    seen.add(k);
    return !sets.some((s) => short(s.subject) === short(b.sl) && s.examDate === b.d);
  }).slice(0, 3);
  const cards = sets.map((s) => `<button class="study-card" data-act="studyOpen" data-v="${esc(s.id)}" style="--h:${hue(s.su, s.subject)}">
      <i class="subj-dot"></i>
      <span class="sc-txt"><b>${esc(s.material?.topic || s.title || short(s.subject))}</b><small>${esc(short(s.subject))}${s.examDate ? ' · ' + esc(examWhen(s.examDate)) : ''}</small></span>
      ${statusChip(s)}
    </button>`).join('');
  const sugg = exams.map((b) => `<button class="study-sugg" data-act="studyNew" data-subject="${esc(b.sl)}" data-su="${esc(b.su)}" data-date="${b.d}" style="--h:${hue(b.su, b.sl)}">
      ${icon('plus')}<span>Für <b>${esc(short(b.sl))}</b> lernen<small>${esc(examWhen(b.d))} · Material hochladen</small></span></button>`).join('');
  return `<section class="study" aria-label="Lernen">
    <div class="hw-head"><small>Lernen für Klausuren${sets.length ? ` · ${sets.length}` : ''}</small>
      <button class="hw-add" data-act="studyNew" aria-label="Neues Lernset">${icon('plus')}</button></div>
    ${st?.loading && !sets.length ? '<div class="study-empty"><span class="spin"></span></div>' : ''}
    ${cards}${sugg}
    ${!sets.length && !exams.length && !st?.loading ? `<button class="study-empty" data-act="studyNew"><b>Lade Arbeitsblätter, Hefteinträge oder PDFs hoch</b><span>${st?.ai ? 'Die KI macht daraus eine Zusammenfassung, Karteikarten, ein Quiz und Klausurfragen – und bewertet deine Antworten.' : 'Schau dir dein Material an, schreib dir Karteikarten dazu und lern sie mit „Gewusst / Nochmal“.'}</span></button>` : ''}
  </section>`;
}

/** Blatt: neues Lernset anlegen. */
export function newSetSheet(S, A) {
  const subjects = [...new Map((S.state?.snapshot?.blocks || []).map((b) => [b.sl, b.su])).entries()]
    .filter(([n]) => n).sort((a, b) => a[0].localeCompare(b[0], 'de'));
  if (A.subject && !subjects.some(([n]) => n === A.subject)) subjects.unshift([A.subject, A.su]);
  return `<div class="sheet-body">
    <h3 class="sheet-title">Neues Lernset</h3>
    <div class="field-row"><span>Fach</span></div>
    <div class="chips subj-chips">${subjects.map(([n, su]) => `<button class="chip ${n === A.subject ? 'on' : ''}" style="--h:${hue(su, n)}" data-act="studySet" data-k="subject" data-v="${esc(n)}" data-su="${esc(su || '')}"><i></i>${esc(short(n))}</button>`).join('')}</div>
    <label class="field"><span>Thema (optional)</span><input class="input" data-in="studyTitle" value="${esc(A.title || '')}" maxlength="100" placeholder="z. B. Globalisierung, Analysis"></label>
    <label class="field"><span>Klausur am (optional)</span><input class="input" type="date" data-in="studyDate" value="${esc(A.examDate || '')}" min="${today()}"></label>
    <button class="btn" data-act="studyCreate" ${A.subject && !S.busy.study ? '' : 'disabled'}>${S.busy.study ? '<span class="spin"></span>' : ''}Anlegen & Material hochladen</button>
    <button class="btn link" data-act="closeSheet">Abbrechen</button>
  </div>`;
}

function docIcon(d) {
  return d.mime === 'application/pdf' ? 'PDF' : d.mime === 'text/plain' ? 'TXT' : 'FOTO';
}

/** Blatt: ein Lernset – Dokumente, KI-Knopf, Lernmodi. */
export function setSheet(S, s, V) {
  if (!s) return '<div class="sheet-body"><p class="muted">Lernset nicht gefunden.</p><button class="btn soft" data-act="closeSheet">Schließen</button></div>';
  const ai = S.study?.ai;
  const m = s.material;
  const docs = s.docs.map((d) => `<div class="doc"><span class="doc-ico">${docIcon(d)}</span><button class="doc-name" data-act="docView" data-v="${esc(d.id)}">${esc(d.name)}<small>${(d.size / 1024 / 1024).toFixed(d.size > 1048576 ? 1 : 2).replace('.', ',')} MB · ansehen</small></button>
      <button class="x" data-act="studyDocDel" data-v="${esc(d.id)}" aria-label="Entfernen">${icon('x')}</button></div>`).join('');
  const upBusy = S.busy.upload;
  const gen = !ai ? ''
    : s.status === 'working'
      ? `<div class="gen-wait"><span class="spin"></span><span><b>Die KI liest dein Material …</b><small>Das dauert meist 1–2 Minuten. Du kannst das Blatt schließen – es läuft weiter.</small></span></div>`
      : `<button class="btn ${m ? 'soft' : ''}" data-act="studyGen" ${s.docs.length ? '' : 'disabled'}>${icon('spark')}${m ? 'Mit neuem Material neu erstellen' : 'Lernhilfe mit KI erstellen'}</button>`;
  const err = ai && s.status === 'error' && s.error ? `<p class="gen-err">${esc(s.error)}</p>` : '';
  const showModes = s.status !== 'working';
  return `<div class="sheet-body study-sheet" style="--h:${hue(s.su, s.subject)}">
    <div class="sheet-kicker">${esc(short(s.subject))}${s.examDate ? ' · ' + esc(dateLong(s.examDate)) + ' · ' + esc(examWhen(s.examDate)) : ''}</div>
    <h3 class="sheet-title"><i class="subj-dot"></i>${esc(m?.topic || s.title || 'Lernset')}</h3>
    ${showModes ? modes(S, s, V) : ''}
    ${PL.taskBlock(S, s)}
    ${PL.prepBlock(S, s)}
    ${ai && m && showModes ? `<button class="btn soft" data-act="chatOpen" data-set="${esc(s.id)}">${icon('spark')}Fragen zum Material stellen</button>` : ''}
    <h4 class="group-label">Material · ${s.docs.length}</h4>
    <div class="docs">${docs || '<p class="muted">Noch nichts hochgeladen. Fotografier Arbeitsblätter und Hefteinträge oder lade PDFs hoch.</p>'}</div>
    ${upBusy ? `<div class="btn soft up-busy"><span class="spin"></span>${esc(upBusy)}</div>` : `<div class="up-btns">
      <label class="btn soft up">${icon('plus')}Fotos<input type="file" accept="image/*" multiple data-file="study" aria-label="Fotos hinzufügen"></label>
      <label class="btn soft up">${icon('plus')}PDF / Datei<input type="file" accept="application/pdf,.pdf,text/plain,.txt" multiple data-file="study" aria-label="PDF oder Datei hinzufügen"></label>
    </div>`}
    ${gen}${err}
    <p class="fine">Dein Material wird auf dem Punktlandung-Server gespeichert${ai ? (S.study?.aiName === 'gemini' ? ' und zum Erstellen an die kostenlose KI Gemini von Google geschickt (im Gratis-Paket darf Google die Inhalte zur Verbesserung seiner Dienste nutzen – lad also nichts Privates hoch)' : ' und zum Erstellen an die KI (Claude von Anthropic) geschickt') : ''}; deine eigenen Karteikarten bleiben auf dem Handy. Lösch das Lernset, wenn du es nicht mehr brauchst.</p>
    <button class="btn link" data-act="studyDel" data-v="${esc(s.id)}">${S._studyDel === s.id ? 'Wirklich löschen? Nochmal tippen' : 'Lernset löschen'}</button>
  </div>`;
}

function modes(S, s, V) {
  const L = S.learn;
  const m = s.material;
  const tabs = [
    ...(PL.planOf(s) ? [['today', 'Heute']] : []),
    ...(s.sheet ? [['sheet', 'Lernzettel']] : []),
    ...(m ? [['over', 'Überblick'], ['cards', 'Karten'], ['quiz', 'Quiz'], ['exam', 'Prüfung'], ['edit', 'Eigene']]
      : [['cards', PL.planOf(s) ? 'Karten' : 'Karten lernen'], ['edit', PL.planOf(s) ? 'Eigene' : 'Karten schreiben']]),
  ];
  const mode = tabs.some(([k]) => k === L.mode) ? L.mode : tabs[0][0];
  const body = mode === 'today' ? PL.todayView(S, s, L) : mode === 'sheet' ? PL.sheetView(s)
    : mode === 'edit' ? editMode(s, L) : mode === 'cards' ? cardsMode(s, L) : mode === 'quiz' ? quizMode(s, L) : mode === 'exam' ? examMode(S, s, L) : overview(m);
  return `<div class="seg small learn-seg">${tabs.map(([k, l]) => `<button class="${mode === k ? 'on' : ''}" data-act="learnMode" data-v="${k}">${l}</button>`).join('')}</div>
    <div class="learn">${body}</div>`;
}

function overview(m) {
  const sum = m.summary || {};
  return `<p class="ov-lead">${esc(sum.overview || '')}</p>
    ${(sum.sections || []).map((sec) => `<div class="ov-sec"><b>${esc(sec.title)}</b><ul>${(sec.points || []).map((p) => `<li>${esc(p)}</li>`).join('')}</ul></div>`).join('')}
    ${(sum.keyTerms || []).length ? `<div class="ov-sec"><b>Fachbegriffe</b><dl class="terms">${sum.keyTerms.map((k) => `<div><dt>${esc(k.term)}</dt><dd>${esc(k.explanation)}</dd></div>`).join('')}</dl></div>` : ''}`;
}

/** Reihenfolge der Karten: zuerst die noch nicht gewussten. */
export function cardOrder(s, onlyOpen) {
  const n = cardsOf(s).length;
  const known = new Set(progress(s.id).known);
  const all = Array.from({ length: n }, (_, i) => i);
  return onlyOpen ? all.filter((i) => !known.has(i)) : all;
}

function cardsMode(s, L) {
  const cards = cardsOf(s);
  const p = progress(s.id);
  if (!cards.length) {
    return `<div class="learn-done"><b>Noch keine Karten</b><span>Schreib dir Karten zu deinem Material – Frage vorne, Antwort hinten.</span>
      <button class="btn" data-act="learnMode" data-v="edit">${icon('plus')}Erste Karte schreiben</button></div>`;
  }
  const order = cardOrder(s, L.onlyOpen);
  if (!order.length) {
    return `<div class="learn-done"><b>🎉 Alle ${cards.length} Karten gewusst!</b><span>Stark.${s.material?.quiz?.length ? ' Mach zur Sicherheit noch das Quiz.' : ' Üb sie kurz vor der Klausur noch einmal.'}</span>
      <button class="btn soft" data-act="cardsReset">Von vorn üben</button></div>`;
  }
  const pos = Math.min(L.ci, order.length - 1);
  const c = cards[order[pos]];
  const knownN = p.known.filter((i) => i < cards.length).length;
  return `<div class="cards-top"><span>${pos + 1} / ${order.length}${L.onlyOpen ? ' offen' : ''}</span><span>${knownN} von ${cards.length} gewusst</span></div>
    <div class="pbar"><i style="width:${(knownN / Math.max(1, cards.length)) * 100}%"></i></div>
    <button class="flash ${L.flip ? 'flip' : ''}" data-act="cardFlip" aria-label="Karte umdrehen">
      <span class="face front"><small>Frage</small>${esc(c.front)}<em>Tippen zum Umdrehen</em></span>
      <span class="face back"><small>Antwort</small>${esc(c.back)}</span>
    </button>
    ${L.flip ? `<div class="card-btns"><button class="btn soft" data-act="cardAgain">Nochmal</button><button class="btn" data-act="cardKnown">${icon('check')}Gewusst</button></div>`
      : '<div class="card-btns"><button class="btn soft" data-act="cardFlip">Antwort zeigen</button></div>'}
    <label class="row only-open"><span class="label">Nur Karten, die ich noch nicht kann</span><input type="checkbox" class="switch" data-act="cardsOnlyOpen" ${L.onlyOpen ? 'checked' : ''}></label>`;
}

function editMode(s, L) {
  const own = ownCards(s.id);
  const offset = s.material?.cards?.length || 0;
  return `<form class="card-form" data-submit="cardAdd">
      <label class="field"><span>Vorderseite (Frage oder Begriff)</span><textarea class="input" name="front" rows="2" maxlength="300" required placeholder="z. B. Was ist Outsourcing?"></textarea></label>
      <label class="field"><span>Rückseite (Antwort)</span><textarea class="input" name="back" rows="3" maxlength="600" required placeholder="z. B. Verlagerung von Arbeit an andere Firmen oder ins Ausland"></textarea></label>
      <button class="btn" type="submit">${icon('plus')}Karte speichern</button>
    </form>
    ${own.length ? `<h4 class="group-label">Deine Karten · ${own.length}</h4><div class="own-cards">${own.map((c, i) => `<div class="own-card"><span><b>${esc(c.front)}</b><small>${esc(c.back)}</small></span>
      <button class="x" data-act="cardDel" data-v="${offset + i}" aria-label="Karte löschen">${icon('x')}</button></div>`).join('')}</div>` : ''}`;
}

function quizMode(s, L) {
  const quiz = s.material.quiz || [];
  if (!quiz.length) return '<p class="muted">Kein Quiz vorhanden.</p>';
  if (L.qi >= quiz.length) {
    const p = progress(s.id);
    const pct = Math.round((L.score / quiz.length) * 100);
    return `<div class="learn-done"><b>${L.score} von ${quiz.length} richtig (${pct} %)</b>
      <span>${pct >= 90 ? 'Hervorragend – das sitzt.' : pct >= 70 ? 'Gut! Schau dir die Fehler noch mal in den Karten an.' : 'Da geht noch was – üb die Karten und versuch es noch mal.'}${p.best != null ? ` Dein Bestwert: ${p.best} von ${quiz.length}.` : ''}</span>
      <button class="btn" data-act="quizRestart">Noch mal</button></div>`;
  }
  const q = quiz[L.qi];
  const picked = L.pick;
  return `<div class="cards-top"><span>Frage ${L.qi + 1} / ${quiz.length}</span><span>${L.score} richtig</span></div>
    <div class="pbar"><i style="width:${(L.qi / quiz.length) * 100}%"></i></div>
    <p class="quiz-q">${esc(q.question)}</p>
    <div class="quiz-opts">${q.options.map((o, i) => {
      const cls = picked == null ? '' : i === q.correct ? 'right' : i === picked ? 'wrong' : 'dim';
      return `<button class="qopt ${cls}" data-act="quizPick" data-v="${i}" ${picked != null ? 'disabled' : ''}><span>${'ABCD'[i] || i + 1}</span>${esc(o)}</button>`;
    }).join('')}</div>
    ${picked != null ? `<p class="quiz-exp ${picked === q.correct ? 'ok' : 'bad'}"><b>${picked === q.correct ? 'Richtig!' : 'Leider falsch.'}</b> ${esc(q.explanation)}</p>
      <button class="btn" data-act="quizNext">${L.qi + 1 < quiz.length ? 'Nächste Frage' : 'Ergebnis'}</button>` : ''}`;
}

function examMode(S, s, L) {
  const qs = s.material.questions || [];
  const p = progress(s.id);
  if (L.ei == null) {
    return `<p class="muted">Klausurfragen wie im Abitur. Schreib deine Antwort – die KI bewertet sie in Punkten und sagt dir, was fehlt.</p>
      <div class="exam-list">${qs.map((q, i) => {
        const r = p.results[i];
        return `<button class="exam-q" data-act="examOpen" data-v="${i}"><span class="op">${esc(q.operator)}</span><span class="eq">${esc(q.question)}</span>${r ? `<b class="pt ${r.points >= 13 ? 'g1' : r.points >= 10 ? 'g2' : r.points >= 5 ? 'g3' : 'g4'}">${r.points}</b>` : icon('right', 'chev')}</button>`;
      }).join('')}</div>`;
  }
  const q = qs[L.ei];
  const r = p.results[L.ei];
  return `<button class="btn link back" data-act="examBack">${icon('left')}Alle Fragen</button>
    <p class="quiz-q"><span class="op">${esc(q.operator)}</span> ${esc(q.question)}</p>
    <textarea class="input exam-input" data-in="examAnswer" rows="7" maxlength="6000" placeholder="Deine Antwort …">${esc(p.answers[L.ei] || '')}</textarea>
    <button class="btn" data-act="examCheck" ${S.busy.check || !S.study?.ai ? 'disabled' : ''}>${S.busy.check ? '<span class="spin"></span>Wird bewertet …' : `${icon('spark')}Antwort bewerten lassen`}</button>
    ${r ? `<div class="exam-res"><div class="er-top"><b class="pt big ${r.points >= 13 ? 'g1' : r.points >= 10 ? 'g2' : r.points >= 5 ? 'g3' : 'g4'}">${r.points}</b><span>${esc(r.verdict)}</span></div>
      ${r.good?.length ? `<b class="er-h ok">Gut</b><ul>${r.good.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
      ${r.missing?.length ? `<b class="er-h bad">Fehlt noch</b><ul>${r.missing.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
      ${r.tip ? `<p class="er-tip">${icon('spark')}${esc(r.tip)}</p>` : ''}</div>` : ''}
    <details class="expect"><summary>Erwartungshorizont zeigen</summary><p>${esc(q.expectation)}</p></details>`;
}

// ---------- Datei vorbereiten (Fotos verkleinern) ----------

export async function prepareFile(file) {
  const isImg = /^image\//.test(file.type) || /\.(jpe?g|png|heic|heif|webp)$/i.test(file.name);
  if (isImg) {
    const bmp = await createImageBitmap(file).catch(() => null);
    if (bmp) {
      const max = 2000;
      const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
      const c = document.createElement('canvas');
      c.width = Math.round(bmp.width * k);
      c.height = Math.round(bmp.height * k);
      c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
      const url = c.toDataURL('image/jpeg', 0.82);
      return { name: file.name.replace(/\.[^.]+$/, '') + '.jpg', mime: 'image/jpeg', data: url.split(',')[1] };
    }
  }
  const mime = file.type === 'application/pdf' || /\.pdf$/i.test(file.name) ? 'application/pdf' : file.type === 'text/plain' || /\.txt$/i.test(file.name) ? 'text/plain' : file.type;
  if (!['application/pdf', 'text/plain'].includes(mime)) throw new Error(`${file.name}: Nur Fotos, PDFs oder Textdateien.`);
  if (file.size > 6 * 1024 * 1024) throw new Error(`${file.name} ist zu groß (höchstens 6 MB).`);
  const data = await new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result).split(',')[1]);
    r.onerror = () => rej(r.error);
    r.readAsDataURL(file);
  });
  return { name: file.name, mime, data };
}

// ---------- Vorschau-Daten ----------

export function demoStudy(blocks) {
  const ex = blocks.find((b) => b.st === 'exam');
  return {
    ai: false,
    sets: [{ id: 'demo2', subject: 'Deutsch', su: 'D', title: 'Lyrik der Romantik', examDate: addDays(today(), 3), status: 'new', error: null, docs: [{ id: 'd3', name: 'Gedichtanalyse.jpg', mime: 'image/jpeg', size: 380000 }], material: null, ...PL.demoPlan() }, {
      id: 'demo1', subject: 'Englisch LK', su: 'E', title: 'Globalisation', examDate: addDays(today(), 7), status: 'ready', error: null,
      docs: [{ id: 'd1', name: 'Arbeitsblatt Globalisation.jpg', mime: 'image/jpeg', size: 412000 }, { id: 'd2', name: 'Hefteintrag.pdf', mime: 'application/pdf', size: 1300000 }],
      material: {
        topic: 'Globalisation – chances and challenges',
        summary: {
          overview: 'Globalisation describes the growing interconnection of economies, cultures and politics worldwide. The unit covers economic, cultural and ecological dimensions as well as winners and losers.',
          sections: [
            { title: 'Economic globalisation', points: ['Free trade and global supply chains', 'Outsourcing to low-wage countries', 'Role of the WTO and multinational companies'] },
            { title: 'Cultural globalisation', points: ['Spread of English as a lingua franca', 'Americanisation vs. glocalisation', 'Migration and identity'] },
          ],
          keyTerms: [{ term: 'outsourcing', explanation: 'Moving parts of production to other companies or countries to save costs.' }, { term: 'glocalisation', explanation: 'Adapting global products to local cultures and markets.' }],
        },
        cards: [
          { front: 'What is outsourcing?', back: 'Moving parts of production or services to external companies, often abroad, to cut costs.' },
          { front: 'Define “glocalisation”.', back: 'Global products adapted to local tastes – e.g. McDonald’s menus in India.' },
          { front: 'Name two winners of globalisation.', back: 'Multinational corporations and consumers in rich countries (cheaper goods).' },
        ],
        quiz: [
          { question: 'Which organisation sets the rules for world trade?', options: ['UNESCO', 'WTO', 'NATO', 'WHO'], correct: 1, explanation: 'The World Trade Organization negotiates and enforces trade rules.' },
          { question: 'What is a typical effect of outsourcing in industrialised countries?', options: ['More factory jobs', 'Loss of low-skilled jobs', 'Higher tariffs', 'Less trade'], correct: 1, explanation: 'Production moves abroad, so low-skilled jobs at home are lost.' },
        ],
        questions: [
          { operator: 'outline', question: 'Outline the main economic aspects of globalisation as presented in the material.', expectation: 'Free trade, global supply chains, outsourcing, role of multinationals and the WTO; structured and in own words.' },
          { operator: 'assess', question: 'Assess whether globalisation has created more winners than losers.', expectation: 'Balanced arguments for both sides, examples (consumers vs. workers in industrialised countries, emerging economies), own justified conclusion.' },
        ],
      },
      generatedAt: new Date().toISOString(),
    }, ...(ex ? [] : [])],
  };
}
