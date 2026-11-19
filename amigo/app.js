'use strict';

/* ============ Datos ============ */
const KEY = 'mivida-amigo.v1';
const DEFAULT = {
  settings: { name: '', currency: 'MXN', budget: 0 },
  tx: [],      // {id, type:'gasto'|'ingreso', amount, cat, note, date:'YYYY-MM-DD'}
  habits: [],  // {id, name, emoji, log:{'YYYY-MM-DD':1}, created}
  notes: [],   // {id, title, body, tags:[], pinned, updated}
  routine: [], // {id, title, type, days:[0..6 (0=lunes)], start:'HH:MM', end:'HH:MM', place}
};
const RTYPES = [
  ['clase', '🎓', 'Clase', '#4f46e5'], ['ejercicio', '🏋️', 'Ejercicio', '#059669'], ['comida', '🍽️', 'Comida', '#d97706'],
  ['trabajo', '💼', 'Trabajo', '#0284c7'], ['estudio', '📚', 'Estudio', '#7c3aed'], ['descanso', '😴', 'Descanso', '#64748b'],
  ['personal', '🙂', 'Personal', '#db2777'], ['otro', '📌', 'Otro', '#475569'],
];
const rtype = id => RTYPES.find(r => r[0] === id) || RTYPES[RTYPES.length - 1];
const DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const DAYS_FULL = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const wday = (d = new Date()) => (d.getDay() + 6) % 7; // 0 = lunes
const toMin = hm => { const [h, m] = (hm || '0:0').split(':').map(Number); return h * 60 + m; };
const fmtDur = m => m >= 60 ? `${Math.floor(m / 60)} h${m % 60 ? ' ' + (m % 60) + ' min' : ''}` : `${m} min`;
function dayBlocks(d) { return db.routine.filter(b => b.days.includes(d)).sort((a, b) => a.start.localeCompare(b.start)); }
const CATS = {
  gasto: [
    ['comida', '🍔', 'Comida'], ['super', '🛒', 'Súper'], ['transporte', '🚗', 'Transporte'],
    ['casa', '🏠', 'Casa'], ['servicios', '💡', 'Servicios'], ['salud', '💊', 'Salud'],
    ['ocio', '🎉', 'Ocio'], ['ropa', '👕', 'Ropa'], ['subs', '📺', 'Suscripciones'],
    ['educacion', '📚', 'Educación'], ['emergencia', '🚨', 'Emergencia'], ['otro', '📦', 'Otro'],
  ],
  ingreso: [
    ['sueldo', '💼', 'Sueldo'], ['negocio', '🏪', 'Negocio'], ['extra', '💸', 'Extra'],
    ['regalo', '🎁', 'Regalo'], ['inversion', '📈', 'Inversión'], ['otro', '📦', 'Otro'],
  ],
};
const catInfo = (type, id) => id === 'fijos' ? ['fijos', '🧾', 'Pago fijo'] : id === 'ahorro' ? ['ahorro', '🐷', 'Ahorro'] : id === 'ajuste' ? ['ajuste', '⚖️', 'Ajuste de saldo'] : id === 'deudas' ? ['deudas', '💳', 'Pago de deuda'] : (CATS[type] || []).find(c => c[0] === id) || ['otro', '📦', 'Otro'];

let db = load();
function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return ensureAll(structuredClone(DEFAULT));
    const d = JSON.parse(raw);
    return ensureAll({ ...structuredClone(DEFAULT), ...d, settings: { ...DEFAULT.settings, ...(d.settings || {}) } });
  } catch { return ensureAll(structuredClone(DEFAULT)); }
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(db)); }
  catch { toast('No se pudo guardar'); }
}
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

/* ============ Utilidades ============ */
const $ = (s, el = document) => el.querySelector(s);
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad = n => String(n).padStart(2, '0');
const dkey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const today = () => dkey();
const parseD = k => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const mkey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
function money(n) {
  n = n || 0;
  if ((db.settings.currency || 'MXN') === 'MXN') return mxn(n);
  try { return new Intl.NumberFormat('es-MX', { style: 'currency', currency: db.settings.currency, minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 }).format(n); }
  catch { return '$' + (n || 0).toFixed(2); }
}
const monthName = mk => { const [y, m] = mk.split('-').map(Number); return cap(new Date(y, m - 1, 1).toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })); };
const dayLabel = k => {
  if (k === today()) return 'Hoy';
  if (k === dkey(addDays(new Date(), -1))) return 'Ayer';
  return parseD(k).toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' });
};
function toast(msg, undo) {
  const t = $('#toast'); t.innerHTML = ''; t.append(msg);
  if (undo) {
    const b = document.createElement('button'); b.className = 'toast-undo'; b.textContent = 'Deshacer';
    b.onclick = () => { t.hidden = true; clearTimeout(toast._t); undo(); };
    t.append(b);
  }
  t.hidden = false;
  clearTimeout(toast._t); toast._t = setTimeout(() => (t.hidden = true), undo ? 6000 : 1800);
}
/* Confirmación dentro de la app (los avisos del navegador a veces no salen) */
function ask(msg, okLabel = 'Sí, continuar') {
  return new Promise(res => {
    const d = document.createElement('div');
    d.className = 'ask-wrap';
    d.innerHTML = `<div class="ask"><p></p><div class="row"><button class="btn ghost" data-r="0">Cancelar</button><button class="btn" data-r="1"></button></div></div>`;
    d.querySelector('p').textContent = msg;
    d.querySelector('[data-r="1"]').textContent = okLabel;
    d.addEventListener('click', e => {
      const b = e.target.closest('[data-r]');
      if (!b && e.target !== d) return;
      d.remove(); res(b?.dataset.r === '1');
    });
    document.body.append(d);
  });
}

