// Punktlandung – Ansichten (reines HTML aus dem Zustand).
import { esc, icon, hue, flap } from './ui.js';
import { store } from './lib.js';
import {
  today, addDays, weekday, nowMin, hhmm, daysFromToday, dayWord, dateLong, ago, until, fmtPeriod, parseDay,
  WD, WD_LONG, isIOS, isStandalone, pushSupported, permission, VERSION,
} from './lib.js';
import { HJ, KIND, noteOf, tone, fmt1, currentHj, hjResult, subjectAvg, abi, goal, hjsOf, baseName, admission, examNeed } from './grades.js';

const wordmark = (cls = '') => `<span class="wordmark ${cls}" aria-label="Punktlandung">punktlandung<span class="wm-dot"></span></span>`;

export const firstName = (S) => {
  const nick = (S.prefs.nick || '').trim();
  if (nick) return nick;
  return '';
};

// ============================================================ Einrichtung

function steps(S) {
  const order = ['school', 'login', 'push', 'done'];
  const i = Math.max(0, order.indexOf(S.ob.step));
  return `<div class="steps" aria-hidden="true">${order.map((_, k) => `<i class="${k <= i ? 'on' : ''}"></i>`).join('')}</div>`;
}

function obHead(S, back = true) {
  return `<header class="ob-head">
    ${back ? `<button class="icon-btn" data-act="obBack" aria-label="Zurück">${icon('left')}</button>` : '<span></span>'}
    ${steps(S)}
    <span class="icon-btn ghost"></span>
  </header>`;
}

const mockNote = (title, body, time, cls = '') => `
  <div class="note ${cls}">
    <div class="note-top"><img src="icons/icon-192.png" alt=""><span>PUNKTLANDUNG</span><time>${time}</time></div>
    <b>${title}</b><p>${body}</p>
  </div>`;

export const WELCOME_MSGS = [
  ['MATHE', 'FÄLLT AUS', 'MORGEN · 3.–4. STD', '🎉 Mathe fällt aus', 'Morgen · 3.–4. Stunde · 09:55–11:30'],
  ['1. STUNDE', 'AUSSCHLAFEN', 'START ERST 09:55', '😴 Ausschlafen! Deutsch fällt aus', 'Morgen · 1.–2. Stunde · Dein Tag startet erst um 09:55'],
  ['BIO', 'FREISTUNDE', 'HEUTE · 5.–6. STD', '🎉 Biologie fällt aus', 'Heute · 5.–6. Stunde · Aufgaben in Moodle'],
  ['GANZER TAG', 'FREI', 'DO · WANDERTAG', '🥳 Ganzer Tag frei!', 'Am Do, 20.11. fällt dein ganzer Unterricht aus – alle 6 Stunden.'],
];

const screws = '<i class="screw tl"></i><i class="screw tr"></i><i class="screw bl"></i><i class="screw br"></i>';

function welcome() {
  return `<section class="ob ob-welcome">
    <div class="ob-brand">${wordmark('xl')}</div>
    <div class="board welcome-board" id="wboard" aria-hidden="true">${screws}
      <div class="board-top"><span>Anzeige · Dein Stundenplan</span><span class="board-light"><i></i>Live</span></div>
      <div class="board-row">${flap('', 'main', 11)}</div>
      <div class="board-row">${flap('', 'status', 11)}</div>
      <div class="board-foot"><span class="wb-foot">&nbsp;</span><span>Punktlandung</span></div>
    </div>
    <div class="wnote-wrap" aria-hidden="true">${mockNote('', '', 'jetzt', 'wnote')}</div>
    <div class="grow"></div>
    <h1>Du weißt es <em>zuerst.</em></h1>
    <p class="lead">Fällt eine Stunde aus, landet die Nachricht sofort auf deinem Handy – bevor es jemand in die Klassengruppe schreibt.</p>
    <button class="btn" data-act="start">Los geht’s</button>
    <p class="fine">Für alle Schulen mit WebUntis · kein offizielles Untis-Produkt</p>
  </section>`;
}

function install(S) {
  return `<section class="ob">
    ${obHead(S)}
    <h1>Erst aufs <em>Handy</em> holen.</h1>
    <p class="lead">Auf dem iPhone darf Punktlandung dir nur Mitteilungen schicken, wenn es auf deinem Home-Bildschirm liegt. Dauert 10 Sekunden:</p>
    <ol class="howto">
      <li><span class="n">1</span><div>Tippe in Safari auf <b>Teilen</b> <span class="kbd">${icon('share')}</span><small>Siehst du es nicht? Erst auf <b>•••</b> tippen.</small></div></li>
      <li><span class="n">2</span><div>Wähle <b>„Zum Home-Bildschirm“</b> <span class="kbd">${icon('addHome')}</span></div></li>
      <li><span class="n">3</span><div>Öffne <b>Punktlandung</b> auf dem Home-Bildschirm und richte es dort ein.</div></li>
    </ol>
    <div class="grow"></div>
    <button class="btn ghost" data-act="browserAnyway">Erst mal im Browser ansehen</button>
  </section>`;
}

export function schoolResults(S) {
  const o = S.ob;
  if (o.searching && !o.results.length) return '<div class="hint-row"><span class="spin"></span>Suche …</div>';
  if (o.searchError) return `<div class="hint-row err">${esc(o.searchError)}</div>`;
  if (o.tooMany) return '<div class="hint-row">Zu viele Treffer – schreib noch den Ort dazu.</div>';
  if (o.query.trim().length < 3) return '<div class="hint-row">Tippe mindestens 3 Buchstaben, z. B. „Gymnasium Musterstadt“.</div>';
  if (!o.results.length) return '<div class="hint-row">Nichts gefunden. Probier’s mit dem Ort oder einem Teil des Namens.</div>';
  return o.results.map((s, i) => `
    <button class="school" data-act="pickSchool" data-i="${i}">
      <span class="school-ico">${icon('school')}</span>
      <span class="school-txt"><b>${esc(s.name)}</b><small>${esc(s.address)}</small></span>
      ${icon('right', 'chev')}
    </button>`).join('');
}

function school(S) {
  return `<section class="ob">
    ${obHead(S)}
    <h1>Deine <em>Schule?</em></h1>
    <p class="lead">Wir suchen sie direkt bei Untis.</p>
    <label class="search">${icon('search')}
      <input class="input" data-in="schoolq" type="search" placeholder="Name oder Ort deiner Schule" autocomplete="off"
        autocorrect="off" spellcheck="false" enterkeyhint="search" value="${esc(S.ob.query)}" aria-label="Schule suchen">
    </label>
    <div id="results" class="results">${schoolResults(S)}</div>
  </section>`;
}

function login(S) {
  const o = S.ob;
  const secret = o.mode === 'secret';
  const d = S.ob.draft || {};
  return `<section class="ob">
    ${obHead(S)}
    <h1>Bei <em>Untis</em> anmelden.</h1>
    <button class="school-chip" data-act="changeSchool">${icon('school')}<span>${esc(o.school?.name || '')}</span><u>ändern</u></button>
    <div class="seg" role="tablist">
      <button role="tab" class="${!secret ? 'on' : ''}" data-act="mode" data-v="password">Passwort</button>
      <button role="tab" class="${secret ? 'on' : ''}" data-act="mode" data-v="secret">Untis-Schlüssel</button>
    </div>
    <form class="form" data-submit="connect" autocomplete="on">
      <label class="field"><span>Benutzername</span>
        <input class="input" name="user" autocomplete="username" autocapitalize="none" autocorrect="off" spellcheck="false" required value="${esc(d.user || '')}">
      </label>
      ${secret ? `
      <label class="field"><span>Schlüssel</span>
        <input class="input mono" name="secret" autocomplete="off" autocapitalize="characters" autocorrect="off" spellcheck="false" required placeholder="z. B. ABCD EFGH IJKL MNOP">
      </label>
      <p class="hint">Steht in WebUntis unter <b>Profil → Freigaben</b> bei „Untis Mobile“ → <b>Anzeigen</b>. Gut, wenn deine Schule einen anderen Login nutzt (z. B. IServ oder Microsoft).</p>` : `
      <label class="field"><span>Passwort</span>
        <span class="pw"><input class="input" name="password" type="password" autocomplete="current-password" required value="${esc(S.ob.pw || '')}">
        <button type="button" class="eye" data-act="togglePw" aria-label="Passwort zeigen">${icon('eye')}</button></span>
      </label>`}
      ${o.error ? `<p class="err" role="alert">${esc(o.error)}</p>` : ''}
      <div class="privacy">${icon('lock')}<span>Wird verschlüsselt gespeichert und nur genutzt, um für dich nach Ausfällen zu schauen. Abmelden löscht alles.</span></div>
      <button class="btn" type="submit" ${o.busy ? 'disabled' : ''}>${o.busy ? '<span class="spin"></span>Verbinde mit Untis …' : 'Verbinden'}</button>
    </form>
  </section>`;
}

function pushStep(S) {
  const o = S.ob;
  const can = pushSupported();
  return `<section class="ob">
    ${obHead(S, false)}
    <h1>Sofort <em>Bescheid</em> wissen.</h1>
    <p class="lead">${can
      ? 'Erlaube Mitteilungen – dann meldet sich Punktlandung, sobald etwas ausfällt. Auch wenn die App zu ist.'
      : isIOS && !isStandalone()
        ? 'Mitteilungen gehen auf dem iPhone nur, wenn du Punktlandung über den Home-Bildschirm öffnest. Du kannst sie später unter „Ich“ einschalten.'
        : 'Dieser Browser kann leider keine Mitteilungen. Öffne Punktlandung am besten auf deinem Handy.'}</p>
    <div class="lock" aria-hidden="true">
      <div class="lock-time">07:12</div>
      <div class="lock-date">${esc(dateLong(today()))}</div>
      ${mockNote('😴 Ausschlafen! Mathe fällt aus', 'Morgen · 1.–2. Stunde · Dein Tag startet erst um 09:55', 'jetzt', 'drop')}
    </div>
    <div class="grow"></div>
    ${o.error ? `<p class="err" role="alert">${esc(o.error)}</p>` : ''}
    ${can ? `<button class="btn" data-act="allowPush" ${o.busy ? 'disabled' : ''}>${o.busy ? '<span class="spin"></span>Einen Moment …' : 'Mitteilungen erlauben'}</button>
    <button class="btn link" data-act="skipPush">Später</button>` : '<button class="btn" data-act="skipPush">Weiter</button>'}
  </section>`;
}

