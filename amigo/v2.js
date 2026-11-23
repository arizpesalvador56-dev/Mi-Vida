'use strict';
/* ============ Mejoras de la revisión: Check-in del día, cuadre del domingo, Más por grupos, Inicio personalizable ============
   (se carga después de extras.js y antes de app.js) */

/* ---------- Check-in del día (Salud + Diario) ---------- */
let checkinDay = null;
function viewCheckin() {
  const k = checkinDay || today();
  const h = db.health[k] || {}, j = db.journal[k] || {};
  const doneH = db.health[k] != null, doneJ = db.journal[k] != null;
  let streakN = 0; for (let d = new Date(); db.health[dkey(d)] || db.journal[dkey(d)]; d = addDays(d, -1)) streakN++;
  return `
    <div class="monthnav">
      <button data-act="checkinDay" data-id="-1" aria-label="Día anterior">‹</button>
      <strong>${k === today() ? 'Hoy' : fmtDay(k)}</strong>
      <button data-act="checkinDay" data-id="1" aria-label="Día siguiente" ${k >= today() ? 'disabled style="opacity:.3"' : ''}>›</button>
    </div>
    ${streakN > 1 ? `<div class="small" style="text-align:center;margin:-4px 0 10px">🔥 ${streakN} días seguidos haciendo tu check-in</div>` : ''}
    <form id="cform">
      <div class="card">
        <h2>❤️ Cómo estás ${doneH ? '<span class="small pos">✓</span>' : ''}</h2>
        <div class="field"><span>¿Cómo te sientes?</span>
          <div class="moods">${MOODS.map((m, i) => `<button type="button" data-m="${i + 1}" class="${h.mood == i + 1 ? 'on' : ''}" aria-label="${MOOD_TXT[i]}">${m}</button>`).join('')}</div></div>
        <div class="row2">
          <label class="field"><span>Horas de sueño</span><input name="sleep" type="number" inputmode="decimal" step="0.5" min="0" max="24" value="${h.sleep ?? ''}" placeholder="7.5"></label>
          <label class="field"><span>Peso (opcional)</span><input name="weight" type="number" inputmode="decimal" step="0.1" min="0" value="${h.weight ?? ''}" placeholder="kg"></label>
        </div>
        <div class="field" style="margin:0"><span>Vasos de agua</span>
          <div class="counter"><button type="button" data-w="-1">−</button><b id="water">${h.water || 0}</b><button type="button" data-w="1">+</button></div></div>
      </div>
      <div class="card">
        <h2>📔 Tu día ${doneJ ? '<span class="small pos">✓</span>' : ''}</h2>
        <label class="field"><span>¿Cómo te fue hoy?</span><textarea name="text" style="min-height:100px" placeholder="Lo que pasó, cómo te sentiste…">${esc(j.text || '')}</textarea></label>
        <label class="field"><span>💡 ¿Qué aprendí hoy?</span><textarea name="learned" style="min-height:60px">${esc(j.learned || '')}</textarea></label>
        <label class="field" style="margin:0"><span>🙏 Algo por lo que estoy agradecido</span><input name="grateful" maxlength="140" value="${esc(j.grateful || '')}"></label>
      </div>
      <button class="btn block" style="margin-bottom:14px">Guardar check-in</button>
    </form>
    <div class="row">
      <button class="btn ghost" data-act="go" data-id="salud">📈 Tendencias de salud</button>
      <button class="btn ghost" data-act="go" data-id="diario">📚 Diario anterior</button>
    </div>`;
}
function mountCheckin(v) {
  const f = $('#cform', v); if (!f) return;
  const k = checkinDay || today();
  let mood = db.health[k]?.mood || null, water = db.health[k]?.water || 0;
  f.querySelector('.moods').addEventListener('click', e => { const b = e.target.closest('[data-m]'); if (!b) return; mood = +b.dataset.m; f.querySelectorAll('.moods button').forEach(x => x.classList.toggle('on', x === b)); });
  f.querySelector('.counter').addEventListener('click', e => { const b = e.target.closest('[data-w]'); if (!b) return; water = Math.max(0, water + +b.dataset.w); $('#water', f).textContent = water; });
  f.addEventListener('submit', e => {
    e.preventDefault();
    const num = x => x.value === '' ? null : +x.value;
    const hd = { ...(db.health[k] || {}), mood, water, sleep: num(f.sleep), weight: num(f.weight) };
    if (hd.mood || hd.water || hd.sleep != null || hd.weight != null) db.health[k] = hd;
    const jd = { text: f.text.value.trim(), learned: f.learned.value.trim(), grateful: f.grateful.value.trim() };
    if (jd.text || jd.learned || jd.grateful) db.journal[k] = jd; else delete db.journal[k];
    save(); render(); toast('Check-in guardado ✅');
  });
}
function homeCheckin() {
  const t = today(), h = db.health[t], j = db.journal[t];
  if (h && j) return `<button class="card prompt" data-act="go" data-id="checkin"><span class="emoji">${h.mood ? MOODS[h.mood - 1] : '✅'}</span>
    <span><b>Check-in de hoy ✓</b><small>${[h.sleep != null ? `😴 ${h.sleep} h` : '', h.water ? `💧 ${h.water}` : '', j.learned ? `💡 ${esc(j.learned)}` : ''].filter(Boolean).join(' · ') || 'Listo por hoy'}</small></span></button>`;
  const hr = new Date().getHours();
  return `<button class="card prompt" data-act="go" data-id="checkin" ${hr >= 18 ? 'style="border:2px dashed var(--accent)"' : ''}><span class="emoji">${h?.mood ? MOODS[h.mood - 1] : '📝'}</span>
    <span><b>${h || j ? 'Termina tu check-in' : hr >= 18 ? '¿Cómo te fue hoy?' : 'Check-in del día'}</b><small>Ánimo, sueño, agua, tu día y lo que aprendiste.</small></span></button>`;
}

