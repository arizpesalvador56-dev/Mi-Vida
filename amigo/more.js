'use strict';
/* ============ Más secciones: Tareas y metas, Salud, Diario, Fechas, Revisión semanal, Proyectos ============
   Se carga antes de app.js; app.js mezcla MORE_TITLES, MORE_VIEWS, MORE_MOUNT y MORE_ACTIONS. */

function ensureMore(d) {
  d.tasks ||= [];     // {id, title, prio:'alta'|'media'|'baja', due, done, doneAt, created}
  d.goals ||= [];     // {id, title, why, deadline, steps:[{id,title,done,doneAt}], created}
  d.health ||= {};    // {'YYYY-MM-DD': {sleep, weight, mood, water, food}}
  d.journal ||= {};   // {'YYYY-MM-DD': {text, learned, grateful}}
  d.dates ||= [];     // {id, title, kind, date, yearly, note}
  d.reviews ||= {};   // {'YYYY-MM-DD'(lunes): {good, improve, focus}}
  d.projects ||= [];  // ver openProject
  return d;
}
const ensureAll = d => { ensureMore(ensurePlan(d)); if (typeof ensureGame === 'function') ensureGame(d); if (typeof ensureExtras === 'function') ensureExtras(d); return d; };

const MORE_TITLES = {
  mas: 'Más', tareas: 'Tareas y metas', salud: 'Salud', diario: 'Diario', fechas: 'Fechas importantes',
  revision: 'Revisión semanal', proyectos: 'Proyectos', proyecto: 'Proyecto', notas: 'Notas', habitos: 'Hábitos',
};
const MORE_PARENT = { tareas: 'mas', salud: 'mas', diario: 'mas', fechas: 'mas', revision: 'mas', proyectos: 'mas', notas: 'mas', deudas: 'mas', proyecto: 'proyectos' };

