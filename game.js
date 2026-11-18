'use strict';
/* ============ Gamificación: XP, niveles, logros, retos semanales y premios ============
   Todo el XP se calcula a partir de lo que ya registraste, así que si deshaces algo el XP también se ajusta.
   (se carga después de home.js y antes de app.js) */

const GAME_START = '2026-11-16';
const TIERS = {
  bronce: { e: '🥉', name: 'Bronce', xp: 50, c: '#b45309' },
  plata: { e: '🥈', name: 'Plata', xp: 150, c: '#64748b' },
  oro: { e: '🥇', name: 'Oro', xp: 400, c: '#ca8a04' },
  diamante: { e: '💎', name: 'Diamante', xp: 1000, c: '#0891b2' },
};
const LEVEL_TITLES = ['Novato', 'Aprendiz', 'Constante', 'Enfocado', 'Disciplinado', 'Imparable', 'Guerrero', 'Maestro', 'Sabio', 'Leyenda'];

function ensureGame(d) {
  d.game ||= {};
  d.game.unlocked ||= {};   // {id: 'YYYY-MM-DD'}
  d.game.spent ||= [];      // [{id, rewardId, name, cost, date}]
  d.game.rewards ||= [
    { id: 'r1', e: '☕', name: 'Un café o antojo', cost: 30, money: true },
    { id: 'r2', e: '🎮', name: '2 horas de videojuegos o series sin culpa', cost: 40 },
    { id: 'r3', e: '🎬', name: 'Noche de película', cost: 60 },
    { id: 'r4', e: '😴', name: 'Mañana libre para dormir tarde', cost: 80 },
    { id: 'r5', e: '🍕', name: 'Cena fuera o pedir comida', cost: 200, money: true },
    { id: 'r6', e: '🛍️', name: 'Un gusto de hasta $500 (cuando termines tus deudas)', cost: 800, money: true },
  ];
  d.game.lastLevel ||= 1;
  return d;
}

/* ---------- utilidades de conteo ---------- */
function maxRun(keys) { // racha más larga de días consecutivos
  const s = [...keys].sort(); let best = 0, cur = 0, prev = null;
  for (const k of s) { cur = prev && dkey(addDays(parseD(prev), 1)) === k ? cur + 1 : 1; best = Math.max(best, cur); prev = k; }
  return best;
}
function perfectDays() {
  const all = new Set(db.habits.flatMap(h => Object.keys(h.log)));
  return [...all].filter(k => { const s = dayScore(k); return s.total > 0 && s.done === s.total; });
}
function pastWeeks() { // lunes de semanas ya terminadas desde el inicio del juego
  const out = []; const cur = weekMon(today());
  for (let m = GAME_START; m < cur; m = dkey(addDays(parseD(m), 7))) out.push(m);
  return out;
}
const debtsPaidCount = () => planDebts().filter(d => d.pending === 0 && d.total > 0).length;
const paidInApp = () => db.plan.items.filter(i => i.kind === 'pago' && i.done && db.tx.some(t => t.planId === i.id));
const tasksDone = () => db.tasks.filter(t => t.done);
const stepsDone = () => db.goals.flatMap(g => g.steps.filter(s => s.done));
const goalsDone = () => db.goals.filter(g => g.steps.length && g.steps.every(s => s.done));
const goodWeeks = () => pastWeeks().filter(m => budgetFor(m) && weekSpent(m) <= budgetFor(m));
const projSales = () => db.projects.flatMap(p => (p.money || []).filter(m => m.type === 'ingreso'));
const projProfitAll = () => db.projects.reduce((a, p) => a + projProfit(p), 0);
const habitChecks = () => db.habits.reduce((a, h) => a + Object.keys(h.log).length, 0);
const bestHabitRun = () => db.habits.reduce((a, h) => Math.max(a, maxRun(Object.keys(h.log))), 0);
const reviewsDone = () => Object.values(db.reviews).filter(r => r.good || r.improve || r.focus).length;