/* ---------- Cuadre del domingo ---------- */
function reconcileDue() { return wday() === 6 && db.settings.lastReconcile !== weekMon(today()); }
function homeReconcile() {
  if (!reconcileDue()) return '';
  return `<form class="card" id="recon" style="border:2px solid var(--accent)">
    <h2>💵 Cuadre del domingo</h2>
    <div class="small" style="margin-bottom:8px">La app calcula que tienes <b>${mxn(planCash())}</b>. ¿Cuánto traes realmente entre efectivo y cuentas?</div>
    <div style="display:flex;gap:8px"><input name="a" class="search" style="margin:0;flex:1" type="number" inputmode="decimal" step="0.01" value="${planCash()}">
    <button class="btn">Cuadrar</button></div>
  </form>`;
}
function mountHome(v) {
  $('#recon', v)?.addEventListener('submit', e => {
    e.preventDefault();
    const real = r2(+e.target.a.value), cur = planCash(), diff = r2(real - cur);
    if (isNaN(real)) return;
    if (diff) db.tx.push({ id: uid(), created: Date.now(), type: diff > 0 ? 'ingreso' : 'gasto', cat: 'ajuste', amount: Math.abs(diff), note: 'Cuadre del domingo', date: today() });
    db.settings.lastReconcile = weekMon(today());
    db.settings.reconciles = (db.settings.reconciles || 0) + 1;
    save(); render();
    const P = projectPlan();
    toast(!diff ? '✅ Cuadra perfecto' : P.firstNeg ? `Ajustado ${diff > 0 ? '+' : ''}${mxn(diff)}. ⚠️ El ${shortD(P.firstNeg.date)} quedarías en ${mxn(P.firstNeg.amount)}` : `Ajustado ${diff > 0 ? '+' : ''}${mxn(diff)}. El plan sigue alcanzando`);
  });
}

