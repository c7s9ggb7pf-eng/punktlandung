// Punktlandung – Ansichten (reines HTML aus dem Zustand).
import { esc, icon, hue, flap } from './ui.js';
import {
  today, addDays, weekday, nowMin, hhmm, daysFromToday, dayWord, dateLong, ago, until, fmtPeriod,
  WD, isIOS, isStandalone, pushSupported, permission, VERSION,
} from './lib.js';

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



function tiles(blocks) {
  const t = today();
  const n = nowMin();
  const real = blocks.filter((b) => b.st !== 'cancel');
  const nowB = real.find((b) => b.d === t && b.s <= n && b.e > n);
  const nextB = real.find((b) => b.d > t || (b.d === t && b.s > n));
  let a;
  if (nowB) {
    a = `<div class="tile"><small><i class="live-dot"></i>Jetzt · bis ${hhmm(nowB.e)}</small><b>${esc(nowB.sl)}</b><span>${esc(nowB.ro.length ? 'Raum ' + nowB.ro.join(', ') : ' ')}</span></div>`;
  } else if (nextB) {
    const when = nextB.d === t ? `Gleich · ${hhmm(nextB.s)}` : `${nextB.d === addDays(t, 1) ? 'Morgen' : WD[weekday(nextB.d)]} · ${hhmm(nextB.s)}`;
    a = `<div class="tile"><small>${icon('clock')}${when}</small><b>${esc(nextB.sl)}</b><span>${esc(nextB.ro.length ? 'Raum ' + nextB.ro.join(', ') : ' ')}</span></div>`;
  } else {
    a = '<div class="tile"><small>Als Nächstes</small><b>Nichts geplant</b><span>Genieß die Zeit</span></div>';
  }
  const wd = weekday(t);
  const mon = addDays(t, wd === 0 ? -6 : 1 - wd);
  const sun = addDays(mon, 6);
  const units = blocks.filter((b) => b.st === 'cancel' && b.d >= mon && b.d <= sun).reduce((s, b) => s + (b.ks?.length || 1), 0);
  const b = `<div class="tile accent"><small>Diese Woche frei</small>${flap(String(Math.min(units, 99)).padStart(2, '0'), 'num')}<span>${units === 1 ? 'Stunde fällt aus' : 'Stunden fallen aus'}</span></div>`;
  return `<div class="tiles">${a}${b}</div>`;
}

function dayList(S, blocks) {
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
  return days.find((d) => d > t && blocks.some((b) => b.d === d)) || days.find((d) => d >= t) || t;
}

function dayChips(S, blocks, sel) {
  const t = today();
  const days = dayList(S, blocks);
  let prevW = null;
  return `<div class="days" id="days">${days.map((d) => {
    const w = weekday(d);
    const sep = prevW != null && w < prevW ? '<span class="wk-sep" aria-hidden="true"></span>' : '';
    prevW = w;
    const hasCancel = blocks.some((b) => b.d === d && b.st === 'cancel');
    const hasChange = blocks.some((b) => b.d === d && b.st === 'change');
    const free = !blocks.some((b) => b.d === d && b.st !== 'cancel');
    return `${sep}<button class="day ${d === sel ? 'sel' : ''} ${d === t ? 'today' : ''} ${d < t ? 'past' : ''}" data-act="day" data-v="${d}" aria-pressed="${d === sel}">
      <span>${d === t ? 'Heute' : WD[w]}</span><b>${Number(d.slice(8))}</b>
      ${hasCancel ? `<i class="pip ${free ? 'full' : ''}"></i>` : hasChange ? '<i class="pip change"></i>' : ''}
    </button>`;
  }).join('')}</div>`;
}