/* ---------- logros ---------- */
const ACHIEVEMENTS = [
  // Hábitos
  { id: 'hab1', cat: 'Hábitos', e: '👣', t: 'Primer paso', d: 'Marca tu primer hábito', tier: 'bronce', p: () => [habitChecks(), 1] },
  { id: 'hab_perf', cat: 'Hábitos', e: '✨', t: 'Día perfecto', d: 'Cumple todos tus hábitos en un día', tier: 'bronce', p: () => [perfectDays().length, 1] },
  { id: 'hab_r3', cat: 'Hábitos', e: '🔥', t: 'Calentando motores', d: 'Racha de 3 días en un hábito', tier: 'bronce', p: () => [bestHabitRun(), 3] },
  { id: 'hab_r7', cat: 'Hábitos', e: '🔥', t: 'Una semana entera', d: 'Racha de 7 días en un hábito', tier: 'plata', p: () => [bestHabitRun(), 7] },
  { id: 'hab_r21', cat: 'Hábitos', e: '🧠', t: 'Ya es costumbre', d: 'Racha de 21 días en un hábito', tier: 'oro', p: () => [bestHabitRun(), 21] },
  { id: 'hab_r66', cat: 'Hábitos', e: '🗿', t: 'Hábito de acero', d: 'Racha de 66 días en un hábito', tier: 'diamante', p: () => [bestHabitRun(), 66] },
  { id: 'hab_pw', cat: 'Hábitos', e: '🌟', t: 'Semana perfecta', d: '7 días perfectos seguidos', tier: 'oro', p: () => [maxRun(perfectDays()), 7] },
  { id: 'hab_100', cat: 'Hábitos', e: '💯', t: 'Centenario', d: 'Marca 100 hábitos', tier: 'plata', p: () => [habitChecks(), 100] },
  { id: 'hab_1000', cat: 'Hábitos', e: '🏛️', t: 'Mil veces sí', d: 'Marca 1,000 hábitos', tier: 'diamante', p: () => [habitChecks(), 1000] },
  // Deudas
  { id: 'debt1', cat: 'Deudas', e: '💳', t: 'Primer golpe', d: 'Marca tu primer pago de deuda en la app', tier: 'bronce', p: () => [paidInApp().length, 1] },
  { id: 'debt5', cat: 'Deudas', e: '🥊', t: 'Rompiendo cadenas', d: 'Marca 5 pagos de deuda', tier: 'plata', p: () => [paidInApp().length, 5] },
  { id: 'debt_kill', cat: 'Deudas', e: '⚔️', t: 'Deuda eliminada', d: 'Liquida 3 deudas por completo', tier: 'plata', p: () => [debtsPaidCount(), 3] },
  { id: 'debt_half', cat: 'Deudas', e: '⛰️', t: 'Mitad del camino', d: 'Paga la mitad de todas tus deudas', tier: 'oro', p: () => { const d = planDebts(); const tot = d.reduce((a, x) => a + x.total, 0); return [Math.round(d.reduce((a, x) => a + x.paid, 0)), Math.round(tot / 2)]; } },
  { id: 'debt_free', cat: 'Deudas', e: '🕊️', t: 'Libre de deudas', d: 'Termina de pagar todo tu plan', tier: 'diamante', p: () => { const d = planDebts(); return [d.filter(x => x.pending === 0).length, d.length]; } },
  // Dinero
  { id: 'wk1', cat: 'Dinero', e: '🛡️', t: 'Semana bajo control', d: 'Termina una semana sin pasarte del gasto', tier: 'bronce', p: () => [goodWeeks().length, 1] },
  { id: 'wk4', cat: 'Dinero', e: '🧱', t: 'Mes disciplinado', d: '4 semanas sin pasarte del gasto', tier: 'plata', p: () => [goodWeeks().length, 4] },
  { id: 'wk12', cat: 'Dinero', e: '🏦', t: 'Control total', d: '12 semanas sin pasarte del gasto', tier: 'oro', p: () => [goodWeeks().length, 12] },
  { id: 'tx30', cat: 'Dinero', e: '🧾', t: 'Contador', d: 'Registra 30 movimientos', tier: 'bronce', p: () => [db.tx.length, 30] },
  // Tareas y metas
  { id: 'task10', cat: 'Tareas y metas', e: '✅', t: 'Manos a la obra', d: 'Completa 10 tareas', tier: 'bronce', p: () => [tasksDone().length, 10] },
  { id: 'task50', cat: 'Tareas y metas', e: '⚡', t: 'Productivo', d: 'Completa 50 tareas', tier: 'plata', p: () => [tasksDone().length, 50] },
  { id: 'task200', cat: 'Tareas y metas', e: '🚀', t: 'Máquina', d: 'Completa 200 tareas', tier: 'oro', p: () => [tasksDone().length, 200] },
  { id: 'goal1', cat: 'Tareas y metas', e: '🎯', t: 'Meta cumplida', d: 'Completa todos los pasos de una meta', tier: 'oro', p: () => [goalsDone().length, 1] },
  { id: 'goal3', cat: 'Tareas y metas', e: '🏆', t: 'Cumplidor', d: 'Completa 3 metas', tier: 'diamante', p: () => [goalsDone().length, 3] },
  // Diario
  { id: 'jr1', cat: 'Diario', e: '📔', t: 'Querido diario', d: 'Escribe tu primera entrada', tier: 'bronce', p: () => [Object.keys(db.journal).length, 1] },
  { id: 'jr7', cat: 'Diario', e: '✍️', t: 'Escritor constante', d: '7 días seguidos escribiendo', tier: 'plata', p: () => [maxRun(Object.keys(db.journal)), 7] },
  { id: 'jr_learn', cat: 'Diario', e: '💡', t: 'Siempre aprendiendo', d: 'Anota 10 aprendizajes', tier: 'plata', p: () => [Object.values(db.journal).filter(j => j.learned).length, 10] },
  { id: 'jr30', cat: 'Diario', e: '📚', t: 'Tu propia historia', d: '30 entradas en tu diario', tier: 'oro', p: () => [Object.keys(db.journal).length, 30] },
  // Salud
  { id: 'hl7', cat: 'Salud', e: '❤️', t: 'Me escucho', d: 'Registra tu salud 7 días', tier: 'bronce', p: () => [Object.keys(db.health).length, 7] },
  { id: 'sleep7', cat: 'Salud', e: '😴', t: 'Bien descansado', d: 'Duerme 7 h o más 7 días seguidos', tier: 'plata', p: () => [maxRun(Object.entries(db.health).filter(([, h]) => h.sleep >= 7).map(([k]) => k)), 7] },
  { id: 'water', cat: 'Salud', e: '💧', t: 'Hidratado', d: '8 vasos de agua en 10 días distintos', tier: 'plata', p: () => [Object.values(db.health).filter(h => h.water >= 8).length, 10] },
  { id: 'hl30', cat: 'Salud', e: '🩺', t: 'Bitácora de salud', d: 'Registra tu salud 30 días', tier: 'oro', p: () => [Object.keys(db.health).length, 30] },
  // Rutina y revisión
  { id: 'rut5', cat: 'Organización', e: '🗓️', t: 'Arquitecto del tiempo', d: 'Agrega 5 actividades a tu rutina', tier: 'bronce', p: () => [db.routine.length, 5] },
  { id: 'rev1', cat: 'Organización', e: '🔍', t: 'Mirada al espejo', d: 'Escribe tu primera revisión semanal', tier: 'bronce', p: () => [reviewsDone(), 1] },
  { id: 'rev4', cat: 'Organización', e: '🧭', t: 'Rumbo claro', d: '4 revisiones semanales', tier: 'plata', p: () => [reviewsDone(), 4] },
  { id: 'date5', cat: 'Organización', e: '🎂', t: 'Nunca se me olvida', d: 'Guarda 5 fechas importantes', tier: 'bronce', p: () => [db.dates.length, 5] },
  // Proyectos
  { id: 'pj1', cat: 'Proyectos', e: '💡', t: 'Emprendedor', d: 'Crea tu primer proyecto', tier: 'bronce', p: () => [db.projects.length, 1] },
  { id: 'pj_canvas', cat: 'Proyectos', e: '🗺️', t: 'Idea aterrizada', d: 'Completa el lienzo de un proyecto', tier: 'plata', p: () => [db.projects.filter(p => ['problema', 'cliente', 'solucion', 'dinero', 'diferencia'].every(k => p.canvas?.[k])).length, 1] },
  { id: 'pj_sale', cat: 'Proyectos', e: '💵', t: 'Primera venta', d: 'Registra la primera venta de un proyecto', tier: 'plata', p: () => [projSales().length, 1] },
  { id: 'pj_10k', cat: 'Proyectos', e: '📈', t: 'Negocio en serio', d: 'Llega a $10,000 de ganancia en tus proyectos', tier: 'oro', p: () => [Math.max(0, Math.round(projProfitAll())), 10000] },
  // Nivel (se evalúan aparte)
  { id: 'lv5', cat: 'Nivel', e: '⭐', t: 'Nivel 5', d: 'Llega al nivel 5', tier: 'plata', lvl: 5 },
  { id: 'lv10', cat: 'Nivel', e: '👑', t: 'Leyenda', d: 'Llega al nivel 10', tier: 'diamante', lvl: 10 },
];

