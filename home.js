'use strict';
/* ============ Pantalla de Inicio ============ (se carga después de habits.js y antes de app.js) */

function homeQuick() {
  const items = [
    ['addTx', 'gasto', '💸', 'Gasto'], ['addTx', 'ingreso', '💰', 'Ingreso'], ['addTask', '', '✅', 'Tarea'], ['addNote', '', '📝', 'Nota'],
    ['go', 'salud', '❤️', 'Salud'], ['go', 'diario', '📔', 'Diario'], ['go', 'ejercicio', '🏋️', 'Ejercicio'], ['go', 'enfoque', '🍅', 'Enfoque'],
  ];
  return `<div class="quick4">${items.map(([a, id, e, l]) => `<button data-act="${a}" data-id="${id}"><b>${e}</b>${l}</button>`).join('')}</div>`;
}

function homeHabits() {
  const t = today();
  if (!db.habits.length) return `<div class="card"><h2>Hábitos de hoy</h2><div class="empty">Aún no tienes hábitos.<br><button class="link" data-act="addHabit">+ Crear mi primer hábito</button></div></div>`;
  const done = db.habits.filter(h => h.log[t]).length;
  return `<div class="card">
    <h2>Hábitos de hoy <button class="link badge" data-act="go" data-id="habitos">${done} / ${db.habits.length} hechos</button></h2>
    <div class="hchips">${db.habits.map(h => `<button class="hchip ${h.log[t] ? 'on' : ''}" data-act="habit" data-id="${h.id}" aria-label="Marcar ${esc(h.name)}"><i></i><span>${esc(h.emoji || '')} ${esc(h.name)}</span></button>`).join('')}</div>
  </div>`;
}

function homeMoney() {
  const t = today(), mon = weekMon(t), max = budgetFor(mon), left = r2(max - weekSpent(mon));
  const mk = mkey();
  const exp = db.tx.filter(x => x.date.startsWith(mk) && x.type === 'gasto' && !['deudas', 'ajuste', 'ahorro'].includes(x.cat)).reduce((a, x) => a + x.amount, 0);
  const nextInc = db.plan.items.filter(i => i.kind === 'ingreso' && !i.done && i.date >= t).sort((a, b) => a.date.localeCompare(b.date))[0];
  return `<div class="card">
    <h2>Dinero <button class="link" data-act="go" data-id="finanzas">Finanzas</button></h2>
    <div class="stats">
      <div class="stat"><div class="lbl">Dinero hoy</div><div class="val">${mxn(planCash())}</div></div>
      <div class="stat"><div class="lbl">Puedes gastar</div><div class="val ${left < 0 ? 'neg' : 'pos'}">${mxn(Math.max(0, left))}</div></div>
      <div class="stat"><div class="lbl">Gastos del mes</div><div class="val">${mxn(r2(exp))}</div></div>
    </div>
    ${max ? `<div class="bar ${left < 0 ? 'over' : left < max * .2 ? 'warn' : ''}"><i style="width:${Math.min(100, (max - Math.max(0, left)) / max * 100)}%"></i></div>` : ''}
    ${nextInc ? `<div class="small" style="margin-top:8px">Próximo ingreso: <b>${esc(nextInc.name)} ${mxn(nextInc.amount)}</b> ${nextInc.date === t ? 'hoy' : 'el ' + shortD(nextInc.date)}</div>` : ''}
  </div>`;
}

function homeTasksGoals() {
  const t = today();
  const tasks = db.tasks.filter(x => !x.done).sort(sortTasks);
  const top = tasks.filter(x => x.prio === 'alta' || (x.due && x.due <= t));
  const show = (top.length ? top : tasks).slice(0, 4);
  const goals = db.goals.map(g => ({ g, next: g.steps.find(s => !s.done), done: g.steps.filter(s => s.done).length })).filter(x => x.next).slice(0, 2);
  if (!show.length && !goals.length) return `<div class="card"><h2>Pendientes y metas</h2><div class="empty">Sin pendientes. <button class="link" data-act="addTask">+ Agregar tarea</button></div></div>`;
  return `<div class="card">
    <h2>Pendientes y metas <button class="link" data-act="go" data-id="tareas">${tasks.length} pendientes · Ver</button></h2>
    ${show.length ? `<ul class="list">${show.map(taskRow).join('')}</ul>` : ''}
    ${goals.map(({ g, next, done }) => `<div class="goal-mini" data-act="go" data-id="tareas">
      <div class="top"><span>🎯 <b>${esc(g.title)}</b></span><span class="small">${done}/${g.steps.length}</span></div>
      <div class="bar" style="margin:4px 0"><i style="width:${g.steps.length ? done / g.steps.length * 100 : 0}%;background:var(--green)"></i></div>
      <div class="small">Siguiente paso: ${esc(next.title)}</div></div>`).join('')}
  </div>`;
}