/* ============ Finanzas: cálculos ============ */
function monthTotals(mk) {
  let inc = 0, exp = 0; const byCat = {};
  for (const t of db.tx) {
    if (!t.date.startsWith(mk)) continue;
    if (t.type === 'ingreso') inc += t.amount;
    else { exp += t.amount; byCat[t.cat] = (byCat[t.cat] || 0) + t.amount; }
  }
  return { inc, exp, bal: inc - exp, byCat };
}

/* ============ Hábitos: cálculos ============ */
function streak(h) {
  let n = 0, d = new Date();
  if (!h.log[dkey(d)]) d = addDays(d, -1); // si hoy no está hecho, la racha sigue viva desde ayer
  while (h.log[dkey(d)]) { n++; d = addDays(d, -1); }
  return n;
}
function toggleHabit(id) {
  const h = db.habits.find(x => x.id === id); if (!h) return;
  const k = today();
  if (h.log[k]) delete h.log[k]; else h.log[k] = 1;
  save(); render();
  if (h.log[k] && navigator.vibrate) navigator.vibrate(15);
}

/* ============ Router ============ */
const TITLES = { inicio: 'Inicio', deudas: 'Deudas', rutina: 'Rutina', finanzas: 'Finanzas', habitos: 'Hábitos', notas: 'Notas', ...MORE_TITLES };
let tab = (location.hash.slice(1) in TITLES) ? location.hash.slice(1) : 'inicio';
if (tab === 'proyecto') tab = 'proyectos';
let finMonth = mkey();
let finFilter = 'todos';
let finView = 'plan';
let rutDay = wday();
let noteQuery = '', noteTag = '';

function go(t) {
  tab = t; history.replaceState(null, '', '#' + t);
  window.scrollTo(0, 0); render();
}
document.querySelectorAll('.tabbar button').forEach(b => b.addEventListener('click', () => go(b.dataset.tab)));
$('#btn-settings').addEventListener('click', openSettings);

function render() {
  $('#title').textContent = TITLES[tab];
  const parent = MORE_PARENT[tab];
  $('#btn-back').hidden = !parent;
  $('#btn-back').onclick = () => go(parent);
  let root = tab; while (MORE_PARENT[root]) root = MORE_PARENT[root];
  document.querySelectorAll('.tabbar button').forEach(b => b.classList.toggle('active', b.dataset.tab === root));
  const v = $('#view');
  v.innerHTML = ({ deudas: viewPlan, rutina: viewRutina, finanzas: viewFinanzas, habitos: viewHabitos, notas: viewNotas, ...MORE_VIEWS })[tab]();
  bindView(v);
  MORE_MOUNT[tab]?.(v);
  if (typeof afterRender === 'function') afterRender();
}

/* Delegación de eventos: data-act="accion" data-id="..." */
function bindView(root) {
  root.querySelectorAll('[data-act]').forEach(el => {
    const ev = el.tagName === 'INPUT' ? 'input' : 'click';
    el.addEventListener(ev, e => ACTIONS[el.dataset.act]?.(el.dataset.id, el, e));
  });
}
const ACTIONS = {
  go: id => go(id),
  habit: id => toggleHabit(id),
  addTx: id => openTx(null, id || 'gasto'),
  editTx: id => { const t = db.tx.find(x => x.id === id); t?.planId ? openPlanTx(t) : openTx(id); },
  payDebt: () => openPayDebt(),
  editBudgets: () => openBudgets(),
  newDebt: () => openNewDebt(),
  addHabit: () => openHabit(),
  editHabit: id => openHabit(id),
  addNote: () => openNote(),
  editNote: id => openNote(id),
  prevMonth: () => { finMonth = shiftMonth(finMonth, -1); render(); },
  nextMonth: () => { finMonth = shiftMonth(finMonth, 1); render(); },
  finFilter: id => { finFilter = id; render(); },
  noteTag: id => { noteTag = noteTag === id ? '' : id; render(); },
  noteSearch: (_, el) => { noteQuery = el.value; renderNotesList(); },
  settings: () => openSettings(),
  goPlan: () => go('deudas'),
  togglePlan: id => togglePlanItem(id),
  editPlan: id => openPlanItem(id),
  addPlan: id => openPlanItem(null, id),
  planAll: () => { planShowAll = !planShowAll; render(); },
  fixCash: () => openFixCash(),
  rutDay: id => { rutDay = +id; render(); },
  addBlock: () => openBlock(null, rutDay),
  editBlock: id => openBlock(id),
  hideInstall: () => { try { localStorage.setItem('mivida-amigo.hideInstall', '1'); } catch {} render(); },
};
Object.assign(ACTIONS, MORE_ACTIONS);
const shiftMonth = (mk, n) => { const [y, m] = mk.split('-').map(Number); return mkey(new Date(y, m - 1 + n, 1)); };