/* ---------- retos semanales ---------- */
const CHALLENGES = [
  { id: 'c_hab80', e: '✅', t: 'Cumple el 80% de tus hábitos', p: m => { const [a, b] = [m, dkey(addDays(parseD(m), 6))]; const v = periodPct(a, b); return [v ?? 0, 80, '%']; }, need: () => db.habits.length },
  { id: 'c_perf3', e: '✨', t: 'Logra 3 días perfectos', p: m => [perfectDays().filter(k => k >= m && k <= dkey(addDays(parseD(m), 6))).length, 3] , need: () => db.habits.length },
  { id: 'c_jr5', e: '📔', t: 'Escribe tu diario 5 días', p: m => [Object.keys(db.journal).filter(k => k >= m && k <= dkey(addDays(parseD(m), 6))).length, 5] },
  { id: 'c_hl5', e: '❤️', t: 'Registra tu salud 5 días', p: m => [Object.keys(db.health).filter(k => k >= m && k <= dkey(addDays(parseD(m), 6))).length, 5] },
  { id: 'c_task5', e: '⚡', t: 'Completa 5 tareas', p: m => [db.tasks.filter(t => t.done && t.doneDay >= m && t.doneDay <= dkey(addDays(parseD(m), 6))).length, 5] },
  { id: 'c_steps2', e: '🎯', t: 'Avanza 2 pasos de metas o proyectos', p: m => { const e = dkey(addDays(parseD(m), 6)); return [[...db.goals.flatMap(g => g.steps), ...db.projects.flatMap(p => p.tasks || [])].filter(s => s.done && s.doneDay >= m && s.doneDay <= e).length, 2]; } },
  { id: 'c_budget', e: '🛡️', t: 'No te pases de tu gasto semanal', p: m => { const done = m < weekMon(today()); const ok = weekSpent(m) <= budgetFor(m); return [done && ok ? 1 : 0, 1, null, done ? (ok ? '' : 'Te pasaste') : `Llevas ${mxn(weekSpent(m))} de ${mxn(budgetFor(m))}`]; }, need: m => budgetFor(m) },
  { id: 'c_sleep', e: '😴', t: 'Duerme 7 h o más 4 noches', p: m => [Object.entries(db.health).filter(([k, h]) => k >= m && k <= dkey(addDays(parseD(m), 6)) && h.sleep >= 7).length, 4] },
];
const CHALLENGE_XP = 75;
function weekChallenges(mon) {
  const n = Math.round(parseD(mon).getTime() / 6048e5);
  const pool = CHALLENGES.filter(c => !c.need || c.need(mon));
  const out = []; let i = n;
  // siempre incluye el de gasto semanal si aplica; los otros 2 rotan
  const budget = pool.find(c => c.id === 'c_budget'); if (budget) out.push(budget);
  const rest = pool.filter(c => c.id !== 'c_budget');
  while (out.length < 3 && rest.length) { const c = rest[((i++ % rest.length) + rest.length) % rest.length]; if (!out.includes(c)) out.push(c); else i++; if (i > n + 50) break; }
  return out.map(c => { const [cur, goal, unit, note] = c.p(mon); return { ...c, cur, goal, unit, note, done: cur >= goal }; });
}