function lessonCard(b, i, t, n) {
  const past = isPast(b, t, n);
  const now = b.d === t && b.s <= n && b.e > n;
  const prog = now ? Math.round(((n - b.s) / (b.e - b.s)) * 100) : 0;
  const meta = [b.ro.length ? b.ro.join(', ') : '', b.te.join(', ')].filter(Boolean).join(' · ');
  let stamp = '';
  let tag = '';
  let extra = '';
  if (b.st === 'cancel') {
    stamp = '<span class="stamp">Fällt aus</span>';
    extra = b.rep ? `Stattdessen: ${b.rep}` : b.info || '';
  } else if (b.st === 'change') {
    const roomOnly = b.notes.some((x) => x.startsWith('Raum')) && !b.notes.some((x) => x.startsWith('Vertretung'));
    tag = `<span class="tag change">${roomOnly ? 'Raum neu' : 'Geändert'}</span>`;
    extra = [...b.notes, b.info].filter(Boolean).join(' · ');
  } else if (b.st === 'exam') {
    stamp = '<span class="stamp exam">Klausur</span>';
  } else if (b.info) {
    extra = b.info;
  }
  return `<button class="ticket ${b.st} ${past ? 'past' : ''} ${now ? 'now' : ''}" data-act="lesson" data-i="${i}" style="--h:${hue(b.su)};--p:${prog}%">
    <span class="tk-main">
      <span class="tk-time"><b>${hhmm(b.s)}</b><span>${hhmm(b.e)}</span></span>
      <span class="tk-body">
        <span class="tk-sub"><i></i><span>${esc(b.sl)}</span></span>
        ${meta ? `<span class="tk-meta">${esc(meta)}</span>` : ''}
        ${extra ? `<span class="tk-extra">${esc(extra)}</span>` : ''}
      </span>
      ${tag}
    </span>
    <span class="tk-stub"><small>${now ? 'Jetzt' : 'Std.'}</small><b>${esc(b.p || '–')}</b></span>
    ${stamp}${now ? '<span class="tk-progress"></span>' : ''}
  </button>`;
}

function dayView(S, blocks, sel) {
  const t = today();
  const n = nowMin();
  const list = blocks.map((b, i) => [b, i]).filter(([b]) => b.d === sel);
  const units = list.filter(([b]) => b.st !== 'cancel').reduce((s, [b]) => s + (b.ks?.length || 1), 0);
  const w = weekday(sel);
  let body;
  if (!list.length) {
    body = `<div class="empty"><div class="empty-ico">${w === 0 || w === 6 ? '🛋️' : '🎈'}</div><b>${w === 0 || w === 6 ? 'Wochenende' : 'Kein Unterricht'}</b><span>${w === 0 || w === 6 ? 'Lehn dich zurück.' : 'An diesem Tag steht nichts im Plan.'}</span></div>`;
  } else {
    const out = [];
    let lastEnd = null;
    for (const [b, i] of list) {
      if (lastEnd != null && b.s - lastEnd >= 30) out.push(`<div class="gap">Freistunde · ${b.s - lastEnd} Min.</div>`);
      out.push(lessonCard(b, i, t, n));
      lastEnd = Math.max(lastEnd ?? 0, b.e);
    }
    body = out.join('');
  }
  const allFree = list.length && !units;
  return `<div class="day-head"><h3>${esc(dateLong(sel))}</h3><span>${allFree ? '<b class="acc">frei 🎉</b>' : list.length ? `${units} ${units === 1 ? 'Stunde' : 'Stunden'}` : ''}</span></div>
    <div class="lessons">${body}</div>`;
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
  if (n === 0) return 'Heute';
  if (n === 1) return 'Morgen';
  if (n === 2) return 'Übermorgen';
  const [, m, dd] = d.split('-');
  return `${WD[weekday(d)]} ${dd}.${m}.`;
}
const cut = (s, n = 13) => (String(s).length <= n ? String(s) : String(s).slice(0, n - 1) + '.');
const units = (list) => list.reduce((s, b) => s + (b.ks?.length || 1), 0);