/* ============ Vistas ============ */
function blockRow(b, opts = {}) {
  const [, e, l, color] = rtype(b.type);
  const dur = toMin(b.end) - toMin(b.start);
  const badge = opts.now ? '<span class="now-badge">AHORA</span>' : opts.next ? '<span class="next-badge">SIGUE</span>' : '';
  return `<li data-act="editBlock" data-id="${b.id}">
    <div class="time"><b>${b.start}</b>${b.end || ''}</div>
    <div class="blk ${opts.past ? 'past' : ''}" style="--c:${color}">
      <div class="t">${e} ${esc(b.title)}${badge}</div>
      <div class="s">${l}${dur > 0 ? ' · ' + fmtDur(dur) : ''}${b.place ? ' · ' + esc(b.place) : ''}</div>
    </div>
  </li>`;
}
function blockState(list, isToday) {
  const now = new Date(); const nm = now.getHours() * 60 + now.getMinutes();
  let nextFound = false;
  return list.map(b => {
    if (!isToday) return {};
    const s = toMin(b.start), e = b.end ? toMin(b.end) : s;
    if (nm >= s && nm < e) return { now: true };
    if (nm >= e && e > s || (nm >= s && e <= s)) return { past: true };
    if (!nextFound && s > nm) { nextFound = true; return { next: true }; }
    return {};
  });
}
function agendaCard() {
  const list = dayBlocks(wday());
  if (!list.length) return `<div class="card"><h2>Agenda de hoy <button class="link" data-act="go" data-id="rutina">Rutina</button></h2>
    <div class="empty">Sin actividades para hoy.<br><button class="link" data-act="go" data-id="rutina">Arma tu rutina semanal</button></div></div>`;
  const st = blockState(list, true);
  // mostrar lo que está pasando y lo que sigue (máx 4), ocultando lo ya terminado
  const items = list.map((b, i) => [b, st[i]]).filter(([, s]) => !s.past).slice(0, 4);
  return `<div class="card"><h2>Agenda de hoy <button class="link" data-act="go" data-id="rutina">Ver día</button></h2>
    ${items.length ? `<ul class="list timeline">${items.map(([b, s]) => blockRow(b, s)).join('')}</ul>` : '<div class="empty">Terminaste todo lo de hoy 🎉</div>'}</div>`;
}

function viewRutina() {
  const td = wday();
  const list = dayBlocks(rutDay);
  const st = blockState(list, rutDay === td);
  const mins = {};
  for (const b of list) { const d = toMin(b.end) - toMin(b.start); if (d > 0) mins[b.type] = (mins[b.type] || 0) + d; }
  const sum = Object.entries(mins).sort((a, b) => b[1] - a[1]);
  return `
    <div class="days">${DAYS.map((d, i) => `<button class="${i === rutDay ? 'on' : ''} ${i === td ? 'today' : ''}" data-act="rutDay" data-id="${i}">${d}<small>${i === td ? 'hoy' : '&nbsp;'}</small></button>`).join('')}</div>
    <div class="card">
      <h2>${DAYS_FULL[rutDay]} <span class="small">${list.length} actividad${list.length === 1 ? '' : 'es'}</span></h2>
      ${list.length ? `<ul class="list timeline">${list.map((b, i) => blockRow(b, st[i])).join('')}</ul>`
        : `<div class="empty">Nada para este día.<br>Agrega tus clases, trabajo, comidas o ejercicio con su hora.</div>`}
    </div>
    ${sum.length ? `<div class="card"><h2>Tiempo del día</h2>${sum.map(([t, m]) => { const [, e, l] = rtype(t); return `<div class="catrow"><div class="top"><span>${e} ${l}</span><span class="amt">${fmtDur(m)}</span></div></div>`; }).join('')}</div>` : ''}
    <button class="fab" data-act="addBlock" aria-label="Agregar actividad">+</button>`;
}

