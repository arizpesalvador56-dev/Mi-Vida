'use strict';
/* ============ Plan de pagos (salir de deudas) ============
   Reglas:
   - Semanas de lunes a domingo.
   - Peor caso: el gasto semanal completo sale el lunes en la mañana (o hoy, si la semana ya empezó),
     antes de cualquier cobro o pago.
   - Mismo día: primero cobros, luego pagos.
   - Gastos con categoría Deudas, Emergencia o Ajuste no cuentan contra el gasto semanal.
   - Dinero actual = saldo base del plan + movimientos registrados desde esa fecha.
*/

// Plan vacío: cada quien agrega sus propias deudas, ingresos y gasto semanal.
function freshPlan() {
  const n = new Date(), k = x => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
  const mon = new Date(n); mon.setDate(n.getDate() - (n.getDay() + 6) % 7);
  const end = new Date(n); end.setFullYear(n.getFullYear() + 1);
  return { version: 1, base: { date: k(n), amount: 0, note: 'Inicio' }, end: k(end), budgets: [{ from: k(mon), to: k(end), max: 0 }], metas: {}, items: [] };
}

function ensurePlan(d) {
  if (!d.plan) d.plan = freshPlan();
  return d;
}

/* ---------- cálculos ---------- */
const NOT_WEEKLY = ['deudas', 'emergencia', 'ajuste'];
const r2 = n => Math.round(n * 100) / 100;
const weekMon = k => dkey(addDays(parseD(k), -wday(parseD(k))));
const budgetFor = k => (db.plan.budgets.find(p => k >= p.from && k <= p.to) || {}).max || 0;

function planCash() {
  let c = db.plan.base.amount;
  for (const t of db.tx) if (t.date >= db.plan.base.date) c += t.type === 'ingreso' ? t.amount : -t.amount;
  return r2(c);
}
function weekSpent(mon) {
  const sun = dkey(addDays(parseD(mon), 6));
  let s = 0;
  for (const t of db.tx) if (t.type === 'gasto' && t.date >= mon && t.date <= sun && !NOT_WEEKLY.includes(t.cat)) s += t.amount;
  return r2(s);
}
function planDebts() {
  const by = {};
  for (const it of db.plan.items) {
    if (it.kind !== 'pago') continue;
    const d = by[it.name] ||= { name: it.name, total: 0, paid: 0, pending: 0, last: '', next: null };
    d.total += it.amount;
    if (it.done) d.paid += it.amount; else { d.pending += it.amount; if (!d.next || it.date < d.next.date) d.next = it; }
    if (it.date > d.last) d.last = it.date;
  }
  return Object.values(by).map(d => ({ ...d, total: r2(d.total), paid: r2(d.paid), pending: r2(d.pending) }))
    .sort((a, b) => (a.pending === 0) - (b.pending === 0) || (a.next?.date || '').localeCompare(b.next?.date || ''));
}

/* Proyección día por día desde hoy hasta el fin del plan. */
function projectPlan() {
  const t = today(), end = db.plan.end;
  let cash = planCash();
  const pend = [...db.plan.items.filter(i => !i.done), ...(typeof billOccurrences === 'function' ? billOccurrences(t, end) : [])].sort((a, b) => a.date.localeCompare(b.date));
  const days = [], weeks = {};
  let min = { amount: Infinity, date: t }, firstNeg = null;
  if (t > end) return { days, weeks, min, firstNeg, cash };
  for (let d = parseD(t); dkey(d) <= end; d = addDays(d, 1)) {
    const k = dkey(d), mon = weekMon(k);
    const ev = [];
    if (k === t || wday(d) === 0) {
      const max = budgetFor(mon) || budgetFor(k);
      const rem = r2(Math.max(0, max - (k === t ? weekSpent(mon) : 0)));
      if (rem) { cash -= rem; ev.push({ name: 'Gasto de la semana', amount: -rem }); }
    }
    const todays = pend.filter(i => (k === t ? i.date <= t : i.date === k));
    for (const i of todays.filter(i => i.kind === 'ingreso')) { cash += i.amount; ev.push({ name: i.name, amount: i.amount, item: i }); }
    const afterIncome = cash;
    for (const i of todays.filter(i => i.kind === 'pago')) { cash -= i.amount; ev.push({ name: i.name, amount: -i.amount, item: i }); }
    cash = r2(cash);
    const low = Math.min(cash, afterIncome);
    if (low < min.amount) min = { amount: r2(low), date: k };
    if (cash < 0 && !firstNeg) firstNeg = { date: k, amount: cash };
    days.push({ date: k, ev, cash });
    weeks[mon] = cash; // queda el valor del último día de la semana (domingo o fin de plan)
  }
  return { days, weeks, min, firstNeg, cash };
}