function heroBoard(S, blocks) {
  const acc = S.state?.account;
  const t = today();
  const n = nowMin();
  let label = 'Status';
  let when = 'Nächste 7 Tage';
  let main = 'Alles';
  let status = 'nach Plan';
  let footL = 'Keine Ausfälle';
  let footR = 'in Sicht';
  let tone = '';
  let act = '';
  if (acc?.status === 'auth_failed') {
    label = 'Untis';
    when = 'Anmeldung';
    main = 'Login';
    status = 'erneuern';
    footL = 'Untis lässt mich nicht rein';
    footR = 'Hier tippen';
    tone = 'bad';
    act = 'data-act="relogin" role="button"';
  } else {
    const next = blocks.find((b) => !isPast(b, t, n) && b.st === 'cancel' && daysFromToday(b.d) <= 7);
    if (next) {
      const day = blocks.filter((b) => b.d === next.d);
      const active = day.filter((b) => b.st !== 'cancel');
      const cancels = day.filter((b) => b.st === 'cancel' && !isPast(b, t, n));
      label = 'Nächster Ausfall';
      when = boardDay(next.d);
      act = `data-act="day" data-v="${next.d}" role="button"`;
      if (!active.length) {
        main = boardDay(next.d);
        status = 'komplett frei';
        footL = `Alle ${units(day)} Stunden`;
        footR = 'fallen aus';
      } else {
        const first = Math.min(...active.map((b) => b.s));
        const last = Math.max(...active.map((b) => b.e));
        if (cancels.length > 1) {
          main = `${units(cancels)} Stunden`;
          status = 'fallen aus';
          footL = [...new Set(cancels.map((b) => b.su))].join(' · ');
          footR = cancels.some((b) => b.e <= first) ? `Start erst ${hhmm(first)}` : cancels.some((b) => b.s >= last) ? `Schluss ${hhmm(last)}` : '';
        } else {
          main = cut(next.sl);
          status = 'fällt aus';
          if (next.p) when += ' · ' + fmtPeriod(next.p, true);
          footL = `${hhmm(next.s)}–${hhmm(next.e)}`;
          footR = next.rep ? `dafür ${cut(next.rep.split(' · ')[0], 14)}`
            : next.e <= first ? `Ausschlafen bis ${hhmm(first)}`
              : next.s >= last ? `Schluss um ${hhmm(last)}`
                : next.info ? cut(next.info, 24) : '';
        }
      }
    } else {
      const wd = weekday(t);
      if ((wd === 6 || wd === 0 || (wd === 5 && n > 15 * 60)) && !blocks.some((b) => b.d === t && !isPast(b, t, n))) {
        main = 'Schönes';
        status = 'Wochenende';
      }
    }
  }
  return `<section class="board hero ${tone}" ${act}>${screws}
    <div class="board-top"><span>${esc(label)}</span><span>${esc(when)}</span></div>
    <div class="board-row">${flap(main, 'main')}</div>
    <div class="board-row">${flap(status, 'status')}</div>
    <div class="board-foot"><span>${esc(footL)}</span><span>${esc(footR)}</span></div>
  </section>`;
}

function plan(S) {
  const blocks = S.state?.snapshot?.blocks || [];
  const name = firstName(S);
  const t = today();
  const sel = defaultDay(S);
  const greet = name ? `Hey ${esc(name)} 👋` : 'Hey 👋';
  return `<header class="top">${wordmark()}${liveChip(S)}</header>
    <p class="greet">${greet} · ${esc(dateLong(t))}</p>
    ${S.state ? heroBoard(S, blocks) : '<div class="board hero skel"></div>'}
    ${S.state ? tiles(blocks) : '<div class="tiles"><div class="tile skel"></div><div class="tile skel"></div></div>'}
    ${S.state ? dayChips(S, blocks, sel) : ''}
    ${S.state ? dayView(S, blocks, sel) : '<div class="lessons"><div class="ticket skel"></div><div class="ticket skel"></div><div class="ticket skel"></div></div>'}`;
}