function openBlock(id, day) {
  const b = id ? db.routine.find(x => x.id === id) : null;
  let type = b?.type || 'clase';
  let days = b ? [...b.days] : [day ?? wday()];
  const typesHTML = () => RTYPES.map(([c, e, l]) => `<button type="button" class="${c === type ? 'on' : ''}" data-c="${c}"><b>${e}</b>${l}</button>`).join('');
  openSheet(`
    <h3>${b ? 'Editar actividad' : 'Nueva actividad'}</h3>
    <form id="f">
      <div class="field"><span>Tipo</span><div class="catpick" id="types">${typesHTML()}</div></div>
      <label class="field"><span>Nombre</span><input name="title" maxlength="50" placeholder="Ej. Cálculo, Gym, Comida, Turno" value="${esc(b?.title || '')}" required></label>
      <div class="row2">
        <label class="field"><span>Empieza</span><input name="start" type="time" value="${b?.start || '08:00'}" required></label>
        <label class="field"><span>Termina</span><input name="end" type="time" value="${b?.end || '09:00'}"></label>
      </div>
      <div class="field"><span>Días que se repite</span><div class="daypick" id="dp">${DAYS.map((d, i) => `<button type="button" class="${days.includes(i) ? 'on' : ''}" data-d="${i}">${d[0]}</button>`).join('')}</div>
        <div class="row" style="margin-top:6px"><button type="button" class="link" data-preset="0,1,2,3,4">Lun a Vie</button><button type="button" class="link" data-preset="0,1,2,3,4,5,6">Todos</button><button type="button" class="link" data-preset="5,6">Fin de semana</button></div></div>
      <label class="field"><span>Lugar o nota (opcional)</span><input name="place" maxlength="60" placeholder="Ej. Salón 204, Smart Fit, Oficina" value="${esc(b?.place || '')}"></label>
      <button class="btn block">Guardar</button>
      ${b ? `<button type="button" class="btn danger block" id="del">Eliminar actividad</button>` : ''}
    </form>`, s => {
    const f = $('#f', s);
    const paintDays = () => s.querySelectorAll('#dp [data-d]').forEach(x => x.classList.toggle('on', days.includes(+x.dataset.d)));
    $('#types', s).addEventListener('click', e => {
      const t = e.target.closest('[data-c]'); if (!t) return;
      type = t.dataset.c; s.querySelectorAll('#types button').forEach(x => x.classList.toggle('on', x === t));
      if (!f.title.value.trim() && ['comida', 'ejercicio', 'trabajo', 'descanso'].includes(type)) f.title.placeholder = rtype(type)[2];
    });
    $('#dp', s).parentElement.addEventListener('click', e => {
      const d = e.target.closest('[data-d]'), p = e.target.closest('[data-preset]');
      if (d) { const n = +d.dataset.d; days = days.includes(n) ? days.filter(x => x !== n) : [...days, n]; }
      if (p) days = p.dataset.preset.split(',').map(Number);
      paintDays();
    });
    f.addEventListener('submit', e => {
      e.preventDefault();
      const title = f.title.value.trim() || rtype(type)[2];
      if (!days.length) { toast('Elige al menos un día'); return; }
      if (f.end.value && toMin(f.end.value) <= toMin(f.start.value)) { toast('La hora de fin debe ser después del inicio'); return; }
      const data = { title, type, days: days.sort(), start: f.start.value, end: f.end.value, place: f.place.value.trim() };
      if (b) Object.assign(b, data); else db.routine.push({ id: uid(), ...data });
      save(); closeSheet(); render(); toast('Guardado');
    });
    $('#del', s)?.addEventListener('click', async () => {
      if (!(await ask('¿Eliminar esta actividad de tu rutina?'))) return;
      db.routine = db.routine.filter(x => x.id !== id); save(); closeSheet(); render(); toast('Eliminada');
    });
  });
}

function habitRow(h) {
  const on = !!h.log[today()];
  const s = streak(h);
  const dots = Array.from({ length: 7 }, (_, i) => `<i class="${h.log[dkey(addDays(new Date(), i - 6))] ? 'on' : ''}"></i>`).join('');
  return `<li>
    <div class="emoji" data-act="editHabit" data-id="${h.id}">${esc(h.emoji || '✅')}</div>
    <div class="grow" data-act="editHabit" data-id="${h.id}"><div class="t">${esc(h.name)}</div><div class="dots">${dots}</div></div>
    ${s ? `<span class="streak">🔥 ${s}</span>` : ''}
    <button class="check ${on ? 'on' : ''}" data-act="habit" data-id="${h.id}" aria-label="Marcar ${esc(h.name)}"></button>
  </li>`;
}