function done(S) {
  const st = S.state;
  const blocks = st?.snapshot?.blocks || [];
  const t = today();
  const n = nowMin();
  const upcoming = blocks.filter((b) => b.st === 'cancel' && (b.d > t || (b.d === t && b.e > n))).length;
  const summary = upcoming
    ? `Gerade ${upcoming === 1 ? 'ist schon 1 Ausfall' : `sind schon ${upcoming} Ausfälle`} in den nächsten zwei Wochen eingetragen.`
    : 'Gerade fällt nichts aus – du hörst von uns, sobald sich das ändert.';
  return `<section class="ob ob-done">
    <div class="landing" aria-hidden="true"><span class="ball"></span><span class="strip"></span></div>
    <h1>Startklar<em>.</em></h1>
    <p class="lead">Punktlandung schaut ab jetzt tagsüber alle 2 Minuten für dich bei Untis nach. ${summary}</p>
    <label class="field"><span>Wie dürfen wir dich nennen?</span>
      <input class="input" data-in="nick" value="${esc(S.prefs.nick || S.ob.nameGuess || '')}" placeholder="Dein Vorname" autocomplete="given-name" maxlength="24">
    </label>
    <div class="grow"></div>
    <button class="btn" data-act="finish">Zum Stundenplan</button>
    ${S.state?.device?.push ? `<button class="btn soft" data-act="test" ${S.busy.test ? 'disabled' : ''}>${icon('send')}Test-Nachricht schicken</button>` : ''}
  </section>`;
}

export function onboarding(S) {
  switch (S.ob.step) {
    case 'install': return install(S);
    case 'school': return school(S);
    case 'login': return login(S);
    case 'push': return pushStep(S);
    case 'done': return done(S);
    default: return welcome();
  }
}

// ============================================================ Hauptbereich

const isPast = (b, t, n) => b.d < t || (b.d === t && b.e <= n);
const units = (list) => list.reduce((s, b) => s + (b.ks?.length || 1), 0);
const MON = ['Jan.', 'Feb.', 'März', 'Apr.', 'Mai', 'Juni', 'Juli', 'Aug.', 'Sep.', 'Okt.', 'Nov.', 'Dez.'];

/** Schultage im geladenen Zeitraum (Wochenende nur, wenn dort Unterricht steht). */
export function dayList(S, blocks) {
  const snap = S.state?.snapshot;
  const t = today();
  const from = snap?.from && snap.from < t ? snap.from : t;
  const to = snap?.to || addDays(t, 13);
  const days = [];
  for (let d = from, i = 0; d <= to && i < 31; d = addDays(d, 1), i++) {
    const w = weekday(d);
    if ((w === 0 || w === 6) && !blocks.some((b) => b.d === d)) continue;
    days.push(d);
  }
  return days;
}

export function defaultDay(S) {
  const blocks = S.state?.snapshot?.blocks || [];
  const days = dayList(S, blocks);
  const t = today();
  const n = nowMin();
  if (S.day && days.includes(S.day)) return S.day;
  const todayLeft = blocks.some((b) => b.d === t && b.e > n);
  if (days.includes(t) && todayLeft) return t;
  return days.find((d) => d > t && blocks.some((b) => b.d === d)) || days.find((d) => d >= t) || days[0] || t;
}

const monday = (d) => addDays(d, -((weekday(d) + 6) % 7));

/** Die sichtbaren Tage je Ansicht (1 Tag, 3 Tage, Woche). */
export function visibleDays(S) {
  const blocks = S.state?.snapshot?.blocks || [];
  const all = dayList(S, blocks);
  const anchor = defaultDay(S);
  const view = S.prefs.view || 3;
  if (!all.length) return { all, days: [anchor], anchor };
  if (view === 5) {
    const m = monday(anchor);
    return { all, days: all.filter((d) => monday(d) === m), anchor };
  }
  if (view === 1) return { all, days: [anchor], anchor };
  let i = Math.max(0, all.indexOf(anchor));
  i = Math.min(i, Math.max(0, all.length - 3));
  return { all, days: all.slice(i, i + 3), anchor };
}

/** Neuer Ankertag beim Blättern (oder null am Rand). */
export function stepDay(S, dir) {
  const { all, days } = visibleDays(S);
  const view = S.prefs.view || 3;
  if (view === 5) {
    const m = monday(days[0]);
    const target = all.find((d) => (dir > 0 ? d > addDays(m, 6) : d < m && monday(d) === monday(addDays(m, -7))));
    return target || null;
  }
  const i = all.indexOf(days[0]);
  const j = i + dir * (view === 1 ? 1 : 3);
  if (dir > 0 && i + (view === 1 ? 1 : 3) >= all.length) return null;
  return all[Math.max(0, Math.min(all.length - 1, j))] ?? null;
}

function rangeLabel(days, view) {
  const a = parseDay(days[0]);
  const b = parseDay(days[days.length - 1]);
  if (view === 1) return esc(dateLong(days[0]));
  const left = `${view === 5 ? '' : WD[a.getDay()] + ' '}${a.getDate()}.${a.getMonth() === b.getMonth() ? '' : ' ' + MON[a.getMonth()]}`;
  const right = `${view === 5 ? '' : WD[b.getDay()] + ' '}${b.getDate()}. ${MON[b.getMonth()]}`;
  return `${left} – ${right}`;
}

function liveChip(S) {
  const acc = S.state?.account;
  if (!acc) return '';
  const bad = acc.status === 'auth_failed' || acc.status === 'error';
  const label = S.busy.refresh ? 'prüfe …' : bad ? (acc.status === 'auth_failed' ? 'Anmeldung nötig' : 'Störung') : `live · ${ago(acc.lastCheckAt).replace('gerade eben', 'jetzt')}`;
  return `<button class="live ${bad ? 'bad' : ''} ${S.busy.refresh ? 'busy' : ''}" data-act="refresh" aria-label="Jetzt prüfen">
    <i></i><span>${label}</span>${icon('refresh')}</button>`;
}

function boardDay(d) {
  const n = daysFromToday(d);
  if (n === 0) return 'heute';
  if (n === 1) return 'morgen';
  if (n === 2) return 'übermorgen';
  return `${WD_LONG[weekday(d)]}, ${Number(d.slice(8))}.${Number(d.slice(5, 7))}.`;
}

function weekFree(blocks) {
  const t = today();
  const m = monday(t);
  const sun = addDays(m, 6);
  return units(blocks.filter((b) => b.st === 'cancel' && b.d >= m && b.d <= sun));
}

/** Große Karte oben: nächster Ausfall mit Countdown, sonst Ruhe. */
function hero(S, blocks) {
  const acc = S.state?.account;
  const t = today();
  const n = nowMin();
  const free = weekFree(blocks);
  const chip = free ? `<span class="hero-chip">Diese Woche ${free} ${free === 1 ? 'Stunde' : 'Stunden'} frei</span>` : '';
  if (acc?.status === 'auth_failed') {
    return `<section class="hero bad" data-act="relogin" role="button">
      <small>Untis</small><b>🔑 Anmeldung erneuern</b><p>Untis lässt Punktlandung gerade nicht rein. Tippe hier, um dich neu anzumelden.</p></section>`;
  }
  const next = blocks.find((b) => !isPast(b, t, n) && b.st === 'cancel' && daysFromToday(b.d) <= 7);
  if (!next) {
    const wd = weekday(t);
    const weekend = (wd === 6 || wd === 0 || (wd === 5 && n > 15 * 60)) && !blocks.some((b) => b.d === t && !isPast(b, t, n));
    return `<section class="hero calm">
      <small>Nächste 7 Tage</small><b>${weekend ? '🛋️ Schönes Wochenende' : '✅ Alles nach Plan'}</b>
      <p>${weekend ? 'Du hörst von uns, sobald sich etwas ändert.' : 'Gerade fällt nichts aus – du erfährst es sofort, wenn doch.'}</p>${chip}</section>`;
  }
  const day = blocks.filter((b) => b.d === next.d);
  const active = day.filter((b) => b.st !== 'cancel');
  const cancels = day.filter((b) => b.st === 'cancel' && !isPast(b, t, n));
  let title;
  let sub;
  if (!active.length) {
    title = `🥳 ${boardDay(next.d)[0].toUpperCase() + boardDay(next.d).slice(1)} komplett frei`;
    sub = `Alle ${units(day)} Stunden fallen aus`;
  } else {
    const first = Math.min(...active.map((b) => b.s));
    const last = Math.max(...active.map((b) => b.e));
    const names = [...new Set(cancels.map((b) => b.sl))].join(', ');
    const period = cancels.length === 1 && next.p ? ` · ${fmtPeriod(next.p, true)}` : '';
    if (cancels.every((b) => b.e <= first)) title = `😴 Ausschlafen bis ${hhmm(first)}`;
    else if (cancels.every((b) => b.s >= last)) title = `🏃 Schluss schon um ${hhmm(last)}`;
    else title = `🎉 ${cancels.length > 1 ? `${units(cancels)} Stunden fallen aus` : `${next.sl} fällt aus`}`;
    sub = `${names}${period} fällt aus${next.info ? ' · ' + next.info : next.rep ? ' · dafür ' + next.rep.split(' · ')[0] : ''}`;
  }
  return `<section class="hero" data-act="day" data-v="${next.d}" role="button">
    <span class="hero-cd">${esc(until(next.d, next.s))}</span>
    <small>Nächster Ausfall · ${esc(boardDay(next.d))}</small><b>${esc(title)}</b><p>${esc(sub)}</p>${chip}</section>`;
}

/** Überlappende Stunden eines Tages nebeneinander legen. */
function lanes(list) {
  const out = [];
  let cluster = [];
  let end = -1;
  const flush = () => {
    const ends = [];
    for (const it of cluster) {
      let k = ends.findIndex((e) => e <= it.b.s);
      if (k < 0) { k = ends.length; ends.push(0); }
      ends[k] = it.b.e;
      it.lane = k;
    }
    for (const it of cluster) { it.n = ends.length; out.push(it); }
    cluster = [];
  };
  for (const it of list) {
    if (cluster.length && it.b.s >= end) { flush(); end = -1; }
    cluster.push(it);
    end = Math.max(end, it.b.e);
  }
  if (cluster.length) flush();
  return out;
}

const ABBR = [
  [/^mathe/i, 'Mathe'], [/^englisch/i, 'Engl.'], [/^erdkunde|^geograph/i, 'Erdk.'], [/^biolog/i, 'Bio'], [/^religion/i, 'Reli'],
  [/^projekt/i, 'Projekt'], [/^sozialw/i, 'SoWi'], [/^geschicht/i, 'Gesch.'], [/^informatik/i, 'Info'], [/^philosoph/i, 'Philo'],
  [/^pädagog|^erziehungsw/i, 'Päda'], [/^französ/i, 'Franz.'], [/^spanisch/i, 'Span.'], [/^literatur/i, 'Lit.'], [/^wirtschaft/i, 'Wirt.'],
];
const shortName = (b, view) => {
  if (view !== 5) return b.sl;
  const n = b.sl.replace(/\s+(LK|GK)$/i, '');
  if (n.length <= 7) return n;
  for (const [re, a] of ABBR) if (re.test(n)) return a;
  return n.length <= 9 ? n : (b.su && b.su.length <= 6 ? b.su : n.slice(0, 6) + '.');
};
const BADGE = { cancel: ['Fällt aus', 'aus'], change: ['Geändert', 'neu'], exam: ['Klausur', 'Klausur'] };