const fmtDay = k => cap(parseD(k).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' }));
const ddmm = k => { const d = parseD(k); return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`; };
const daysBetween = (a, b) => Math.round((parseD(b) - parseD(a)) / 86400000);
const MOODS = ['😞', '😕', '😐', '🙂', '😄'];
const MOOD_TXT = ['Muy mal', 'Mal', 'Normal', 'Bien', 'Muy bien'];

/* ---------------- Menú "Más" ---------------- */
function viewMas() {
  const items = [
    ['logros', '🏆', 'Logros y premios', (() => { const G = gameState(); return `Nivel ${G.level} · ${levelTitle(G.level)} · 🪙 ${G.coins}`; })()],
    ['deudas', '💳', 'Plan de deudas', (() => { const n = db.plan.items.filter(i => i.kind === 'pago' && !i.done).sort((a, b) => a.date.localeCompare(b.date))[0]; return n ? `Próximo: ${n.name} ${mxn(n.amount)} el ${ddmm(n.date)}` : 'Sin pagos pendientes'; })()],
    ['ejercicio', '🏋️', 'Ejercicio', db.activeWorkout ? 'Entreno en curso' : `${db.workouts.filter(w => w.date >= weekMon(today())).length} entrenos esta semana`],
    ['enfoque', '🍅', 'Enfoque (Pomodoro)', db.focusTimer ? 'Temporizador corriendo' : `${db.focus.filter(f => f.date === today()).length} pomodoros hoy`],
    ['pagos', '🧾', 'Pagos fijos y suscripciones', `${db.bills.length} registrados`],
    ['ahorro', '🐷', 'Metas de ahorro', `${mxn(r2(db.savings.reduce((a, s) => a + saved(s), 0)))} ahorrados`],
    ['tareas', '✅', 'Tareas y metas', `${db.tasks.filter(t => !t.done).length} pendientes`],
    ['proyectos', '🚀', 'Proyectos y negocios', `${db.projects.filter(p => p.status === 'activo').length} activos`],
    ['salud', '❤️', 'Salud', db.health[today()] ? 'Hoy ya registrado' : 'Registra tu día'],
    ['diario', '📔', 'Diario', db.journal[today()] ? 'Hoy ya escribiste' : '¿Cómo te fue hoy?'],
    ['notas', '📝', 'Notas e ideas', `${db.notes.length} notas`],
    ['fechas', '📅', 'Fechas importantes', nextDatesLabel()],
    ['revision', '📊', 'Revisión semanal', 'Cómo te fue esta semana'],
  ];
  return `<div class="menu">${items.map(([k, e, t, s]) => `
    <button class="menu-item" data-act="go" data-id="${k}"><span class="emoji">${e}</span><span class="grow"><b>${t}</b><small>${esc(s)}</small></span><span class="chev">›</span></button>`).join('')}</div>`;
}

/* ---------------- Tareas y metas ---------------- */
let taskView = 'tareas', showDoneTasks = false;
const PRIO = { alta: ['🔴', 'Alta', 0], media: ['🟡', 'Media', 1], baja: ['🟢', 'Baja', 2] };

function taskRow(t) {
  const late = !t.done && t.due && t.due < today();
  return `<li>
    <button class="check ${t.done ? 'on' : ''}" data-act="toggleTask" data-id="${t.id}" aria-label="Completar"></button>
    <div class="grow" data-act="editTask" data-id="${t.id}">
      <div class="t" style="${t.done ? 'text-decoration:line-through;opacity:.5' : ''}">${esc(t.title)}</div>
      <div class="s">${PRIO[t.prio]?.[0] || ''} ${PRIO[t.prio]?.[1] || ''}${t.due ? ` · <span class="${late ? 'neg' : ''}">${t.due === today() ? 'Hoy' : ddmm(t.due)}${late ? ' (atrasada)' : ''}</span>` : ''}</div>
    </div>
  </li>`;
}
const sortTasks = (a, b) => (PRIO[a.prio]?.[2] ?? 1) - (PRIO[b.prio]?.[2] ?? 1) || (a.due || '9').localeCompare(b.due || '9');

function viewTareas() {
  const seg = `<div class="seg">${[['tareas', 'Pendientes'], ['metas', 'Metas']].map(([k, l]) => `<button class="${taskView === k ? 'on' : ''}" data-act="taskView" data-id="${k}">${l}</button>`).join('')}</div>`;
  if (taskView === 'metas') return seg + viewMetas();
  const open = db.tasks.filter(t => !t.done).sort(sortTasks);
  const done = db.tasks.filter(t => t.done).sort((a, b) => (b.doneAt || 0) - (a.doneAt || 0));
  const groups = { alta: [], media: [], baja: [] };
  open.forEach(t => (groups[t.prio] || groups.media).push(t));
  return seg + `
    ${open.length ? Object.entries(groups).filter(([, l]) => l.length).map(([p, l]) => `
      <div class="card"><h2>${PRIO[p][0]} Prioridad ${PRIO[p][1].toLowerCase()} <span class="small">${l.length}</span></h2><ul class="list">${l.map(taskRow).join('')}</ul></div>`).join('')
      : `<div class="card empty">Sin pendientes. Toca <b>+</b> para agregar uno.</div>`}
    ${done.length ? `<div class="card"><h2>Completadas <button class="link" data-act="toggleDoneTasks">${showDoneTasks ? 'Ocultar' : `Ver (${done.length})`}</button></h2>
      ${showDoneTasks ? `<ul class="list">${done.slice(0, 30).map(taskRow).join('')}</ul>` : ''}</div>` : ''}
    <button class="fab" data-act="addTask" aria-label="Nueva tarea">+</button>`;
}

function viewMetas() {
  return `
    ${db.goals.length ? db.goals.map(g => {
      const total = g.steps.length, done = g.steps.filter(s => s.done).length;
      const pct = total ? Math.round(done / total * 100) : 0;
      const next = g.steps.find(s => !s.done);
      const left = g.deadline ? daysBetween(today(), g.deadline) : null;
      return `<div class="card">
        <h2 style="text-transform:none;letter-spacing:0;font-size:17px;color:var(--text)">${pct === 100 ? '🏆' : '🎯'} ${esc(g.title)} <button class="link" data-act="editGoal" data-id="${g.id}">Editar</button></h2>
        ${g.why ? `<div class="small" style="margin-bottom:6px">Para qué: ${esc(g.why)}</div>` : ''}
        <div class="bar"><i style="width:${pct}%;background:var(--green)"></i></div>
        <div class="small" style="margin:6px 0">${done} de ${total} pasos · ${pct}%${left != null ? ` · ${left >= 0 ? `faltan ${left} días` : `<span class="neg">venció hace ${-left} días</span>`}` : ''}</div>
        <ul class="list">${g.steps.map(s => `<li>
          <button class="check ${s.done ? 'on' : ''}" data-act="toggleStep" data-id="${g.id}|${s.id}"></button>
          <div class="grow"><div class="t" style="${s.done ? 'text-decoration:line-through;opacity:.5' : ''}">${esc(s.title)}${s === next ? ' <span class="next-badge">SIGUIENTE</span>' : ''}</div></div></li>`).join('')}</ul>
        <button class="link" style="margin-top:8px" data-act="addStep" data-id="${g.id}">+ Agregar paso</button>
      </div>`;
    }).join('') : `<div class="card empty">Una meta grande se logra en pasos chiquitos.<br>Ej. "Juntar mi fondo de emergencia" → abrir cuenta, ahorrar $500 por semana…</div>`}
    <button class="fab" data-act="addGoal" aria-label="Nueva meta">+</button>`;
}

function openTask(id) {
  const t = id ? db.tasks.find(x => x.id === id) : null;
  let prio = t?.prio || 'media';
  openSheet(`
    <h3>${t ? 'Editar tarea' : 'Nueva tarea'}</h3>
    <form id="f">
      <label class="field"><span>¿Qué tienes que hacer?</span><input name="title" maxlength="100" value="${esc(t?.title || '')}" required></label>
      <div class="field"><span>Prioridad</span><div class="seg" id="prio" style="margin:0">${Object.entries(PRIO).map(([k, [e, l]]) => `<button type="button" data-p="${k}" class="${k === prio ? 'on' : ''}">${e} ${l}</button>`).join('')}</div></div>
      <label class="field"><span>Para cuándo (opcional)</span><input name="due" type="date" value="${t?.due || ''}"></label>
      <button class="btn block">Guardar</button>
      ${t ? `<button type="button" class="btn danger block" id="del">Eliminar</button>` : ''}
    </form>`, s => {
    const f = $('#f', s);
    if (!t) setTimeout(() => f.title.focus(), 250);
    $('#prio', s).addEventListener('click', e => { const b = e.target.closest('[data-p]'); if (!b) return; prio = b.dataset.p; s.querySelectorAll('#prio button').forEach(x => x.classList.toggle('on', x === b)); });
    f.addEventListener('submit', e => {
      e.preventDefault();
      const data = { title: f.title.value.trim(), prio, due: f.due.value };
      if (!data.title) return;
      if (t) Object.assign(t, data); else db.tasks.push({ id: uid(), done: false, created: Date.now(), ...data });
      save(); closeSheet(); render(); toast('Guardada');
    });
    $('#del', s)?.addEventListener('click', async () => {
      if (!(await ask('¿Eliminar esta tarea?'))) return;
      db.tasks = db.tasks.filter(x => x.id !== id); save(); closeSheet(); render();
    });
  });
}
function toggleTask(id) {
  const t = db.tasks.find(x => x.id === id); if (!t) return;
  t.done = !t.done; t.doneAt = t.done ? Date.now() : null; t.doneDay = t.done ? today() : null;
  save(); render();
  if (t.done) toast('¡Hecho! ✅', () => { t.done = false; t.doneAt = t.doneDay = null; save(); render(); });
}

function openGoal(id) {
  const g = id ? db.goals.find(x => x.id === id) : null;
  openSheet(`
    <h3>${g ? 'Editar meta' : 'Nueva meta'}</h3>
    <form id="f">
      <label class="field"><span>Meta</span><input name="title" maxlength="80" placeholder="Ej. Salir de deudas" value="${esc(g?.title || '')}" required></label>
      <label class="field"><span>¿Para qué la quieres? (te motiva)</span><input name="why" maxlength="120" value="${esc(g?.why || '')}"></label>
      <label class="field"><span>Fecha límite (opcional)</span><input name="deadline" type="date" value="${g?.deadline || ''}"></label>
      <label class="field"><span>Pasos (uno por renglón)</span><textarea name="steps" style="min-height:140px" placeholder="Paso 1&#10;Paso 2&#10;Paso 3">${esc(g ? g.steps.map(s => s.title).join('\n') : '')}</textarea></label>
      <button class="btn block">Guardar</button>
      ${g ? `<button type="button" class="btn danger block" id="del">Eliminar meta</button>` : ''}
    </form>`, s => {
    const f = $('#f', s);
    f.addEventListener('submit', e => {
      e.preventDefault();
      const lines = f.steps.value.split('\n').map(x => x.trim()).filter(Boolean);
      const old = g?.steps || [];
      const steps = lines.map(title => { const o = old.find(s => s.title === title); return o || { id: uid(), title, done: false }; });
      const data = { title: f.title.value.trim(), why: f.why.value.trim(), deadline: f.deadline.value, steps };
      if (g) Object.assign(g, data); else db.goals.push({ id: uid(), created: Date.now(), ...data });
      save(); closeSheet(); render(); toast('Meta guardada');
    });
    $('#del', s)?.addEventListener('click', async () => {
      if (!(await ask('¿Eliminar esta meta y sus pasos?'))) return;
      db.goals = db.goals.filter(x => x.id !== id); save(); closeSheet(); render();
    });
  });
}
function toggleStep(ref) {
  const [gid, sid] = ref.split('|');
  const g = db.goals.find(x => x.id === gid); const s = g?.steps.find(x => x.id === sid); if (!s) return;
  s.done = !s.done; s.doneAt = s.done ? Date.now() : null; s.doneDay = s.done ? today() : null;
  save(); render();
  if (s.done && g.steps.every(x => x.done)) toast('🏆 ¡Meta cumplida!');
}
function addStep(gid) {
  const g = db.goals.find(x => x.id === gid); if (!g) return;
  openSheet(`<h3>Nuevo paso</h3><form id="f"><label class="field"><span>${esc(g.title)}</span><input name="t" maxlength="100" required></label><button class="btn block">Agregar</button></form>`, s => {
    const f = $('#f', s); setTimeout(() => f.t.focus(), 250);
    f.addEventListener('submit', e => { e.preventDefault(); g.steps.push({ id: uid(), title: f.t.value.trim(), done: false }); save(); closeSheet(); render(); });
  });
}

/* ---------------- Salud ---------------- */
let healthDay = null;
function viewSalud() {
  const k = healthDay || today();
  const h = db.health[k] || {};
  const last7 = Array.from({ length: 7 }, (_, i) => dkey(addDays(new Date(), -i)));
  const vals = f => last7.map(d => db.health[d]?.[f]).filter(v => v != null && v !== '');
  const avg = a => a.length ? a.reduce((x, y) => x + +y, 0) / a.length : null;
  const sleepAvg = avg(vals('sleep')), moodAvg = avg(vals('mood'));
  const weights = Object.entries(db.health).filter(([, v]) => v.weight).sort(([a], [b]) => a.localeCompare(b)).slice(-20);
  return `
    <div class="monthnav">
      <button data-act="healthDay" data-id="-1" aria-label="Día anterior">‹</button>
      <strong>${k === today() ? 'Hoy' : fmtDay(k)}</strong>
      <button data-act="healthDay" data-id="1" aria-label="Día siguiente" ${k >= today() ? 'disabled style="opacity:.3"' : ''}>›</button>
    </div>
    <form class="card" id="hform">
      <div class="field"><span>¿Cómo te sientes?</span>
        <div class="moods">${MOODS.map((m, i) => `<button type="button" data-m="${i + 1}" class="${h.mood == i + 1 ? 'on' : ''}" aria-label="${MOOD_TXT[i]}">${m}</button>`).join('')}</div></div>
      <div class="row2">
        <label class="field"><span>Horas de sueño</span><input name="sleep" type="number" inputmode="decimal" step="0.5" min="0" max="24" value="${h.sleep ?? ''}" placeholder="7.5"></label>
        <label class="field"><span>Peso (kg)</span><input name="weight" type="number" inputmode="decimal" step="0.1" min="0" value="${h.weight ?? ''}" placeholder="—"></label>
      </div>
      <div class="field"><span>Vasos de agua</span>
        <div class="counter"><button type="button" data-w="-1">−</button><b id="water">${h.water || 0}</b><button type="button" data-w="1">+</button></div></div>
      <button class="btn block">Guardar día</button>
    </form>
    <div class="card"><h2>Últimos 7 días</h2>
      <div class="stats">
        <div class="stat"><div class="lbl">Sueño prom.</div><div class="val">${sleepAvg != null ? sleepAvg.toFixed(1) + ' h' : '—'}</div></div>
        <div class="stat"><div class="lbl">Ánimo prom.</div><div class="val">${moodAvg != null ? MOODS[Math.round(moodAvg) - 1] : '—'}</div></div>
        <div class="stat"><div class="lbl">Peso</div><div class="val">${weights.length ? weights[weights.length - 1][1].weight + ' kg' : '—'}</div></div>
      </div>
      <div class="week-mini">${last7.slice().reverse().map(d => { const x = db.health[d] || {}; return `<div><small>${DAYS[wday(parseD(d))][0]}</small><span>${x.mood ? MOODS[x.mood - 1] : '·'}</span><small>${x.sleep ? x.sleep + 'h' : ''}</small></div>`; }).join('')}</div>
      ${weights.length > 1 ? `<h2 style="margin-top:14px">Peso</h2>${sparkline(weights.map(([, v]) => +v.weight))}
        <div class="small">${(() => { const d = +weights[weights.length - 1][1].weight - +weights[0][1].weight; return `${d > 0 ? '+' : ''}${d.toFixed(1)} kg desde el ${ddmm(weights[0][0])}`; })()}</div>` : ''}
    </div>`;
}
function sparkline(vals) {
  const w = 300, h = 60, mn = Math.min(...vals), mx = Math.max(...vals), r = mx - mn || 1;
  const pts = vals.map((v, i) => `${(i / (vals.length - 1)) * (w - 8) + 4},${h - 6 - ((v - mn) / r) * (h - 12)}`).join(' ');
  return `<svg viewBox="0 0 ${w} ${h}" width="100%" height="${h}" aria-hidden="true"><polyline points="${pts}" fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/></svg>`;
}
function mountSalud(v) {
  const f = $('#hform', v); if (!f) return;
  const k = healthDay || today();
  let mood = db.health[k]?.mood || null, water = db.health[k]?.water || 0;
  f.querySelector('.moods').addEventListener('click', e => { const b = e.target.closest('[data-m]'); if (!b) return; mood = +b.dataset.m; f.querySelectorAll('.moods button').forEach(x => x.classList.toggle('on', x === b)); });
  f.querySelector('.counter').addEventListener('click', e => { const b = e.target.closest('[data-w]'); if (!b) return; water = Math.max(0, water + +b.dataset.w); $('#water', f).textContent = water; });
  f.addEventListener('submit', e => {
    e.preventDefault();
    const num = x => x.value === '' ? null : +x.value;
    db.health[k] = { mood, water, sleep: num(f.sleep), weight: num(f.weight), food: db.health[k]?.food || '' };
    save(); render(); toast('Día guardado');
  });
}

/* ---------------- Diario ---------------- */
let journalDay = null;
function viewDiario() {
  const k = journalDay || today();
  const j = db.journal[k] || {};
  const past = Object.entries(db.journal).filter(([d]) => d !== k).sort(([a], [b]) => b.localeCompare(a)).slice(0, 20);
  let streakN = 0; for (let d = new Date(); db.journal[dkey(d)]; d = addDays(d, -1)) streakN++;
  return `
    <div class="monthnav">
      <button data-act="journalDay" data-id="-1" aria-label="Día anterior">‹</button>
      <strong>${k === today() ? 'Hoy' : fmtDay(k)}</strong>
      <button data-act="journalDay" data-id="1" aria-label="Día siguiente" ${k >= today() ? 'disabled style="opacity:.3"' : ''}>›</button>
    </div>
    <form class="card" id="jform">
      <label class="field"><span>¿Cómo te fue hoy?</span><textarea name="text" style="min-height:120px" placeholder="Lo que pasó, cómo te sentiste…">${esc(j.text || '')}</textarea></label>
      <label class="field"><span>💡 ¿Qué aprendí hoy?</span><textarea name="learned" style="min-height:70px">${esc(j.learned || '')}</textarea></label>
      <label class="field"><span>🙏 Algo por lo que estoy agradecido</span><input name="grateful" maxlength="140" value="${esc(j.grateful || '')}"></label>
      <button class="btn block">Guardar</button>
    </form>
    ${streakN > 1 ? `<div class="small" style="text-align:center;margin-bottom:12px">🔥 Llevas ${streakN} días seguidos escribiendo</div>` : ''}
    ${past.length ? `<div class="card"><h2>Entradas anteriores</h2><ul class="list">${past.map(([d, x]) => `
      <li data-act="journalOpen" data-id="${d}"><div class="grow"><div class="t">${fmtDay(d)}</div><div class="s">${esc(x.learned ? '💡 ' + x.learned : x.text || '')}</div></div></li>`).join('')}</ul></div>` : ''}`;
}
function mountDiario(v) {
  const f = $('#jform', v); if (!f) return;
  const k = journalDay || today();
  f.addEventListener('submit', e => {
    e.preventDefault();
    const data = { text: f.text.value.trim(), learned: f.learned.value.trim(), grateful: f.grateful.value.trim() };
    if (!data.text && !data.learned && !data.grateful) delete db.journal[k]; else db.journal[k] = data;
    save(); render(); toast('Guardado en tu diario');
  });
}

/* ---------------- Fechas importantes ---------------- */
const DKINDS = { cumple: ['🎂', 'Cumpleaños'], vence: ['⏰', 'Vencimiento'], aniv: ['💍', 'Aniversario'], tramite: ['📄', 'Trámite / documento'], otro: ['📌', 'Otro'] };
function nextOccur(x) {
  const t = today();
  if (!x.yearly) return x.date;
  const [, m, d] = x.date.split('-');
  let y = +t.slice(0, 4);
  let k = `${y}-${m}-${d}`;
  if (k < t) k = `${y + 1}-${m}-${d}`;
  return k;
}
function upcomingDates(days = 30) {
  return db.dates.map(x => ({ ...x, next: nextOccur(x) })).map(x => ({ ...x, left: daysBetween(today(), x.next) }))
    .filter(x => x.left >= -0 && x.left <= days).sort((a, b) => a.left - b.left);
}
function nextDatesLabel() { const u = upcomingDates(30); return u.length ? `${u[0].title} ${u[0].left === 0 ? 'hoy' : `en ${u[0].left} días`}` : `${db.dates.length} guardadas`; }
const leftTxt = n => n === 0 ? '¡Hoy!' : n === 1 ? 'Mañana' : n < 0 ? `Hace ${-n} días` : `En ${n} días`;

function viewFechas() {
  const all = db.dates.map(x => ({ ...x, next: nextOccur(x) })).map(x => ({ ...x, left: daysBetween(today(), x.next) }))
    .sort((a, b) => (a.left < 0) - (b.left < 0) || a.left - b.left);
  return `
    ${all.length ? `<div class="card"><ul class="list">${all.map(x => {
      const [e, l] = DKINDS[x.kind] || DKINDS.otro;
      const age = x.kind === 'cumple' && x.yearly && x.year ? ` · cumple ${+x.next.slice(0, 4) - x.year}` : '';
      return `<li data-act="editDate" data-id="${x.id}"><div class="emoji">${e}</div>
        <div class="grow"><div class="t">${esc(x.title)}</div><div class="s">${l} · ${ddmm(x.next)}${x.yearly ? ' · cada año' : ''}${age}${x.note ? ' · ' + esc(x.note) : ''}</div></div>
        <div class="amt ${x.left <= 7 && x.left >= 0 ? 'neg' : x.left < 0 ? '' : ''}" style="font-size:13px;${x.left < 0 ? 'opacity:.5' : ''}">${leftTxt(x.left)}</div></li>`;
    }).join('')}</ul></div>` : `<div class="card empty">Guarda cumpleaños, vencimientos (licencia, pasaporte, seguro, tarjeta), aniversarios y trámites.<br>Te avisamos en Inicio cuando se acerquen.</div>`}
    <button class="fab" data-act="addDate" aria-label="Nueva fecha">+</button>`;
}
function openDate(id) {
  const x = id ? db.dates.find(d => d.id === id) : null;
  let kind = x?.kind || 'cumple';
  openSheet(`
    <h3>${x ? 'Editar fecha' : 'Nueva fecha'}</h3>
    <form id="f">
      <div class="field"><span>Tipo</span><div class="catpick" id="kinds">${Object.entries(DKINDS).map(([k, [e, l]]) => `<button type="button" data-k="${k}" class="${k === kind ? 'on' : ''}"><b>${e}</b>${l.split(' ')[0]}</button>`).join('')}</div></div>
      <label class="field"><span>Nombre</span><input name="title" maxlength="60" placeholder="Ej. Cumple de mamá, Vence licencia" value="${esc(x?.title || '')}" required></label>
      <label class="field"><span>Fecha</span><input name="date" type="date" value="${x?.date || today()}" required></label>
      <label class="field" style="display:flex;gap:10px;align-items:center"><input name="yearly" type="checkbox" style="width:22px;height:22px" ${x ? (x.yearly ? 'checked' : '') : 'checked'}><span style="margin:0">Se repite cada año</span></label>
      <label class="field"><span>Nota (opcional)</span><input name="note" maxlength="80" placeholder="Ej. número de póliza, qué regalar" value="${esc(x?.note || '')}"></label>
      <button class="btn block">Guardar</button>
      ${x ? `<button type="button" class="btn danger block" id="del">Eliminar</button>` : ''}
    </form>`, s => {
    const f = $('#f', s);
    $('#kinds', s).addEventListener('click', e => {
      const b = e.target.closest('[data-k]'); if (!b) return; kind = b.dataset.k;
      s.querySelectorAll('#kinds button').forEach(z => z.classList.toggle('on', z === b));
      f.yearly.checked = ['cumple', 'aniv'].includes(kind);
    });
    f.addEventListener('submit', e => {
      e.preventDefault();
      const data = { kind, title: f.title.value.trim(), date: f.date.value, yearly: f.yearly.checked, note: f.note.value.trim(), year: +f.date.value.slice(0, 4) };
      if (x) Object.assign(x, data); else db.dates.push({ id: uid(), ...data });
      save(); closeSheet(); render(); toast('Guardada');
    });
    $('#del', s)?.addEventListener('click', async () => {
      if (!(await ask('¿Eliminar esta fecha?'))) return;
      db.dates = db.dates.filter(d => d.id !== id); save(); closeSheet(); render();
    });
  });
}

/* ---------------- Revisión semanal ---------------- */
let reviewMon = null;
function weekReview(mon) {
  const days = Array.from({ length: 7 }, (_, i) => dkey(addDays(parseD(mon), i)));
  const sun = days[6];
  const inW = d => d && d >= mon && d <= sun;
  const t = today();
  const elapsed = days.filter(d => d <= t);
  // Finanzas
  const spent = weekSpent(mon), max = budgetFor(mon);
  const txs = db.tx.filter(x => inW(x.date));
  const paid = txs.filter(x => x.planId && x.type === 'gasto').reduce((a, x) => a + x.amount, 0);
  const income = txs.filter(x => x.type === 'ingreso' && x.cat !== 'ajuste').reduce((a, x) => a + x.amount, 0);
  const emerg = txs.filter(x => x.cat === 'emergencia').reduce((a, x) => a + x.amount, 0);
  const topCat = Object.entries(txs.filter(x => x.type === 'gasto' && !NOT_WEEKLY.includes(x.cat)).reduce((a, x) => (a[x.cat] = (a[x.cat] || 0) + x.amount, a), {})).sort((a, b) => b[1] - a[1])[0];
  // Hábitos
  let hPossible = 0, hDone = 0; const perHabit = db.habits.map(h => { const n = elapsed.filter(d => h.log[d]).length; hPossible += elapsed.length; hDone += n; return [h, n]; });
  // Tareas / metas
  const tasksDone = db.tasks.filter(x => x.done && inW(x.doneDay)).length;
  const stepsDone = db.goals.flatMap(g => g.steps.filter(s => s.done && inW(s.doneDay)).map(s => [g, s]));
  // Salud
  const hs = days.map(d => db.health[d]).filter(Boolean);
  const avg = f => { const a = hs.map(x => x[f]).filter(v => v != null && v !== ''); return a.length ? a.reduce((x, y) => x + +y, 0) / a.length : null; };
  // Diario
  const jour = days.filter(d => db.journal[d]);
  const learned = days.filter(d => db.journal[d]?.learned).map(d => [d, db.journal[d].learned]);
  // Proyectos
  const projMoney = db.projects.flatMap(p => (p.money || []).filter(m => inW(m.date)).map(m => m.type === 'ingreso' ? m.amount : -m.amount)).reduce((a, b) => a + b, 0);
  return { days, sun, spent, max, paid, income, emerg, topCat, perHabit, hPossible, hDone, tasksDone, stepsDone, sleep: avg('sleep'), mood: avg('mood'), jour, learned, projMoney, elapsed };
}
function viewRevision() {
  const mon = reviewMon || weekMon(today());
  const R = weekReview(mon);
  const r = db.reviews[mon] || {};
  const hp = R.hPossible ? Math.round(R.hDone / R.hPossible * 100) : null;
  const wins = [];
  if (R.max && R.spent <= R.max && R.elapsed.length) wins.push(`Te mantuviste en tu gasto semanal (${mxn(R.spent)} de ${mxn(R.max)})`);
  if (R.paid) wins.push(`Pagaste ${mxn(r2(R.paid))} de deudas`);
  if (hp != null && hp >= 70) wins.push(`Cumpliste ${hp}% de tus hábitos`);
  if (R.tasksDone) wins.push(`Terminaste ${R.tasksDone} tarea${R.tasksDone > 1 ? 's' : ''}`);
  if (R.stepsDone.length) wins.push(`Avanzaste ${R.stepsDone.length} paso${R.stepsDone.length > 1 ? 's' : ''} en tus metas`);
  const watch = [];
  if (R.max && R.spent > R.max) watch.push(`Te pasaste ${mxn(r2(R.spent - R.max))} del gasto semanal`);
  if (R.emerg) watch.push(`Tuviste ${mxn(R.emerg)} en emergencias`);
  if (hp != null && hp < 50) watch.push(`Hábitos al ${hp}%: elige uno solo para enfocarte`);
  if (R.sleep != null && R.sleep < 6.5) watch.push(`Dormiste ${R.sleep.toFixed(1)} h en promedio`);
  return `
    <div class="monthnav">
      <button data-act="reviewWeek" data-id="-7" aria-label="Semana anterior">‹</button>
      <strong>${rangeD(mon)}</strong>
      <button data-act="reviewWeek" data-id="7" aria-label="Semana siguiente" ${mon >= weekMon(today()) ? 'disabled style="opacity:.3"' : ''}>›</button>
    </div>
    ${wins.length ? `<div class="card"><h2>🏆 Lo que salió bien</h2><ul class="bullets">${wins.map(w => `<li>${w}</li>`).join('')}</ul></div>` : ''}
    ${watch.length ? `<div class="card"><h2>👀 Para cuidar</h2><ul class="bullets">${watch.map(w => `<li>${w}</li>`).join('')}</ul></div>` : ''}
    <div class="card"><h2>💰 Dinero</h2>
      <div class="stats">
        <div class="stat"><div class="lbl">Gastaste</div><div class="val ${R.spent > R.max ? 'neg' : ''}">${mxn(R.spent)}</div></div>
        <div class="stat"><div class="lbl">Pagaste deudas</div><div class="val">${mxn(r2(R.paid))}</div></div>
        <div class="stat"><div class="lbl">Cobraste</div><div class="val pos">${mxn(r2(R.income))}</div></div>
      </div>
      <div class="small" style="margin-top:8px">Máximo de la semana ${mxn(R.max)}${R.topCat ? ` · Donde más gastaste: ${catInfo('gasto', R.topCat[0])[1]} ${catInfo('gasto', R.topCat[0])[2]} (${mxn(R.topCat[1])})` : ''}${db.plan.metas[mon] != null ? ` · Meta al domingo ${mxn(db.plan.metas[mon])}` : ''}${R.projMoney ? ` · Proyectos: ${R.projMoney > 0 ? '+' : ''}${mxn(r2(R.projMoney))}` : ''}</div>
    </div>
    ${db.habits.length ? `<div class="card"><h2>✅ Hábitos <span class="small">${hp ?? 0}%</span></h2>
      ${R.perHabit.map(([h, n]) => `<div class="catrow"><div class="top"><span>${esc(h.emoji)} ${esc(h.name)}</span><span class="small">${n}/${R.elapsed.length}</span></div><div class="bar"><i style="width:${R.elapsed.length ? n / R.elapsed.length * 100 : 0}%;background:var(--green)"></i></div></div>`).join('')}</div>` : ''}
    <div class="card"><h2>📋 Avance</h2>
      <div class="stats">
        <div class="stat"><div class="lbl">Tareas hechas</div><div class="val">${R.tasksDone}</div></div>
        <div class="stat"><div class="lbl">Pasos de metas</div><div class="val">${R.stepsDone.length}</div></div>
        <div class="stat"><div class="lbl">Días en diario</div><div class="val">${R.jour.length}/7</div></div>
      </div>
      ${R.stepsDone.length ? `<ul class="bullets" style="margin-top:8px">${R.stepsDone.map(([g, s]) => `<li>${esc(s.title)} <span class="small">(${esc(g.title)})</span></li>`).join('')}</ul>` : ''}
    </div>
    ${R.sleep != null || R.mood != null ? `<div class="card"><h2>❤️ Salud</h2><div class="stats">
      <div class="stat"><div class="lbl">Sueño prom.</div><div class="val">${R.sleep != null ? R.sleep.toFixed(1) + ' h' : '—'}</div></div>
      <div class="stat"><div class="lbl">Ánimo prom.</div><div class="val">${R.mood != null ? MOODS[Math.round(R.mood) - 1] : '—'}</div></div>
      <div class="stat"><div class="lbl">Días registrados</div><div class="val">${R.days.filter(d => db.health[d]).length}/7</div></div></div></div>` : ''}
    ${R.learned.length ? `<div class="card"><h2>💡 Lo que aprendiste</h2><ul class="bullets">${R.learned.map(([d, l]) => `<li>${esc(l)} <span class="small">${ddmm(d)}</span></li>`).join('')}</ul></div>` : ''}
    <form class="card" id="rform"><h2>✍️ Tu reflexión</h2>
      <label class="field"><span>¿Qué salió bien?</span><textarea name="good" style="min-height:60px">${esc(r.good || '')}</textarea></label>
      <label class="field"><span>¿Qué quiero mejorar?</span><textarea name="improve" style="min-height:60px">${esc(r.improve || '')}</textarea></label>
      <label class="field"><span>Mi prioridad para la próxima semana</span><input name="focus" maxlength="120" value="${esc(r.focus || '')}"></label>
      <button class="btn block">Guardar reflexión</button>
    </form>`;
}
function mountRevision(v) {
  const f = $('#rform', v); if (!f) return;
  const mon = reviewMon || weekMon(today());
  f.addEventListener('submit', e => {
    e.preventDefault();
    db.reviews[mon] = { good: f.good.value.trim(), improve: f.improve.value.trim(), focus: f.focus.value.trim() };
    save(); toast('Reflexión guardada');
  });
}

/* ---------------- Proyectos y negocios ---------------- */
const PSTATUS = { idea: ['💡', 'Idea'], validando: ['🔍', 'Validando'], activo: ['🟢', 'Activo'], pausado: ['⏸️', 'Pausado'], terminado: ['🏁', 'Terminado'] };
let projId = null, projTab = 'resumen';
const projProfit = p => r2((p.money || []).reduce((a, m) => a + (m.type === 'ingreso' ? m.amount : -m.amount), 0));

function viewProyectos() {
  const order = ['activo', 'validando', 'idea', 'pausado', 'terminado'];
  const list = [...db.projects].sort((a, b) => order.indexOf(a.status) - order.indexOf(b.status));
  return `
    ${list.length ? list.map(p => {
      const steps = p.tasks || [], done = steps.filter(s => s.done).length;
      const next = steps.find(s => !s.done);
      const profit = projProfit(p);
      return `<button class="card proj" data-act="openProject" data-id="${p.id}">
        <div class="proj-top"><span class="emoji">${esc(p.emoji || '🚀')}</span><div class="grow"><b>${esc(p.name)}</b><small>${PSTATUS[p.status][0]} ${PSTATUS[p.status][1]}</small></div>
        ${(p.money || []).length ? `<span class="amt ${profit < 0 ? 'neg' : 'pos'}">${mxn(profit)}</span>` : ''}</div>
        ${steps.length ? `<div class="bar"><i style="width:${done / steps.length * 100}%"></i></div>` : ''}
        <div class="small" style="margin-top:6px">${next ? `Siguiente paso: ${esc(next.title)}` : esc(p.pitch || 'Toca para abrir')}</div>
      </button>`;
    }).join('') : `<div class="card empty">Aquí viven tus negocios e ideas.<br>Cada proyecto tiene su plan, pasos, dinero (ganancia real), clientes e ideas.</div>`}
    <button class="fab" data-act="addProject" aria-label="Nuevo proyecto">+</button>`;
}

function viewProyecto() {
  const p = db.projects.find(x => x.id === projId);
  if (!p) { setTimeout(() => go('proyectos')); return ''; }
  const tabs = [['resumen', 'Resumen'], ['pasos', 'Pasos'], ['dinero', 'Dinero'], ['gente', 'Clientes'], ['ideas', 'Ideas']];
  const seg = `<div class="seg seg-sm">${tabs.map(([k, l]) => `<button class="${projTab === k ? 'on' : ''}" data-act="projTab" data-id="${k}">${l}</button>`).join('')}</div>`;
  const head = `<div class="proj-head"><span class="emoji" style="width:52px;height:52px;font-size:28px">${esc(p.emoji || '🚀')}</span>
    <div class="grow"><div style="font-size:22px;font-weight:700">${esc(p.name)}</div><div class="small">${PSTATUS[p.status][0]} ${PSTATUS[p.status][1]}${p.pitch ? ' · ' + esc(p.pitch) : ''}</div></div>
    <button class="link" data-act="editProject" data-id="${p.id}">Editar</button></div>`;
  return head + seg + ({ resumen: projResumen, pasos: projPasos, dinero: projDinero, gente: projGente, ideas: projIdeas })[projTab](p);
}
function projResumen(p) {
  const steps = p.tasks || [], done = steps.filter(s => s.done).length, next = steps.find(s => !s.done);
  const money = p.money || [];
  const inc = money.filter(m => m.type === 'ingreso').reduce((a, m) => a + m.amount, 0), exp = money.filter(m => m.type === 'gasto').reduce((a, m) => a + m.amount, 0);
  const mk = mkey();
  const monthProfit = money.filter(m => m.date.startsWith(mk)).reduce((a, m) => a + (m.type === 'ingreso' ? m.amount : -m.amount), 0);
  const c = p.canvas || {};
  const filled = ['problema', 'cliente', 'solucion', 'dinero', 'diferencia'].filter(k => c[k]).length;
  return `
    <div class="card"><h2>Números</h2><div class="stats">
      <div class="stat"><div class="lbl">Ganancia total</div><div class="val ${inc - exp < 0 ? 'neg' : 'pos'}">${mxn(r2(inc - exp))}</div></div>
      <div class="stat"><div class="lbl">Este mes</div><div class="val ${monthProfit < 0 ? 'neg' : ''}">${mxn(r2(monthProfit))}</div></div>
      <div class="stat"><div class="lbl">Pasos</div><div class="val">${done}/${steps.length}</div></div></div>
      ${p.target ? `<div class="small" style="margin-top:8px">Meta de ganancia mensual: <b>${mxn(p.target)}</b> · llevas ${Math.max(0, Math.round(monthProfit / p.target * 100))}%</div><div class="bar"><i style="width:${Math.min(100, Math.max(0, monthProfit / p.target * 100))}%;background:var(--green)"></i></div>` : ''}
    </div>
    ${next ? `<div class="card"><h2>👉 Siguiente paso</h2><ul class="list">${projStepRow(p, next)}</ul></div>` : ''}
    <div class="card"><h2>Lienzo del negocio <span class="small">${filled}/5</span></h2>
      <div class="small" style="margin-bottom:8px">Contesta estas 5 preguntas para aterrizar la idea. Si no puedes contestarlas, todavía está en etapa de idea.</div>
      <form id="canvas">
        ${[['problema', '¿Qué problema resuelve?'], ['cliente', '¿Quién paga? (tu cliente ideal)'], ['solucion', '¿Qué ofreces exactamente?'], ['dinero', '¿Cómo ganas dinero? (precio, costo, margen)'], ['diferencia', '¿Por qué te elegirían a ti?']]
          .map(([k, l]) => `<label class="field"><span>${l}</span><textarea name="${k}" style="min-height:56px">${esc(c[k] || '')}</textarea></label>`).join('')}
        <button class="btn ghost block">Guardar lienzo</button>
      </form>
    </div>`;
}
function projStepRow(p, s) {
  const late = !s.done && s.due && s.due < today();
  return `<li><button class="check ${s.done ? 'on' : ''}" data-act="projStep" data-id="${s.id}"></button>
    <div class="grow" data-act="projStepEdit" data-id="${s.id}"><div class="t" style="${s.done ? 'text-decoration:line-through;opacity:.5' : ''}">${esc(s.title)}</div>${s.due ? `<div class="s ${late ? 'neg' : ''}">${ddmm(s.due)}${late ? ' (atrasado)' : ''}</div>` : ''}</div></li>`;
}
function projPasos(p) {
  const steps = p.tasks || [];
  return `<div class="card">${steps.length ? `<ul class="list">${steps.map(s => projStepRow(p, s)).join('')}</ul>` : '<div class="empty">Divide el proyecto en pasos concretos.<br>Ej. "Hacer 10 muestras", "Abrir página de Instagram", "Conseguir 3 clientes".</div>'}</div>
    <button class="fab" data-act="projStepAdd" aria-label="Nuevo paso">+</button>`;
}
function projDinero(p) {
  const money = [...(p.money || [])].sort((a, b) => b.date.localeCompare(a.date));
  const byMonth = {};
  for (const m of p.money || []) { const k = m.date.slice(0, 7); byMonth[k] ||= [0, 0]; byMonth[k][m.type === 'ingreso' ? 0 : 1] += m.amount; }
  const months = Object.entries(byMonth).sort(([a], [b]) => b.localeCompare(a)).slice(0, 6);
  return `
    ${months.length ? `<div class="card"><h2>Por mes</h2><ul class="list">${months.map(([k, [i, g]]) => `<li><div class="grow"><div class="t">${monthName(k)}</div><div class="s">Vendiste ${mxn(r2(i))} · Gastaste ${mxn(r2(g))}</div></div><div class="amt ${i - g < 0 ? 'neg' : 'pos'}">${mxn(r2(i - g))}</div></li>`).join('')}</ul></div>` : ''}
    <div class="card"><h2>Movimientos</h2>${money.length ? `<ul class="list">${money.map(m => `
      <li data-act="projMoneyEdit" data-id="${m.id}"><div class="emoji">${m.type === 'ingreso' ? '💰' : '🧾'}</div><div class="grow"><div class="t">${esc(m.note || (m.type === 'ingreso' ? 'Venta' : 'Gasto'))}</div><div class="s">${ddmm(m.date)}</div></div>
      <div class="amt ${m.type === 'ingreso' ? 'pos' : ''}">${m.type === 'ingreso' ? '+' : '−'}${mxn(m.amount)}</div></li>`).join('')}</ul>` : '<div class="empty">Anota ventas y gastos del negocio para saber tu ganancia real.<br>Esto va aparte de tus finanzas personales.</div>'}</div>
    <div class="row"><button class="btn ghost" data-act="projMoneyAdd" data-id="ingreso">+ Venta</button><button class="btn ghost" data-act="projMoneyAdd" data-id="gasto">+ Gasto</button></div>`;
}
function projGente(p) {
  const people = p.people || [];
  return `<div class="card">${people.length ? `<ul class="list">${people.map(c => `
    <li data-act="projPersonEdit" data-id="${c.id}"><div class="emoji">${c.role === 'proveedor' ? '🏭' : c.role === 'socio' ? '🤝' : '🧑'}</div><div class="grow"><div class="t">${esc(c.name)}</div><div class="s">${cap(c.role || 'cliente')}${c.phone ? ' · ' + esc(c.phone) : ''}${c.note ? ' · ' + esc(c.note) : ''}</div></div>
    ${c.phone ? `<a class="link" href="https://wa.me/${esc(c.phone.replace(/\D/g, ''))}" target="_blank" rel="noopener" onclick="event.stopPropagation()">WhatsApp</a>` : ''}</li>`).join('')}</ul>` : '<div class="empty">Guarda clientes, proveedores y socios con su teléfono y notas.</div>'}</div>
    <button class="fab" data-act="projPersonAdd" aria-label="Agregar persona">+</button>`;
}
function projIdeas(p) {
  const ideas = [...(p.ideas || [])].sort((a, b) => b.created - a.created);
  return `<form class="card" id="ideaform" style="display:flex;gap:8px"><input name="t" class="search" style="margin:0;flex:1" placeholder="Anota una idea rápida…" maxlength="200"><button class="btn">+</button></form>
    <div class="card">${ideas.length ? `<ul class="list">${ideas.map(i => `<li><div class="grow"><div class="t" style="white-space:normal">💡 ${esc(i.text)}</div><div class="s">${new Date(i.created).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}</div></div>
      <button class="link" data-act="projIdeaToStep" data-id="${i.id}">→ Paso</button><button class="link" style="color:var(--muted)" data-act="projIdeaDel" data-id="${i.id}">✕</button></li>`).join('')}</ul>` : '<div class="empty">Ideas de productos, promociones, mejoras… Cuando una valga la pena, conviértela en paso.</div>'}</div>`;
}
function mountProyecto(v) {
  const p = db.projects.find(x => x.id === projId); if (!p) return;
  $('#canvas', v)?.addEventListener('submit', e => {
    e.preventDefault(); const f = e.target;
    p.canvas = Object.fromEntries(['problema', 'cliente', 'solucion', 'dinero', 'diferencia'].map(k => [k, f[k].value.trim()]));
    save(); render(); toast('Lienzo guardado');
  });
  $('#ideaform', v)?.addEventListener('submit', e => {
    e.preventDefault(); const t = e.target.t.value.trim(); if (!t) return;
    (p.ideas ||= []).push({ id: uid(), text: t, created: Date.now() }); save(); render();
  });
}
const curProj = () => db.projects.find(x => x.id === projId);

const PROJ_EMOJIS = ['🚀', '🏪', '🍔', '👕', '💻', '📱', '🎨', '📸', '🚗', '🏠', '💄', '🎵', '📦', '🧁', '💪', '🌮'];
function openProject(id) {
  const p = id ? db.projects.find(x => x.id === id) : null;
  let emoji = p?.emoji || '🚀', status = p?.status || 'idea';
  openSheet(`
    <h3>${p ? 'Editar proyecto' : 'Nuevo proyecto o negocio'}</h3>
    <form id="f">
      <label class="field"><span>Nombre</span><input name="name" maxlength="50" placeholder="Ej. Venta de postres, Tienda en línea" value="${esc(p?.name || '')}" required></label>
      <label class="field"><span>En una frase, ¿qué es?</span><input name="pitch" maxlength="100" placeholder="Ej. Pasteles por pedido para fiestas" value="${esc(p?.pitch || '')}"></label>
      <div class="field"><span>Etapa</span><div class="catpick" id="st" style="grid-template-columns:repeat(5,1fr)">${Object.entries(PSTATUS).map(([k, [e, l]]) => `<button type="button" data-s="${k}" class="${k === status ? 'on' : ''}"><b>${e}</b>${l}</button>`).join('')}</div></div>
      <div class="field"><span>Ícono</span><div class="catpick" id="emo" style="grid-template-columns:repeat(8,1fr)">${PROJ_EMOJIS.map(e => `<button type="button" data-e="${e}" class="${e === emoji ? 'on' : ''}"><b>${e}</b></button>`).join('')}</div></div>
      <label class="field"><span>Meta de ganancia al mes (opcional)</span><input name="target" type="number" inputmode="decimal" min="0" value="${p?.target || ''}"></label>
      ${p ? '' : `<label class="field"><span>Primeros pasos (uno por renglón, opcional)</span><textarea name="steps" style="min-height:90px" placeholder="Investigar precios&#10;Hacer prueba&#10;Conseguir primer cliente"></textarea></label>`}
      <button class="btn block">Guardar</button>
      ${p ? `<button type="button" class="btn danger block" id="del">Eliminar proyecto</button>` : ''}
    </form>`, s => {
    const f = $('#f', s);
    $('#st', s).addEventListener('click', e => { const b = e.target.closest('[data-s]'); if (!b) return; status = b.dataset.s; s.querySelectorAll('#st button').forEach(x => x.classList.toggle('on', x === b)); });
    $('#emo', s).addEventListener('click', e => { const b = e.target.closest('[data-e]'); if (!b) return; emoji = b.dataset.e; s.querySelectorAll('#emo button').forEach(x => x.classList.toggle('on', x === b)); });
    f.addEventListener('submit', e => {
      e.preventDefault();
      const data = { name: f.name.value.trim(), pitch: f.pitch.value.trim(), status, emoji, target: +f.target.value || 0 };
      if (p) Object.assign(p, data);
      else {
        const np = { id: uid(), created: Date.now(), tasks: [], money: [], people: [], ideas: [], canvas: {}, ...data };
        np.tasks = (f.steps?.value || '').split('\n').map(x => x.trim()).filter(Boolean).map(t => ({ id: uid(), title: t, done: false }));
        db.projects.push(np); projId = np.id; projTab = 'resumen';
        save(); closeSheet(); go('proyecto'); return;
      }
      save(); closeSheet(); render(); toast('Guardado');
    });
    $('#del', s)?.addEventListener('click', async () => {
      if (!(await ask(`¿Eliminar "${p.name}" con todo su contenido?`))) return;
      db.projects = db.projects.filter(x => x.id !== id); save(); closeSheet(); go('proyectos');
    });
  });
}
function openProjStep(sid) {
  const p = curProj(); const st = sid ? p.tasks.find(x => x.id === sid) : null;
  openSheet(`<h3>${st ? 'Editar paso' : 'Nuevo paso'}</h3><form id="f">
    <label class="field"><span>Paso</span><input name="t" maxlength="100" value="${esc(st?.title || '')}" required></label>
    <label class="field"><span>Para cuándo (opcional)</span><input name="due" type="date" value="${st?.due || ''}"></label>
    <button class="btn block">Guardar</button>${st ? '<button type="button" class="btn danger block" id="del">Eliminar</button>' : ''}</form>`, s => {
    const f = $('#f', s); if (!st) setTimeout(() => f.t.focus(), 250);
    f.addEventListener('submit', e => { e.preventDefault(); const d = { title: f.t.value.trim(), due: f.due.value }; if (st) Object.assign(st, d); else p.tasks.push({ id: uid(), done: false, ...d }); save(); closeSheet(); render(); });
    $('#del', s)?.addEventListener('click', () => { p.tasks = p.tasks.filter(x => x.id !== sid); save(); closeSheet(); render(); });
  });
}
function openProjMoney(mid, type = 'ingreso') {
  const p = curProj(); const m = mid ? p.money.find(x => x.id === mid) : null; type = m?.type || type;
  openSheet(`<h3>${type === 'ingreso' ? 'Venta / ingreso' : 'Gasto del negocio'}</h3><form id="f">
    <label class="field"><span>Monto</span><input class="big-amount" name="amount" type="number" inputmode="decimal" step="0.01" min="0" value="${m?.amount ?? ''}" required></label>
    <label class="field"><span>Concepto</span><input name="note" maxlength="80" placeholder="${type === 'ingreso' ? 'Ej. Pastel para Ana' : 'Ej. Material, envío, publicidad'}" value="${esc(m?.note || '')}"></label>
    <label class="field"><span>Fecha</span><input name="date" type="date" value="${m?.date || today()}" required></label>
    <button class="btn block">Guardar</button>${m ? '<button type="button" class="btn danger block" id="del">Eliminar</button>' : ''}</form>`, s => {
    const f = $('#f', s); if (!m) setTimeout(() => f.amount.focus(), 250);
    f.addEventListener('submit', e => { e.preventDefault(); const a = r2(+f.amount.value); if (!(a > 0)) return; const d = { type, amount: a, note: f.note.value.trim(), date: f.date.value }; if (m) Object.assign(m, d); else p.money.push({ id: uid(), ...d }); save(); closeSheet(); render(); toast('Guardado'); });
    $('#del', s)?.addEventListener('click', () => { p.money = p.money.filter(x => x.id !== mid); save(); closeSheet(); render(); });
  });
}
function openProjPerson(cid) {
  const p = curProj(); const c = cid ? p.people.find(x => x.id === cid) : null; let role = c?.role || 'cliente';
  openSheet(`<h3>${c ? 'Editar contacto' : 'Nuevo contacto'}</h3><form id="f">
    <div class="seg" id="role">${['cliente', 'proveedor', 'socio'].map(r => `<button type="button" data-r="${r}" class="${r === role ? 'on' : ''}">${cap(r)}</button>`).join('')}</div>
    <label class="field"><span>Nombre</span><input name="name" maxlength="60" value="${esc(c?.name || '')}" required></label>
    <label class="field"><span>Teléfono / WhatsApp</span><input name="phone" type="tel" inputmode="tel" maxlength="20" value="${esc(c?.phone || '')}"></label>
    <label class="field"><span>Nota</span><input name="note" maxlength="100" placeholder="Qué compra, cuánto debe, preferencias…" value="${esc(c?.note || '')}"></label>
    <button class="btn block">Guardar</button>${c ? '<button type="button" class="btn danger block" id="del">Eliminar</button>' : ''}</form>`, s => {
    const f = $('#f', s);
    $('#role', s).addEventListener('click', e => { const b = e.target.closest('[data-r]'); if (!b) return; role = b.dataset.r; s.querySelectorAll('#role button').forEach(x => x.classList.toggle('on', x === b)); });
    f.addEventListener('submit', e => { e.preventDefault(); const d = { role, name: f.name.value.trim(), phone: f.phone.value.trim(), note: f.note.value.trim() }; if (c) Object.assign(c, d); else p.people.push({ id: uid(), ...d }); save(); closeSheet(); render(); });
    $('#del', s)?.addEventListener('click', () => { p.people = p.people.filter(x => x.id !== cid); save(); closeSheet(); render(); });
  });
}

/* ---------------- Tarjetas para Inicio ---------------- */
function moreHomeCards() {
  const t = today();
  const urgent = db.tasks.filter(x => !x.done && (x.prio === 'alta' || (x.due && x.due <= t))).sort(sortTasks).slice(0, 4);
  const dates = upcomingDates(14).slice(0, 3);
  const noJournal = !db.journal[t] && new Date().getHours() >= 19;
  let out = '';
  if (urgent.length) out += `<div class="card"><h2>Pendientes importantes <button class="link" data-act="go" data-id="tareas">Ver todos</button></h2><ul class="list">${urgent.map(taskRow).join('')}</ul></div>`;
  if (dates.length) out += `<div class="card"><h2>Fechas próximas <button class="link" data-act="go" data-id="fechas">Ver</button></h2><ul class="list">${dates.map(x => `<li><div class="emoji">${(DKINDS[x.kind] || DKINDS.otro)[0]}</div><div class="grow"><div class="t">${esc(x.title)}</div><div class="s">${ddmm(x.next)}</div></div><div class="amt ${x.left <= 3 ? 'neg' : ''}" style="font-size:13px">${leftTxt(x.left)}</div></li>`).join('')}</ul></div>`;
  if (noJournal) out += `<button class="card install" style="width:100%;text-align:left;border-style:dashed" data-act="go" data-id="diario"><b>📔 ¿Cómo te fue hoy?</b><div class="small">Escribe tu entrada del diario y lo que aprendiste.</div></button>`;
  if (wday() === 6 || wday() === 0) out += `<button class="card" style="width:100%;text-align:left;border:0" data-act="go" data-id="revision"><b>📊 Tu revisión semanal está lista</b><div class="small">Mira cómo te fue esta semana.</div></button>`;
  return out;
}

/* ---------------- Exportes a app.js ---------------- */
const MORE_VIEWS = { mas: viewMas, tareas: viewTareas, salud: viewSalud, diario: viewDiario, fechas: viewFechas, revision: viewRevision, proyectos: viewProyectos, proyecto: viewProyecto };
const MORE_MOUNT = { salud: mountSalud, diario: mountDiario, revision: mountRevision, proyecto: mountProyecto };
const MORE_ACTIONS = {
  taskView: id => { taskView = id; render(); },
  toggleDoneTasks: () => { showDoneTasks = !showDoneTasks; render(); },
  addTask: () => taskView === 'metas' ? openGoal() : openTask(),
  editTask: id => openTask(id),
  toggleTask: id => toggleTask(id),
  addGoal: () => openGoal(),
  editGoal: id => openGoal(id),
  toggleStep: id => toggleStep(id),
  addStep: id => addStep(id),
  healthDay: n => { const k = dkey(addDays(parseD(healthDay || today()), +n)); healthDay = k > today() ? today() : k; render(); },
  journalDay: n => { const k = dkey(addDays(parseD(journalDay || today()), +n)); journalDay = k > today() ? today() : k; render(); },
  journalOpen: d => { journalDay = d; render(); window.scrollTo(0, 0); },
  addDate: () => openDate(),
  editDate: id => openDate(id),
  reviewWeek: n => { reviewMon = dkey(addDays(parseD(reviewMon || weekMon(today())), +n)); render(); },
  addProject: () => openProject(),
  editProject: id => openProject(id),
  openProject: id => { projId = id; projTab = 'resumen'; go('proyecto'); },
  projTab: id => { projTab = id; render(); },
  projStep: sid => { const s = curProj()?.tasks.find(x => x.id === sid); if (!s) return; s.done = !s.done; s.doneDay = s.done ? today() : null; save(); render(); },
  projStepEdit: sid => openProjStep(sid),
  projStepAdd: () => openProjStep(),
  projMoneyAdd: t => openProjMoney(null, t),
  projMoneyEdit: id => openProjMoney(id),
  projPersonAdd: () => openProjPerson(),
  projPersonEdit: id => openProjPerson(id),
  projIdeaDel: id => { const p = curProj(); p.ideas = p.ideas.filter(x => x.id !== id); save(); render(); },
  projIdeaToStep: id => { const p = curProj(); const i = p.ideas.find(x => x.id === id); if (!i) return; p.tasks.push({ id: uid(), title: i.text, done: false }); p.ideas = p.ideas.filter(x => x.id !== id); save(); render(); toast('Ahora es un paso'); },
};