/* ---------- XP ---------- */
function xpBreakdown() {
  const b = {};
  const add = (k, v) => b[k] = (b[k] || 0) + v;
  add('Hábitos', habitChecks() * 10);
  if (typeof extraXp === 'function') for (const [k, v] of extraXp()) add(k, v);
  add('Tareas', tasksDone().reduce((a, t) => a + ({ alta: 25, media: 15, baja: 10 }[t.prio] || 15), 0));
  add('Metas', stepsDone().length * 30 + goalsDone().length * 150);
  add('Diario', Object.values(db.journal).reduce((a, j) => a + 15 + (j.learned ? 5 : 0), 0));
  add('Salud', Object.keys(db.health).length * 10);
  add('Deudas', paidInApp().length * 50);
  add('Dinero', goodWeeks().length * 50 + db.plan.items.filter(i => i.kind === 'ingreso' && i.done).length * 5);
  add('Proyectos', db.projects.reduce((a, p) => a + (p.tasks || []).filter(s => s.done).length * 20 + (p.money || []).length * 5, 0));
  add('Revisión', reviewsDone() * 40);
  add('Retos', [...pastWeeks(), weekMon(today())].reduce((a, m) => a + weekChallenges(m).filter(c => c.done).length * CHALLENGE_XP, 0));
  return b;
}
const levelFromXp = xp => Math.floor(Math.sqrt(xp / 60)) + 1;      // nivel 2 = 60 XP, 5 = 960, 10 = 4,860
const xpForLevel = l => 60 * (l - 1) * (l - 1);
const levelTitle = l => LEVEL_TITLES[Math.min(l, LEVEL_TITLES.length) - 1];