/* ---------- formato ---------- */
function mxn(n) {
  const neg = n < 0; n = Math.abs(r2(n));
  const s = n.toLocaleString('es-MX', { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 });
  return (neg ? '−$' : '$') + s;
}
const shortD = k => parseD(k).toLocaleDateString('es-MX', { weekday: 'short', day: '2-digit', month: '2-digit' }).replace('.', '');
const rangeD = mon => { const a = parseD(mon); let b = addDays(a, 6); if (db.plan && dkey(b) > db.plan.end) b = parseD(db.plan.end); const f = x => `${pad(x.getDate())}/${pad(x.getMonth() + 1)}`; return `${f(a)} al ${f(b)}`; };

/* ---------- vistas ---------- */
let planShowAll = false;

function planWeekCard(P) {
  const t = today(), mon = weekMon(t);
  const max = budgetFor(mon), spent = weekSpent(mon), rem = r2(max - spent);
  const meta = db.plan.metas[mon];
  const proj = P.weeks[mon];
  const pct = max ? Math.min(100, spent / max * 100) : 0;
  return `<div class="card">
    <h2>Esta semana · ${rangeD(mon)}</h2>
    <div class="stats">
      <div class="stat"><div class="lbl">Puedes gastar</div><div class="val ${rem < 0 ? 'neg' : 'pos'}">${mxn(Math.max(0, rem))}</div></div>
      <div class="stat"><div class="lbl">Dinero hoy</div><div class="val ${P.cash < 0 ? 'neg' : ''}">${mxn(planCash())}</div></div>
      <div class="stat"><div class="lbl">Meta domingo</div><div class="val">${meta != null ? mxn(meta) : '—'}</div></div>
    </div>
    <div class="bar ${spent > max ? 'over' : pct > 80 ? 'warn' : ''}"><i style="width:${pct}%"></i></div>
    <div class="small" style="margin-top:6px">${spent > max ? `Te pasaste ${mxn(spent - max)} del gasto de la semana` : `Llevas ${mxn(spent)} de ${mxn(max)} esta semana`}${proj != null ? ` · Si sigues el plan cierras el domingo con <b>${mxn(proj)}</b>` : ''}</div>
    <div class="row" style="margin-top:12px">
      <button class="btn ghost" data-act="addTx" data-id="gasto">+ Gasto</button>
      <button class="btn ghost" data-act="fixCash">Corregir dinero</button>
    </div>
    <button class="btn ghost block" style="margin-top:8px" data-act="editBudgets">✏️ Ajustar gasto semanal</button>
  </div>`;
}

function planAlert(P) {
  if (!db.plan.items.length && !(db.bills || []).length) return '';
  if (P.firstNeg) {
    return `<div class="card" style="border:2px solid var(--red)">
      <h2 style="color:var(--red)">⚠️ El plan no alcanza</h2>
      <div>El <b>${shortD(P.firstNeg.date)}</b> quedarías en <b class="neg">${mxn(P.firstNeg.amount)}</b>. El punto más bajo es <b class="neg">${mxn(P.min.amount)}</b> el ${shortD(P.min.date)}.</div>
      <div class="small" style="margin-top:8px">Opciones: bajar el gasto semanal de las semanas anteriores, recorrer un pago a después de un cobro, o abonar ese pago en partes. Toca un pago abajo para cambiar su fecha o monto.</div>
    </div>`;
  }
  if (P.min.amount < 500 && P.min.amount !== Infinity) {
    return `<div class="card" style="border:2px solid var(--amber)">
      <h2 style="color:var(--amber)">Semana justa</h2>
      <div>El punto más bajo del plan es <b>${mxn(P.min.amount)}</b> el ${shortD(P.min.date)}. Ahí cualquier imprevisto rompe el plan.</div>
    </div>`;
  }
  return '';
}