function viewFinanzas() {
  const t0 = today();
  const txs = db.tx.filter(t => t.date.startsWith(finMonth));
  const inc = txs.filter(t => t.type === 'ingreso' && t.cat !== 'ajuste').reduce((a, t) => a + t.amount, 0);
  const debt = txs.filter(t => t.type === 'gasto' && t.cat === 'deudas').reduce((a, t) => a + t.amount, 0);
  const exp = txs.filter(t => t.type === 'gasto' && !['deudas', 'ajuste', 'ahorro'].includes(t.cat)).reduce((a, t) => a + t.amount, 0);
  const filt = { todos: () => true, ingreso: t => t.type === 'ingreso', gasto: t => t.type === 'gasto' && t.cat !== 'deudas', deudas: t => t.cat === 'deudas' }[finFilter] || (() => true);
  const list = txs.filter(filt).sort((a, b) => b.date.localeCompare(a.date) || (b.created || 0) - (a.created || 0));
  const byCat = {};
  for (const t of txs) if (t.type === 'gasto' && !['deudas', 'ajuste', 'ahorro'].includes(t.cat)) byCat[t.cat] = (byCat[t.cat] || 0) + t.amount;
  const cats = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
  const maxCat = cats[0]?.[1] || 1;
  const mon = weekMon(t0), wmax = budgetFor(mon), wleft = r2(wmax - weekSpent(mon));
  // ingresos programados (del plan) pendientes: atrasados + próximos 14 días
  const horizon = dkey(addDays(new Date(), 14));
  const sched = db.plan.items.filter(i => i.kind === 'ingreso' && !i.done && i.date <= horizon).sort((a, b) => a.date.localeCompare(b.date));

  let lastDay = '';
  const rows = list.map(t => {
    const isDebt = t.cat === 'deudas';
    const [, emoji, label] = isDebt ? ['', '💳', 'Pago de deuda'] : catInfo(t.type, t.cat);
    const head = t.date !== lastDay ? `<li class="small" style="padding:10px 0 4px;border:0">${dayLabel(t.date)}</li>` : '';
    lastDay = t.date;
    return head + `<li data-act="editTx" data-id="${t.id}">
      <div class="emoji">${emoji}</div>
      <div class="grow"><div class="t">${esc(t.note || label)}</div><div class="s">${label}${t.planId ? ' · del plan' : ''}</div></div>
      <div class="amt ${t.type === 'ingreso' ? 'pos' : ''}">${t.type === 'ingreso' ? '+' : '−'}${money(t.amount)}</div>
    </li>`;
  }).join('');

  return `
    <div class="card">
      <div class="stats">
        <div class="stat"><div class="lbl">Dinero hoy</div><div class="val">${mxn(planCash())}</div></div>
        <div class="stat"><div class="lbl">Puedes gastar</div><div class="val ${wleft < 0 ? 'neg' : 'pos'}">${mxn(Math.max(0, wleft))}</div></div>
        <div class="stat" data-act="editBudgets" style="cursor:pointer"><div class="lbl">Máx. semana ✏️</div><div class="val">${mxn(wmax)}</div></div>
      </div>
      <div class="row" style="margin-top:12px">
        <button class="btn ghost" data-act="addTx" data-id="ingreso">+ Ingreso</button>
        <button class="btn ghost" data-act="addTx" data-id="gasto">+ Gasto</button>
      </div>
      <button class="btn ghost block" style="margin-top:8px" data-act="payDebt">💳 Registrar pago de deuda</button>
    </div>
    <div class="card">
      <h2>Ingresos programados <button class="link" data-act="go" data-id="deudas">Ver plan</button></h2>
      ${sched.length ? `<ul class="list">${sched.map(planItemRow).join('')}</ul>` : '<div class="empty">No hay ingresos programados en los próximos días.</div>'}
    </div>
    <div class="monthnav">
      <button data-act="prevMonth" aria-label="Mes anterior">‹</button>
      <strong>${monthName(finMonth)}</strong>
      <button data-act="nextMonth" aria-label="Mes siguiente">›</button>
    </div>
    <div class="card">
      <div class="stats">
        <div class="stat"><div class="lbl">Ingresos</div><div class="val pos">${money(inc)}</div></div>
        <div class="stat"><div class="lbl">Gastos</div><div class="val neg">${money(exp)}</div></div>
        <div class="stat"><div class="lbl">Pagos de deuda</div><div class="val">${money(debt)}</div></div>
      </div>
      <div class="small" style="margin-top:8px">Balance del mes: <b class="${inc - exp - debt < 0 ? 'neg' : ''}">${money(r2(inc - exp - debt))}</b></div>
    </div>
    ${cats.length ? `<div class="card"><h2>Gastos por categoría</h2>
      ${cats.map(([c, v]) => { const [, e, l] = catInfo('gasto', c); return `
        <div class="catrow"><div class="top"><span>${e} ${l}</span><span class="amt">${money(v)} <span class="small">${Math.round(v / exp * 100)}%</span></span></div>
        <div class="bar"><i style="width:${v / maxCat * 100}%"></i></div></div>`; }).join('')}
    </div>` : ''}
    <div class="seg seg-sm">
      ${[['todos', 'Todo'], ['ingreso', 'Ingresos'], ['gasto', 'Gastos'], ['deudas', 'Deudas']].map(([f, l]) => `<button class="${finFilter === f ? 'on' : ''}" data-act="finFilter" data-id="${f}">${l}</button>`).join('')}
    </div>
    <div class="card">
      <h2>Actividad</h2>
      ${list.length ? `<ul class="list">${rows}</ul>` : `<div class="empty">Sin movimientos este mes.</div>`}
    </div>`;
}