let HW_OPEN = [];
function lessonBlock(b, i, view, top, h, lane, n, t, nm) {
  const now = b.d === t && b.s <= nm && b.e > nm;
  const past = !now && isPast(b, t, nm);
  const roomOnly = b.st === 'change' && b.notes.some((x) => x.startsWith('Raum')) && !b.notes.some((x) => x.startsWith('Vertretung'));
  const badgeTxt = b.st === 'change' && roomOnly ? (view === 5 ? 'Raum' : 'Raum neu') : BADGE[b.st]?.[view === 5 ? 1 : 0];
  const room = b.ro.join(', ');
  let inner = `<span class="ls-s">${esc(shortName(b, view))}</span>`;
  if (view === 1) {
    inner += `<span class="ls-m">${b.p ? esc(fmtPeriod(b.p, true)) + ' · ' : ''}${hhmm(b.s)}–${hhmm(b.e)}${room ? ' · ' + esc(room) : ''}${b.te.length ? ' · ' + esc(b.te.join(', ')) : ''}</span>`;
  } else if (room) {
    inner += `<span class="ls-m">${esc(room)}${view === 3 && b.te.length && h > 56 ? ' · ' + esc(b.te.join(', ')) : ''}</span>`;
  }
  if (badgeTxt && h >= 40) inner += `<span class="ls-bd">${esc(badgeTxt)}</span>`;
  if (view === 1) {
    const extra = b.st === 'cancel' ? (b.rep ? `Stattdessen: ${b.rep}` : b.info || '') : [...(b.st === 'change' ? b.notes : []), b.info].filter(Boolean).join(' · ');
    if (extra && h >= 70) inner += `<span class="ls-x">${esc(extra)}</span>`;
  }
  if (b.st !== 'cancel' && HW_OPEN.some((x) => x.d === b.d && x.subject === b.sl)) inner += '<span class="ls-hw" title="Hausaufgabe fällig">HA</span>';
  if (now) inner += `<span class="ls-now">Jetzt</span><span class="ls-prog" style="width:${Math.round(((nm - b.s) / (b.e - b.s)) * 100)}%"></span>`;
  const w = 100 / n;
  return `<button class="ls ${b.st} ${now ? 'cur' : ''} ${past ? 'past' : ''} ${h < 44 ? 'tight' : ''}" data-act="lesson" data-i="${i}"
    style="--h:${hue(b.su, b.sl)};top:${top}px;height:${h}px;left:calc(${w * lane}% + 1px);width:calc(${w}% - 2px)"
    aria-label="${esc(`${b.sl}, ${hhmm(b.s)} bis ${hhmm(b.e)}${badgeTxt ? ', ' + badgeTxt : ''}`)}">${inner}</button>`;
}

function calendar(S, blocks, days) {
  HW_OPEN = (S.state?.homework || []).filter((h) => !h.done).map((h) => ({ d: h.due, subject: h.subject }));
  const view = S.prefs.view || 3;
  const t = today();
  const nm = nowMin();
  const vis = blocks.map((b, i) => ({ b, i })).filter(({ b }) => days.includes(b.d));
  const ref = vis.length ? vis.map((x) => x.b) : blocks;
  if (!ref.length) {
    return `<div class="empty"><div class="empty-ico">🎈</div><b>Kein Unterricht</b><span>In diesem Zeitraum steht nichts im Plan.</span></div>`;
  }
  const start = Math.floor((Math.min(...ref.map((b) => b.s)) - 5) / 15) * 15;
  const end = Math.max(...ref.map((b) => b.e)) + 5;
  const ppm = view === 1 ? 1.05 : view === 3 ? 0.95 : 0.85;
  const H = Math.round((end - start) * ppm);
  const y = (m) => Math.round((m - start) * ppm);

  // Zeitachse: Beginn jeder Stunde (mit Stundennummer, wenn bekannt), nicht zu dicht
  const marks = new Map();
  for (const { b } of vis.length ? vis : ref.map((b) => ({ b }))) {
    const no = String(b.p || '').split('–')[0];
    if (!marks.has(b.s) || (!marks.get(b.s) && /^\d+$/.test(no))) marks.set(b.s, /^\d+$/.test(no) ? no : '');
  }
  let lastY = -99;
  const axis = [];
  const lines = [];
  for (const [m, no] of [...marks].sort((a, b) => a[0] - b[0])) {
    const yy = y(m);
    lines.push(`<i style="top:${yy}px"></i>`);
    if (yy - lastY < 24) continue;
    lastY = yy;
    axis.push(`<span class="ax" style="top:${yy}px">${no ? `<b>${esc(no)}</b>` : ''}${hhmm(m)}</span>`);
  }
  const showNow = days.includes(t) && nm >= start && nm <= end;
  if (showNow) axis.push(`<span class="ax-now" style="top:${y(nm)}px">${hhmm(nm)}</span>`);

  const head = days.map((d) => {
    const dt = parseDay(d);
    const isT = d === t;
    const free = blocks.some((b) => b.d === d) && !blocks.some((b) => b.d === d && b.st !== 'cancel');
    return `<button class="ch ${isT ? 'today' : ''} ${d < t ? 'past' : ''}" ${view === 1 ? 'tabindex="-1"' : `data-act="dayOne" data-v="${d}"`}>
      <span>${view === 1 ? WD_LONG[dt.getDay()] : WD[dt.getDay()]}</span><b>${dt.getDate()}</b>${free ? '<em>frei</em>' : ''}</button>`;
  }).join('');

  const cols = days.map((d) => {
    const list = lanes(vis.filter(({ b }) => b.d === d));
    const items = list.map(({ b, i, lane, n }) => {
      const top = y(b.s);
      const h = Math.max(view === 5 ? 30 : 34, y(b.e) - top - 3);
      return lessonBlock(b, i, view, top, h, lane, n, t, nm);
    }).join('');
    const nowLine = showNow && d === t ? `<i class="nowline" style="top:${y(nm)}px"></i>` : '';
    const empty = list.length ? '' : `<span class="col-empty">${weekday(d) % 6 ? 'frei' : 'Wochenende'}</span>`;
    return `<div class="col ${d === t ? 'today' : ''}">${nowLine}${empty}${items}</div>`;
  }).join('');

  return `<div class="cal v${view}" style="--n:${days.length}">
    <div class="cal-head"><span></span>${head}</div>
    <div class="cal-body" style="height:${H}px">
      <div class="axis">${axis.join('')}</div>
      <div class="grid-lines" aria-hidden="true">${lines.join('')}</div>
      <div class="cols">${cols}</div>
    </div>
  </div>`;
}

/** Himmel nach Tageszeit hinter dem Kopf der Plan-Seite (Morgenrot, Tag, Abendrot, Nacht mit Sternen). */
function sky() {
  const force = new URLSearchParams(location.search).get('sky');
  const m = force ? { dawn: 400, day: 720, dusk: 1110, night: 1380 }[force] ?? nowMin() : nowMin();
  const ph = m < 330 || m >= 1260 ? 'night' : m < 480 ? 'dawn' : m < 1020 ? 'day' : 'dusk';
  let p;
  if (ph === 'night') p = ((m >= 1260 ? m - 1260 : m + 180) / 510);
  else p = Math.min(1, Math.max(0, (m - 330) / (1260 - 330)));
  const x = 56 + p * 36;
  const y = 58 - Math.sin(Math.PI * p) * 38;
  let extra = '';
  if (ph === 'night' || ph === 'dusk' || ph === 'dawn') {
    const n = ph === 'night' ? 26 : 10;
    for (let i = 0; i < n; i++) {
      const sx = (i * 37 + 11) % 100;
      const sy = (i * 23 + 7) % 58;
      extra += `<i class="star" style="left:${sx}%;top:${sy}%;--d:${(i % 7) * 0.6}s;--s:${1 + (i % 3)}px"></i>`;
    }
  }
  if (ph === 'day') extra += '<i class="cloud c1"></i><i class="cloud c2"></i><i class="cloud c3"></i>';
  return `<div class="sky ${ph}" aria-hidden="true">${extra}<i class="orb ${ph === 'night' ? 'moon' : 'sun'}" style="left:${x.toFixed(1)}%;top:${y.toFixed(1)}%"></i></div>`;
}

/** Kommende Klausuren aus dem Stundenplan (nächste 14 Tage), mit Countdown. */
function examsCard(blocks) {
  const t = today();
  const n = nowMin();
  const list = blocks.filter((b) => b.st === 'exam' && !isPast(b, t, n)).slice(0, 3);
  if (!list.length) return '';
  return `<section class="exams" aria-label="Nächste Klausuren">
    <small>Nächste Klausuren</small>
    <div class="ex-row">${list.map((b) => {
      const d = daysFromToday(b.d);
      const big = d === 0 ? 'heute' : d === 1 ? 'morgen' : `${d} Tagen`;
      return `<button class="ex" data-act="dayOne" data-v="${b.d}" style="--h:${hue(b.su, b.sl)}">
        <span class="ex-e"></span><b>${esc(b.sl.replace(/\s+(LK|GK)$/i, ''))}</b>
        <span class="ex-d">${d > 1 ? 'in ' : ''}${big}</span><span class="ex-m">${WD[weekday(b.d)]} · ${hhmm(b.s)}${b.ro.length ? ' · ' + esc(b.ro[0]) : ''}</span></button>`;
    }).join('')}</div></section>`;
}

/** Nächste Stunde eines Fachs (für das Fälligkeitsdatum), sonst morgen. */
export function nextLessonDay(S, subject, after = null) {
  const t = today();
  const n = nowMin();
  const b = (S.state?.snapshot?.blocks || []).find((x) => x.sl === subject && x.st !== 'cancel'
    && (after ? x.d > after : x.d > t || (x.d === t && x.s > n)));
  return b ? b.d : addDays(after || t, 1);
}

