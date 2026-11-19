'use strict';
/* ============ Hábitos: calendario y resumen ============ (se carga después de more.js y antes de app.js) */

let habMonth = null, habDay = null, habEdit = false;          // calendario
let habPeriod = 'semana', habRef = null;      // resumen

const habStart = h => h.created || '2000-01-01';
const habExists = (h, k) => k >= habStart(h);
function dayScore(k) {
  const hs = db.habits.filter(h => habExists(h, k));
  return { total: hs.length, done: hs.filter(h => h.log[k]).length };
}
function bestStreak(h) {
  const days = Object.keys(h.log).sort();
  let best = 0, cur = 0, prev = null;
  for (const k of days) { cur = prev && dkey(addDays(parseD(prev), 1)) === k ? cur + 1 : 1; best = Math.max(best, cur); prev = k; }
  return best;
}
function toggleHabitOn(id, k) {
  const h = db.habits.find(x => x.id === id); if (!h) return;
  if (h.log[k]) delete h.log[k]; else h.log[k] = 1;
  if (k < habStart(h)) h.created = k; // si marca un día anterior a su creación, ampliamos el inicio
  save(); render();
}

/* ---------- Pestaña Hábitos ---------- */
function viewHabitos() {
  const t = today();
  const total = db.habits.length;
  const done = db.habits.filter(x => x.log[t]).length;
  const best = db.habits.reduce((a, h) => Math.max(a, streak(h)), 0);
  const mk = habMonth || mkey();
  const sel = habDay || t;
  return `
    ${total ? `<div class="card"><div class="stats">
      <div class="stat"><div class="lbl">Hoy</div><div class="val">${done}/${total}</div></div>
      <div class="stat"><div class="lbl">Racha activa</div><div class="val">🔥 ${best}</div></div>
      <div class="stat"><div class="lbl">Este mes</div><div class="val">${periodPct(...monthRange(mkey())) ?? 0}%</div></div>
    </div></div>` : ''}
    <div class="card">
      <h2>${habEdit ? 'Editar hábitos' : 'Hoy'} ${total ? `<button class="link" data-act="habEdit">${habEdit ? 'Listo' : '✏️ Editar'}</button>` : ''}</h2>
      ${total && habEdit ? `<div class="small" style="margin-bottom:4px">Cambia el orden con las flechas, toca el nombre para editarlo o 🗑️ para eliminarlo.</div><ul class="list">${db.habits.map((h, i) => `<li>
        <div class="emoji">${esc(h.emoji || '✅')}</div>
        <div class="grow" data-act="editHabit" data-id="${h.id}"><div class="t">${esc(h.name)}</div><div class="s">Toca para cambiar nombre o ícono</div></div>
        <button class="ord" data-act="habMove" data-id="${i}|-1" ${i === 0 ? 'disabled' : ''} aria-label="Subir">↑</button>
        <button class="ord" data-act="habMove" data-id="${i}|1" ${i === total - 1 ? 'disabled' : ''} aria-label="Bajar">↓</button>
        <button class="ord del" data-act="habDel" data-id="${h.id}" aria-label="Eliminar">🗑️</button></li>`).join('')}</ul>`
      : total ? `<ul class="list">${db.habits.map(habitRow).join('')}</ul>`
        : `<div class="empty">Crea hábitos como tomar agua, leer 10 minutos o dormir antes de las 11.<br>Se repiten solos cada día: solo los marcas.</div>`}
    </div>
    <div class="row" style="margin-bottom:14px">
      <button class="btn ghost" data-act="addHabit">+ Nuevo hábito</button>
      ${total ? '<button class="btn" data-act="go" data-id="habresumen">📊 Resumen</button>' : ''}
    </div>
    ${total ? habCalendar(mk, sel) + habDayDetail(sel) : ''}`;
}