function planItemRow(i) {
  if (i.bill) return `<li><div class="grow" data-act="go" data-id="pagos"><div class="t">🧾 ${esc(i.name)}${i.date < today() || i.late ? ' <span class="next-badge" style="color:var(--red);background:transparent;border:1px solid var(--red)">ATRASADO</span>' : ''}</div><div class="s">${shortD(i.date)} · Pago fijo</div></div><div class="amt">−${mxn(i.amount)}</div><button class="check" data-act="payBill" data-id="${i.billId}" aria-label="Pagar"></button></li>`;
  const late = !i.done && i.date < today();
  const isPay = i.kind === 'pago';
  return `<li>
    <div class="grow" data-act="editPlan" data-id="${i.id}">
      <div class="t">${isPay ? '💳' : '💰'} ${esc(i.name)}${late ? ' <span class="next-badge" style="color:var(--red);background:transparent;border:1px solid var(--red)">ATRASADO</span>' : ''}</div>
      <div class="s">${shortD(i.date)}${i.note ? ' · ' + esc(i.note) : ''}</div>
    </div>
    <div class="amt ${isPay ? '' : 'pos'}" style="${i.done ? 'text-decoration:line-through;opacity:.5' : ''}">${isPay ? '−' : '+'}${mxn(i.amount)}</div>
    <button class="check ${i.done ? 'on' : ''}" data-act="togglePlan" data-id="${i.id}" aria-label="${isPay ? 'Marcar pagado' : 'Marcar cobrado'}"></button>
  </li>`;
}