/* ---------- Más por grupos ---------- */
function viewMasGrouped() {
  const G = gameState();
  const nextPay = db.plan.items.filter(i => i.kind === 'pago' && !i.done).sort((a, b) => a.date.localeCompare(b.date))[0];
  const t = today();
  const groups = [
    ['💰 Dinero', [
      ['deudas', '💳', 'Plan de deudas', nextPay ? `Próximo: ${nextPay.name} ${mxn(nextPay.amount)} el ${ddmm(nextPay.date)}` : 'Sin pagos pendientes'],
      ['pagos', '🧾', 'Pagos fijos y suscripciones', `${db.bills.length} registrados · ${mxn(r2(db.bills.reduce((a, b) => a + b.amount, 0)))} al mes`],
      ['ahorro', '🐷', 'Metas de ahorro', `${mxn(r2(db.savings.reduce((a, s) => a + saved(s), 0)))} ahorrados`],
    ]],
    ['🚀 Crecer', [
      ['tareas', '✅', 'Tareas y metas', `${db.tasks.filter(x => !x.done).length} pendientes · ${db.goals.length} metas`],
      ['proyectos', '🚀', 'Proyectos y negocios', `${db.projects.filter(p => p.status === 'activo').length} activos`],
      ['enfoque', '🍅', 'Enfoque (Pomodoro)', db.focusTimer ? 'Temporizador corriendo' : `${db.focus.filter(f => f.date === t).length} pomodoros hoy`],
    ]],
    ['❤️ Bienestar', [
      ['checkin', '📝', 'Check-in del día', db.health[t] && db.journal[t] ? 'Hoy ya lo hiciste ✓' : 'Ánimo, sueño, agua y tu día'],
      ['ejercicio', '🏋️', 'Ejercicio', db.activeWorkout ? 'Entreno en curso' : `${db.workouts.filter(w => w.date >= weekMon(t)).length} entrenos esta semana`],
    ]],
    ['🗂️ Organizar', [
      ['notas', '📝', 'Notas e ideas', `${db.notes.length} notas`],
      ['fechas', '📅', 'Fechas importantes', nextDatesLabel()],
      ['revision', '📊', 'Revisión semanal', 'Cómo te fue esta semana'],
    ]],
  ];
  const item = ([k, e, ti, s]) => `<button class="menu-item" data-act="go" data-id="${k}"><span class="emoji">${e}</span><span class="grow"><b>${ti}</b><small>${esc(s)}</small></span><span class="chev">›</span></button>`;
  const tile = ([k, e, ti, s]) => `<button class="mtile" data-act="go" data-id="${k}"><span class="emoji">${e}</span><b>${ti}</b><small>${esc(s)}</small></button>`;
  const a = xpForLevel(G.level), b = xpForLevel(G.level + 1);
  const ch = weekChallenges(weekMon(t));
  return `
    <div class="card tier">
      <div class="tier-top"><span class="lvl-badge">${G.level}</span>
        <span class="grow"><b>${levelTitle(G.level)}</b><small>Nivel ${G.level} · 🪙 ${G.coins} monedas</small></span>
        <button class="btn sm" data-act="go" data-id="logros">🎁 Premios</button></div>
      <div class="tier-xp"><span>Progreso XP</span><span><b>${G.xp - a}</b> / ${b - a}</span></div>
      <div class="bar"><i style="width:${(G.xp - a) / (b - a) * 100}%"></i></div>
      <button class="tier-ch" data-act="go" data-id="logros"><span class="emoji">🔥</span><span class="grow"><b>Retos semanales</b><small>${ch.filter(c => c.done).length} de ${ch.length} completados</small></span><span class="chev">›</span></button>
    </div>
    ${groups.map(([title, items], gi) => `<div class="menu-group"><h4>${title}<span>${items.length}</span></h4>${gi === 3 ? `<div class="mtiles">${items.map(tile).join('')}</div>` : `<div class="menu">${items.map(item).join('')}</div>`}</div>`).join('')}`;
}