function habCalendar(mk, sel) {
  const [y, m] = mk.split('-').map(Number);
  const first = new Date(y, m - 1, 1), daysIn = new Date(y, m, 0).getDate();
  const t = today();
  let cells = '';
  for (let i = 0; i < wday(first); i++) cells += '<span></span>';
  for (let d = 1; d <= daysIn; d++) {
    const k = `${y}-${pad(m)}-${pad(d)}`;
    const future = k > t;
    const { total, done } = dayScore(k);
    const r = !future && total && !(k === t && !done) ? done / total : null;
    const lvl = r == null ? '' : r === 0 ? 'l0' : r < .5 ? 'l1' : r < 1 ? 'l2' : 'l3';
    cells += `<button class="cal-d ${lvl} ${k === sel ? 'sel' : ''} ${k === t ? 'tod' : ''}" ${future ? 'disabled' : ''} data-act="habDay" data-id="${k}" aria-label="${d}: ${done} de ${total}">${d}</button>`;
  }
  return `<div class="card">
    <div class="monthnav" style="margin-bottom:8px">
      <button data-act="habMonth" data-id="-1" aria-label="Mes anterior">‹</button>
      <strong>${monthName(mk)}</strong>
      <button data-act="habMonth" data-id="1" aria-label="Mes siguiente" ${mk >= mkey() ? 'disabled style="opacity:.3"' : ''}>›</button>
    </div>
    <div class="cal">${DAYS.map(d => `<small>${d[0]}</small>`).join('')}${cells}</div>
    <div class="cal-legend"><span><i class="l0"></i>Nada</span><span><i class="l1"></i>Poco</span><span><i class="l2"></i>Casi</span><span><i class="l3"></i>Todo</span></div>
  </div>`;
}

function habDayDetail(k) {
  const hs = db.habits.filter(h => habExists(h, k));
  const done = hs.filter(h => h.log[k]), miss = hs.filter(h => !h.log[k]);
  const label = k === today() ? 'Hoy' : k === dkey(addDays(new Date(), -1)) ? 'Ayer' : fmtDay(k);
  return `<div class="card">
    <h2>${label} <span class="small">${done.length}/${hs.length}</span></h2>
    ${hs.length ? `<ul class="list">${[...done, ...miss].map(h => `<li>
      <div class="emoji">${esc(h.emoji || '✅')}</div>
      <div class="grow"><div class="t">${esc(h.name)}</div><div class="s ${h.log[k] ? 'pos' : ''}">${h.log[k] ? 'Hecho' : 'No hecho'}</div></div>
      <button class="check ${h.log[k] ? 'on' : ''}" data-act="habToggleDay" data-id="${h.id}|${k}" aria-label="Marcar"></button></li>`).join('')}</ul>
      ${k !== today() ? '<div class="small" style="margin-top:6px">¿Se te olvidó marcar algo ese día? Puedes corregirlo aquí.</div>' : ''}`
      : '<div class="empty">No tenías hábitos ese día.</div>'}
  </div>`;
}

/* ---------- Resumen ---------- */
function monthRange(mk) { const [y, m] = mk.split('-').map(Number); return [`${mk}-01`, dkey(new Date(y, m, 0))]; }
function periodRange(period, ref) {
  const r = parseD(ref);
  if (period === 'semana') { const mon = weekMon(ref); return [mon, dkey(addDays(parseD(mon), 6))]; }
  if (period === 'mes') return monthRange(mkey(r));
  return [`${r.getFullYear()}-01-01`, `${r.getFullYear()}-12-31`];
}
function habStats(h, from, to) {
  const end = to < today() ? to : today();
  let possible = 0, done = 0;
  const t = today();
  for (let d = parseD(from > habStart(h) ? from : habStart(h)); dkey(d) <= end; d = addDays(d, 1)) { const k = dkey(d); if (k === t && !h.log[k]) continue; possible++; if (h.log[k]) done++; }
  return { possible, done, pct: possible ? Math.round(done / possible * 100) : 0 };
}
function periodPct(from, to) {
  let p = 0, d = 0; for (const h of db.habits) { const s = habStats(h, from, to); p += s.possible; d += s.done; }
  return p ? Math.round(d / p * 100) : null;
}
function shiftRef(period, ref, n) {
  const r = parseD(ref);
  if (period === 'semana') return dkey(addDays(r, 7 * n));
  if (period === 'mes') return dkey(new Date(r.getFullYear(), r.getMonth() + n, 1));
  return dkey(new Date(r.getFullYear() + n, 0, 1));
}
function periodLabel(period, from) {
  const r = parseD(from);
  if (period === 'semana') return rangeD(from);
  if (period === 'mes') return monthName(mkey(r));
  return String(r.getFullYear());
}