function viewPlan() {
  const P = projectPlan();
  const t = today();
  const pend = [...db.plan.items.filter(i => !i.done), ...(typeof billOccurrences === 'function' ? billOccurrences(t, db.plan.end) : [])].sort((a, b) => a.date.localeCompare(b.date) || (a.kind === 'ingreso' ? -1 : 1));
  const horizon = dkey(addDays(new Date(), 14));
  const upcoming = planShowAll ? pend : pend.filter(i => i.date <= horizon);
  const debts = planDebts();
  const totalPend = r2(debts.reduce((a, d) => a + d.pending, 0));
  const totalAll = r2(debts.reduce((a, d) => a + d.total, 0));
  const weeksKeys = Object.keys(P.weeks);

  const intro = db.plan.items.length ? '' : `<div class="card">
      <h2>👋 Arma tu plan</h2>
      <div class="small">1. Toca <b>Corregir dinero</b> y escribe cuánto tienes hoy.<br>2. Toca <b>Ajustar gasto semanal</b> y pon cuánto puedes gastar por semana.<br>3. Agrega tus ingresos con <b>+ Ingreso</b> (puedes hacer que se repitan cada semana o cada mes).<br>4. Agrega lo que debes con <b>+ Nueva deuda</b>. La app calcula día por día si te alcanza.</div>
    </div>`;
  return `
    ${intro}
    ${planAlert(P)}
    ${planWeekCard(P)}
    <div class="card">
      <h2>${planShowAll ? 'Todo lo pendiente' : 'Próximos 14 días'} <button class="link" data-act="planAll">${planShowAll ? 'Ver menos' : 'Ver todo'}</button></h2>
      ${upcoming.length ? `<ul class="list">${upcoming.map(planItemRow).join('')}</ul>` : '<div class="empty">Nada pendiente en estos días.</div>'}
      <div class="row" style="margin-top:10px">
        <button class="btn ghost" data-act="addPlan" data-id="pago">+ Pago</button>
        <button class="btn ghost" data-act="addPlan" data-id="ingreso">+ Ingreso</button>
      </div>
    </div>
    ${(() => {
      const done = db.plan.items.filter(i => i.done && db.tx.some(t => t.planId === i.id))
        .sort((x, y) => (db.tx.find(t => t.planId === y.id)?.created || 0) - (db.tx.find(t => t.planId === x.id)?.created || 0)).slice(0, 6);
      return done.length ? `<div class="card"><h2>Ya marcados</h2>
        <div class="small" style="margin-bottom:4px">¿Marcaste algo por error? Toca la palomita para regresarlo a pendiente.</div>
        <ul class="list">${done.map(planItemRow).join('')}</ul></div>` : '';
    })()}
    <div class="card">
      <h2>Deudas <button class="link" data-act="newDebt">+ Nueva deuda</button></h2>
      <div class="small">Faltan <b>${mxn(totalPend)}</b></div>
      <div class="bar"><i style="width:${totalAll ? (1 - totalPend / totalAll) * 100 : 0}%;background:var(--green)"></i></div>
      <div class="small" style="margin:6px 0 4px">Llevas ${mxn(r2(totalAll - totalPend))} pagados de ${mxn(totalAll)}</div>
      <ul class="list">${debts.map(d => `<li>
        <div class="grow"><div class="t">${d.pending ? '' : '✅ '}${esc(d.name)}</div>
        <div class="s">${d.pending ? `Siguiente: ${shortD(d.next.date)} · ${mxn(d.next.amount)} · Último pago ${shortD(d.last)}` : `Pagada el ${shortD(d.last)}`}</div></div>
        <div class="amt">${d.pending ? mxn(d.pending) : 'Pagada'}</div></li>`).join('')}</ul>
    </div>
    ${db.plan.items.length ? `
    <div class="card">
      <h2>Semana por semana</h2>
      <div class="small" style="margin-bottom:6px">Dinero al domingo si gastas justo tu máximo.</div>
      <ul class="list">${weeksKeys.map(mon => {
        const meta = db.plan.metas[mon], p = P.weeks[mon];
        const ok = p >= 0 && (meta == null || p >= meta - 1);
        return `<li><div class="grow"><div class="t" style="font-size:14px">${rangeD(mon)}</div><div class="s">Gasto máx ${mxn(budgetFor(mon))}${meta != null ? ` · Meta ${mxn(meta)}` : ''}</div></div>
          <div class="amt ${p < 0 ? 'neg' : ok ? '' : ''}" style="${!ok && p >= 0 ? 'color:var(--amber)' : ''}">${mxn(p)}</div></li>`;
      }).join('')}</ul>
      <div class="small" style="margin-top:8px">Al ${shortD(db.plan.end)} quedarías sin deudas y con unos <b>${mxn(Math.round(P.cash))}</b>${P.cash >= 0 ? ' ahorrados' : ''}, sin contar recargos por atraso.</div>
    </div>` : ''}`;
}

/* Tarjeta compacta para Inicio */
function planHomeCard() {
  const P = projectPlan(), t = today(), mon = weekMon(t);
  const rem = r2(budgetFor(mon) - weekSpent(mon));
  const next = db.plan.items.filter(i => !i.done && i.kind === 'pago').sort((a, b) => a.date.localeCompare(b.date))[0];
  return `<div class="card" ${P.firstNeg ? 'style="border:2px solid var(--red)"' : ''}>
    <h2>Plan de deudas <button class="link" data-act="goPlan">Ver plan</button></h2>
    <div class="stats">
      <div class="stat"><div class="lbl">Puedes gastar</div><div class="val ${rem < 0 ? 'neg' : 'pos'}">${mxn(Math.max(0, rem))}</div></div>
      <div class="stat"><div class="lbl">Dinero hoy</div><div class="val">${mxn(planCash())}</div></div>
      <div class="stat"><div class="lbl">Meta domingo</div><div class="val">${db.plan.metas[mon] != null ? mxn(db.plan.metas[mon]) : '—'}</div></div>
    </div>
    ${next ? `<div class="small" style="margin-top:10px">Próximo pago: <b>${esc(next.name)} ${mxn(next.amount)}</b> el ${shortD(next.date)}${next.date < t ? ' <b class="neg">(atrasado)</b>' : ''}</div>` : '<div class="small" style="margin-top:10px">🎉 Sin pagos pendientes</div>'}
    ${P.firstNeg ? `<div class="small neg" style="margin-top:6px">⚠️ El ${shortD(P.firstNeg.date)} quedarías en ${mxn(P.firstNeg.amount)}</div>` : ''}
  </div>`;
}