function gameState() {
  const b = xpBreakdown();
  const base = Object.values(b).reduce((a, x) => a + x, 0);
  const res = ACHIEVEMENTS.filter(a => !a.lvl).map(a => { const [cur, goal] = a.p(); return { ...a, cur: Math.min(cur, goal), goal, done: goal > 0 && cur >= goal }; });
  let achXp = res.filter(a => a.done).reduce((s, a) => s + TIERS[a.tier].xp, 0);
  let xp = base + achXp;
  for (const a of ACHIEVEMENTS.filter(a => a.lvl)) {
    const lvl = levelFromXp(xp); const done = lvl >= a.lvl;
    res.push({ ...a, cur: Math.min(lvl, a.lvl), goal: a.lvl, done });
    if (done) { achXp += TIERS[a.tier].xp; xp += TIERS[a.tier].xp; }
  }
  b['Logros'] = achXp;
  const level = levelFromXp(xp);
  const coins = Math.floor(xp / 10) - db.game.spent.reduce((a, s) => a + s.cost, 0);
  return { xp, level, coins, ach: res, breakdown: b };
}

/* ---------- avisos de logros nuevos ---------- */
let gameChecked = false;
function afterRender() {
  const G = gameState();
  const newly = G.ach.filter(a => a.done && !db.game.unlocked[a.id]);
  let changed = false;
  for (const a of newly) { db.game.unlocked[a.id] = today(); changed = true; }
  if (gameChecked && newly.length) celebrate(`${TIERS[newly[0].tier].e} ¡Logro desbloqueado! ${newly[0].e} ${newly[0].t}`, `+${TIERS[newly[0].tier].xp} XP${newly.length > 1 ? ` · y ${newly.length - 1} más` : ''}`);
  else if (gameChecked && G.level > db.game.lastLevel) celebrate(`⬆️ ¡Subiste a nivel ${G.level}!`, `Ahora eres ${levelTitle(G.level)}`);
  if (G.level !== db.game.lastLevel) { db.game.lastLevel = G.level; changed = true; }
  if (changed) save();
  gameChecked = true;
}
function celebrate(title, sub) {
  const d = document.createElement('div');
  d.className = 'celebrate';
  d.innerHTML = `<div class="cele-box"><div class="cele-burst">🎉</div><b></b><small></small></div>`;
  d.querySelector('b').textContent = title; d.querySelector('small').textContent = sub;
  document.body.append(d);
  if (navigator.vibrate) navigator.vibrate([20, 40, 20]);
  setTimeout(() => d.classList.add('out'), 2600);
  setTimeout(() => d.remove(), 3100);
  d.addEventListener('click', () => d.remove());
}