function viewNotas() {
  const tags = [...new Set(db.notes.flatMap(n => n.tags))].sort();
  return `
    <input class="search" type="search" placeholder="Buscar en notas…" value="${esc(noteQuery)}" data-act="noteSearch">
    ${tags.length ? `<div class="chips">${tags.map(t => `<button class="chip ${noteTag === t ? 'on' : ''}" data-act="noteTag" data-id="${esc(t)}">#${esc(t)}</button>`).join('')}</div>` : ''}
    <div id="notes-list">${notesListHTML()}</div>
    <button class="fab" data-act="addNote" aria-label="Nueva nota">+</button>`;
}
function notesListHTML() {
  const q = noteQuery.trim().toLowerCase();
  const list = db.notes
    .filter(n => (!noteTag || n.tags.includes(noteTag)) && (!q || (n.title + ' ' + n.body + ' ' + n.tags.join(' ')).toLowerCase().includes(q)))
    .sort((a, b) => (b.pinned - a.pinned) || (b.updated - a.updated));
  if (!list.length) return `<div class="card empty">${db.notes.length ? 'Nada coincide con tu búsqueda.' : 'Guarda aquí ideas, pendientes, listas o lo que se te ocurra.<br>Usa #etiquetas para ordenarlas.'}</div>`;
  return `<div class="notes">${list.map(n => `
    <button class="note" data-act="editNote" data-id="${n.id}">
      <div class="t">${n.pinned ? '📌 ' : ''}${esc(n.title || 'Sin título')}</div>
      <div class="b">${esc(n.body)}</div>
      ${n.tags.length ? `<div>${n.tags.map(t => `<span class="tag">#${esc(t)}</span>`).join('')}</div>` : ''}
      <div class="d">${new Date(n.updated).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}</div>
    </button>`).join('')}</div>`;
}
function renderNotesList() { const el = $('#notes-list'); if (el) { el.innerHTML = notesListHTML(); bindView(el); } }

/* ============ Hojas (formularios) ============ */
function openSheet(html, onMount) {
  const s = $('#sheet'), b = $('#sheet-backdrop');
  s.innerHTML = `<div class="grab"></div>` + html;
  s.hidden = false; b.hidden = false;
  document.body.style.overflow = 'hidden';
  onMount?.(s);
}
function closeSheet() {
  $('#sheet').hidden = true; $('#sheet-backdrop').hidden = true;
  document.body.style.overflow = '';
}
$('#sheet-backdrop').addEventListener('click', closeSheet);

function openTx(id, type = 'gasto') {
  const t = id ? db.tx.find(x => x.id === id) : null;
  let cur = { type: t?.type || type, cat: t?.cat || (type === 'ingreso' ? 'sueldo' : 'comida') };
  const catsHTML = () => CATS[cur.type].map(([c, e, l]) => `<button type="button" class="${cur.cat === c ? 'on' : ''}" data-c="${c}"><b>${e}</b>${l}</button>`).join('');
  openSheet(`
    <h3>${t ? 'Editar movimiento' : 'Nuevo movimiento'}</h3>
    <form id="f">
      <div class="seg" id="tx-type">
        <button type="button" data-t="gasto" class="${cur.type === 'gasto' ? 'on' : ''}">Gasto</button>
        <button type="button" data-t="ingreso" class="${cur.type === 'ingreso' ? 'on' : ''}">Ingreso</button>
      </div>
      <label class="field"><span>Monto</span><input class="big-amount" name="amount" type="number" inputmode="decimal" step="0.01" min="0" placeholder="0.00" value="${t ? t.amount : ''}" required></label>
      <div class="field"><span>Categoría</span><div class="catpick" id="catpick">${catsHTML()}</div></div>
      <label class="field"><span>Nota (opcional)</span><input name="note" maxlength="80" placeholder="Ej. Tacos con amigos" value="${esc(t?.note || '')}"></label>
      <label class="field"><span>Fecha</span><input name="date" type="date" value="${t?.date || today()}" required></label>
      <button class="btn block">Guardar</button>
      ${t ? `<button type="button" class="btn danger block" id="del">Eliminar</button>` : ''}
    </form>`, s => {
    const f = $('#f', s);
    if (!t) setTimeout(() => f.amount.focus(), 250);
    $('#tx-type', s).addEventListener('click', e => {
      const b = e.target.closest('[data-t]'); if (!b) return;
      cur.type = b.dataset.t; cur.cat = CATS[cur.type][0][0];
      s.querySelectorAll('#tx-type button').forEach(x => x.classList.toggle('on', x === b));
      $('#catpick', s).innerHTML = catsHTML();
    });
    $('#catpick', s).addEventListener('click', e => {
      const b = e.target.closest('[data-c]'); if (!b) return;
      cur.cat = b.dataset.c;
      s.querySelectorAll('#catpick button').forEach(x => x.classList.toggle('on', x === b));
    });
    f.addEventListener('submit', e => {
      e.preventDefault();
      const amount = Math.round(parseFloat(f.amount.value.replace(',', '.')) * 100) / 100;
      if (!(amount > 0)) { toast('Escribe un monto'); return; }
      const data = { type: cur.type, cat: cur.cat, amount, note: f.note.value.trim(), date: f.date.value || today() };
      if (t) Object.assign(t, data); else db.tx.push({ id: uid(), created: Date.now(), ...data });
      save(); closeSheet(); render(); toast(t ? 'Actualizado' : 'Guardado');
    });
    $('#del', s)?.addEventListener('click', async () => {
      if (!(await ask('¿Eliminar este movimiento?'))) return;
      db.tx = db.tx.filter(x => x.id !== id); save(); closeSheet(); render(); toast('Eliminado');
    });
  });
}

const HABIT_EMOJIS = ['💧', '📖', '🏃', '🧘', '😴', '🥗', '💪', '🚭', '🧠', '✍️', '🙏', '💊', '🦷', '📵', '💰', '✅'];
function openHabit(id) {
  const h = id ? db.habits.find(x => x.id === id) : null;
  let emoji = h?.emoji || '💧';
  openSheet(`
    <h3>${h ? 'Editar hábito' : 'Nuevo hábito'}</h3>
    <form id="f">
      <label class="field"><span>Nombre</span><input name="name" maxlength="40" placeholder="Ej. Tomar 2 litros de agua" value="${esc(h?.name || '')}" required></label>
      <div class="field"><span>Ícono</span><div class="catpick" id="emo">${HABIT_EMOJIS.map(e => `<button type="button" class="${e === emoji ? 'on' : ''}" data-e="${e}"><b>${e}</b></button>`).join('')}</div></div>
      <button class="btn block">Guardar</button>
      ${h ? `<button type="button" class="btn danger block" id="del">Eliminar hábito</button>` : ''}
    </form>`, s => {
    const f = $('#f', s);
    if (!h) setTimeout(() => f.name.focus(), 250);
    $('#emo', s).addEventListener('click', e => {
      const b = e.target.closest('[data-e]'); if (!b) return;
      emoji = b.dataset.e; s.querySelectorAll('#emo button').forEach(x => x.classList.toggle('on', x === b));
    });
    f.addEventListener('submit', e => {
      e.preventDefault();
      const name = f.name.value.trim(); if (!name) return;
      if (h) Object.assign(h, { name, emoji });
      else db.habits.push({ id: uid(), name, emoji, log: {}, created: today() });
      save(); closeSheet(); render(); toast('Guardado');
    });
    $('#del', s)?.addEventListener('click', async () => {
      if (!(await ask('¿Eliminar este hábito y su historial?'))) return;
      db.habits = db.habits.filter(x => x.id !== id); save(); closeSheet(); render(); toast('Eliminado');
    });
  });
}

function openNote(id) {
  const n = id ? db.notes.find(x => x.id === id) : null;
  let pinned = !!n?.pinned;
  openSheet(`
    <form id="f">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
        <h3 style="margin:0">${n ? 'Nota' : 'Nueva nota'}</h3>
        <button type="button" class="chip ${pinned ? 'on' : ''}" id="pin">📌 Fijar</button>
      </div>
      <label class="field"><span>Título</span><input name="title" maxlength="80" placeholder="Idea, lista, pendiente…" value="${esc(n?.title || '')}"></label>
      <label class="field"><span>Nota</span><textarea name="body" placeholder="Escribe aquí…">${esc(n?.body || '')}</textarea></label>
      <label class="field"><span>Etiquetas (separadas por coma)</span><input name="tags" placeholder="ideas, trabajo, compras" value="${esc(n?.tags.join(', ') || '')}"></label>
      <button class="btn block">Guardar</button>
      ${n ? `<button type="button" class="btn danger block" id="del">Eliminar nota</button>` : ''}
    </form>`, s => {
    const f = $('#f', s);
    if (!n) setTimeout(() => f.title.focus(), 250);
    $('#pin', s).addEventListener('click', e => { pinned = !pinned; e.currentTarget.classList.toggle('on', pinned); });
    f.addEventListener('submit', e => {
      e.preventDefault();
      const title = f.title.value.trim(), body = f.body.value.trim();
      if (!title && !body) { toast('La nota está vacía'); return; }
      const tags = [...new Set(f.tags.value.split(',').map(x => x.trim().replace(/^#/, '').toLowerCase()).filter(Boolean))];
      const data = { title, body, tags, pinned, updated: Date.now() };
      if (n) Object.assign(n, data); else db.notes.push({ id: uid(), ...data });
      save(); closeSheet(); render(); toast('Guardada');
    });
    $('#del', s)?.addEventListener('click', async () => {
      if (!(await ask('¿Eliminar esta nota?'))) return;
      db.notes = db.notes.filter(x => x.id !== id); save(); closeSheet(); render(); toast('Eliminada');
    });
  });
}

function openSettings() {
  const st = db.settings;
  openSheet(`
    <h3>Ajustes</h3>
    <form id="f">
      <label class="field"><span>Tu nombre</span><input name="name" maxlength="30" value="${esc(st.name)}" placeholder="Para saludarte"></label>
      <button type="button" class="btn ghost block" id="bud" style="margin-bottom:12px">✏️ Gasto semanal: ${mxn(budgetFor(weekMon(today())))} esta semana</button>
      <label class="field"><span>Moneda</span><select name="currency">
        ${['MXN', 'USD', 'EUR', 'COP', 'ARS', 'CLP', 'PEN', 'GTQ'].map(c => `<option ${c === st.currency ? 'selected' : ''}>${c}</option>`).join('')}
      </select></label>
      <button class="btn block">Guardar</button>
    </form>
    <h3 style="margin-top:22px">Seguridad</h3>
    <button class="btn ghost block" id="pin">🔒 ${db.settings.pinHash ? "Cambiar o quitar PIN" : "Activar candado con PIN"}</button>
    <h3 style="margin-top:22px">Respaldo</h3>
    <p class="small">Tus datos se guardan solo en este teléfono. Descarga un respaldo de vez en cuando para no perderlos (por ejemplo, si borras Safari o cambias de celular).</p>
    <div class="row" style="margin-bottom:10px">
      <button class="btn ghost" id="exp">Descargar respaldo</button>
      <button class="btn ghost" id="imp">Restaurar</button>
    </div>
    <input type="file" id="file" accept="application/json,.json" hidden>
    <button class="btn danger block" id="wipe">Borrar todos mis datos</button>
    <button class="btn ghost block" id="upd" style="margin-top:14px">🔄 Buscar actualización</button>
    <p class="small" style="text-align:center;margin-top:8px">Mi Vida · v1</p>`, s => {
    const f = $('#f', s);
    f.addEventListener('submit', e => {
      e.preventDefault();
      db.settings = { ...db.settings, name: f.name.value.trim(),  currency: f.currency.value };
      save(); closeSheet(); render(); toast('Ajustes guardados');
    });
    $('#pin', s).addEventListener('click', () => openPinSetup());
    $('#upd', s).addEventListener('click', async () => {
      toast('Buscando actualización…');
      try {
        const reg = await navigator.serviceWorker?.getRegistration();
        await reg?.update();
        const keys = await caches.keys(); await Promise.all(keys.map(k => caches.delete(k)));
      } catch {}
      setTimeout(() => location.reload(), 600);
    });
    $('#bud', s).addEventListener('click', () => openBudgets());
    $('#exp', s).addEventListener('click', async () => { closeSheet(); return doBackup();
      const name = `mivida-respaldo-${today()}.json`;
      const blob = new Blob([JSON.stringify(db, null, 2)], { type: 'application/json' });
      const file = new File([blob], name, { type: 'application/json' });
      try {
        if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], title: 'Respaldo Mi Vida' }); return; }
      } catch (err) { if (err.name === 'AbortError') return; }
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    });
    $('#imp', s).addEventListener('click', () => $('#file', s).click());
    $('#file', s).addEventListener('change', async e => {
      const file = e.target.files[0]; if (!file) return;
      try {
        const d = JSON.parse(await file.text());
        if (!d || !Array.isArray(d.tx) || !Array.isArray(d.habits) || !Array.isArray(d.notes)) throw 0;
        if (!Array.isArray(d.routine)) d.routine = [];
        ensureAll(d);
        if (!(await ask('Esto reemplazará tus datos actuales con el respaldo. ¿Continuar?'))) return;
        db = { ...structuredClone(DEFAULT), ...d, settings: { ...DEFAULT.settings, ...(d.settings || {}) } };
        save(); closeSheet(); render(); toast('Respaldo restaurado');
      } catch { toast('Ese archivo no es un respaldo válido'); }
    });
    $('#wipe', s).addEventListener('click', async () => {
      if (!(await ask('¿Seguro? Se borrarán tu rutina, movimientos, hábitos y notas de este teléfono.'))) return;
      db = ensureAll(structuredClone(DEFAULT)); save(); closeSheet(); render(); toast('Datos borrados');
    });
  });
}

/* ============ Arranque ============ */
render();
// Re-render al volver a la app (por si cambió el día)
let lastDay = today();
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && today() !== lastDay) { lastDay = today(); render(); }
});
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then(reg => {
    // Busca versión nueva cada vez que vuelves a la app
    document.addEventListener('visibilitychange', () => { if (!document.hidden) reg.update().catch(() => {}); });
  }).catch(() => {});
  // Cuando se instala una versión nueva, recarga una sola vez para usarla
  let reloaded = false;
  const hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || reloaded || document.querySelector('.sheet:not([hidden])')) return;
    reloaded = true; location.reload();
  });
}
// Pedir almacenamiento persistente (ayuda a que el navegador no borre los datos)
navigator.storage?.persist?.().catch(() => {});