/* ---------- acciones ---------- */
async function togglePlanItem(id) {
  const i = db.plan.items.find(x => x.id === id); if (!i) return;
  if (!i.done) {
    i.done = true;
    {
      // registra el movimiento real con fecha de hoy (o la del plan si ya pasó y es anterior)
      const date = today();
      db.tx.push({ id: uid(), created: Date.now(), planId: i.id, type: i.kind === 'pago' ? 'gasto' : 'ingreso', cat: i.kind === 'pago' ? 'deudas' : 'sueldo', amount: i.amount, note: i.name, date });
    }
    save(); render();
    toast(i.kind === 'pago' ? 'Pago marcado ✅' : 'Cobro marcado 💰', () => { i.done = false; db.tx = db.tx.filter(t => t.planId !== i.id); save(); render(); toast('Listo, se deshizo'); });
    return;
  } else {
    if (!(await ask(`¿Desmarcar "${i.name}"? Se quitará el movimiento registrado y volverá a pendiente.`, 'Sí, desmarcar'))) return;
    i.done = false;
    db.tx = db.tx.filter(t => t.planId !== i.id);
  }
  save(); render();
}

function openPlanItem(id, kind = 'pago') {
  const i = id ? db.plan.items.find(x => x.id === id) : null;
  kind = i?.kind || kind;
  const names = [...new Set(db.plan.items.filter(x => x.kind === kind).map(x => x.name))];
  openSheet(`
    <h3>${i ? (kind === 'pago' ? 'Pago del plan' : 'Ingreso del plan') : (kind === 'pago' ? 'Nuevo pago' : 'Nuevo ingreso')}</h3>
    <form id="f">
      <label class="field"><span>${kind === 'pago' ? 'Deuda' : 'De dónde viene'}</span><input name="name" list="pnames" maxlength="40" value="${esc(i?.name || '')}" required>
        <datalist id="pnames">${names.map(n => `<option value="${esc(n)}">`).join('')}</datalist></label>
      <div class="row2">
        <label class="field"><span>Monto</span><input name="amount" type="number" inputmode="decimal" step="0.01" min="0" value="${i?.amount ?? ''}" required></label>
        <label class="field"><span>Fecha</span><input name="date" type="date" value="${i?.date || today()}" required></label>
      </div>
      ${i ? '' : `<div class="row2">
        <label class="field"><span>Se repite</span><select name="rep"><option value="no">No, solo una vez</option><option value="semanal">Cada semana</option><option value="quincenal">Cada 2 semanas</option><option value="mensual">Cada mes</option></select></label>
        <label class="field"><span>Hasta</span><input name="until" type="date" value="${db.plan.end}"></label>
      </div>`}
      <label class="field"><span>Nota (opcional)</span><input name="note" maxlength="80" value="${esc(i?.note || '')}"></label>
      ${i?.done ? '<p class="small">Ya está marcado como hecho. Si cambias el monto, desmárcalo y vuelve a marcarlo.</p>' : ''}
      <button class="btn block">Guardar y recalcular</button>
      ${i && !i.done && kind === 'pago' ? `<button type="button" class="btn ghost block" id="split" style="margin-top:8px">Dividir en dos abonos</button>` : ''}
      ${i ? `<button type="button" class="btn danger block" id="del">Quitar del plan</button>` : ''}
    </form>`, s => {
    const f = $('#f', s);
    f.addEventListener('submit', e => {
      e.preventDefault();
      const amount = r2(parseFloat(f.amount.value));
      if (!(amount > 0)) { toast('Escribe un monto'); return; }
      const data = { name: f.name.value.trim(), amount, date: f.date.value, note: f.note.value.trim() };
      if (i) Object.assign(i, data);
      else {
        const rep = f.rep ? f.rep.value : 'no', until = f.until?.value || db.plan.end;
        const first = parseD(data.date);
        for (let k = 0; k < 120; k++) {
          let d;
          if (rep === 'semanal') d = addDays(first, 7 * k);
          else if (rep === 'quincenal') d = addDays(first, 14 * k);
          else if (rep === 'mensual') { d = new Date(first.getFullYear(), first.getMonth() + k, 1); d.setDate(Math.min(first.getDate(), new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate())); }
          else if (k) break; else d = first;
          if (k && dkey(d) > until) break;
          db.plan.items.push({ id: uid(), kind, done: false, ...data, date: dkey(d) });
        }
      }
      const last = db.plan.items.map(x => x.date).sort().pop();
      if (last && last > db.plan.end) db.plan.end = last;
      save(); closeSheet(); render(); toast('Plan recalculado');
    });
    $('#split', s)?.addEventListener('click', () => {
      const first = r2(i.amount / 2), second = r2(i.amount - first);
      const nd = dkey(addDays(parseD(i.date), 7));
      i.amount = first; i.note = (i.note ? i.note + '; ' : '') + 'abono 1 de 2';
      db.plan.items.push({ id: uid(), kind: 'pago', done: false, name: i.name, amount: second, date: nd, note: 'abono 2 de 2' });
      save(); closeSheet(); render(); toast('Dividido: el 2º abono quedó una semana después');
    });
    $('#del', s)?.addEventListener('click', async () => {
      if (!(await ask('¿Quitar este movimiento del plan?'))) return;
      db.plan.items = db.plan.items.filter(x => x.id !== i.id);
      db.tx = db.tx.filter(t => t.planId !== i.id);
      save(); closeSheet(); render(); toast('Quitado del plan');
    });
  });
}