/* ---------- vistas ---------- */
function gameHomeCard() {
  const G = gameState();
  const a = xpForLevel(G.level), b = xpForLevel(G.level + 1);
  const ch = weekChallenges(weekMon(today()));
  return `<button class="card lvl-card" data-act="go" data-id="logros">
    <div class="lvl-badge">${G.level}</div>
    <div class="grow">
      <div class="lvl-top"><b>${levelTitle(G.level)}</b><span>🪙 ${G.coins}</span></div>
      <div class="bar" style="margin:6px 0 4px"><i style="width:${(G.xp - a) / (b - a) * 100}%;background:linear-gradient(90deg,#f59e0b,#f97316)"></i></div>
      <small>${G.xp - a}/${b - a} XP para nivel ${G.level + 1} · Retos ${ch.filter(c => c.done).length}/${ch.length}</small>
    </div></button>`;
}

let logrosTab = 'logros';
function viewLogros() {
  const G = gameState();
  const a = xpForLevel(G.level), b = xpForLevel(G.level + 1);
  const mon = weekMon(today());
  const ch = weekChallenges(mon);
  const unlocked = G.ach.filter(x => x.done).length;
  const seg = `<div class="seg">${[['logros', 'Logros'], ['retos', 'Retos'], ['premios', 'Premios']].map(([k, l]) => `<button class="${logrosTab === k ? 'on' : ''}" data-act="logrosTab" data-id="${k}">${l}</button>`).join('')}</div>`;
  const head = `<div class="card lvl-hero">
    <div class="lvl-badge big">${G.level}</div>
    <div style="font-size:20px;font-weight:700;margin-top:8px">${levelTitle(G.level)}</div>
    <div class="small">${G.xp.toLocaleString('es-MX')} XP en total · ${unlocked}/${G.ach.length} logros</div>
    <div class="bar" style="margin:10px 0 4px"><i style="width:${(G.xp - a) / (b - a) * 100}%;background:linear-gradient(90deg,#f59e0b,#f97316)"></i></div>
    <div class="small">Faltan ${b - G.xp} XP para nivel ${G.level + 1}${G.level < LEVEL_TITLES.length ? ` (${levelTitle(G.level + 1)})` : ''}</div>
    <div class="coins">🪙 ${G.coins} monedas</div>
  </div>`;

  if (logrosTab === 'retos') {
    return head + seg + `<div class="card"><h2>Retos de esta semana <span class="small">+${CHALLENGE_XP} XP c/u</span></h2>
      <ul class="list">${ch.map(c => `<li><div class="emoji">${c.e}</div><div class="grow"><div class="t" style="white-space:normal">${c.t}</div>
        <div class="bar" style="margin-top:6px"><i style="width:${Math.min(100, c.cur / c.goal * 100)}%;background:${c.done ? 'var(--green)' : 'var(--accent)'}"></i></div>
        <div class="s">${c.note || `${c.cur}${c.unit || ''} de ${c.goal}${c.unit || ''}`}</div></div>${c.done ? '<span class="streak" style="color:var(--green)">✓ Hecho</span>' : ''}</li>`).join('')}</ul>
      <div class="small" style="margin-top:8px">Cada lunes salen retos nuevos.</div></div>
      <div class="card"><h2>Cómo ganas XP</h2><ul class="bullets small">
        <li>Hábito marcado: 10 · Día en diario: 15 (+5 si anotas qué aprendiste) · Salud del día: 10</li>
        <li>Tarea: 10 a 25 según prioridad · Paso de meta: 30 · Meta completa: 150</li>
        <li>Pago de deuda marcado: 50 · Semana sin pasarte del gasto: 50</li>
        <li>Paso de proyecto: 20 · Revisión semanal: 40 · Reto semanal: ${CHALLENGE_XP}</li>
        <li>Logros: 🥉 50 · 🥈 150 · 🥇 400 · 💎 1,000</li>
        <li>Cada 10 XP = 🪙 1 moneda para tus premios</li></ul></div>
      <div class="card"><h2>De dónde viene tu XP</h2>${Object.entries(G.breakdown).filter(([, v]) => v).sort((x, y) => y[1] - x[1]).map(([k, v]) => `<div class="catrow"><div class="top"><span>${k}</span><span class="amt">${v.toLocaleString('es-MX')} XP</span></div><div class="bar"><i style="width:${v / G.xp * 100}%;background:#f59e0b"></i></div></div>`).join('') || '<div class="empty">Empieza a usar la app para ganar XP.</div>'}</div>`;
  }

  if (logrosTab === 'premios') {
    const hist = [...db.game.spent].reverse().slice(0, 10);
    return head + seg + `<div class="card"><h2>Tienda de premios <button class="link" data-act="addReward">+ Premio</button></h2>
      <div class="small" style="margin-bottom:6px">Canjea tus monedas por gustos. Si el premio cuesta dinero, sale de tu gasto de la semana: no rompas tu plan 😉</div>
      <ul class="list">${db.game.rewards.map(r => `<li><div class="emoji">${esc(r.e)}</div>
        <div class="grow" data-act="editReward" data-id="${r.id}"><div class="t" style="white-space:normal">${esc(r.name)}</div><div class="s">🪙 ${r.cost}${r.money ? ' · cuesta dinero' : ' · gratis'}</div></div>
        <button class="btn ${G.coins >= r.cost ? '' : 'ghost'}" style="padding:8px 12px" data-act="redeem" data-id="${r.id}" ${G.coins >= r.cost ? '' : 'disabled'}>${G.coins >= r.cost ? 'Canjear' : `Faltan ${r.cost - G.coins}`}</button></li>`).join('')}</ul></div>
      ${hist.length ? `<div class="card"><h2>Premios canjeados</h2><ul class="list">${hist.map(s => `<li><div class="grow"><div class="t">${esc(s.name)}</div><div class="s">${ddmm(s.date)}</div></div><div class="amt">−🪙 ${s.cost}</div></li>`).join('')}</ul></div>` : ''}`;
  }

  const cats = [...new Set(ACHIEVEMENTS.map(x => x.cat))];
  return head + seg + cats.map(c => {
    const list = G.ach.filter(x => x.cat === c).sort((x, y) => (y.done - x.done) || (Object.keys(TIERS).indexOf(x.tier) - Object.keys(TIERS).indexOf(y.tier)));
    return `<div class="card"><h2>${c} <span class="small">${list.filter(x => x.done).length}/${list.length}</span></h2>
      <div class="ach-grid">${list.map(x => `<div class="ach ${x.done ? 'done' : ''}" style="--tc:${TIERS[x.tier].c}">
        <div class="ach-ico">${x.done ? x.e : '🔒'}<span>${TIERS[x.tier].e}</span></div>
        <b>${x.t}</b><small>${x.d}</small>
        ${x.done ? `<small class="ach-ok">${db.game.unlocked[x.id] ? 'Desbloqueado ' + ddmm(db.game.unlocked[x.id]) : 'Desbloqueado'}</small>`
          : `<div class="bar" style="height:5px;margin-top:6px"><i style="width:${x.goal ? x.cur / x.goal * 100 : 0}%;background:var(--tc)"></i></div><small>${x.cur.toLocaleString('es-MX')}/${x.goal.toLocaleString('es-MX')}</small>`}
      </div>`).join('')}</div></div>`;
  }).join('');
}