/* ---------- Inicio personalizable ---------- */
const HOME_CARDS = [
  ['quote', 'Frase del día', () => homeQuote()],
  ['level', 'Tu nivel y retos', () => gameHomeCard()],
  ['quick', 'Botones rápidos', () => homeQuick()],
  ['agenda', 'Agenda de hoy', () => agendaCard()],
  ['habits', 'Hábitos de hoy', () => homeHabits()],
  ['tasks', 'Pendientes y metas', () => homeTasksGoals()],
  ['money', 'Dinero', () => homeMoney()],
  ['bills', 'Pagos fijos por llegar', () => homeBillsCard()],
  ['checkin', 'Check-in del día', () => homeCheckin()],
  ['projects', 'Proyectos', () => homeProjects()],
  ['dates', 'Fechas próximas', () => homeDates()],
  ['review', 'Revisión semanal y prioridad', () => homeReflect()],
  ['notes', 'Notas recientes', () => homeNotes()],
];
const HOME_DEFAULT_OFF = ['notes'];
function homeLayout() {
  const saved = db.settings.homeCards;
  const ids = HOME_CARDS.map(c => c[0]);
  if (!saved) return ids.map(id => ({ id, on: !HOME_DEFAULT_OFF.includes(id) }));
  const out = saved.filter(s => ids.includes(s.id));
  for (const id of ids) if (!out.some(s => s.id === id)) out.push({ id, on: true });
  return out;
}
function viewInicioV2() {
  const now = new Date(), h = now.getHours();
  const saludo = h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches';
  const name = db.settings.name ? `, ${esc(db.settings.name)}` : '';
  const isStandalone = window.navigator.standalone || matchMedia('(display-mode: standalone)').matches;
  let hideInstall = false; try { hideInstall = localStorage.getItem('mivida-amigo.hideInstall') === '1'; } catch {}
  const install = (!isStandalone && !hideInstall) ? `
    <div class="card install">
      <h2>Instálala en tu iPhone <button class="link" data-act="hideInstall">Ocultar</button></h2>
      <div class="small">En Safari toca <b>Compartir</b> (el cuadro con la flecha ↑), luego <b>Agregar a pantalla de inicio</b> y <b>Agregar</b>. Se abrirá como app y funciona sin internet.</div>
    </div>` : '';
  const map = Object.fromEntries(HOME_CARDS.map(c => [c[0], c[2]]));
  return `
    <div class="hello">
      <div><div class="hello-date">${now.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'short' })}</div>
      <div class="hello-t">${saludo}${name}</div></div>
      <button class="pill custom" data-act="customizeHome">⚙︎ Personalizar</button>
    </div>
    ${install}
    ${homeFocusCard()}
    ${homeReconcile()}
    ${homeLayout().filter(c => c.on).map(c => map[c.id]()).join('')}`;
}
function openCustomizeHome() {
  let layout = homeLayout();
  const names = Object.fromEntries(HOME_CARDS.map(c => [c[0], c[1]]));
  const draw = () => layout.map((c, i) => `<li>
    <button class="check ${c.on ? 'on' : ''}" data-tog="${i}" aria-label="Mostrar"></button>
    <div class="grow"><div class="t" style="${c.on ? '' : 'opacity:.5'}">${names[c.id]}</div></div>
    <button class="ord" data-up="${i}" ${i === 0 ? 'disabled' : ''} aria-label="Subir">↑</button>
    <button class="ord" data-down="${i}" ${i === layout.length - 1 ? 'disabled' : ''} aria-label="Bajar">↓</button></li>`).join('');
  openSheet(`<h3>Personalizar Inicio</h3>
    <p class="small">Palomea lo que quieres ver y acomódalo con las flechas.</p>
    <ul class="list" id="hc">${draw()}</ul>
    <div class="row" style="margin-top:12px"><button class="btn ghost" id="reset">Restablecer</button><button class="btn" id="ok">Guardar</button></div>`, s => {
    const box = $('#hc', s);
    box.addEventListener('click', e => {
      const t = e.target.closest('[data-tog]'), u = e.target.closest('[data-up]'), d = e.target.closest('[data-down]');
      if (t) layout[+t.dataset.tog].on = !layout[+t.dataset.tog].on;
      if (u) { const i = +u.dataset.up; [layout[i - 1], layout[i]] = [layout[i], layout[i - 1]]; }
      if (d) { const i = +d.dataset.down; [layout[i + 1], layout[i]] = [layout[i], layout[i + 1]]; }
      box.innerHTML = draw();
    });
    $('#reset', s).addEventListener('click', () => { delete db.settings.homeCards; layout = homeLayout(); box.innerHTML = draw(); });
    $('#ok', s).addEventListener('click', () => { db.settings.homeCards = layout; save(); closeSheet(); render(); toast('Inicio actualizado'); });
  });
}

/* ---------- Ajustes a botones rápidos y logros ---------- */
function homeQuick() {
  const items = [
    ['addTx', 'gasto', '💸', 'Gasto'], ['addTx', 'ingreso', '💰', 'Ingreso'], ['addTask', '', '✅', 'Tarea'], ['addNote', '', '📝', 'Nota'],
    ['go', 'checkin', '❤️', 'Check-in'], ['go', 'ejercicio', '🏋️', 'Ejercicio'], ['go', 'enfoque', '🍅', 'Enfoque'], ['go', 'proyectos', '🚀', 'Proyectos'],
  ];
  return `<div class="quick4">${items.map(([a, id, e, l]) => `<button data-act="${a}" data-id="${id}"><b>${e}</b>${l}</button>`).join('')}</div>`;
}
ACHIEVEMENTS.splice(ACHIEVEMENTS.findIndex(a => a.lvl), 0,
  { id: 'recon4', cat: 'Dinero', e: '⚖️', t: 'Cuentas claras', d: 'Haz 4 cuadres del domingo', tier: 'plata', p: () => [db.settings.reconciles || 0, 4] },
  { id: 'chk7', cat: 'Salud', e: '📝', t: 'Check-in constante', d: '7 días seguidos con check-in completo', tier: 'plata', p: () => [maxRun(Object.keys(db.health).filter(k => db.journal[k])), 7] },
);

/* ---------- Registro ---------- */
Object.assign(MORE_TITLES, { checkin: 'Check-in del día' });
Object.assign(MORE_PARENT, { checkin: 'mas', salud: 'checkin', diario: 'checkin' });
Object.assign(MORE_VIEWS, { checkin: viewCheckin, mas: viewMasGrouped, inicio: viewInicioV2 });
Object.assign(MORE_MOUNT, { checkin: mountCheckin, inicio: mountHome });
Object.assign(MORE_ACTIONS, {
  checkinDay: n => { const k = dkey(addDays(parseD(checkinDay || today()), +n)); checkinDay = k > today() ? today() : k; render(); },
  customizeHome: () => openCustomizeHome(),
});