function openFixCash() {
  const cur = planCash();
  openSheet(`
    <h3>Corregir dinero</h3>
    <p class="small">Hoy la app calcula que tienes <b>${mxn(cur)}</b>. Si en realidad tienes otra cantidad, escríbela y se guarda un ajuste para que el plan se recalcule desde hoy.</p>
    <form id="f">
      <label class="field"><span>¿Cuánto dinero tienes ahorita?</span><input class="big-amount" name="amount" type="number" inputmode="decimal" step="0.01" value="${cur}" required></label>
      <label class="field"><span>Motivo (opcional)</span><input name="note" maxlength="60" placeholder="Ej. gasto que no anoté"></label>
      <button class="btn block">Guardar</button>
    </form>`, s => {
    const f = $('#f', s);
    f.addEventListener('submit', e => {
      e.preventDefault();
      const real = r2(parseFloat(f.amount.value));
      if (isNaN(real)) return;
      const diff = r2(real - cur);
      if (diff) db.tx.push({ id: uid(), created: Date.now(), type: diff > 0 ? 'ingreso' : 'gasto', cat: 'ajuste', amount: Math.abs(diff), note: f.note.value.trim() || 'Ajuste de saldo', date: today() });
      save(); closeSheet(); render(); toast('Dinero corregido');
    });
  });
}

/* ---------- Conexión con Finanzas ---------- */
function openPlanTx(t) {
  const i = db.plan.items.find(x => x.id === t.planId);
  openSheet(`
    <h3>${t.type === 'ingreso' ? 'Ingreso del plan' : 'Pago de deuda'}</h3>
    <ul class="list">
      <li><div class="grow"><div class="t">${esc(t.note)}</div><div class="s">Registrado el ${shortD(t.date)}${i ? ` · programado para ${shortD(i.date)}` : ''}</div></div><div class="amt ${t.type === 'ingreso' ? 'pos' : ''}">${t.type === 'ingreso' ? '+' : '−'}${mxn(t.amount)}</div></li>
    </ul>
    <p class="small">Este movimiento viene de tu plan de deudas. Si fue un error, desmárcalo y regresa a pendiente.</p>
    <div class="row"><button class="btn ghost" id="goplan">Ver en Deudas</button><button class="btn danger" id="undo" style="border:1px solid var(--red)">Desmarcar</button></div>`, s => {
    $('#goplan', s).addEventListener('click', () => { closeSheet(); go('deudas'); });
    $('#undo', s).addEventListener('click', async () => {
      if (!(await ask(`¿Desmarcar "${t.note}"? Vuelve a pendiente en tu plan.`, 'Sí, desmarcar'))) return;
      if (i) i.done = false;
      db.tx = db.tx.filter(x => x.id !== t.id);
      save(); closeSheet(); render(); toast('Regresó a pendiente');
    });
  });
}

