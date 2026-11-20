// Punktlandung – Chat „Frag Punktlandung“. Verlauf nur auf dem Handy (pl.chat bzw. pl.chat.<Lernset>).
import { esc, icon } from './ui.js';
import { HJ, abi, hjResult, hjsOf, fmt1 } from './grades.js';

const key = (setId) => (setId ? 'pl.chat.' + setId : 'pl.chat');
export function loadChat(setId) {
  try { return JSON.parse(localStorage.getItem(key(setId)) || '[]'); } catch { return []; }
}
export function saveChat(setId, msgs) {
  try { localStorage.setItem(key(setId), JSON.stringify(msgs.slice(-40))); } catch { /* egal */ }
}

/** Sicheres Mini-Markdown: **fett**, Listen mit „- “, Absätze, Links. */
export function md(text) {
  const lines = esc(String(text || '')).split('\n');
  const out = [];
  let list = false;
  for (const raw of lines) {
    const line = raw.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
      .replace(/(https?:\/\/[^\s<)]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');
    const li = /^\s*(?:[-•*]|\d+\.)\s+(.*)$/.exec(line);
    if (li) {
      if (!list) { out.push('<ul>'); list = true; }
      out.push(`<li>${li[1]}</li>`);
      continue;
    }
    if (list) { out.push('</ul>'); list = false; }
    if (line.trim()) out.push(`<p>${line}</p>`);
  }
  if (list) out.push('</ul>');
  return out.join('');
}

/** Noten kompakt als Text für den Chat (nur wenn der Schalter an ist). */
export function gradesText(G) {
  if (!G?.subjects?.length) return '';
  const rows = G.subjects.map((s) => {
    const hj = hjsOf(s).map((i) => { const r = hjResult(G, s.id, i); return `${HJ[i]} ${r ? r.pts + (r.est ? '~' : '') : '–'}`; }).join(', ');
    const ex = G.exams?.[s.id] != null ? `, Abiprüfung ${G.exams[s.id]}` : '';
    return `- ${s.name}${s.lk && !/\bLK$/.test(s.name) ? ' (LK)' : ''}${s.abi ? ` (Abifach ${s.abi})` : ''}${s.q1 ? ' (nur Q1)' : ''}: ${hj}${ex}`;
  });
  const r = abi(G);
  const tail = [
    G.bll?.on ? `Besondere Lernleistung (5. Abifach): ${G.bll.pts ?? 'noch offen'}` : '',
    r ? `Hochrechnung: Block I ${r.block1}/600, Block II ${r.block2}/300, gesamt ${r.total}/900${r.note ? `, Note ${fmt1(r.note)}` : ''}${r.est ? ' (teils geschätzt)' : ''}` : '',
    G.goal ? `Wunschnote: ${fmt1(G.goal)}` : '',
  ].filter(Boolean);
  return [...rows, ...tail].join('\n') + '\n(~ = aus Klausur/Mitarbeit geschätzt)';
}

const SUGGEST = [
  'Was habe ich morgen?',
  'Welche Hausaufgaben sind als Nächstes dran?',
  'Erklär mir ein Thema einfach',
  'Wie viele Punkte brauche ich fürs Abi in NRW?',
];
const SUGGEST_SET = ['Fass das Thema in 5 Sätzen zusammen', 'Stell mir eine schwere Frage dazu', 'Was kommt wahrscheinlich in der Klausur dran?', 'Erklär mir den schwierigsten Begriff'];

export function chatFab() {
  return `<button class="chat-fab" data-act="chatOpen" aria-label="Frag Punktlandung">${icon('spark')}</button>`;
}

export function chatSheet(S) {
  const C = S.chat;
  const msgs = C.msgs;
  const ai = S.study?.ai !== false;
  const body = msgs.length
    ? msgs.map((m) => `<div class="msg ${m.role}">${m.role === 'assistant' ? md(m.content) + (m.web ? '<small class="web">mit Websuche</small>' : '') : `<p>${esc(m.content)}</p>`}</div>`).join('')
    : `<div class="chat-empty"><b>${C.setId ? 'Frag mich zu diesem Lernstoff' : 'Frag mich alles'}</b>
        <span>${C.setId ? 'Ich kenne die Zusammenfassung und die Karten aus deinem Lernset.' : 'Stundenplan, Hausaufgaben, Klausuren, Abi – oder einfach Stoff, den du nicht verstehst.'}</span>
        <div class="chips">${(C.setId ? SUGGEST_SET : SUGGEST).map((q) => `<button class="chip" data-act="chatAsk" data-v="${esc(q)}">${esc(q)}</button>`).join('')}</div></div>`;
  return `<div class="sheet-body chat-sheet">
    <div class="chat-head"><h3 class="sheet-title">${icon('spark')}${C.setId ? esc(C.title || 'Fragen zum Material') : 'Frag Punktlandung'}</h3>
      ${msgs.length ? '<button class="mini" data-act="chatClear">Neu</button>' : ''}</div>
    ${C.setId ? '' : `<label class="row chat-opt"><span class="label">Noten mitschicken<small>Nur für diese Fragen – sonst bleiben sie auf dem Handy</small></span><input type="checkbox" class="switch" data-act="chatGrades" ${C.grades ? 'checked' : ''}></label>`}
    <div class="chat-log">${body}${C.busy ? '<div class="msg assistant typing"><i></i><i></i><i></i></div>' : ''}</div>
    ${ai ? (S.study?.aiName === 'gemini' ? '<p class="muted small-note">Kostenlose KI: Gemini von Google. Google darf die Fragen im Gratis-Paket zur Verbesserung nutzen – schreib nichts Privates hinein.</p>' : '') : '<p class="muted small-note">Die KI ist auf dem Server noch nicht eingerichtet (API-Schlüssel fehlt).</p>'}
    <form class="chat-input" data-submit="chatSend">
      <textarea class="input" name="q" rows="1" maxlength="4000" placeholder="Deine Frage …" ${C.busy ? 'disabled' : ''}>${esc(C.draft || '')}</textarea>
      <button class="send" type="submit" aria-label="Senden" ${C.busy ? 'disabled' : ''}>${icon('send')}</button>
    </form>
  </div>`;
}