function viewHabResumen() {
  const ref = habRef || today();
  const [from, to] = periodRange(habPeriod, ref);
  const isCurrent = from <= today() && today() <= to;
  const stats = db.habits.map(h => [h, habStats(h, from, to)]).sort((a, b) => b[1].pct - a[1].pct);
  const totalDone = stats.reduce((a, [, s]) => a + s.done, 0);
  const overall = periodPct(from, to) ?? 0;
  // día de la semana más constante
  const byW = Array.from({ length: 7 }, () => [0, 0]);
  for (let d = parseD(from); dkey(d) <= to && dkey(d) < today(); d = addDays(d, 1)) { const s = dayScore(dkey(d)); byW[wday(d)][0] += s.done; byW[wday(d)][1] += s.total; }
  const wPct = byW.map(([d, t]) => t ? d / t : -1);
  const bestW = wPct.indexOf(Math.max(...wPct)), worstW = wPct.indexOf(Math.min(...wPct.map(x => x < 0 ? 2 : x)));
  const top = stats[0], low = stats[stats.length - 1];

  let chart = '';
  if (habPeriod === 'semana') {
    const days = Array.from({ length: 7 }, (_, i) => dkey(addDays(parseD(from), i)));
    chart = `<div class="card"><h2>Día por día</h2>
      <div class="hgrid" style="grid-template-columns: minmax(0,1fr) repeat(7, 26px)">
        <span></span>${days.map(d => `<small>${DAYS[wday(parseD(d))][0]}</small>`).join('')}
        ${db.habits.map(h => `<span class="hname">${esc(h.emoji)} ${esc(h.name)}</span>${days.map(d => `<i class="${h.log[d] ? 'on' : d >= today() || !habExists(h, d) ? 'na' : ''}"></i>`).join('')}`).join('')}
      </div></div>`;
  } else {
    const buckets = habPeriod === 'mes'
      ? (() => { const out = []; for (let d = parseD(from); dkey(d) <= to; d = addDays(d, 1)) { const k = dkey(d); const s = dayScore(k); out.push([String(d.getDate()), k > today() || !s.total || (k === today() && !s.done) ? null : s.done / s.total]); } return out; })()
      : Array.from({ length: 12 }, (_, i) => { const mk = `${from.slice(0, 4)}-${pad(i + 1)}`; const [a, b] = monthRange(mk); const v = a > today() ? null : periodPct(a, b); return [MESES[i], v == null ? null : v / 100]; });
    chart = `<div class="card"><h2>${habPeriod === 'mes' ? 'Cumplimiento por día' : 'Cumplimiento por mes'}</h2>
      <div class="cols ${habPeriod === 'mes' ? 'cols-month' : ''}">${buckets.map(([l, v]) => `<div class="col" title="${l}: ${v == null ? '—' : Math.round(v * 100) + '%'}"><div class="colbar"><i style="height:${v == null ? 0 : Math.max(3, v * 100)}%"></i></div><small>${habPeriod === 'mes' ? (+l % 5 === 0 || l === '1' ? l : '') : l}</small></div>`).join('')}</div>
    </div>`;
  }

  return `
    <div class="seg">${[['semana', 'Semana'], ['mes', 'Mes'], ['año', 'Año']].map(([k, l]) => `<button class="${habPeriod === k ? 'on' : ''}" data-act="habPeriod" data-id="${k}">${l}</button>`).join('')}</div>
    <div class="monthnav">
      <button data-act="habRef" data-id="-1" aria-label="Anterior">‹</button>
      <strong>${periodLabel(habPeriod, from)}</strong>
      <button data-act="habRef" data-id="1" aria-label="Siguiente" ${isCurrent || from > today() ? 'disabled style="opacity:.3"' : ''}>›</button>
    </div>
    <div class="card"><div class="stats">
      <div class="stat"><div class="lbl">Cumplimiento</div><div class="val">${overall}%</div></div>
      <div class="stat"><div class="lbl">Veces hecho</div><div class="val">${totalDone}</div></div>
      <div class="stat"><div class="lbl">Día más constante</div><div class="val">${wPct[bestW] >= 0 ? DAYS_FULL[bestW] : '—'}</div></div>
    </div>
    <div class="bar"><i style="width:${overall}%;background:var(--green)"></i></div>
    ${stats.length > 1 && top[1].possible ? `<div class="small" style="margin-top:8px">Tu hábito más fuerte: <b>${esc(top[0].name)}</b> (${top[1].pct}%). El que más te cuesta: <b>${esc(low[0].name)}</b> (${low[1].pct}%)${wPct[worstW] >= 0 && worstW !== bestW ? `. Fallas más los <b>${DAYS_FULL[worstW].toLowerCase().replace(/([^s])$/, '$1s')}</b>` : ''}.</div>` : ''}
    </div>
    ${chart}
    <div class="card"><h2>Por hábito</h2>
      ${stats.map(([h, s]) => `<div class="catrow">
        <div class="top"><span>${esc(h.emoji)} ${esc(h.name)}</span><span class="amt">${s.done}/${s.possible} <span class="small">${s.pct}%</span></span></div>
        <div class="bar"><i style="width:${s.pct}%;background:var(--green)"></i></div>
        <div class="small" style="margin-top:2px">Racha actual 🔥 ${streak(h)} · Mejor racha ${bestStreak(h)} días</div>
      </div>`).join('')}
    </div>`;
}
const MESES = ['E', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];