function openPayDebt() {
  const pend = db.plan.items.filter(i => i.kind === 'pago' && !i.done).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 12);
  openSheet(`
    <h3>Registrar pago de deuda</h3>
    <p class="small">Elige el pago que hiciste. Se marca en tu plan y queda en tu actividad.</p>
    ${pend.length ? `<ul class="list">${pend.map(i => `<li>
      <div class="grow"><div class="t">💳 ${esc(i.name)}${i.date < today() ? ' <span class="neg small">atrasado</span>' : ''}</div><div class="s">${shortD(i.date)}${i.note ? ' · ' + esc(i.note) : ''}</div></div>
      <div class="amt">${mxn(i.amount)}</div><button class="btn" style="padding:8px 12px" data-pay="${i.id}">Pagar</button></li>`).join('')}</ul>` : '<div class="empty">No tienes pagos pendientes 🎉</div>'}
    <p class="small" style="margin-top:12px">¿Es una deuda que no está en tu plan? <button class="link" id="nd">Agrégala aquí</button></p>`, s => {
    s.addEventListener('click', e => {
      const b = e.target.closest('[data-pay]'); if (!b) return;
      closeSheet(); togglePlanItem(b.dataset.pay);
    });
    $('#nd', s).addEventListener('click', () => openNewDebt());
  });
}

function openNewDebt() {
  openSheet(`
    <h3>Nueva deuda</h3>
    <form id="f">
      <label class="field"><span>¿A quién le debes?</span><input name="name" maxlength="40" placeholder="Ej. Tarjeta de crédito, Préstamo" required></label>
      <div class="row2">
        <label class="field"><span>Monto de cada pago</span><input name="amount" type="number" inputmode="decimal" step="0.01" min="0" required></label>
        <label class="field"><span>Número de pagos</span><input name="n" type="number" inputmode="numeric" min="1" max="60" value="1" required></label>
      </div>
      <div class="row2">
        <label class="field"><span>Primer pago</span><input name="date" type="date" value="${today()}" required></label>
        <label class="field"><span>Cada cuánto</span><select name="freq"><option value="mensual">Cada mes</option><option value="quincenal">Cada 15 días</option><option value="semanal">Cada semana</option></select></label>
      </div>
      <div class="small" id="sum" style="margin:-4px 0 12px"></div>
      <label class="field"><span>Nota (opcional)</span><input name="note" maxlength="80"></label>
      <button class="btn block">Agregar al plan y recalcular</button>
    </form>`, s => {
    const f = $('#f', s);
    setTimeout(() => f.name.focus(), 250);
    const upd = () => { const a = +f.amount.value || 0, n = +f.n.value || 0; $('#sum', s).innerHTML = a && n ? `Total de la deuda: <b>${mxn(r2(a * n))}</b>` : ''; };
    f.addEventListener('input', upd);
    f.addEventListener('submit', e => {
      e.preventDefault();
      const name = f.name.value.trim(), amount = r2(+f.amount.value), n = Math.max(1, Math.min(60, +f.n.value || 1));
      if (!name || !(amount > 0)) return;
      const first = parseD(f.date.value);
      for (let k = 0; k < n; k++) {
        let d;
        if (f.freq.value === 'semanal') d = addDays(first, 7 * k);
        else if (f.freq.value === 'quincenal') d = addDays(first, 15 * k);
        else { d = new Date(first.getFullYear(), first.getMonth() + k, 1); const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(); d.setDate(Math.min(first.getDate(), last)); }
        db.plan.items.push({ id: uid(), kind: 'pago', date: dkey(d), name, amount, done: false, note: [f.note.value.trim(), n > 1 ? `pago ${k + 1} de ${n}` : ''].filter(Boolean).join(' · ') });
      }
      const lastDate = db.plan.items.filter(i => i.name === name).map(i => i.date).sort().pop();
      if (lastDate > db.plan.end) db.plan.end = lastDate;
      save(); closeSheet(); go('deudas');
      const P = projectPlan();
      toast(P.firstNeg ? `⚠️ Con esta deuda el ${shortD(P.firstNeg.date)} quedas en ${mxn(P.firstNeg.amount)}` : 'Deuda agregada, el plan sigue alcanzando');
    });
  });
}