function openReward(id) {
  const r = id ? db.game.rewards.find(x => x.id === id) : null;
  openSheet(`<h3>${r ? 'Editar premio' : 'Nuevo premio'}</h3><form id="f">
    <div class="row2"><label class="field"><span>Emoji</span><input name="e" maxlength="4" value="${esc(r?.e || '🎁')}"></label>
    <label class="field"><span>Costo en monedas</span><input name="cost" type="number" inputmode="numeric" min="1" value="${r?.cost || 50}" required></label></div>
    <label class="field"><span>Premio</span><input name="name" maxlength="80" placeholder="Ej. Ir al cine, un postre, tarde libre" value="${esc(r?.name || '')}" required></label>
    <label class="field" style="display:flex;gap:10px;align-items:center"><input name="money" type="checkbox" style="width:22px;height:22px" ${r?.money ? 'checked' : ''}><span style="margin:0">Cuesta dinero</span></label>
    <button class="btn block">Guardar</button>${r ? '<button type="button" class="btn danger block" id="del">Eliminar premio</button>' : ''}</form>`, s => {
    const f = $('#f', s);
    f.addEventListener('submit', e => { e.preventDefault(); const d = { e: f.e.value.trim() || '🎁', name: f.name.value.trim(), cost: Math.max(1, +f.cost.value || 1), money: f.money.checked }; if (r) Object.assign(r, d); else db.game.rewards.push({ id: uid(), ...d }); save(); closeSheet(); render(); });
    $('#del', s)?.addEventListener('click', () => { db.game.rewards = db.game.rewards.filter(x => x.id !== id); save(); closeSheet(); render(); });
  });
}
async function redeem(id) {
  const r = db.game.rewards.find(x => x.id === id); if (!r) return;
  if (gameState().coins < r.cost) return;
  if (!(await ask(`¿Canjear "${r.name}" por 🪙 ${r.cost}?${r.money ? ' Recuerda que el dinero sale de tu gasto de la semana.' : ''}`, 'Canjear'))) return;
  db.game.spent.push({ id: uid(), rewardId: r.id, name: r.name, cost: r.cost, date: today() });
  save(); render();
  celebrate(`${r.e} ¡Te lo ganaste!`, `Disfruta: ${r.name}`);
}

/* ---------- registro ---------- */
Object.assign(MORE_TITLES, { logros: 'Logros' });
Object.assign(MORE_PARENT, { logros: 'mas' });
Object.assign(MORE_VIEWS, { logros: viewLogros });
Object.assign(MORE_ACTIONS, {
  logrosTab: k => { logrosTab = k; render(); },
  addReward: () => openReward(),
  editReward: id => openReward(id),
  redeem: id => redeem(id),
});