function eventIcon(ev) {
  const m = /^(\p{Extended_Pictographic}️?)\s*/u.exec(ev.title || '');
  if (m) return [m[1], ev.title.slice(m[0].length)];
  return [{ cancel: '🎉', restore: '⚠️', auth: '🔑', test: '🎯' }[ev.kind] || '🔔', ev.title];
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
        return `<article class="event ${esc(ev.kind)}" ${ev.date ? `data-act="day" data-v="${esc(String(ev.date).slice(0, 10))}" role="button"` : ''}>
          <span class="emo">${emo}</span>
          <div><b>${esc(title)}</b>${ev.body ? `<p>${esc(ev.body)}</p>` : ''}
          <time>${String(tm.getHours()).padStart(2, '0')}:${String(tm.getMinutes()).padStart(2, '0')} Uhr${ev.sent ? ' · aufs Handy geschickt' : ''}</time></div>
        </article>`;
      }).join('')}`;
    }).join('');
  }
  return `<header class="page-head"><h2>Verlauf</h2><p>Alles, was Punktlandung dir gemeldet hat.</p></header>${body}`;
}

const ACCENTS = [
  ['lime', 'Limette', '#C8F560'], ['mint', 'Minze', '#6FF0C6'], ['sky', 'Himmel', '#84C5FF'],
  ['lilac', 'Flieder', '#C6B3FF'], ['sun', 'Sonne', '#FFD34D'], ['pink', 'Pink', '#FF9BD2'],
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
  const statusTxt = acc.status === 'auth_failed' ? `<span class="bad">Anmeldung klappt nicht: ${esc(acc.lastError || '')}</span>`
    : acc.status === 'error' ? `<span class="bad">Störung: ${esc(acc.lastError || 'Untis nicht erreichbar')}</span>`
      : `Zuletzt geprüft ${esc(ago(acc.lastCheckAt))}`;
  return `<header class="page-head"><h2>Ich</h2></header>
    <div class="ticket pass">
      <span class="tk-main">
        <span class="avatar">${esc(initials)}</span>
        <span class="tk-body">
          <small class="pass-label">Bordkarte · Punktlandung</small>
          <span class="pass-name">${esc(name)}</span>
          <span class="tk-meta">${esc(acc.schoolName || '')}</span>
        </span>
      </span>
      <span class="tk-stub"><small>Klasse</small><b>${esc(acc.className || '–')}</b></span>
    </div>

    <h4 class="section-title">Mitteilungen</h4>
    <div class="group">
      ${pushRow(S)}
      <label class="row"><span class="label">„Doch Unterricht“ melden<small>Wenn ein Ausfall zurückgenommen wird</small></span>
        <input type="checkbox" class="switch" data-act="toggleRestore" ${set.restore !== false ? 'checked' : ''}></label>
      ${S.state?.device?.push ? `<button class="row link" data-act="test" ${S.busy.test ? 'disabled' : ''}><span class="r-ico">${icon('send')}</span><span class="label">Test-Nachricht schicken</span>${icon('right', 'chev')}</button>` : ''}
    </div>

    <h4 class="section-title">Untis</h4>
    <div class="group">
      <div class="row"><span class="r-ico">${icon('school')}</span><span class="label">${esc(acc.schoolName || '')}<small>${esc(acc.user || '')} · ${acc.authKind === 'secret' ? 'mit Schlüssel' : 'mit Passwort'}</small></span></div>
      <button class="row link" data-act="refresh" ${S.busy.refresh ? 'disabled' : ''}><span class="r-ico">${icon('refresh')}</span><span class="label">Jetzt prüfen<small>${statusTxt}</small></span>${S.busy.refresh ? '<span class="spin"></span>' : icon('right', 'chev')}</button>
      ${acc.status === 'auth_failed' ? `<button class="row link" data-act="relogin"><span class="r-ico warn">${icon('key')}</span><span class="label">Neu anmelden</span>${icon('right', 'chev')}</button>` : ''}
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
        <p>Gespeichert werden nur: deine Schule, dein Untis-Benutzername und dein Passwort bzw. Schlüssel (verschlüsselt), dein Stundenplan der nächsten zwei Wochen und die Mitteilungen der letzten 90 Tage – auf einem Server in der EU. Nichts davon wird weitergegeben. „Abmelden & löschen“ entfernt alles sofort.</p></details>
      <div class="row"><span class="label">Version ${VERSION}<small>Kein offizielles Produkt der Untis GmbH.</small></span></div>
    </div>

    <button class="btn danger" data-act="logout">${icon('out')}Abmelden & Daten löschen</button>
    <p class="fine center">Mit ${'<span class="heart">♥</span>'} gebaut für alle, die gern ausschlafen.</p>`;
}

export function main(S) {
  const tab = S.tab;
  const unseen = (S.state?.events || []).filter((e) => e.id > (S.lastSeenEvent || 0) && e.kind !== 'test').length;
  const content = tab === 'verlauf' ? history(S) : tab === 'ich' ? me(S) : plan(S);
  const tabs = [['plan', 'plan', 'Plan'], ['verlauf', 'bell', 'Verlauf'], ['ich', 'user', 'Ich']];
  return `<main class="screen screen-${tab}">${content}</main>
    <nav class="tabbar" aria-label="Bereiche">${tabs.map(([k, ic, label]) => `
      <button class="tab ${tab === k ? 'on' : ''}" data-act="tab" data-v="${k}" aria-current="${tab === k ? 'page' : 'false'}" aria-label="${label}">
        ${icon(ic)}<span>${label}</span>${k === 'verlauf' && unseen && tab !== 'verlauf' ? `<em class="badge">${unseen}</em>` : ''}
      </button>`).join('')}
    </nav>`;
}

export function lessonSheet(b) {
  const rows = [
    ['Zeit', `${b.p ? esc(fmtPeriod(b.p)) + ' · ' : ''}${hhmm(b.s)}–${hhmm(b.e)} Uhr`],
    b.ro.length ? ['Raum', esc(b.ro.join(', '))] : null,
    b.te.length ? ['Lehrkraft', esc(b.te.join(', '))] : null,
    b.kl.length ? ['Klasse/Kurs', esc(b.kl.join(', '))] : null,
    b.lt ? ['Stundentext', esc(b.lt)] : null,
    ...b.notes.map((x) => ['Änderung', esc(x)]),
    b.info ? ['Info', esc(b.info)] : null,
    b.rep ? ['Stattdessen', esc(b.rep)] : null,
  ].filter(Boolean);
  const status = b.st === 'cancel' ? '<span class="pill free">Fällt aus</span>'
    : b.st === 'change' ? '<span class="pill change">Geändert</span>'
      : b.st === 'exam' ? '<span class="pill exam">Klausur</span>' : '<span class="pill">Findet statt</span>';
  return `<div class="sheet-body" style="--h:${hue(b.su)}">
    <div class="sheet-kicker">${esc(dayWord(b.d))} · ${esc(dateLong(b.d))}</div>
    <h3 class="sheet-title"><i class="subj-dot"></i>${esc(b.sl)}</h3>
    <div>${status}${b.st === 'cancel' && b.d >= today() ? ` <span class="pill ghost">${esc(until(b.d, b.s))}</span>` : ''}</div>
    <dl class="facts">${rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>
    <button class="btn soft" data-act="closeSheet">Schließen</button>
  </div>`;
}

export function confirmLogoutSheet() {
  return `<div class="sheet-body">
    <h3 class="sheet-title">Wirklich abmelden?</h3>
    <p class="muted">Deine Untis-Zugangsdaten, dein gespeicherter Plan und der Verlauf werden sofort vom Server gelöscht. Du bekommst dann keine Mitteilungen mehr.</p>
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