/* ---------- Editar gasto semanal ---------- */
function openBudgets() {
  let rows = db.plan.budgets.map(b => ({ ...b }));
  const t = today(), mon = weekMon(t);
  const draw = () => rows.map((b, i) => `<div class="bud-row">
      <label class="field"><span>Desde</span><input type="date" data-i="${i}" data-f="from" value="${b.from}"></label>
      <label class="field"><span>Hasta</span><input type="date" data-i="${i}" data-f="to" value="${b.to}"></label>
      <label class="field"><span>Máx.</span><input type="number" inputmode="decimal" min="0" step="10" data-i="${i}" data-f="max" value="${b.max}"></label>
      <button type="button" class="link" style="color:var(--red)" data-del="${i}" aria-label="Quitar periodo">✕</button>
    </div>`).join('');
  openSheet(`<h3>Gasto semanal</h3>
    <p class="small">Esta semana puedes gastar <b>${mxn(budgetFor(mon))}</b>. Cambia el monto de cada periodo y el plan se recalcula día por día.</p>
    <form id="f"><div id="rows">${draw()}</div>
      <button type="button" class="link" id="add" style="margin-bottom:12px">+ Agregar periodo</button>
      <div id="prev" class="small" style="margin-bottom:12px"></div>
      <button class="btn block">Guardar y recalcular</button>
    </form>`, s => {
    const f = $('#f', s), box = $('#rows', s), prev = $('#prev', s);
    const preview = () => {
      const old = db.plan.budgets; db.plan.budgets = rows.filter(r => r.from && r.to);
      const P = projectPlan(); db.plan.budgets = old;
      prev.innerHTML = P.firstNeg ? `<span class="neg">⚠️ Así el plan no alcanza: el ${shortD(P.firstNeg.date)} quedarías en ${mxn(P.firstNeg.amount)}.</span>`
        : `✅ El plan alcanza. Punto más bajo ${mxn(P.min.amount)} el ${shortD(P.min.date)}. Al ${shortD(db.plan.end)} tendrías ${mxn(Math.round(P.cash))}.`;
    };
    box.addEventListener('input', e => { const el = e.target; if (!el.dataset.f) return; rows[+el.dataset.i][el.dataset.f] = el.dataset.f === 'max' ? Math.max(0, +el.value || 0) : el.value; preview(); });
    box.addEventListener('click', e => { const d = e.target.closest('[data-del]'); if (!d) return; rows.splice(+d.dataset.del, 1); box.innerHTML = draw(); preview(); });
    $('#add', s).addEventListener('click', () => {
      const last = rows[rows.length - 1];
      const from = last ? dkey(addDays(parseD(last.to), 1)) : mon;
      rows.push({ from, to: dkey(addDays(parseD(from), 27)), max: last?.max || 0 });
      box.innerHTML = draw(); preview();
    });
    preview();
    f.addEventListener('submit', e => {
      e.preventDefault();
      const clean = rows.filter(r => r.from && r.to && r.to >= r.from).sort((a, b) => a.from.localeCompare(b.from));
      if (!clean.length) { toast('Deja al menos un periodo'); return; }
      db.plan.budgets = clean; save(); closeSheet(); render();
      const P = projectPlan();
      toast(P.firstNeg ? `⚠️ Guardado, pero el ${shortD(P.firstNeg.date)} quedarías en ${mxn(P.firstNeg.amount)}` : 'Gasto semanal actualizado ✅');
    });
  });
}