/* ---------- Registro ---------- */
Object.assign(MORE_TITLES, { habresumen: 'Resumen de hábitos' });
Object.assign(MORE_PARENT, { habresumen: 'habitos' });
Object.assign(MORE_VIEWS, { habitos: viewHabitos, habresumen: viewHabResumen });
Object.assign(MORE_ACTIONS, {
  habDay: k => { habDay = k; render(); },
  habEdit: () => { habEdit = !habEdit; render(); },
  habMove: ref => { const [i, d] = ref.split('|').map(Number); const j = i + d; if (j < 0 || j >= db.habits.length) return; [db.habits[i], db.habits[j]] = [db.habits[j], db.habits[i]]; save(); render(); },
  habDel: async id => { const h = db.habits.find(x => x.id === id); if (!h) return; if (!(await ask(`¿Eliminar "${h.name}" y todo su historial?`, 'Sí, eliminar'))) return; db.habits = db.habits.filter(x => x.id !== id); save(); render(); toast('Hábito eliminado'); },
  habMonth: n => { const [y, m] = (habMonth || mkey()).split('-').map(Number); const nk = mkey(new Date(y, m - 1 + +n, 1)); habMonth = nk > mkey() ? mkey() : nk; render(); },
  habToggleDay: ref => { const [id, k] = ref.split('|'); toggleHabitOn(id, k); },
  habPeriod: p => { habPeriod = p; habRef = null; render(); },
  habRef: n => { habRef = shiftRef(habPeriod, habRef || today(), +n); render(); },
});
