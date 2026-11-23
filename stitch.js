'use strict';
/* ============ Diseño Stitch: pantallas principales ============
   Se carga al final (después de app.js). Solo cambia cómo se ven las pantallas:
   usa los mismos datos y las mismas acciones que ya existían. */

/* ---------- íconos (trazo) ---------- */
const IC = {
  flag: '<path d="M4 22V4a1 1 0 0 1 1-1h11l-2 4 2 4H5"/>',
  pencil: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
  sparkle: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2 2M16 16l2 2M6 18l2-2M16 8l2-2"/>',
  send: '<path d="M12 19V5M5 12l7-7 7 7"/>',
  down: '<path d="M12 5v14M5 12l7 7 7-7"/>',
  up: '<path d="M7 17 17 7M8 7h9v9"/>',
  card: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>',
  minus: '<path d="M5 12h14"/>',
  check: '<path d="m5 12 5 5 9-10"/>',
  scale: '<rect x="3" y="4" width="18" height="16" rx="3"/><path d="M12 8v4M8 4l2 4h4l2-4"/>',
  shield: '<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6Z"/>',
  home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>',
  alert: '<path d="M12 3 2 20h20Z"/><path d="M12 10v4M12 17h.01"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 8h.01M11 12h1v5h1"/>',
  ring: '<path d="M21 12a9 9 0 1 1-6.2-8.6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  fire: '<path d="M12 22c4 0 7-3 7-7 0-5-5-7-5-12-3 2-5 5-5 8-1-1-2-2-2-4-2 2-2 5-2 8 0 4 3 7 7 7Z"/>',
  medal: '<circle cx="12" cy="9" r="6"/><path d="m9 14-2 8 5-3 5 3-2-8"/>',
  gift: '<rect x="3" y="8" width="18" height="13" rx="2"/><path d="M3 12h18M12 8v13M12 8S10 3 7.5 4.5 9 8 12 8Zm0 0s2-5 4.5-3.5S15 8 12 8Z"/>',
  rocket: '<path d="M5 15c-1.5 1.5-2 5-2 5s3.5-.5 5-2M9 18l-3-3 8-9c2-2 5-3 7-3 0 2-1 5-3 7Z"/><circle cx="15" cy="9" r="1.5"/>',
  tasks: '<path d="m3 6 2 2 3-3M3 13l2 2 3-3M11 7h10M11 14h10M11 20h10"/>',
  timer: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2M9 2h6"/>',
  dumbbell: '<path d="m6 6 12 12M4 8l4-4M16 20l4-4M2 10l2 2M20 12l2 2M8 4l2 2M14 18l2 2"/>',
  trophy: '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0Z"/><path d="M17 5h3a3 3 0 0 1-3 4M7 5H4a3 3 0 0 0 3 4"/>',
  heart: '<path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10Z"/>',
  note: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>',
  cal: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  cloud: '<path d="M7 18a5 5 0 1 1 1-9.9A6 6 0 0 1 19 10a4 4 0 0 1 0 8Z"/>',
  share: '<path d="M12 3v13M7 8l5-5 5 5M5 14v6h14v-6"/>',
  chev: '<path d="m9 6 6 6-6 6"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1A1.7 1.7 0 0 0 9 19.4a1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/>',
  piggy: '<path d="M19 10c1 0 2 1 2 2h-1c0 2-1 3-2 4v3h-3v-2h-4v2H8v-3a6 6 0 0 1 2-10.5c2-.5 4-.5 6 .5l2-1v3c.5.5 1 1 1 2Z"/><path d="M15 9h.01"/>',
};
const ico = (n, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 24 24" aria-hidden="true">${IC[n] || ''}</svg>`;
const badge = (txt, cls = '') => `<span class="sbadge ${cls}">${txt}</span>`;
const pctTxt = n => `${Math.round(n)}%`;
const daysTo = k => Math.round((parseD(k) - parseD(today())) / 864e5);
const whenTxt = k => { const n = daysTo(k); return n === 0 ? 'Hoy' : n === 1 ? 'Mañana' : n === -1 ? 'Ayer' : n < 0 ? `Hace ${-n} días` : `En ${n} días`; };
const agoTxt = ms => { if (!ms) return ''; const m = Math.round((Date.now() - ms) / 60000); return m < 60 ? `Hace ${Math.max(1, m)} min` : m < 1440 ? `Hace ${Math.round(m / 60)} h` : m < 2880 ? 'Ayer' : `Hace ${Math.round(m / 1440)} días`; };
const SCOLORS = ['#10b981', '#06b6d4', '#a5b4fc', '#6366f1', '#f59e0b', '#f472b6', '#94a3b8'];

/* =========================================================
   INICIO
   ========================================================= */
function sPriority() {
  const t = today();
  const mon = weekMon(t);
  const focus = db.reviews?.[dkey(addDays(parseD(mon), -7))]?.focus || db.reviews?.[mon]?.focus;
  const elapsed = Math.min(7, wday() + 1);
  return `<div class="scard pri">
    <div class="pri-row"><span class="ibox">${ico('flag')}</span><span class="eyebrow">Prioridad de la semana</span>
      <button class="iround" data-act="go" data-id="revision" aria-label="Editar prioridad">${ico('pencil')}</button></div>
    ${focus ? `<div class="pri-title">${esc(focus)}</div>
      <div class="pri-sub">La elegiste en tu revisión semanal. Que todo lo de hoy te acerque a esto.</div>
      <div class="pri-foot"><b>Día ${elapsed} de 7</b><span class="acc">${pctTxt(elapsed / 7 * 100)} de la semana</span></div>
      <div class="sbar"><i style="width:${elapsed / 7 * 100}%"></i></div>`
    : `<div class="pri-title">Elige tu prioridad</div>
      <div class="pri-sub">Haz tu revisión semanal y escoge lo más importante de esta semana.</div>
      <button class="sbtn ghost" data-act="go" data-id="revision">Hacer revisión</button>`}
  </div>`;
}

const REF_MOODS = [[5, '😄', 'Muy bien'], [4, '🙂', 'Bien'], [3, '😐', 'Normal'], [2, '😕', 'Mal'], [1, '😞', 'Muy mal']];
function sReflection() {
  const t = today(), h = db.health[t] || {}, j = db.journal[t] || {};
  return `<div class="scard">
    <div class="shead"><h3>${ico('sparkle', 'cy')} Reflexión del día</h3><button class="slink" data-act="go" data-id="checkin">Check-in</button></div>
    <div class="mood-row">${REF_MOODS.map(([v, e, l]) => `<button class="mood-pill ${h.mood === v ? 'on' : ''}" data-act="sMood" data-id="${v}">${e} ${l}</button>`).join('')}</div>
    <form class="ref-form" id="sref"><input name="t" maxlength="200" placeholder="Una idea o logro de hoy…" autocomplete="off">
      <button class="send" aria-label="Guardar">${ico('send')}</button></form>
    ${j.text ? `<div class="ref-last">“${esc(j.text.split('\n').pop())}”</div>` : ''}
  </div>`;
}

function sAgenda() {
  const list = dayBlocks(wday());
  const st = blockState(list, true);
  const items = list.map((b, i) => [b, st[i]]).filter(([, s]) => !s.past).slice(0, 4);
  return `<div class="scard">
    <div class="shead"><h3>Agenda de hoy</h3><button class="slink muted" data-act="go" data-id="rutina">${list.length} ${list.length === 1 ? 'bloque' : 'bloques'}</button></div>
    ${!list.length ? `<div class="sempty">Sin actividades para hoy. <button class="slink" data-act="go" data-id="rutina">Arma tu rutina</button></div>`
      : items.length ? `<div class="tl">${items.map(([b, s]) => sBlock(b, s, false)).join('')}</div>` : '<div class="sempty">Terminaste todo lo de hoy 🎉</div>'}
  </div>`;
}
function sBlock(b, s = {}, withCheck = true) {
  const [, e, l, color] = rtype(b.type);
  const dur = toMin(b.end) - toMin(b.start);
  const state = s.past ? 'done' : s.now ? 'now' : '';
  return `<div class="tl-row ${state}" data-act="editBlock" data-id="${b.id}">
    <div class="tl-time"><b>${b.start}</b><small>${dur > 0 ? fmtDur(dur).replace(' min', 'm').replace(' h', 'h') : ''}</small></div>
    <i class="tl-bar" style="background:${color}"></i>
    <div class="tl-body"><div class="t">${esc(b.title)}${s.now ? ' <span class="now-badge">AHORA</span>' : s.next ? ' <span class="next-badge">SIGUE</span>' : ''}</div>
      <div class="s">${e} ${l}${b.place ? ' · ' + esc(b.place) : ''}${b.end ? ' · hasta ' + b.end : ''}</div></div>
    ${withCheck ? `<span class="tl-check ${state}">${s.past ? ico('check') : ''}</span>` : ''}
  </div>`;
}

function sHabitsCard() {
  const t = today();
  if (!db.habits.length) return `<div class="scard"><div class="shead"><h3>Hábitos de hoy</h3></div><div class="sempty">Aún no tienes hábitos. <button class="slink" data-act="addHabit">+ Crear</button></div></div>`;
  const done = db.habits.filter(h => h.log[t]).length;
  return `<div class="scard">
    <div class="shead"><h3>Hábitos de hoy</h3><button class="slink" data-act="go" data-id="habitos">${done} / ${db.habits.length} hechos</button></div>
    <div class="hgrid2">${db.habits.map(h => `<button class="hchip ${h.log[t] ? 'on' : ''}" data-act="habit" data-id="${h.id}"><i>${h.log[t] ? ico('check') : ''}</i><span>${esc(h.name)}</span></button>`).join('')}</div>
  </div>`;
}

function sTasksGoals() {
  const t = today();
  const open = db.tasks.filter(x => !x.done).sort(sortTasks);
  const top = open.filter(x => x.prio === 'alta' || (x.due && x.due <= t));
  const show = (top.length ? top : open).slice(0, 3);
  const goals = db.goals.map(g => ({ g, done: g.steps.filter(s => s.done).length })).filter(x => x.done < x.g.steps.length).slice(0, 2);
  const tag = x => x.due && x.due < t ? badge('Atrasada', 'red') : x.prio === 'alta' ? badge('Urgente', 'red') : x.due === t ? badge('Hoy', 'cy') : x.due ? badge(ddmm(x.due), 'mut') : '';
  return `<div class="scard">
    <div class="shead"><h3>Pendientes y metas</h3><button class="slink muted" data-act="go" data-id="tareas">${top.length ? 'Alta prioridad' : `${open.length} pendientes`}</button></div>
    ${show.length ? show.map(x => `<div class="todo"><button class="box" data-act="toggleTask" data-id="${x.id}" aria-label="Completar"></button>
      <span class="t" data-act="editTask" data-id="${x.id}">${esc(x.title)}</span>${tag(x)}</div>`).join('')
      : `<div class="sempty">Sin pendientes. <button class="slink" data-act="addTask">+ Agregar tarea</button></div>`}
    ${goals.map(({ g, done }) => `<div class="goal" data-act="sGoals"><div class="goal-top"><b>${esc(g.title)}</b><span class="acc">${done} / ${g.steps.length} pasos</span></div>
      <div class="sbar"><i style="width:${done / g.steps.length * 100}%"></i></div></div>`).join('')}
  </div>`;
}

function sBillsCard() {
  const due = db.bills.map(b => ({ b, n: billNext(b) })).filter(x => !x.n.paidThisMonth && x.n.left <= 7).sort((a, b) => a.n.left - b.n.left);
  if (!due.length) return '';
  return `<div class="scard">
    <div class="shead"><h3>Pagos fijos por llegar</h3><button class="slink muted" data-act="go" data-id="pagos">Próximos 7 días</button></div>
    ${due.map(({ b, n }) => `<div class="prow"><span class="icirc">${esc(b.e || (BILL_KINDS[b.kind] || BILL_KINDS.otro)[0])}</span>
      <div class="grow"><div class="t">${esc(b.name)}</div><div class="s ${n.left < 0 ? 'neg' : ''}">${n.left < 0 ? `Venció hace ${-n.left} días` : 'Vence ' + whenTxt(dkey(addDays(new Date(), n.left))).toLowerCase()} · día ${b.day}</div></div>
      <div class="pamt"><b>−${mxn(b.amount)}</b><button class="slink" data-act="payBill" data-id="${b.id}">Pagar</button></div></div>`).join('')}
  </div>`;
}

function sNotesCard() {
  const notes = [...db.notes].sort((a, b) => (b.pinned - a.pinned) || (b.updated - a.updated)).slice(0, 2);
  if (!notes.length) return '';
  return `<div class="scard">
    <div class="shead"><h3>Notas recientes</h3><button class="slink" data-act="go" data-id="notas">${db.notes.length} ${db.notes.length === 1 ? 'nota' : 'notas'}</button></div>
    <div class="ngrid">${notes.map(n => `<button class="ncard" data-act="editNote" data-id="${n.id}"><b>${n.pinned ? '📌 ' : ''}${esc(n.title || 'Sin título')}</b><span>${esc(n.body.slice(0, 70))}</span><small>${agoTxt(n.updated)}</small></button>`).join('')}</div>
  </div>`;
}

/* Las tarjetas del diseño van primero; las demás siguen disponibles en Personalizar */
HOME_CARDS.splice(0, HOME_CARDS.length,
  ['review', 'Prioridad de la semana', () => sPriority() + (wday() >= 5 ? `<button class="scard prompt-row" data-act="go" data-id="revision"><span class="icirc">📊</span><span class="grow"><b>Tu revisión semanal está lista</b><small>Mira cómo te fue esta semana.</small></span>${ico('chev', 'chev')}</button>` : '')],
  ['checkin', 'Reflexión del día', () => sReflection()],
  ['agenda', 'Agenda de hoy', () => sAgenda()],
  ['habits', 'Hábitos de hoy', () => sHabitsCard()],
  ['tasks', 'Pendientes y metas', () => sTasksGoals()],
  ['bills', 'Pagos fijos por llegar', () => sBillsCard()],
  ['notes', 'Notas recientes', () => sNotesCard()],
  ['level', 'Tu nivel y retos', () => gameHomeCard()],
  ['quick', 'Botones rápidos', () => homeQuick()],
  ['money', 'Dinero', () => homeMoney()],
  ['projects', 'Proyectos', () => homeProjects()],
  ['dates', 'Fechas próximas', () => homeDates()],
  ['quote', 'Frase del día', () => homeQuote()],
);
HOME_DEFAULT_OFF.splice(0, HOME_DEFAULT_OFF.length, 'level', 'quick', 'money', 'projects', 'dates', 'quote');

function sInicio() {
  const now = new Date(), h = now.getHours();
  const saludo = h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches';
  const name = db.settings.name ? `, ${esc(db.settings.name)}` : '';
  const isStandalone = window.navigator.standalone || matchMedia('(display-mode: standalone)').matches;
  let hideInstall = false; try { hideInstall = localStorage.getItem('mivida.hideInstall') === '1'; } catch {}
  const map = Object.fromEntries(HOME_CARDS.map(c => [c[0], c[2]]));
  return `
    <div class="phead">
      <div><div class="eyebrow acc">${now.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'short' }).replace('.', '')}</div>
      <div class="ptitle">${saludo}${name}</div></div>
      <button class="spill" data-act="customizeHome">${ico('gear')} Personalizar</button>
    </div>
    ${(!isStandalone && !hideInstall) ? `<div class="scard install-s"><span class="icirc">${ico('share')}</span><div class="grow"><b>Instálala en tu iPhone</b><small>En Safari toca Compartir ↑ y luego “Agregar a pantalla de inicio”.</small></div><button class="slink" data-act="hideInstall">Ocultar</button></div>` : ''}
    ${homeFocusCard()}
    ${homeReconcile()}
    ${homeLayout().filter(c => c.on).map(c => map[c.id]()).join('')}`;
}
function mountInicio(v) {
  mountHome(v);
  $('#sref', v)?.addEventListener('submit', e => {
    e.preventDefault();
    const txt = e.target.t.value.trim(); if (!txt) return;
    const k = today(), j = db.journal[k] || { text: '', learned: '', grateful: '' };
    j.text = j.text ? `${j.text}\n${txt}` : txt;
    db.journal[k] = j; save(); render(); toast('Guardado en tu diario ✅');
  });
}

/* =========================================================
   FINANZAS
   ========================================================= */
function sFinanzas() {
  const t = today(), mon = weekMon(t), sun = dkey(addDays(parseD(mon), 6));
  const cash = planCash();
  const wtx = db.tx.filter(x => x.date >= mon && x.date <= sun && x.cat !== 'ajuste');
  const wnet = r2(wtx.reduce((a, x) => a + (x.type === 'ingreso' ? x.amount : -x.amount), 0));
  const max = budgetFor(mon), spent = weekSpent(mon), used = max ? spent / max * 100 : 0;
  const byCat = {};
  for (const x of db.tx) if (x.type === 'gasto' && x.date >= mon && x.date <= sun && !NOT_WEEKLY.includes(x.cat)) byCat[x.cat] = (byCat[x.cat] || 0) + x.amount;
  const cats = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
  const P = projectPlan();
  const debts = planDebts();
  const totalPend = r2(debts.reduce((a, d) => a + d.pending, 0)), totalAll = r2(debts.reduce((a, d) => a + d.total, 0));
  const nextPay = db.plan.items.filter(i => i.kind === 'pago' && !i.done).sort((a, b) => a.date.localeCompare(b.date))[0];
  const in7 = dkey(addDays(new Date(), 7));
  const sched = [
    ...db.plan.items.filter(i => !i.done && i.date <= in7).map(i => ({ k: 'plan', i, date: i.date })),
    ...db.bills.map(b => ({ b, n: billNext(b) })).filter(x => !x.n.paidThisMonth && x.n.left <= 7).map(x => ({ k: 'bill', b: x.b, n: x.n, date: dkey(addDays(new Date(), x.n.left)) })),
  ].sort((a, b) => a.date.localeCompare(b.date));
  const recon = reconcileDue();

  return `
    <div class="fhero">
      <div><div class="eyebrow">Dinero hoy</div>
        <div class="fval">${mxn(cash)}${wnet ? `<span class="chg ${wnet < 0 ? 'neg' : ''}">${wnet > 0 ? '+' : ''}${mxn(wnet)} semana</span>` : ''}</div></div>
      <button class="cur" data-act="settings"><i></i>${esc(db.settings.currency || 'MXN')}</button>
    </div>
    <div class="ftiles">
      <button data-act="addTx" data-id="ingreso"><span class="fic g">${ico('down')}</span>Ingreso</button>
      <button data-act="payDebt"><span class="fic c">${ico('card')}</span>Pago deuda</button>
      <button data-act="addTx" data-id="gasto"><span class="fic r">${ico('note')}</span>Gasto</button>
    </div>
    ${typeof walletsSection === "function" ? walletsSection() : ""}
    <div class="scard sunday ${recon ? 'due' : ''}">
      <span class="sq">${ico('scale')}</span>
      <div class="grow"><b>Cuadre del domingo</b><small>${recon ? `Revisa que tengas ${mxn(cash)} de verdad` : `La app calcula ${mxn(cash)}. ¿Cuadra?`}</small></div>
      <button class="sbtn sq-btn" data-act="fixCash">${recon ? 'Cuadrar' : 'Revisar'}</button>
    </div>
    <div class="scard">
      <div class="eyebrow">Gasto de la semana</div>
      <div class="wrow"><div class="wval">${mxn(spent)} <small>de ${mxn(max)} tope</small></div>
        <button class="spill ${used > 100 ? 'bad' : 'good'}" data-act="editBudgets">${pctTxt(used)} usado</button></div>
      <div class="stack">${cats.map(([c], i) => `<i style="width:${max ? byCat[c] / Math.max(max, spent) * 100 : 0}%;background:${SCOLORS[i % SCOLORS.length]}"></i>`).join('')}</div>
      <div class="cchips"><span class="cchip on"><i style="background:#fff"></i>Todo</span>${cats.map(([c, v], i) => `<span class="cchip"><i style="background:${SCOLORS[i % SCOLORS.length]}"></i>${catInfo('gasto', c)[2]} ${mxn(r2(v))}</span>`).join('')}</div>
    </div>

    <div class="sec"><h3>Metas de ahorro</h3><button class="slink" data-act="go" data-id="ahorro">${db.savings.length} ${db.savings.length === 1 ? 'activa' : 'activas'}</button></div>
    ${db.savings.length ? db.savings.map((s, i) => {
      const v = saved(s), pct = s.target ? Math.min(100, v / s.target * 100) : 0;
      return `<div class="scard jar">
        <div class="jar-top"><span class="sq ${i % 2 ? 'c' : ''}">${esc(s.e || '🐷')}</span>
          <div class="grow" data-act="editSaving" data-id="${s.id}"><b>${esc(s.name)}</b><small>Meta: ${mxn(s.target)}</small></div>
          <div class="jar-amt"><b>${mxn(v)}</b><small class="${i % 2 ? 'cy' : 'acc'}">${pctTxt(pct)}</small></div></div>
        <div class="sbar ${i % 2 ? 'c' : ''}"><i style="width:${pct}%"></i></div>
        <div class="jar-btns"><button data-act="saveMove" data-id="${s.id}|1" class="dep">${ico('plus')} Depositar</button><button data-act="saveMove" data-id="${s.id}|-1" class="wd" ${v > 0 ? '' : 'disabled'}>${ico('minus')} Retirar</button></div>
      </div>`; }).join('')
      : `<button class="scard sempty-card" data-act="addSaving">${ico('piggy')} Crea tu primera meta de ahorro</button>`}

    <div class="sec"><h3>Fijos y programados</h3><button class="slink muted" data-act="go" data-id="deudas">Próximos 7 días</button></div>
    <div class="scard">${sched.length ? sched.map(x => x.k === 'plan' ? `<div class="prow">
        <span class="icirc ${x.i.kind === 'ingreso' ? 'g' : ''}">${x.i.kind === 'ingreso' ? '💰' : '💳'}</span>
        <div class="grow" data-act="editPlan" data-id="${x.i.id}"><div class="t">${esc(x.i.name)}</div><div class="s ${x.date < t ? 'neg' : ''}">${x.i.kind === 'ingreso' ? 'Ingreso' : 'Pago de deuda'} · ${x.date < t ? 'Atrasado' : whenTxt(x.date)}</div></div>
        <b class="${x.i.kind === 'ingreso' ? 'pos' : ''}">${x.i.kind === 'ingreso' ? '+' : '−'}${mxn(x.i.amount)}</b>
        <button class="check" data-act="togglePlan" data-id="${x.i.id}" aria-label="${x.i.kind === 'ingreso' ? 'Marcar cobrado' : 'Marcar pagado'}"></button></div>`
      : `<div class="prow"><span class="icirc">${esc(x.b.e || (BILL_KINDS[x.b.kind] || BILL_KINDS.otro)[0])}</span>
        <div class="grow" data-act="go" data-id="pagos"><div class="t">${esc(x.b.name)}</div><div class="s ${x.n.left < 0 ? 'neg' : ''}">Pago fijo · ${x.n.left < 0 ? `Venció hace ${-x.n.left} días` : whenTxt(x.date)}</div></div>
        <b>−${mxn(x.b.amount)}</b><button class="check" data-act="payBill" data-id="${x.b.id}" aria-label="Pagar"></button></div>`).join('')
      : '<div class="sempty">Nada programado en los próximos 7 días.</div>'}</div>

    <div class="sec"><h3>Plan de deudas</h3>${P.firstNeg ? `<span class="sbadge red solid">${ico('alert')} El plan no alcanza</span>` : `<button class="slink" data-act="go" data-id="deudas">Ver plan</button>`}</div>
    <div class="scard debt">
      <div class="jar-top"><span class="sq r">${ico('card')}</span>
        <div class="grow" data-act="go" data-id="deudas"><b>${nextPay ? esc(nextPay.name) : 'Sin pagos pendientes'}</b><small>${nextPay ? `Próximo pago ${shortD(nextPay.date)} · ${mxn(nextPay.amount)}` : '🎉 Todo pagado'}</small></div>
        <div class="jar-amt"><b>${mxn(totalPend)}</b><small>faltan de ${mxn(totalAll)}</small></div></div>
      <div class="sbar debt"><i style="width:${totalAll ? (1 - totalPend / totalAll) * 100 : 0}%"></i></div>
      ${P.firstNeg ? `<div class="warnbox">${ico('info')}<span>El ${shortD(P.firstNeg.date)} quedarías en ${mxn(P.firstNeg.amount)}. Revisa tu plan o baja tu gasto semanal para no quedarte corto.</span></div>` : ''}
      <button class="sbtn block" data-act="payDebt">${ico('card')} Registrar pago${nextPay ? ` (${mxn(nextPay.amount)})` : ''}</button>
    </div>

    <div class="sec"><h3>Movimientos</h3></div>
    ${viewFinanzasHistory()}`;
}
/* Parte de abajo de la pantalla anterior (mes, categorías y actividad) */
function viewFinanzasHistory() {
  const html = viewFinanzas();
  const i = html.indexOf('<div class="monthnav">');
  return i >= 0 ? html.slice(i) : '';
}

/* =========================================================
   RUTINA
   ========================================================= */
let rutView = 'dia';
function sRutina() {
  const td = wday(), mon = parseD(weekMon(today()));
  const sel = addDays(mon, rutDay);
  const head = `<div class="phead">
      <div><div class="eyebrow acc">${sel.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })}</div>
      <div class="ptitle">${rutView === 'dia' ? cap(sel.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'short' }).replace('.', '')) : 'Tu semana'}</div></div>
      <div class="tog">${[['dia', 'Día'], ['semana', 'Semana']].map(([k, l]) => `<button class="${rutView === k ? 'on' : ''}" data-act="rutView" data-id="${k}">${l}</button>`).join('')}</div>
    </div>`;
  const rail = `<div class="rail">${DAYS.map((d, i) => { const dt = addDays(mon, i); return `<button class="${i === rutDay && rutView === 'dia' ? 'on' : ''} ${i === td ? 'today' : ''}" data-act="rutDayS" data-id="${i}"><small>${d}</small><b>${dt.getDate()}</b><i class="${dayBlocks(i).length ? 'has' : ''}"></i></button>`; }).join('')}</div>`;
  if (rutView === 'semana') {
    return head + rail + DAYS.map((d, i) => { const l = dayBlocks(i); const st = blockState(l, i === td); return `<div class="scard">
      <div class="shead"><h3>${DAYS_FULL[i]}${i === td ? ' · hoy' : ''}</h3><button class="slink muted" data-act="rutDayS" data-id="${i}">${l.length} ${l.length === 1 ? 'bloque' : 'bloques'}</button></div>
      ${l.length ? `<div class="tl">${l.map((b, j) => sBlock(b, st[j], false)).join('')}</div>` : '<div class="sempty">Libre</div>'}</div>`; }).join('');
  }
  const list = dayBlocks(rutDay);
  const st = blockState(list, rutDay === td);
  const mins = {};
  for (const b of list) { const d = toMin(b.end) - toMin(b.start); if (d > 0) mins[b.type] = (mins[b.type] || 0) + d; }
  const sum = Object.entries(mins).sort((a, b) => b[1] - a[1]);
  const tot = sum.reduce((a, x) => a + x[1], 0);
  return head + rail + `
    ${sum.length ? `<div class="scard">
      <div class="shead"><h3>${ico('ring', 'acc')} Tiempo del día</h3>${badge(`${fmtDur(tot)} planeadas`, 'mut')}</div>
      <div class="stack">${sum.map(([t, m]) => `<i style="width:${m / tot * 100}%;background:${rtype(t)[3]}"></i>`).join('')}</div>
      <div class="alloc">${sum.map(([t, m]) => { const [, , l, c] = rtype(t); return `<div><i style="background:${c}"></i><span>${l}</span><b style="color:${c}">${(m / 60).toFixed(1)}h</b></div>`; }).join('')}</div>
    </div>` : ''}
    <div class="sec"><h3>Agenda del día</h3><button class="sbtn grad" data-act="addBlock">${ico('plus')} Agregar actividad</button></div>
    ${list.length ? `<div class="tl big">${list.map((b, i) => sBlock(b, st[i], true)).join('')}</div>`
      : `<div class="scard sempty">Nada para este día.<br>Agrega tus clases, trabajo, comidas o ejercicio con su hora.</div>`}`;
}

/* =========================================================
   HÁBITOS
   ========================================================= */
let habSView = 'dia';
function sHabitos() {
  const t = today(), total = db.habits.length;
  const head = `<div class="phead">
      <div><div class="eyebrow">Rituales diarios</div><div class="ptitle">Mis hábitos</div></div>
      <button class="sbtn" data-act="addHabit">${ico('plus')} Nuevo hábito</button></div>
    <div class="seg4">${[['dia', 'Día'], ['semana', 'Semana'], ['mes', 'Mes'], ['año', 'Año']].map(([k, l]) => `<button class="${habSView === k ? 'on' : ''}" data-act="habSView" data-id="${k}">${l}</button>`).join('')}</div>`;
  if (habSView !== 'dia') {
    habPeriod = habSView;
    return head + viewHabResumen().replace(/^\s*<div class="seg">[\s\S]*?<\/div>/, '');
  }
  if (!total) return head + `<div class="scard sempty">Crea hábitos como tomar agua, leer 10 minutos o dormir antes de las 11.<br>Se repiten solos cada día: solo los marcas.</div>`;
  const done = db.habits.filter(h => h.log[t]).length;
  const best = db.habits.reduce((a, h) => Math.max(a, streak(h)), 0);
  const pct = periodPct(...monthRange(mkey())) ?? 0;
  const prevMk = mkey(addDays(parseD(mkey() + '-01'), -1));
  const prevPct = periodPct(...monthRange(prevMk));
  const diff = prevPct == null ? null : pct - prevPct;
  const days7 = Array.from({ length: 7 }, (_, i) => dkey(addDays(new Date(), i - 6)));
  const from30 = dkey(addDays(new Date(), -29));
  const brk = db.habits.map(h => [h, habStats(h, from30 > habStart(h) ? from30 : habStart(h), t)]).sort((a, b) => b[1].pct - a[1].pct);
  return head + `
    <div class="scard consist">
      <div class="cons-top"><div><div class="eyebrow">Constancia del mes</div>
        <div class="cons-pct">${pct}%${diff != null && diff !== 0 ? `<span class="chg ${diff < 0 ? 'neg' : ''}">${diff > 0 ? '+' : ''}${diff}%</span>` : ''}</div></div>
        <div class="cons-streak"><span>${ico('fire')}</span><div><small>Racha</small><b>${best} ${best === 1 ? 'día' : 'días'}</b></div></div></div>
      <div class="cons-sub"><span>Últimos 7 días</span><b>${done} de ${total} hoy</b></div>
      <div class="pills7">${days7.map(k => { const sc = dayScore(k); const r = sc.total ? sc.done / sc.total : 0; return `<div><span><i style="height:${r ? Math.max(r * 100, 30) : 0}%" class="${k === t ? 'tod' : r < 1 ? 'part' : ''}"></i></span><small class="${k === t ? 'tod' : ''}">${DAYS[wday(parseD(k))][0]}</small></div>`; }).join('')}</div>
    </div>
    <div class="sec"><h3>${habEdit ? 'Editar hábitos' : 'Checklist de hoy'}</h3><button class="slink muted" data-act="habEdit">${habEdit ? 'Listo' : '✏️ Editar'}</button></div>
    ${habEdit ? `<div class="scard"><div class="small" style="margin-bottom:8px">Cambia el orden con las flechas, toca el nombre para editarlo o 🗑️ para eliminarlo.</div><ul class="list">${db.habits.map((h, i) => `<li>
        <div class="emoji">${esc(h.emoji || '✅')}</div>
        <div class="grow" data-act="editHabit" data-id="${h.id}"><div class="t">${esc(h.name)}</div></div>
        <button class="ord" data-act="habMove" data-id="${i}|-1" ${i === 0 ? 'disabled' : ''} aria-label="Subir">↑</button>
        <button class="ord" data-act="habMove" data-id="${i}|1" ${i === total - 1 ? 'disabled' : ''} aria-label="Bajar">↓</button>
        <button class="ord del" data-act="habDel" data-id="${h.id}" aria-label="Eliminar">🗑️</button></li>`).join('')}</ul></div>`
    : db.habits.map((h, i) => { const on = !!h.log[t], s = streak(h); return `<div class="hrow ${on ? 'on' : ''}">
        <span class="hico c${i % 4}" data-act="editHabit" data-id="${h.id}">${esc(h.emoji || '✅')}</span>
        <div class="grow" data-act="editHabit" data-id="${h.id}"><b>${esc(h.name)}</b><small>${s ? `<span class="acc">${ico('fire')} ${s}d</span> · ` : ''}Mejor racha ${bestStreak(h)} d</small></div>
        <button class="hcheck ${on ? 'on' : ''}" data-act="habit" data-id="${h.id}" aria-label="Marcar ${esc(h.name)}">${on ? ico('check') : ''}</button></div>`; }).join('')}
    <div class="sec"><h3>Constancia por hábito</h3><span class="slink muted">Prom. 30 días</span></div>
    <div class="scard">${brk.map(([h, s], i) => { const c = ['#10b981', '#10b981', '#06b6d4', '#a5b4fc', '#6b7280'][Math.min(i, 4)]; return `<div class="brk"><div class="brk-top"><span>${esc(h.name)}</span><b style="color:${c === '#6b7280' ? 'var(--text)' : c}">${s.pct}%</b></div><div class="sbar"><i style="width:${s.pct}%;background:${c}"></i></div></div>`; }).join('')}</div>
    ${habCalendar(habMonth || mkey(), habDay || t)}${habDayDetail(habDay || t)}`;
}

/* =========================================================
   MÁS
   ========================================================= */
function sMas() {
  const G = gameState(), t = today();
  const a = xpForLevel(G.level), b = xpForLevel(G.level + 1);
  const ch = weekChallenges(weekMon(t));
  const goalsPct = (() => { const all = db.goals.reduce((x, g) => x + g.steps.length, 0), d = db.goals.reduce((x, g) => x + g.steps.filter(s => s.done).length, 0); return all ? Math.round(d / all * 100) : null; })();
  const g0 = db.goals.find(g => g.steps.some(s => !s.done)) || db.goals[0];
  const mk = mkey();
  const projMoney = r2(db.projects.reduce((x, p) => x + (p.money || []).filter(m => m.date.startsWith(mk)).reduce((y, m) => y + (m.type === 'ingreso' ? m.amount : -m.amount), 0), 0));
  const activeProj = db.projects.filter(p => ['activo', 'validando'].includes(p.status)).length;
  const hiTasks = db.tasks.filter(x => !x.done && (x.prio === 'alta' || (x.due && x.due <= t))).length;
  const weights = Object.entries(db.health).filter(([, v]) => v.weight).sort(([x], [y]) => x.localeCompare(y));
  const lastW = weights[weights.length - 1];
  const wk = weights.filter(([k]) => k >= dkey(addDays(new Date(), -7)));
  const wDiff = wk.length > 1 ? r2(+wk[wk.length - 1][1].weight - +wk[0][1].weight) : null;
  const sleeps = Array.from({ length: 7 }, (_, i) => db.health[dkey(addDays(new Date(), -i))]?.sleep).filter(v => v != null && v !== '');
  const sleepAvg = sleeps.length ? (sleeps.reduce((x, y) => x + +y, 0) / sleeps.length).toFixed(1) : null;
  const wkouts = db.workouts.filter(w => w.date >= weekMon(t));
  const lastWk = [...db.workouts].sort((x, y) => y.date.localeCompare(x.date))[0];
  const rec = exRecords().filter(r => r.weight)[0];
  const pinOn = !!db.settings.pinHash;
  const isStandalone = window.navigator.standalone || matchMedia('(display-mode: standalone)').matches;
  const row = (act, id, icon, title, sub, right = '') => `<button class="mrow" data-act="${act}" data-id="${id}"><span class="icirc">${icon}</span><span class="grow"><b>${title}</b><small>${sub}</small></span>${right}${ico('chev', 'chev')}</button>`;
  return `
    <div class="scard tier2">
      <div class="tier-top"><span class="sq">${ico('medal')}</span>
        <span class="grow"><span class="tier-name">${levelTitle(G.level)} <span class="sbadge acc">NIV ${G.level}</span></span><small>${b - G.xp} XP para nivel ${G.level + 1} · 🪙 ${G.coins}</small></span>
        <button class="sbtn" data-act="sLogros" data-id="premios">${ico('gift')} Premios</button></div>
      <div class="tier-xp"><span class="eyebrow">Progreso XP</span><span><b>${(G.xp - a).toLocaleString('es-MX')}</b> / ${(b - a).toLocaleString('es-MX')}</span></div>
      <div class="sbar grad"><i style="width:${(G.xp - a) / (b - a) * 100}%"></i></div>
      <button class="tier-ch" data-act="sLogros" data-id="retos"><span class="cy">${ico('fire')}</span><span class="grow"><b>Retos semanales</b><small>${ch.filter(c => c.done).length} de ${ch.length} completados</small></span>${ico('chev', 'chev')}</button>
      <button class="tier-ch" data-act="sLogros" data-id="logros"><span class="acc">${ico('trophy')}</span><span class="grow"><b>Logros</b><small>${G.ach.filter(x => x.done).length} de ${G.ach.length} desbloqueados</small></span>${ico('chev', 'chev')}</button>
    </div>

    <div class="sec"><h3>Crecer</h3><span class="slink">${activeProj + db.goals.length} ${activeProj + db.goals.length === 1 ? "activo" : "activos"}</span></div>
    <div class="mlist">
      ${row('sGoals', '', ico('flag'), 'Metas con pasos', g0 ? `${esc(g0.title)} · ${g0.steps.filter(s => s.done).length}/${g0.steps.length} pasos` : 'Crea tu primera meta', goalsPct != null ? badge(goalsPct + '%', 'acc') : '')}
      ${row('go', 'proyectos', ico('rocket'), 'Proyectos y negocios', `${activeProj} activos · lienzo, números y siguiente paso`, (db.projects.some(p => (p.money || []).length)) ? `<b class="mamt ${projMoney < 0 ? 'neg' : ''}">${mxn(projMoney)}</b>` : '')}
      ${row('go', 'tareas', ico('tasks'), 'Tareas prioritarias', `${hiTasks} de alta prioridad · ${db.tasks.filter(x => !x.done).length} pendientes`)}
      ${row('go', 'enfoque', ico('timer'), 'Enfoque (Pomodoro)', db.focusTimer ? 'Temporizador corriendo' : `${db.focus.filter(f => f.date === t).length} pomodoros hoy`)}
    </div>

    <div class="sec"><h3>Bienestar</h3><span class="slink muted">Esta semana</span></div>
    <button class="scard well" data-act="go" data-id="salud">
      <div class="grow"><div class="eyebrow">Salud y peso</div>
        <div class="wbig">${lastW ? `${lastW[1].weight}<small>kg</small>${wDiff ? `<span class="${wDiff > 0 ? 'cy' : 'acc'}">${wDiff > 0 ? '+' : ''}${wDiff} kg</span>` : ''}` : '—<small>sin peso</small>'}</div>
        <small>${sleepAvg ? `Sueño prom. 7 días: ${sleepAvg} h` : 'Registra tu peso y sueño en el check-in'}</small></div>
      ${weights.length > 1 ? `<div class="spark">${sparkline(weights.slice(-10).map(([, v]) => +v.weight))}</div>` : ''}
    </button>
    <div class="wtiles">
      <button class="scard" data-act="go" data-id="ejercicio"><div class="wt-top"><span class="acc">${ico('dumbbell')}</span><small>${wkouts.length} esta semana</small></div><b>Ejercicio</b><small>${db.activeWorkout ? 'Entreno en curso' : lastWk ? `Último: ${ddmm(lastWk.date)}` : 'Empieza tu primer entreno'}</small></button>
      <button class="scard" data-act="go" data-id="ejercicio"><div class="wt-top"><span class="acc">${ico('trophy')}</span><small class="acc">${rec ? rec.weight + ' kg' : ''}</small></div><b>Récords</b><small>${rec ? `${esc(rec.name)} · ${rec.reps} reps` : 'Aún sin récords'}</small></button>
    </div>
    <div class="mlist">${row('go', 'checkin', ico('heart'), 'Check-in del día', db.health[t] && db.journal[t] ? 'Hoy ya lo hiciste ✓' : 'Ánimo, sueño, agua y tu día')}</div>

    <div class="sec"><h3>Organizar</h3></div>
    <div class="otiles">
      <button data-act="go" data-id="notas"><span class="icirc">${ico('note')}</span><b>Notas</b><small>${db.notes.length}</small></button>
      <button data-act="go" data-id="fechas"><span class="icirc">${ico('cal')}</span><b>Fechas</b><small class="acc">${(() => { const u = upcomingDates(14).length; return u ? `${u} pronto` : db.dates.length; })()}</small></button>
      <button data-act="go" data-id="revision"><span class="icirc">${ico('chart')}</span><b>Revisión</b><small>Semanal</small></button>
    </div>

    <div class="sec"><h3>Dinero</h3></div>
    <div class="mlist">
      ${row('go', 'deudas', '💳', 'Plan de deudas', 'Pagos, ingresos y proyección')}
      ${row('go', 'pagos', '🧾', 'Pagos fijos y suscripciones', `${db.bills.length} registrados`)}
      ${row('go', 'ahorro', '🐷', 'Metas de ahorro', `${mxn(r2(db.savings.reduce((x, s) => x + saved(s), 0)))} ahorrados`)}
    </div>

    <div class="sec"><h3>Ajustes</h3></div>
    <div class="scard setlist">
      <button class="srow" data-act="sPin"><span class="icirc">${ico('lock')}</span><span class="grow"><b>Candado con PIN</b><small>${pinOn ? 'Activado' : 'Desactivado'}</small></span><span class="tgl ${pinOn ? 'on' : ''}"><i></i></span></button>
      <button class="srow" data-act="settings"><span class="icirc acc">${ico('cloud')}</span><span class="grow"><b>Respaldo de datos</b><small>Se guardan solo en este teléfono · descarga un respaldo</small></span><span class="dot"></span></button>
      <button class="srow" data-act="sInstall"><span class="icirc cy">${ico('share')}</span><span class="grow"><b>Instalar en iPhone</b><small>${isStandalone ? 'Ya está instalada ✓' : 'Agrega Mi Vida a tu pantalla de inicio'}</small></span>${ico('chev', 'chev')}</button>
      <button class="srow" data-act="settings"><span class="icirc">${ico('gear')}</span><span class="grow"><b>Más ajustes</b><small>Nombre, moneda, gasto semanal, actualizar</small></span>${ico('chev', 'chev')}</button>
    </div>`;
}

/* ---------- conectar vistas y acciones ---------- */
Object.assign(MORE_VIEWS, { inicio: sInicio, finanzas: sFinanzas, rutina: sRutina, habitos: sHabitos, mas: sMas });
Object.assign(MORE_MOUNT, { inicio: mountInicio });
Object.assign(ACTIONS, {
  sMood: v => { const k = today(); db.health[k] = { ...(db.health[k] || {}), mood: +v }; save(); render(); },
  sGoals: () => { taskView = 'metas'; go('tareas'); },
  sLogros: k => { logrosTab = k; go('logros'); },
  sPin: () => openPinSetup(),
  sInstall: () => openSheet(`<h3>Instalar en iPhone</h3><p>1. Abre la app en <b>Safari</b>.</p><p>2. Toca <b>Compartir</b> (el cuadro con la flecha ↑).</p><p>3. Elige <b>Agregar a pantalla de inicio</b> y luego <b>Agregar</b>.</p><p class="small">Se abrirá como app y funciona sin internet.</p>`),
  rutView: k => { rutView = k; render(); },
  rutDayS: i => { rutDay = +i; rutView = 'dia'; render(); },
  habSView: k => { habSView = k; habRef = null; render(); },
});

/* Encabezado: marca en las pestañas principales, título en las demás */
const _render = render;
render = function () {
  _render();
  const main = !MORE_PARENT[tab];
  document.body.classList.toggle('main-tab', main);
  if (main) $('#title').textContent = 'Mi Vida';
};
render();