export function remindLabel(d) {
  const day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const n = daysFromToday(day);
  const w = n === 0 ? 'heute' : n === 1 ? 'morgen' : `${WD[d.getDay()]}`;
  return `${w} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function dueLabel(d) {
  const n = daysFromToday(d);
  if (n < 0) return n === -1 ? 'seit gestern fällig' : `seit ${-n} Tagen fällig`;
  if (n === 0) return 'heute';
  if (n === 1) return 'morgen';
  if (n === 2) return 'übermorgen';
  return `${WD[weekday(d)]}, ${Number(d.slice(8))}.${Number(d.slice(5, 7))}.`;
}

function hwItem(h) {
  const late = !h.done && h.due < today();
  return `<div class="hw-item ${late ? 'late' : ''} ${h.done ? 'done' : ''}" style="--h:${hue(h.su, h.subject)}">
      <button class="hw-check" data-act="${h.done ? 'hwUndo' : 'hwDone'}" data-v="${esc(h.id)}" aria-label="${h.done ? 'Wieder offen' : 'Erledigt'}">${h.done ? icon('check') : ''}</button>
      <button class="hw-body" data-act="hwEdit" data-v="${esc(h.id)}">
        <span class="hw-top"><b>${esc(h.subject.replace(/\s+(LK|GK)$/i, ''))}</b><em>${h.done ? 'erledigt' : esc(dueLabel(h.due))}</em></span>
        <span class="hw-text">${esc(h.text)}</span>
      </button>
    </div>`;
}

/** Tab „Aufgaben“: Hausaufgaben nach Fälligkeit + Klausuren + Erledigtes. */
function tasks(S) {
  const blocks = S.state?.snapshot?.blocks || [];
  const all = S.state?.homework || [];
  const open = all.filter((h) => !h.done);
  const t = today();
  const sun = addDays(t, (7 - weekday(t)) % 7);
  const groups = [
    ['Überfällig', open.filter((h) => h.due < t)],
    ['Heute', open.filter((h) => h.due === t)],
    ['Morgen', open.filter((h) => h.due === addDays(t, 1))],
    ['Diese Woche', open.filter((h) => h.due > addDays(t, 1) && h.due <= sun)],
    ['Später', open.filter((h) => h.due > sun && h.due > addDays(t, 1))],
  ].filter(([, l]) => l.length);
  const done = all.filter((h) => h.done);
  const list = groups.length
    ? groups.map(([label, l]) => `<h4 class="group-label ${label === 'Überfällig' ? 'warn' : ''}">${label} · ${l.length}</h4><div class="hw tasks-list">${l.map(hwItem).join('')}</div>`).join('')
    : `<div class="empty"><b>Alles erledigt</b><span>Neue Hausaufgaben trägst du hier ein – oder direkt an einer Stunde im Plan.</span></div>`;
  return `<header class="top">${wordmark()}</header>
    <h1 class="title">Aufgaben</h1>
    <button class="btn" data-act="hwNew">${icon('plus')}Hausaufgabe eintragen</button>
    ${list}
    ${examsCard(blocks)}
    ${done.length ? `<h4 class="group-label">Erledigt</h4><div class="hw tasks-list">${done.map(hwItem).join('')}</div>` : ''}`;
}

/** Eine Zeile über dem Stundenplan: was bald fällig ist. */
function planHint(S, blocks) {
  const t = today();
  const open = (S.state?.homework || []).filter((h) => !h.done);
  const soon = open.filter((h) => h.due <= addDays(t, 1));
  const ex = blocks.find((b) => b.st === 'exam' && b.d >= t && daysFromToday(b.d) <= 7);
  const parts = [];
  if (soon.length) parts.push(`<b>${soon.length}</b> ${soon.length === 1 ? 'Hausaufgabe' : 'Hausaufgaben'} bis morgen`);
  else if (open.length) parts.push(`<b>${open.length}</b> offene ${open.length === 1 ? 'Hausaufgabe' : 'Hausaufgaben'}`);
  if (ex) { const d = daysFromToday(ex.d); parts.push(`Klausur ${esc(ex.sl.replace(/\s+(LK|GK)$/i, ''))} ${d === 0 ? 'heute' : d === 1 ? 'morgen' : `in ${d} Tagen`}`); }
  if (!parts.length) return '';
  return `<button class="plan-hint" data-act="tab" data-v="aufgaben"><span>${parts.join(' · ')}</span>${icon('right', 'chev')}</button>`;
}

function homeworkCard(S) {
  const open = (S.state?.homework || []).filter((h) => !h.done);
  const items = open.slice(0, 6).map((h) => {
    const late = h.due < today();
    return `<div class="hw-item ${late ? 'late' : ''}" style="--h:${hue(h.su, h.subject)}">
      <button class="hw-check" data-act="hwDone" data-v="${esc(h.id)}" aria-label="Erledigt"></button>
      <button class="hw-body" data-act="hwEdit" data-v="${esc(h.id)}">
        <span class="hw-top"><b>${esc(h.subject.replace(/\s+(LK|GK)$/i, ''))}</b><em>${esc(dueLabel(h.due))}</em></span>
        <span class="hw-text">${esc(h.text)}</span>
      </button>
    </div>`;
  }).join('');
  return `<section class="hw" aria-label="Hausaufgaben">
    <div class="hw-head"><small>Hausaufgaben${open.length ? ` · ${open.length}` : ''}</small>
      <button class="hw-add" data-act="hwNew" aria-label="Hausaufgabe eintragen">${icon('plus')}</button></div>
    ${items || '<button class="hw-empty" data-act="hwNew">Keine offenen Hausaufgaben – tippe hier oder auf eine Stunde, um eine einzutragen.</button>'}
    ${open.length > 6 ? `<p class="hw-more">+ ${open.length - 6} weitere</p>` : ''}
  </section>`;
}

/** Blatt zum Eintragen/Bearbeiten. A = Entwurf { id, subject, su, text, due, remind } */
export function hwSheet(S, A) {
  const subjects = [...new Map((S.state?.snapshot?.blocks || []).map((b) => [b.sl, b.su])).entries()].sort((a, b) => a[0].localeCompare(b[0], 'de'));
  if (A.subject && !subjects.some(([n]) => n === A.subject)) subjects.unshift([A.subject, A.su]);
  const nextL = A.subject ? nextLessonDay(S, A.subject, A.from || null) : null;
  const t = today();
  const dueOpts = [
    nextL ? [nextL, `Nächste Stunde · ${dueLabel(nextL)}`] : null,
    [addDays(t, 1), 'Morgen'],
    [addDays(t, 2), 'Übermorgen'],
    [addDays(t, 7), 'In einer Woche'],
  ].filter(Boolean).filter((o, i, arr) => arr.findIndex((x) => x[0] === o[0]) === i);
  return `<div class="sheet-body hw-sheet">
    <h3 class="sheet-title">${A.id ? 'Hausaufgabe' : 'Hausaufgabe eintragen'}</h3>
    <div class="chips subj-chips">${subjects.map(([n, su]) => `<button class="chip ${n === A.subject ? 'on' : ''}" style="--h:${hue(su, n)}" data-act="hwSet" data-k="subject" data-v="${esc(n)}" data-su="${esc(su || '')}"><i></i>${esc(n)}</button>`).join('')}</div>
    <label class="field"><span>Aufgabe</span>
      <textarea class="input hw-input" name="hwtext" rows="3" maxlength="500" placeholder="z. B. S. 42, Nr. 3–5">${esc(A.text || '')}</textarea></label>
    <div class="field-row"><span>Fällig</span></div>
    <div class="chips">${dueOpts.map(([d, l]) => `<button class="chip ${A.due === d ? 'on' : ''}" data-act="hwSet" data-k="due" data-v="${d}">${esc(l)}</button>`).join('')}
      <label class="chip date-chip ${dueOpts.some((o) => o[0] === A.due) ? '' : 'on'}">${dueOpts.some((o) => o[0] === A.due) ? 'Datum …' : esc(dueLabel(A.due))}<input type="date" data-in="hwDate" value="${esc(A.due)}" min="${t}"></label></div>
    <div class="field-row"><span>Erinnerung</span></div>
    <div class="seg small">${[['eve', 'Vorabend 17 Uhr'], ['morning', 'Morgens 6:45'], ['none', 'Keine']].map(([k, l]) => `<button class="${A.remind === k ? 'on' : ''}" data-act="hwSet" data-k="remind" data-v="${k}">${l}</button>`).join('')}</div>
    <button class="btn" data-act="hwSave">${A.id ? 'Speichern' : 'Eintragen'}</button>
    ${A.id ? '<button class="btn link" data-act="hwDelete">Löschen</button>' : '<button class="btn link" data-act="closeSheet">Abbrechen</button>'}
  </div>`;
}

// ---------------------------------------------------------------- 1.5: Kurswahl

/** Alle wählbaren Kurse (vom Server; ältere Stände: aus den Stunden abgeleitet). */
export function courseOptions(S) {
  const snap = S.state?.snapshot;
  if (snap?.courses?.length) return snap.courses;
  const m = new Map();
  for (const b of snap?.blocks || []) if (!m.has(b.su)) m.set(b.su, { su: b.su, sl: b.sl, lt: b.lt, mine: true, ag: b.kl.length > 2, n: 1, slots: [] });
  return [...m.values()];
}

/** Vorschlag, solange noch nichts gewählt ist: alles aus dem eigenen Plan außer schulweiten AGs. */
export function defaultCourses(S) {
  return courseOptions(S).filter((c) => c.mine && !c.ag).map((c) => c.su);
}

export const coursesChosen = (S) => Array.isArray(S.state?.account?.settings?.courses);

function courseRow(c, on) {
  const meta = [c.su !== c.sl ? c.su.replace(/\s+/g, ' ') : '', c.lt && c.lt !== c.su ? c.lt : '', (c.slots || []).join(', ')].filter(Boolean).join(' · ');
  return `<label class="row course" style="--h:${hue(c.su, c.sl)}"><i class="subj-dot"></i>
    <span class="label">${esc(c.sl)}${meta ? `<small>${esc(meta)}</small>` : ''}</span>
    <input type="checkbox" class="switch" data-act="courseToggle" data-v="${esc(c.su)}" ${on ? 'checked' : ''}></label>`;
}

export function coursesSheet(S, sel) {
  const all = courseOptions(S);
  const on = new Set(sel);
  const groups = [
    ['In deinem Stundenplan', all.filter((c) => c.mine && !c.ag)],
    ['AGs & schulweite Angebote', all.filter((c) => c.ag)],
    ['Weitere Kurse deiner Stufe', all.filter((c) => !c.mine && !c.ag)],
  ].filter(([, list]) => list.length);
  const n = sel.length;
  return `<div class="sheet-body courses-sheet">
    <h3 class="sheet-title">Welche Kurse hast du?</h3>
    <p class="muted">Untis zeigt oft auch Kurse und AGs, die du gar nicht belegst. Wähl deine aus – dann siehst du nur deine Stunden und bekommst nur dafür Mitteilungen. Deine Fächer im Noten-Tab passen sich mit an.</p>
    ${groups.map(([title, list]) => `<h4 class="group-label">${title}</h4><div class="group">${list.map((c) => courseRow(c, on.has(c.su))).join('')}</div>`).join('')}
    ${all.length ? '' : '<p class="muted">Noch kein Stundenplan geladen – versuch es gleich noch mal.</p>'}
    <div class="sheet-foot"><button class="btn" data-act="saveCourses" ${n && !S.busy.courses ? '' : 'disabled'}>${S.busy.courses ? '<span class="spin"></span>Wird gespeichert …' : `${n} ${n === 1 ? 'Kurs' : 'Kurse'} übernehmen`}</button></div>
  </div>`;
}

function coursesPrompt(S) {
  if (coursesChosen(S) || !courseOptions(S).length) return '';
  return `<button class="course-prompt" data-act="openCourses">
    <span><b>Welche Kurse hast du?</b><small>Damit fremde Kurse und AGs nicht als Ausfall auftauchen.</small></span>
    <em>Auswählen</em></button>`;
}

function plan(S) {
  const blocks = S.state?.snapshot?.blocks || [];
  const name = firstName(S);
  const t = parseDay(today());
  const view = S.prefs.view || 3;
  const head = `${sky()}<header class="top">${wordmark()}${liveChip(S)}</header>
    <p class="greet">${name ? `Hey ${esc(name)} 👋` : 'Hey 👋'}</p>
    <h1 class="title">${WD_LONG[t.getDay()]}, ${t.getDate()}. <span>${MON[t.getMonth()]}</span></h1>`;
  if (!S.state) {
    return `${head}<div class="hero skel"></div><div class="seg view-seg"></div><div class="cal skel" style="height:360px"></div>`;
  }
  const { days } = visibleDays(S);
  const canPrev = stepDay(S, -1) && stepDay(S, -1) !== days[0];
  const canNext = !!stepDay(S, 1);
  return `${head}
    ${coursesPrompt(S)}
    ${hero(S, blocks)}
    ${planHint(S, blocks)}
    <div class="seg view-seg" role="tablist">${[[1, '1 Tag'], [3, '3 Tage'], [5, 'Woche']].map(([k, l]) => `<button role="tab" class="${view === k ? 'on' : ''}" data-act="view" data-v="${k}" aria-selected="${view === k}">${l}</button>`).join('')}</div>
    <div class="cal-nav">
      <button class="icon-btn ghost" data-act="step" data-v="-1" aria-label="Zurück" ${canPrev ? '' : 'disabled'}>${icon('left')}</button>
      <b>${rangeLabel(days, view)}</b>
      <button class="icon-btn ghost" data-act="step" data-v="1" aria-label="Weiter" ${canNext ? '' : 'disabled'}>${icon('right')}</button>
    </div>
    ${calendar(S, blocks, days)}`;
}

// ---------------------------------------------------------------- Noten

function ring(r) {
  const C = 2 * Math.PI * 42;
  const frac = r ? Math.max(0.02, Math.min(1, r.total / 900)) : 0;
  return `<svg class="ring" width="112" height="112" viewBox="0 0 112 112" aria-hidden="true">
    <defs><linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="var(--g1)"/><stop offset=".55" stop-color="var(--g2)"/><stop offset="1" stop-color="var(--g3)"/></linearGradient></defs>
    <circle cx="56" cy="56" r="42" fill="none" stroke="var(--card-2)" stroke-width="12"/>
    <circle cx="56" cy="56" r="42" fill="none" stroke="url(#ringGrad)" stroke-width="12" stroke-linecap="round"
      stroke-dasharray="${(C * frac).toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 56 56)"/>
    <text x="56" y="61" text-anchor="middle" class="ring-val">${r ? (r.note != null ? fmt1(r.note) : '–') : '–'}</text>
    <text x="56" y="78" text-anchor="middle" class="ring-lbl">${r && r.est ? 'GESCHÄTZT' : 'SCHNITT'}</text>
  </svg>`;
}

const GOALS = [1.0, 1.3, 1.5, 1.7, 2.0, 2.5, 3.0];

/** Ziel-Rechner-Karte im Noten-Tab. */
function goalCard(G, blocks) {
  const target = G.goal ?? 1.5;
  const g = goal(G, target, currentHj(G.abiYear), new Set((blocks || []).map((b) => baseName(b.sl))));
  let big;
  let small;
  if (g.done) {
    big = g.reached ? `🎯 <b>${fmt1(target)}</b> hast du sicher.` : `Für ${fmt1(target)} reicht es leider nicht mehr.`;
    small = 'Alles ist eingetragen.';
  } else if (g.x == null) {
    big = `${fmt1(target)} ist selbst mit 15 Punkten überall nicht mehr drin.`;
    small = `Maximal möglich: ${g.best} von ${g.need} nötigen Punkten. Probier ein anderes Ziel.`;
  } else if (g.safe) {
    big = `🎉 Für die <b>${fmt1(target)}</b> bist du schon auf Kurs – selbst mit wenig Punkten.`;
    small = 'Hochrechnung mit deinen bisherigen Noten.';
  } else {
    big = `Du brauchst im Schnitt <b class="goal-x ${tone(g.x)}">${g.x} Punkte</b> <span style="white-space:nowrap">(${noteOf(g.x)})</span>`;
    small = `in allem, was noch offen ist: ${g.open ? `${g.open} Halbjahreskurs${g.open > 1 ? 'e' : ''}` : ''}${g.open && g.exams ? ' und ' : ''}${g.exams ? `${g.exams} Prüfung${g.exams > 1 ? 'en' : ''}` : ''} · nötig sind ${g.need} von 900 P.`;
  }
  const pos = g.x == null ? 100 : (g.x / 15) * 100;
  return `<section class="card goal">
    <div class="goal-h"><small>Ziel-Rechner</small><span>Wunschnote</span></div>
    <div class="chips goal-chips">${GOALS.map((n) => `<button class="chip ${n === target ? 'on' : ''}" data-act="setGoal" data-v="${n}">${fmt1(n)}</button>`).join('')}</div>
    <p class="goal-big">${big}</p>
    ${!g.done && g.x != null && !g.safe ? `<div class="goal-bar"><i style="left:${pos}%"></i></div><div class="goal-scale"><span>0</span><span>5</span><span>10</span><span>15 P.</span></div>` : ''}
    <p class="goal-small">${small}</p>
    ${examNeeds(G, target)}
  </section>`;
}

/** Je Abifach ohne eingetragene Prüfung: nötige Punkte für die Wunschnote (Rest wie hochgerechnet). */
function examNeeds(G, target) {
  const subs = G.subjects.filter((s) => s.abi > 0 && G.exams?.[s.id] == null).sort((a, b) => a.abi - b.abi);
  if (!subs.length) return '';
  const xs = subs.map((s) => [s, examNeed(G, s.id, target)]);
  if (xs.every(([, x]) => x == null)) {
    return `<div class="needs"><small class="needs-h">Prüfungen</small><p class="goal-small">Für ${fmt1(target)} reicht eine einzelne starke Prüfung nicht – es kommt auf alle offenen Prüfungen und Kurse zusammen an (Wert oben).</p></div>`;
  }
  const items = xs.map(([s, x]) => `<span class="need ${x == null ? 'no' : tone(Math.max(x, 5))}"><small>${esc(s.name)}</small><b>${x == null ? '–' : x === 0 ? '✓' : x}</b></span>`).join('');
  return `<div class="needs"><small class="needs-h">Nötig in der Prüfung für ${fmt1(target)} (wenn der Rest so bleibt)</small><div class="needs-row">${items}</div></div>`;
}

/** Ampel: Zulassung & Bestehen nach NRW-Regeln. */
function admissionCard(G, r) {
  const a = admission(G, r);
  if (!a) return '';
  const bad = a.checks.filter((c) => !c.ok);
  const warn = a.checks.filter((c) => c.ok && c.warn);
  const head = bad.length ? `<b class="bad">${bad.length === 1 ? 'Eine Bedingung' : bad.length + ' Bedingungen'} noch nicht erfüllt</b>`
    : warn.length ? '<b class="warn">Zugelassen – aber knapp</b>' : '<b class="good">Alle Bedingungen erfüllt</b>';
  return `<details class="card adm ${bad.length ? 'is-bad' : warn.length ? 'is-warn' : 'is-good'}" ${bad.length ? 'open' : ''}>
    <summary><span class="adm-dot"></span><span><small>Zulassung & Bestehen${a.est ? ' · Hochrechnung' : ''}</small>${head}</span>${icon('right', 'chev')}</summary>
    <ul>${a.checks.map((c) => `<li class="${!c.ok ? 'bad' : c.warn ? 'warn' : 'ok'}"><span>${esc(c.label)}${c.hint ? `<small>${esc(c.hint)}</small>` : ''}</span><b>${esc(c.val)}</b></li>`).join('')}</ul>
    <p class="fine">Vereinfacht nach APO-GOSt NRW – maßgeblich ist, was deine Schule berechnet.</p>
  </details>`;
}

/** Vorbei geschriebene Klausuren ohne eingetragene Note. */
function examPrompts(S, G) {
  const t = today();
  const log = { ...store.examLog };
  for (const b of S.state?.snapshot?.blocks || []) if (b.st === 'exam') log[`${b.d}|${b.sl}`] = { d: b.d, sl: b.sl };
  const out = [];
  for (const [k, e] of Object.entries(log)) {
    if (e.d >= t || e.d < addDays(t, -28) || G.examSkip?.[k]) continue;
    const sub = G.subjects.find((s) => baseName(s.name) === baseName(e.sl));
    if (!sub) continue;
    if (G.entries.some((x) => x.sid === sub.id && x.kind === 'k' && x.at >= e.d)) continue;
    out.push({ k, e, sub });
  }
  return out.sort((a, b) => b.e.d.localeCompare(a.e.d)).slice(0, 2).map(({ k, e, sub }) => `
    <div class="exam-ask" style="--h:${hue(sub.su, sub.name)}"><i class="subj-dot"></i>
      <span><small>Klausur vom ${esc(dateLong(e.d))}</small><b>${esc(sub.name)} – schon zurück?</b></span>
      <button class="mini acc" data-act="examGrade" data-sid="${sub.id}">Note eintragen</button>
      <button class="x" data-act="examSkip" data-v="${esc(k)}" aria-label="Ausblenden">${icon('x')}</button>
    </div>`).join('');
}

function noten(S) {
  const G = S.grades;
  const r = abi(G);
  const cur = currentHj(G.abiYear);
  const head = `<header class="top">${wordmark()}<button class="live" data-act="abiYear" aria-label="Abiturjahr ändern"><span>Abi ${G.abiYear} · NRW</span></button></header>
    <h1 class="title">Noten</h1>`;
  if (!G.subjects.length) {
    return `${head}<div class="empty big"><div class="empty-ico">📚</div><b>Noch keine Fächer</b>
      <span>Sobald dein Stundenplan geladen ist, übernehmen wir deine Fächer automatisch. Du kannst sie auch selbst anlegen.</span>
      <button class="btn" data-act="addSubject">Fach hinzufügen</button></div>`;
  }
  let hint = '';
  if (!G.subjects.some((s) => s.lk) || G.subjects.filter((s) => s.abi > 0).length < 4) {
    hint = `<button class="tip" data-act="subject" data-v="${G.subjects[0].id}">${icon('spark')}<span><b>Kurz einrichten</b>Tippe auf ein Fach und markiere deine 2 Leistungskurse und 4 Abifächer – dann stimmt die Hochrechnung.</span></button>`;
  }
  const adm = r ? admission(G, r) : null;
  const backupTip = G.entries.length >= 5 && (!S.prefs.lastBackup || S.prefs.lastBackup < addDays(today(), -30)) && !S.demo
    ? `<button class="tip" data-act="backup">${icon('lock')}<span><b>Noten sichern</b>Deine Noten liegen nur auf diesem Handy. ${S.prefs.lastBackup ? 'Letzte Sicherung ist über einen Monat her' : 'Sicher sie einmal als Datei'} – dann sind sie auch bei einem neuen Handy nicht weg.</span></button>` : '';
  const summary = r ? `
    <section class="card abi">
      ${ring(r)}
      <div class="abi-txt">
        <small>Abi-Schnitt · Hochrechnung</small>
        <b>${r.total}<span> / 900 P.</span></b>
        <p>${!r.passed || !adm?.ok ? 'So noch nicht bestanden – siehe „Zulassung & Bestehen“.' : r.est ? `Noch offen: ${r.hjs < 4 ? HJ.slice(r.hjs).join(', ') + (r.examsMissing ? ' und die Prüfungen' : '') : 'die Prüfungen'}` : 'Alles eingetragen.'}</p>
      </div>
      <div class="abi-blocks"><span>Block I<b>${r.block1}<i>/600</i></b></span><span>Block II<b>${r.block2}<i>/300</i></b></span>${r.deficits ? `<span class="warn">Unterkurse<b>${r.deficits}</b></span>` : ''}</div>
    </section>` : `
    <section class="card abi empty-abi">${ring(null)}<div class="abi-txt"><small>Abi-Schnitt</small><b>Noch leer</b><p>Trag deine ersten Punkte ein – der Schnitt rechnet sich dann von selbst.</p></div></section>`;
  const rows = G.subjects.map((s) => {
    const a = subjectAvg(G, s.id);
    const tag = [s.lk ? 'LK' : '', s.abi ? `Abi ${s.abi}` : '', s.q1 ? 'nur Q1' : ''].filter(Boolean).join(' · ');
    const cells = HJ.map((_, hj) => {
      if (!hjsOf(s).includes(hj)) return '<span class="pt none off">–</span>';
      const res = hjResult(G, s.id, hj);
      return res ? `<span class="pt ${tone(res.pts)} ${res.est ? 'est' : ''} ${hj === cur ? 'cur' : ''}">${res.pts}</span>` : `<span class="pt none ${hj === cur ? 'cur' : ''}">·</span>`;
    }).join('');
    return `<button class="subj" data-act="subject" data-v="${s.id}">
      <span class="sn"><i style="--h:${hue(s.su, s.name)}"></i><span><b>${esc(s.name)}</b>${tag ? `<small>${tag}</small>` : ''}</span></span>
      ${cells}<span class="avg">${a == null ? '–' : fmt1(a)}</span></button>`;
  }).join('');
  return `${head}${examPrompts(S, G)}${hint}${backupTip}${summary}${r ? admissionCard(G, r) : ''}${r ? goalCard(G, S.state?.snapshot?.blocks) : ''}
    <section class="card subjects">
      <div class="subj head"><span class="sn">Fach</span>${HJ.map((h, i) => `<span class="${i === cur ? 'cur' : ''}">${h}</span>`).join('')}<span class="avg">Ø</span></div>
      ${rows}
      ${bllCard(G)}
    </section>
    <button class="btn" data-act="addGrade">${icon('plus')}Note eintragen</button>
    <button class="btn link" data-act="addSubject">Fach hinzufügen (z. B. nur Q1)</button>
    ${G.bll?.on ? '' : '<button class="btn link" data-act="bllOpen">Besondere Lernleistung hinzufügen (5. Abiturfach)</button>'}
    <p class="fine center">Deine Noten bleiben nur auf diesem Handy. Hochrechnung nach APO-GOSt NRW, vereinfacht – ohne Gewähr.</p>`;
}

export function subjectSheet(G, sid) {
  const s = G.subjects.find((x) => x.id === sid);
  if (!s) return '';
  const cur = currentHj(G.abiYear);
  const hjs = hjsOf(s).map((hj) => {
    const h = HJ[hj];
    const es = G.entries.filter((e) => e.sid === sid && e.hj === hj);
    const res = hjResult(G, sid, hj);
    return `<div class="hj ${hj === cur ? 'cur' : ''}">
      <div class="hj-h"><b>${h}${hj === cur ? ' <em>jetzt</em>' : ''}</b>${res ? `<span class="pt ${tone(res.pts)}">${res.pts}</span><small>${res.est ? 'geschätzt' : 'Zeugnis'}</small>` : '<small>noch nichts</small>'}
        <button class="mini" data-act="addGrade" data-sid="${sid}" data-hj="${hj}" aria-label="Note in ${h} eintragen">${icon('plus')}</button></div>
      ${es.map((e) => `<div class="entry"><span>${KIND[e.kind]}</span><b class="${tone(e.pts)}">${e.pts} P. <small>(${noteOf(e.pts)})</small></b>
        <button class="x" data-act="delGrade" data-v="${e.id}" aria-label="Löschen">${icon('x')}</button></div>`).join('')}
    </div>`;
  }).join('');
  const ex = G.exams?.[sid];
  return `<div class="sheet-body" style="--h:${hue(s.su, s.name)}">
    <h3 class="sheet-title"><i class="subj-dot"></i>${esc(s.name)}</h3>
    <div class="seg small"><button class="${!s.lk ? 'on' : ''}" data-act="setLk" data-sid="${sid}" data-v="0">Grundkurs</button><button class="${s.lk ? 'on' : ''}" data-act="setLk" data-sid="${sid}" data-v="1">Leistungskurs</button></div>
    <div class="seg small"><button class="${!s.q1 ? 'on' : ''}" data-act="setQ1" data-sid="${sid}" data-v="0">Q1 + Q2</button><button class="${s.q1 ? 'on' : ''}" data-act="setQ1" data-sid="${sid}" data-v="1">Nur in der Q1</button></div>
    <div class="field-row"><span>Abiturfach</span><div class="chips">${[0, 1, 2, 3, 4].map((n) => `<button class="chip ${s.abi === n ? 'on' : ''}" data-act="setAbi" data-sid="${sid}" data-v="${n}">${n ? n + '.' : 'nein'}</button>`).join('')}</div></div>
    ${s.abi && ex == null && abi(G) ? (() => { const tg = G.goal ?? 1.5; const x = examNeed(G, sid, tg); return `<p class="muted small-note">${x == null ? `Für ${fmt1(tg)} reicht es mit dieser Prüfung allein nicht – schau in den Ziel-Rechner.` : `Für eine ${fmt1(tg)} brauchst du in dieser Prüfung mindestens <b>${x} Punkte (${noteOf(x)})</b> – wenn der Rest so bleibt.`}</p>`; })() : ''}
    ${s.abi ? `<div class="field-row"><span>Abiturprüfung</span>${ex != null ? `<b class="pt ${tone(ex)}">${ex}</b><button class="mini" data-act="delExam" data-sid="${sid}">Löschen</button>` : `<button class="mini acc" data-act="addGrade" data-sid="${sid}" data-hj="abi">Punkte eintragen</button>`}</div>` : ''}
    <div class="hjs">${hjs}</div>
    <button class="btn soft" data-act="closeSheet">Fertig</button>
    <button class="btn link" data-act="delSubject" data-v="${sid}">${S_CONFIRM === sid ? 'Wirklich entfernen? Nochmal tippen' : 'Fach entfernen'}</button>
  </div>`;
}
let S_CONFIRM = null;
export const confirmDelete = (sid) => { S_CONFIRM = sid; };

export function addSheet(G, A) {
  const sub = G.subjects.find((s) => s.id === A.sid) || G.subjects[0];
  const isAbi = A.hj === 'abi';
  const hjBtns = hjsOf(sub).map((i) => `<button class="${A.hj === i ? 'on' : ''}" data-act="addSet" data-k="hj" data-v="${i}">${HJ[i]}</button>`).join('')
    + (sub?.abi ? `<button class="${isAbi ? 'on' : ''}" data-act="addSet" data-k="hj" data-v="abi">Abi</button>` : '');
  return `<div class="sheet-body">
    <h3 class="sheet-title">Note eintragen</h3>
    <div class="chips subj-chips">${G.subjects.map((s) => `<button class="chip ${s.id === sub?.id ? 'on' : ''}" style="--h:${hue(s.su, s.name)}" data-act="addSet" data-k="sid" data-v="${s.id}"><i></i>${esc(s.name)}</button>`).join('')}</div>
    <div class="seg small">${hjBtns}</div>
    ${isAbi ? '<p class="muted small-note">Punkte deiner Abiturprüfung in diesem Fach.</p>' : `<div class="seg small">${Object.entries(KIND).map(([k, l]) => `<button class="${A.kind === k ? 'on' : ''}" data-act="addSet" data-k="kind" data-v="${k}">${l}</button>`).join('')}</div>`}
    <div class="pts-grid">${Array.from({ length: 16 }, (_, i) => 15 - i).map((p) => `<button class="pbtn ${tone(p)}" data-act="saveGrade" data-v="${p}"><b>${p}</b><small>${noteOf(p)}</small></button>`).join('')}</div>
    <button class="btn link" data-act="closeSheet">Abbrechen</button>
  </div>`;
}

// Besondere Lernleistung (5. Abiturfach)
function bllCard(G) {
  const b = G.bll;
  if (!b?.on) return '';
  return `<button class="subj bll-row" data-act="bllOpen">
    <span class="sn"><i style="--h:45"></i><span><b>${esc(b.title || 'Besondere Lernleistung')}</b><small>5. Abiturfach · zählt ×4 in Block II</small></span></span>
    ${b.pts != null ? `<span class="pt ${tone(b.pts)}">${b.pts}</span>` : '<span class="pt none">·</span>'}
  </button>`;
}

export function bllSheet(G) {
  const b = G.bll || {};
  return `<div class="sheet-body">
    <h3 class="sheet-title">Besondere Lernleistung</h3>
    <p class="muted">Dein 5. Abiturfach. Mit ihr zählen in Block II deine 4 Prüfungen und die Lernleistung je ×4 statt ×5 (zusammen höchstens 300 Punkte). Trag die Punkte ein, die du für Arbeit und Kolloquium zusammen bekommst.</p>
    <label class="field"><span>Thema (optional)</span><input class="input" data-in="bllTitle" value="${esc(b.title || '')}" maxlength="60" placeholder="z. B. Facharbeit Sport"></label>
    <div class="field-row"><span>Punkte</span>${b.pts != null ? `<b class="pt ${tone(b.pts)}">${b.pts}</b>` : '<small class="muted">noch offen – bis dahin geschätzt</small>'}</div>
    <div class="pts-grid">${Array.from({ length: 16 }, (_, i) => 15 - i).map((p) => `<button class="pbtn ${tone(p)} ${b.pts === p ? 'sel' : ''}" data-act="bllPts" data-v="${p}"><b>${p}</b><small>${noteOf(p)}</small></button>`).join('')}</div>
    <button class="btn soft" data-act="closeSheet">Fertig</button>
    ${b.pts != null ? '<button class="btn link" data-act="bllPts" data-v="">Punkte löschen</button>' : ''}
    <button class="btn link" data-act="bllRemove">Besondere Lernleistung entfernen</button>
  </div>`;
}

export function newSubjectSheet(A = { name: '', q1: true }) {
  const ideas = ['Religion', 'Projektkurs Sport', 'Philosophie', 'Kunst', 'Musik', 'Literatur', 'Physik', 'Informatik'];
  return `<div class="sheet-body">
    <h3 class="sheet-title">Fach hinzufügen</h3>
    <p class="muted">Für Fächer, die nicht (mehr) in Untis stehen – zum Beispiel Kurse, die du nur in der Q1 hattest.</p>
    <form class="form" data-submit="saveSubject">
      <label class="field"><span>Name</span><input class="input" name="name" maxlength="40" value="${esc(A.name || '')}" placeholder="z. B. Projektkurs Sport" required autocomplete="off"></label>
      <div class="chips">${ideas.map((n) => `<button type="button" class="chip" data-act="subjIdea" data-v="${esc(n)}">${esc(n)}</button>`).join('')}</div>
      <div class="field-row"><span>Belegt</span></div>
      <div class="seg small"><button type="button" class="${A.q1 ? 'on' : ''}" data-act="newQ1" data-v="1">Nur in der Q1</button><button type="button" class="${!A.q1 ? 'on' : ''}" data-act="newQ1" data-v="0">Q1 + Q2</button></div>
      <button class="btn" type="submit">Hinzufügen</button>
    </form>
    <button class="btn link" data-act="closeSheet">Abbrechen</button>
  </div>`;
}

// ---------------------------------------------------------------- Verlauf

function eventIcon(ev) {
  const m = /^(\p{Extended_Pictographic}️?)\s*/u.exec(ev.title || '');
  if (m) return [m[1], ev.title.slice(m[0].length)];
  return [{ cancel: '🎉', restore: '⚠️', auth: '🔑', test: '🎯', change: '🔀', exam: '📝' }[ev.kind] || '🔔', ev.title];
}

/** „Freistunden-Rückblick“ – wie ein Jahresrückblick, gezählt seit dem Start von Punktlandung. */
function statsCard(st) {
  if (!st) return '';
  const since = dateLong(st.since).replace(/^\w+, /, '');
  if (!st.total) {
    return `<section class="wrapped calm"><small>Freistunden-Rückblick · seit ${esc(since)}</small><b class="w-big">0</b><p>Noch keine Stunde ausgefallen. Wir zählen mit – versprochen.</p></section>`;
  }
  const max = Math.max(...st.top.map(([, n]) => n));
  const wdMax = Math.max(...st.weekday.slice(1, 6));
  const bestWd = wdMax ? WD_LONG[st.weekday.indexOf(wdMax)] : '';
  const facts = [
    st.sleepIn ? `<span><b>${st.sleepIn}×</b> ausgeschlafen</span>` : '',
    st.earlyEnd ? `<span><b>${st.earlyEnd}×</b> früher Schluss</span>` : '',
    st.fullDays ? `<span><b>${st.fullDays}×</b> ganzer Tag frei</span>` : '',
    bestWd ? `<span>Lieblings-Ausfalltag: <b>${esc(bestWd)}</b></span>` : '',
  ].filter(Boolean).join('');
  return `<section class="wrapped">
    <small>Freistunden-Rückblick · seit ${esc(since)}</small>
    <div class="w-head"><b class="w-big">${st.total}</b><span>Stunden<br>ausgefallen${st.upcoming ? `<em>davon ${st.upcoming} noch angekündigt</em>` : ''}</span></div>
    <div class="w-bars">${st.top.map(([sl, n]) => `<div class="w-bar" style="--h:${hue('', sl)};--w:${Math.round((n / max) * 100)}%"><span>${esc(sl)}</span><b>${n}</b></div>`).join('')}</div>
    ${facts ? `<div class="w-facts">${facts}</div>` : ''}
  </section>`;
}

function history(S) {
  const events = S.state?.events || [];
  let body;
  if (!events.length) {
    body = `<div class="empty big"><div class="empty-ico">📭</div><b>Noch ruhig hier.</b><span>Sobald etwas ausfällt, steht es hier – und auf deinem Sperrbildschirm.</span></div>`;
  } else {
    const groups = new Map();
    for (const ev of events) {
      const d = new Date(ev.at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(ev);
    }
    body = [...groups].map(([day, evs]) => {
      const n = daysFromToday(day);
      const label = n === 0 ? 'Heute' : n === -1 ? 'Gestern' : dateLong(day);
      return `<h4 class="group-label">${esc(label)}</h4>${evs.map((ev) => {
        const [emo, title] = eventIcon(ev);
        const tm = new Date(ev.at);
        return `<article class="event ${esc(ev.kind)}" ${ev.date ? `data-act="dayOne" data-v="${esc(String(ev.date).slice(0, 10))}" role="button"` : ''}>
          <span class="emo">${emo}</span>
          <div><b>${esc(title)}</b>${ev.body ? `<p>${esc(ev.body)}</p>` : ''}
          <time>${String(tm.getHours()).padStart(2, '0')}:${String(tm.getMinutes()).padStart(2, '0')} Uhr${ev.sent ? ' · aufs Handy geschickt' : ''}</time></div>
        </article>`;
      }).join('')}`;
    }).join('');
  }
  return `<header class="top">${wordmark()}</header><h1 class="title">Verlauf</h1><p class="page-sub">Alles, was Punktlandung dir gemeldet hat.</p>${statsCard(S.state?.stats)}${body}`;
}

export function historySheet(S) {
  const html = history(S).replace(/^<header class="top">.*?<\/header>/s, '').replace('<h1 class="title">Verlauf</h1>', '<h3 class="sheet-title">Verlauf</h3>');
  return `<div class="sheet-body hist-sheet">${html}<button class="btn soft" data-act="closeSheet">Schließen</button></div>`;
}

// ---------------------------------------------------------------- Ich

export const ACCENTS = [
  ['koralle', 'Koralle', 'linear-gradient(135deg,#FF4D4D,#E8337E,#B13CE0)'],
  ['blau', 'Blau', 'linear-gradient(135deg,#3D7BFF,#5B5CF0,#9B4DFF)'],
  ['gruen', 'Grün', 'linear-gradient(135deg,#10B981,#0EA5A5,#2F7FD8)'],
  ['lila', 'Lila', 'linear-gradient(135deg,#8B5CF6,#C026D3,#F43F5E)'],
  ['sonne', 'Sonne', 'linear-gradient(135deg,#FFB020,#FF7A1A,#F0443A)'],
  ['pink', 'Pink', 'linear-gradient(135deg,#FF5FA2,#E8337E,#8B5CF6)'],
];

function pushRow(S) {
  const dev = S.state?.device || {};
  const perm = permission();
  if (dev.push && perm === 'granted') {
    return `<div class="row"><span class="r-ico ok">${icon('check')}</span><span class="label">Mitteilungen sind an<small>Auf diesem Gerät${dev.pushOkAt ? ' · zuletzt zugestellt ' + esc(ago(dev.pushOkAt)) : ''}</small></span></div>`;
  }
  if (!pushSupported()) {
    if (isIOS && !isStandalone()) {
      return `<div class="row"><span class="r-ico warn">${icon('bell')}</span><span class="label">Nur über den Home-Bildschirm<small>Leg Punktlandung auf deinen Home-Bildschirm und öffne es dort.</small></span><button class="mini" data-act="howInstall">So geht’s</button></div>`;
    }
    return `<div class="row"><span class="r-ico warn">${icon('bell')}</span><span class="label">Hier nicht möglich<small>Dieser Browser kann keine Mitteilungen.</small></span></div>`;
  }
  if (perm === 'denied') {
    return `<div class="row"><span class="r-ico warn">${icon('bell')}</span><span class="label">Mitteilungen blockiert<small>Erlaube sie in den Einstellungen deines Handys für Punktlandung.</small></span></div>`;
  }
  return `<div class="row"><span class="r-ico warn">${icon('bell')}</span><span class="label">Mitteilungen sind aus${dev.pushError ? `<small>${esc(dev.pushError)}</small>` : '<small>Ohne sie verpasst du Ausfälle.</small>'}</span><button class="mini acc" data-act="pushOn" ${S.busy.push ? 'disabled' : ''}>Einschalten</button></div>`;
}

function me(S) {
  const acc = S.state?.account || {};
  const name = firstName(S) || acc.user || 'Du';
  const initials = name.trim().slice(0, 1).toUpperCase();
  const set = acc.settings || {};
  const p = S.prefs;
  const pushOk = !!S.state?.device?.push && permission() === 'granted';
  const statusTxt = acc.status === 'auth_failed' ? `<span class="bad">Anmeldung klappt nicht: ${esc(acc.lastError || '')}</span>`
    : acc.status === 'error' ? `<span class="bad">Störung: ${esc(acc.lastError || 'Untis nicht erreichbar')}</span>`
      : `Zuletzt geprüft ${esc(ago(acc.lastCheckAt))}`;
  return `<header class="top">${wordmark()}</header><h1 class="title">Ich</h1>
    <div class="profile">
      <span class="avatar">${esc(initials)}</span>
      <span class="pr-txt"><b>${esc(name)}</b><small>${esc(acc.schoolName || '')}</small></span>
      ${acc.className ? `<span class="pr-class"><small>Klasse</small><b>${esc(acc.className)}</b></span>` : ''}
    </div>

    <h4 class="section-title">Mitteilungen</h4>
    <div class="group">
      <button class="row link" data-act="openHistory"><span class="r-ico">${icon('bell')}</span><span class="label">Verlauf & Freistunden-Rückblick<small>${(S.state?.events || []).length} Meldungen</small></span>${(() => { const u = (S.state?.events || []).filter((e) => e.id > (S.lastSeenEvent || 0) && e.kind !== 'test').length; return u ? `<em class="badge inline">${u}</em>` : ''; })()}${icon('right', 'chev')}</button>
      ${pushRow(S)}
      <label class="row"><span class="label">„Doch Unterricht“ melden<small>Wenn ein Ausfall zurückgenommen wird</small></span>
        <input type="checkbox" class="switch" data-act="toggleSetting" data-k="restore" ${set.restore !== false ? 'checked' : ''}></label>
      <label class="row"><span class="label">Abendvorschau<small>Gegen 18 Uhr, wenn sich am nächsten Schultag etwas ändert</small></span>
        <input type="checkbox" class="switch" data-act="toggleSetting" data-k="preview" ${set.preview !== false ? 'checked' : ''}></label>
      <label class="row"><span class="label">Klausur-Erinnerung<small>Am Vorabend um 17 Uhr, mit Raum und Uhrzeit</small></span>
        <input type="checkbox" class="switch" data-act="toggleSetting" data-k="exams" ${set.exams !== false ? 'checked' : ''}></label>
      <label class="row"><span class="label">Raum- & Lehrerwechsel melden<small>Wenn sich Raum oder Lehrkraft ändert</small></span>
        <input type="checkbox" class="switch" data-act="toggleSetting" data-k="changes" ${set.changes === true ? 'checked' : ''}></label>
      ${pushOk ? `<button class="row link" data-act="test" ${S.busy.test ? 'disabled' : ''}><span class="r-ico">${icon('send')}</span><span class="label">Test-Nachricht schicken</span>${icon('right', 'chev')}</button>` : ''}
    </div>

    <h4 class="section-title">Untis</h4>
    <div class="group">
      <div class="row"><span class="r-ico">${icon('school')}</span><span class="label">${esc(acc.schoolName || '')}<small>${esc(acc.user || '')} · ${acc.authKind === 'secret' ? 'mit Schlüssel' : 'mit Passwort'}</small></span></div>
      <button class="row link" data-act="openCourses"><span class="r-ico">${icon('grade')}</span><span class="label">Meine Kurse<small>${coursesChosen(S) ? `${acc.settings.courses.length} ausgewählt` : 'Noch nicht ausgewählt'}</small></span>${icon('right', 'chev')}</button>
      <button class="row link" data-act="refresh" ${S.busy.refresh ? 'disabled' : ''}><span class="r-ico">${icon('refresh')}</span><span class="label">Jetzt prüfen<small>${statusTxt}</small></span>${S.busy.refresh ? '<span class="spin"></span>' : icon('right', 'chev')}</button>
      ${acc.status === 'auth_failed' ? `<button class="row link" data-act="relogin"><span class="r-ico warn">${icon('key')}</span><span class="label">Neu anmelden</span>${icon('right', 'chev')}</button>` : ''}
    </div>

    <h4 class="section-title">Noten</h4>
    <div class="group">
      <button class="row link" data-act="backup"><span class="r-ico">${icon('lock')}</span><span class="label">Noten sichern<small>${p.lastBackup ? 'Zuletzt am ' + esc(dateLong(p.lastBackup)) : 'Noch nie gesichert'} · als Datei, z. B. in iCloud</small></span>${icon('right', 'chev')}</button>
      <button class="row link" data-act="restore"><span class="r-ico">${icon('refresh')}</span><span class="label">Noten wiederherstellen<small>Aus einer gesicherten Datei</small></span>${icon('right', 'chev')}</button>
    </div>

    <h4 class="section-title">Aussehen</h4>
    <div class="group">
      <div class="row col"><span class="label">Design</span>
        <div class="seg small">${[['auto', 'Automatisch'], ['light', 'Hell'], ['dark', 'Dunkel']].map(([v, l]) => `<button class="${p.theme === v ? 'on' : ''}" data-act="theme" data-v="${v}">${l}</button>`).join('')}</div>
      </div>
      <div class="row col"><span class="label">Farbe</span>
        <div class="swatches">${ACCENTS.map(([v, l, c]) => `<button class="sw ${p.accent === v ? 'on' : ''}" style="--c:${c}" data-act="accent" data-v="${v}" aria-label="${l}" title="${l}"></button>`).join('')}</div>
      </div>
      <label class="row"><span class="label">Dein Name</span><input class="input inline" data-in="nick" value="${esc(p.nick || '')}" placeholder="Vorname" maxlength="24"></label>
    </div>

    <h4 class="section-title">Über Punktlandung</h4>
    <div class="group about">
      <details class="row"><summary><span class="r-ico">${icon('info')}</span><span class="label">So funktioniert’s</span>${icon('right', 'chev')}</summary>
        <p>Tagsüber (5:30–22 Uhr) schaut Punktlandung alle 2 Minuten in deinen Untis-Stundenplan, nachts alle 15 Minuten. Ist eine Stunde neu als Ausfall eingetragen, bekommst du sofort eine Mitteilung – auch wenn die App zu ist. Wird ein Ausfall zurückgenommen, sagen wir dir das auch.</p></details>
      <details class="row"><summary><span class="r-ico">${icon('lock')}</span><span class="label">Datenschutz</span>${icon('right', 'chev')}</summary>
        <p>Gespeichert werden nur: deine Schule, dein Untis-Benutzername und dein Passwort bzw. Schlüssel (verschlüsselt), dein Stundenplan der nächsten zwei Wochen und die Mitteilungen der letzten 90 Tage – auf einem Server in der EU. Nichts davon wird weitergegeben. Deine Noten verlassen dein Handy nie. „Abmelden & löschen“ entfernt alles auf dem Server sofort.</p></details>
      <div class="row"><span class="label">Version ${VERSION}<small>Kein offizielles Produkt der Untis GmbH.</small></span></div>
    </div>

    <button class="btn danger" data-act="logout">${icon('out')}Abmelden & Daten löschen</button>
    <p class="fine center">Mit ${'<span class="heart">♥</span>'} gebaut für alle, die gern ausschlafen.</p>`;
}

export function main(S) {
  const tab = S.tab;
  const t = today();
  const dueSoon = (S.state?.homework || []).filter((h) => !h.done && h.due <= addDays(t, 1)).length;
  const content = tab === 'aufgaben' ? tasks(S) : tab === 'ich' || tab === 'verlauf' ? me(S) : tab === 'noten' ? noten(S) : plan(S);
  const tabs = [['plan', 'plan', 'Plan'], ['noten', 'grade', 'Noten'], ['aufgaben', 'tasks', 'Aufgaben'], ['ich', 'user', 'Ich']];
  return `<main class="screen screen-${tab}">${content}</main>
    <nav class="tabbar" aria-label="Bereiche">${tabs.map(([k, ic, label]) => `
      <button class="tab ${tab === k ? 'on' : ''}" data-act="tab" data-v="${k}" aria-current="${tab === k ? 'page' : 'false'}" aria-label="${label}">
        ${icon(ic)}<span>${label}</span>${k === 'aufgaben' && dueSoon && tab !== 'aufgaben' ? `<em class="badge">${dueSoon}</em>` : ''}
      </button>`).join('')}
    </nav>`;
}

export function lessonSheet(b, hw = []) {
  const rows = [
    ['Zeit', `${b.p ? esc(fmtPeriod(b.p)) + '<br>' : ''}${hhmm(b.s)}–${hhmm(b.e)} Uhr`],
    b.ro.length ? ['Raum', esc(b.ro.join(', '))] : null,
    b.te.length ? ['Lehrkraft', esc(b.te.join(', '))] : null,
    b.kl.length ? [b.kl.length > 1 ? 'Klassen' : 'Klasse/Kurs', esc(b.kl.length > 6 ? b.kl.slice(0, 5).join(', ') + ` und ${b.kl.length - 5} weitere` : b.kl.join(', '))] : null,
    b.lt ? ['Stundentext', esc(b.lt)] : null,
    ...b.notes.map((x) => ['Änderung', esc(x)]),
    b.info ? ['Info', esc(b.info)] : null,
    b.rep ? ['Stattdessen', esc(b.rep)] : null,
  ].filter(Boolean);
  const status = b.st === 'cancel' ? '<span class="pill free">Fällt aus</span>'
    : b.st === 'change' ? '<span class="pill change">Geändert</span>'
      : b.st === 'exam' ? '<span class="pill exam">Klausur</span>' : '<span class="pill">Findet statt</span>';
  return `<div class="sheet-body" style="--h:${hue(b.su, b.sl)}">
    <div class="sheet-kicker">${esc(dayWord(b.d))} · ${esc(dateLong(b.d))}</div>
    <h3 class="sheet-title"><i class="subj-dot"></i>${esc(b.sl)}</h3>
    <div>${status}${b.st === 'cancel' && b.d >= today() ? ` <span class="pill ghost">${esc(until(b.d, b.s))}</span>` : ''}</div>
    <dl class="facts">${rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>
    ${(hw || []).filter((h) => h.subject === b.sl && h.due === b.d).map((h) => `<button class="hw-due ${h.done ? 'done' : ''}" data-act="hwEdit" data-v="${esc(h.id)}"><small>Hausaufgabe für diese Stunde</small>${esc(h.text)}</button>`).join('')}
    <button class="btn" data-act="hwNew" data-subject="${esc(b.sl)}" data-su="${esc(b.su)}" data-from="${b.d}">${icon('plus')}Hausaufgabe eintragen</button>
    <button class="btn soft" data-act="closeSheet">Schließen</button>
  </div>`;
}

export function confirmLogoutSheet() {
  return `<div class="sheet-body">
    <h3 class="sheet-title">Wirklich abmelden?</h3>
    <p class="muted">Deine Untis-Zugangsdaten, dein gespeicherter Plan und der Verlauf werden sofort vom Server gelöscht. Du bekommst dann keine Mitteilungen mehr. Deine Noten bleiben auf diesem Handy.</p>
    <button class="btn danger solid" data-act="logoutConfirm">Ja, abmelden & löschen</button>
    <button class="btn soft" data-act="closeSheet">Abbrechen</button>
  </div>`;
}

export function installSheet() {
  return `<div class="sheet-body">
    <h3 class="sheet-title">Auf den Home-Bildschirm</h3>
    <ol class="howto compact">
      <li><span class="n">1</span><div>In Safari auf <b>Teilen</b> <span class="kbd">${icon('share')}</span> tippen (evtl. erst auf <b>•••</b>).</div></li>
      <li><span class="n">2</span><div><b>„Zum Home-Bildschirm“</b> <span class="kbd">${icon('addHome')}</span> wählen.</div></li>
      <li><span class="n">3</span><div>Punktlandung dort öffnen und kurz neu anmelden.</div></li>
    </ol>
    <button class="btn soft" data-act="closeSheet">Alles klar</button>
  </div>`;
}

export const loading = () => `<div class="boot">${wordmark('xl')}</div>`;