function homeHealth() {
  const h = db.health[today()];
  if (!h) return `<button class="card prompt" data-act="go" data-id="salud"><span class="emoji">❤️</span><span><b>¿Cómo te sientes hoy?</b><small>Registra tu ánimo, sueño, agua y comida.</small></span></button>`;
  return `<button class="card prompt" data-act="go" data-id="salud"><span class="emoji">${h.mood ? MOODS[h.mood - 1] : '❤️'}</span>
    <span><b>Salud de hoy</b><small>${[h.mood ? MOOD_TXT[h.mood - 1] : '', h.sleep != null ? `😴 ${h.sleep} h` : '', h.water ? `💧 ${h.water} vasos` : '', h.weight ? `⚖️ ${h.weight} kg` : ''].filter(Boolean).join(' · ') || 'Toca para completar'}</small></span></button>`;
}

function homeProjects() {
  const act = db.projects.filter(p => ['activo', 'validando'].includes(p.status)).slice(0, 3);
  if (!act.length) return '';
  const mk = mkey();
  return `<div class="card"><h2>Proyectos <button class="link" data-act="go" data-id="proyectos">Ver</button></h2>
    <ul class="list">${act.map(p => {
      const next = (p.tasks || []).find(s => !s.done);
      const mp = r2((p.money || []).filter(m => m.date.startsWith(mk)).reduce((a, m) => a + (m.type === 'ingreso' ? m.amount : -m.amount), 0));
      return `<li data-act="openProject" data-id="${p.id}"><div class="emoji">${esc(p.emoji || '🚀')}</div>
        <div class="grow"><div class="t">${esc(p.name)}</div><div class="s">${next ? 'Siguiente: ' + esc(next.title) : PSTATUS[p.status][1]}</div></div>
        ${(p.money || []).length ? `<div class="amt ${mp < 0 ? 'neg' : 'pos'}" style="font-size:14px">${mxn(mp)}<div class="small" style="text-align:right;font-weight:400">este mes</div></div>` : ''}</li>`;
    }).join('')}</ul></div>`;
}

function homeDates() {
  const dates = upcomingDates(14).slice(0, 3);
  if (!dates.length) return '';
  return `<div class="card"><h2>Fechas próximas <button class="link" data-act="go" data-id="fechas">Ver</button></h2><ul class="list">${dates.map(x => `
    <li><div class="emoji">${(DKINDS[x.kind] || DKINDS.otro)[0]}</div><div class="grow"><div class="t">${esc(x.title)}</div><div class="s">${ddmm(x.next)}</div></div>
    <div class="amt ${x.left <= 3 ? 'neg' : ''}" style="font-size:13px">${leftTxt(x.left)}</div></li>`).join('')}</ul></div>`;
}

function homeReflect() {
  const t = today(), out = [];
  const hr = new Date().getHours();
  if (wday() >= 5) out.push(`<button class="card prompt" data-act="go" data-id="revision"><span class="emoji">📊</span><span><b>Tu revisión semanal está lista</b><small>Mira cómo te fue esta semana.</small></span></button>`);
  const focus = db.reviews?.[dkey(addDays(parseD(weekMon(t)), -7))]?.focus;
  if (focus) out.push(`<div class="card priority"><div class="pri-head"><span class="pri-ico">⚑</span>Prioridad de la semana</div><div class="pri-t">${esc(focus)}</div></div>`);
  return out.join('');
}

function homeNotes() {
  const notes = [...db.notes].sort((a, b) => (b.pinned - a.pinned) || (b.updated - a.updated)).slice(0, 2);
  if (!notes.length) return '';
  return `<div class="card"><h2>Notas recientes <button class="link badge" data-act="go" data-id="notas">Ver todas</button></h2><div class="notes">${notes.map(n => `
    <button class="note" data-act="editNote" data-id="${n.id}"><span class="t">${n.pinned ? '📌 ' : ''}${esc(n.title || 'Sin título')}</span><span class="b">${esc(n.body.slice(0, 80))}</span></button>`).join('')}</div></div>`;
}

function viewInicioNew() {
  const now = new Date(), h = now.getHours();
  const saludo = h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches';
  const name = db.settings.name ? `, ${esc(db.settings.name)}` : '';
  const isStandalone = window.navigator.standalone || matchMedia('(display-mode: standalone)').matches;
  let hideInstall = false; try { hideInstall = localStorage.getItem('mivida.hideInstall') === '1'; } catch {}
  const install = (!isStandalone && !hideInstall) ? `
    <div class="card install">
      <h2>Instálala en tu iPhone <button class="link" data-act="hideInstall">Ocultar</button></h2>
      <div class="small">En Safari toca <b>Compartir</b> (el cuadro con la flecha ↑), luego <b>Agregar a pantalla de inicio</b> y <b>Agregar</b>. Se abrirá como app y funciona sin internet.</div>
    </div>` : '';
  return `
    <p class="greet">${saludo}${name} · ${cap(now.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' }))}</p>
    ${homeQuote()}
    ${install}
    ${homeFocusCard()}
    ${gameHomeCard()}
    ${homeQuick()}
    ${agendaCard()}
    ${homeHabits()}
    ${homeTasksGoals()}
    ${homeMoney()}
    ${homeBillsCard()}
    ${homeHealth()}
    ${homeProjects()}
    ${homeDates()}
    ${homeReflect()}
    ${homeNotes()}`;
}

Object.assign(MORE_VIEWS, { inicio: viewInicioNew });
