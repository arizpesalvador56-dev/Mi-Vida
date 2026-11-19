'use strict';
/* ============ Extras: Ejercicio, Candado PIN, Respaldo, Pagos fijos, Ahorro, Enfoque, Frase del día ============
   (se carga después de game.js y antes de app.js) */

function ensureExtras(d) {
  d.workouts ||= [];       // [{id, date, name, ex:[{name, sets:[{reps, weight}]}], dur}]
  d.wtemplates ||= [];     // [{id, name, ex:[name]}]
  d.activeWorkout ||= null;
  d.bills ||= [];          // [{id, name, e, amount, day, kind, paid:{'YYYY-MM': 'YYYY-MM-DD'}}]
  d.savings ||= [];        // [{id, name, e, target, deadline, moves:[{id, amount, date}]}]
  d.focus ||= [];          // [{id, date, min, label}]
  d.focusTimer ||= null;   // {end, mode:'work'|'break', dur, label, pausedLeft}
  for (const t of d.tx || []) if (t.billId && t.cat !== 'fijos') t.cat = 'fijos';
  for (const b of d.bills) if (!b.start) b.start = Object.keys(b.paid || {}).sort()[0] || null;
  return d;
}
NOT_WEEKLY.push('ahorro', 'fijos');

/* ============ 1. EJERCICIO ============ */
const EX_SUGGEST = ['Press de banca', 'Sentadilla', 'Peso muerto', 'Press militar', 'Dominadas', 'Remo con barra', 'Curl de bíceps', 'Extensión de tríceps', 'Prensa', 'Zancadas', 'Elevaciones laterales', 'Jalón al pecho', 'Abdominales', 'Plancha (seg)', 'Correr (min)', 'Bicicleta (min)'];
const knownExercises = () => [...new Set([...EX_SUGGEST, ...db.workouts.flatMap(w => w.ex.map(e => e.name)), ...db.wtemplates.flatMap(t => t.ex)])];
function exHistory(name) { // [{date, max, vol}]
  return db.workouts.filter(w => w.ex.some(e => e.name === name)).sort((a, b) => a.date.localeCompare(b.date)).map(w => {
    const sets = w.ex.filter(e => e.name === name).flatMap(e => e.sets);
    return { date: w.date, max: Math.max(0, ...sets.map(s => +s.weight || 0)), reps: Math.max(0, ...sets.map(s => +s.reps || 0)), vol: sets.reduce((a, s) => a + (+s.weight || 0) * (+s.reps || 0), 0) };
  });
}
function exRecords() {
  const out = {};
  for (const w of db.workouts) for (const e of w.ex) for (const s of e.sets) {
    const r = out[e.name] ||= { name: e.name, weight: 0, reps: 0, date: w.date };
    if ((+s.weight || 0) > r.weight || ((+s.weight || 0) === r.weight && (+s.reps || 0) > r.reps)) Object.assign(r, { weight: +s.weight || 0, reps: +s.reps || 0, date: w.date });
  }
  return Object.values(out).sort((a, b) => b.date.localeCompare(a.date));
}

function viewEjercicio() {
  const t = today(), mon = weekMon(t), mk = mkey();
  const week = db.workouts.filter(w => w.date >= mon).length, month = db.workouts.filter(w => w.date.startsWith(mk)).length;
  const weeksActive = (() => { const has = m => db.workouts.some(w => w.date >= m && w.date <= dkey(addDays(parseD(m), 6))); let m = has(mon) ? mon : dkey(addDays(parseD(mon), -7)), n = 0; while (has(m) && n < 520) { n++; m = dkey(addDays(parseD(m), -7)); } return n; })();
  const recs = exRecords().slice(0, 8);
  const hist = [...db.workouts].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10);
  const aw = db.activeWorkout;
  return `
    ${aw ? `<button class="card prompt" style="border:2px solid var(--green)" data-act="go" data-id="entreno"><span class="emoji">🏋️</span><span><b>Entreno en curso: ${esc(aw.name)}</b><small>Toca para continuar</small></span></button>` : ''}
    <div class="card"><div class="stats">
      <div class="stat"><div class="lbl">Esta semana</div><div class="val">${week}</div></div>
      <div class="stat"><div class="lbl">Este mes</div><div class="val">${month}</div></div>
      <div class="stat"><div class="lbl">Semanas activas</div><div class="val">🔥 ${weeksActive}</div></div>
    </div></div>
    ${aw ? '' : `<button class="btn block" style="margin-bottom:14px" data-act="startWorkout">▶️ Empezar entreno libre</button>`}
    <div class="card"><h2>Mis rutinas <button class="link" data-act="addTemplate">+ Rutina</button></h2>
      ${db.wtemplates.length ? `<ul class="list">${db.wtemplates.map(tp => `<li><div class="emoji">📋</div>
        <div class="grow" data-act="editTemplate" data-id="${tp.id}"><div class="t">${esc(tp.name)}</div><div class="s">${tp.ex.map(esc).join(' · ')}</div></div>
        ${aw ? '' : `<button class="btn" style="padding:8px 12px" data-act="startWorkout" data-id="${tp.id}">Empezar</button>`}</li>`).join('')}</ul>`
        : '<div class="empty">Crea rutinas como "Pecho y tríceps" o "Pierna" con sus ejercicios, y empiézalas con un toque.</div>'}
    </div>
    ${recs.length ? `<div class="card"><h2>Récords personales 🏆</h2><ul class="list">${recs.map(r => `
      <li data-act="exProgress" data-id="${esc(r.name)}"><div class="grow"><div class="t">${esc(r.name)}</div><div class="s">${ddmm(r.date)} · toca para ver tu progreso</div></div>
      <div class="amt">${r.weight ? r.weight + ' kg' : ''}${r.weight && r.reps ? ' × ' : ''}${r.reps ? r.reps : ''}</div></li>`).join('')}</ul></div>` : ''}
    ${hist.length ? `<div class="card"><h2>Historial</h2><ul class="list">${hist.map(w => {
      const sets = w.ex.reduce((a, e) => a + e.sets.length, 0);
      const vol = w.ex.reduce((a, e) => a + e.sets.reduce((x, s) => x + (+s.weight || 0) * (+s.reps || 0), 0), 0);
      return `<li data-act="viewWorkout" data-id="${w.id}"><div class="emoji">💪</div><div class="grow"><div class="t">${esc(w.name)}</div>
        <div class="s">${dayLabel(w.date)} · ${w.ex.length} ejercicios · ${sets} series${vol ? ` · ${Math.round(vol).toLocaleString('es-MX')} kg movidos` : ''}${w.dur ? ` · ${w.dur} min` : ''}</div></div></li>`;
    }).join('')}</ul></div>` : ''}`;
}

function startWorkout(tid) {
  const tp = tid ? db.wtemplates.find(x => x.id === tid) : null;
  const lastSets = name => { const h = [...db.workouts].sort((a, b) => b.date.localeCompare(a.date)).find(w => w.ex.some(e => e.name === name)); const e = h?.ex.find(e => e.name === name); return e ? e.sets.map(s => ({ reps: s.reps, weight: s.weight, done: false })) : [{ reps: '', weight: '', done: false }]; };
  db.activeWorkout = { id: uid(), name: tp?.name || 'Entreno libre', start: Date.now(), date: today(), ex: (tp?.ex || []).map(n => ({ name: n, sets: lastSets(n) })) };
  save(); go('entreno');
}
function viewEntreno() {
  const w = db.activeWorkout;
  if (!w) { setTimeout(() => go('ejercicio')); return ''; }
  const mins = Math.round((Date.now() - w.start) / 60000);
  return `
    <div class="card" style="display:flex;justify-content:space-between;align-items:center">
      <div><b style="font-size:18px">${esc(w.name)}</b><div class="small">⏱️ ${mins} min · ${w.ex.reduce((a, e) => a + e.sets.filter(s => s.done).length, 0)} series hechas</div></div>
      <button class="link" style="color:var(--red)" data-act="cancelWorkout">Cancelar</button>
    </div>
    <div id="wk">${w.ex.map((e, i) => {
      const pr = exRecords().find(r => r.name === e.name);
      return `<div class="card">
        <h2 style="text-transform:none;letter-spacing:0;font-size:16px;color:var(--text)">${esc(e.name)} <button class="link" style="color:var(--muted)" data-rmex="${i}">Quitar</button></h2>
        ${pr ? `<div class="small" style="margin:-6px 0 8px">Tu récord: ${pr.weight ? pr.weight + ' kg' : ''}${pr.reps ? ' × ' + pr.reps : ''}</div>` : ''}
        <div class="sets"><small>Serie</small><small>Kg</small><small>Reps</small><small></small>
        ${e.sets.map((s, j) => `<span class="setn">${j + 1}</span>
          <input type="number" inputmode="decimal" step="0.5" min="0" value="${s.weight}" data-ei="${i}" data-si="${j}" data-f="weight" placeholder="0">
          <input type="number" inputmode="numeric" min="0" value="${s.reps}" data-ei="${i}" data-si="${j}" data-f="reps" placeholder="0">
          <button class="check ${s.done ? 'on' : ''}" data-done="${i}|${j}" aria-label="Serie hecha"></button>`).join('')}
        </div>
        <button class="link" style="margin-top:8px" data-addset="${i}">+ Serie</button>
      </div>`;
    }).join('')}</div>
    <form class="card" id="addex" style="display:flex;gap:8px"><input name="n" class="search" style="margin:0;flex:1" list="exlist" placeholder="Agregar ejercicio…"><datalist id="exlist">${knownExercises().map(n => `<option value="${esc(n)}">`).join('')}</datalist><button class="btn">+</button></form>
    <button class="btn block" style="background:var(--green)" data-act="finishWorkout">✅ Terminar entreno</button>`;
}
function mountEntreno(v) {
  const w = db.activeWorkout; if (!w) return;
  const wk = $('#wk', v);
  wk?.addEventListener('input', e => { const el = e.target; if (el.dataset.f) { w.ex[+el.dataset.ei].sets[+el.dataset.si][el.dataset.f] = el.value; save(); } });
  wk?.addEventListener('click', e => {
    const d = e.target.closest('[data-done]'), a = e.target.closest('[data-addset]'), r = e.target.closest('[data-rmex]');
    if (d) { const [i, j] = d.dataset.done.split('|').map(Number); const s = w.ex[i].sets[j]; s.done = !s.done; if (s.done && navigator.vibrate) navigator.vibrate(15); save(); render(); }
    if (a) { const sets = w.ex[+a.dataset.addset].sets; const last = sets[sets.length - 1] || {}; sets.push({ reps: last.reps || '', weight: last.weight || '', done: false }); save(); render(); }
    if (r) { w.ex.splice(+r.dataset.rmex, 1); save(); render(); }
  });
  $('#addex', v)?.addEventListener('submit', e => { e.preventDefault(); const n = e.target.n.value.trim(); if (!n) return; w.ex.push({ name: n, sets: [{ reps: '', weight: '', done: false }] }); save(); render(); setTimeout(() => window.scrollTo(0, document.body.scrollHeight), 50); });
}
async function finishWorkout() {
  const w = db.activeWorkout; if (!w) return;
  const ex = w.ex.map(e => ({ name: e.name, sets: e.sets.filter(s => s.done || (s.reps !== '' && +s.reps > 0)).map(s => ({ reps: +s.reps || 0, weight: +s.weight || 0 })) })).filter(e => e.sets.length);
  if (!ex.length) { if (await ask('No registraste ninguna serie. ¿Cancelar el entreno?', 'Sí, cancelar')) { db.activeWorkout = null; save(); go('ejercicio'); } return; }
  const before = Object.fromEntries(exRecords().map(r => [r.name, r.weight]));
  const rec = { id: w.id, date: w.date, name: w.name, ex, dur: Math.round((Date.now() - w.start) / 60000) };
  db.workouts.push(rec); db.activeWorkout = null; save();
  const prs = ex.filter(e => before[e.name] != null && Math.max(...e.sets.map(s => s.weight)) > before[e.name]).map(e => e.name);
  go('ejercicio');
  if (prs.length) celebrate('🏆 ¡Nuevo récord personal!', prs.join(', '));
  else toast('💪 Entreno guardado (+25 XP)');
  if (!db.wtemplates.some(t => t.name === w.name) && w.name === 'Entreno libre' && ex.length >= 2) {
    setTimeout(async () => {
      if (await ask('¿Guardar estos ejercicios como una rutina para repetirla?', 'Guardar rutina')) {
        db.wtemplates.push({ id: uid(), name: `Rutina ${db.wtemplates.length + 1}`, ex: ex.map(e => e.name) }); save(); render(); toast('Rutina guardada: cámbiale el nombre tocándola');
      }
    }, 3200);
  }
}
function openTemplate(id) {
  const tp = id ? db.wtemplates.find(x => x.id === id) : null;
  openSheet(`<h3>${tp ? 'Editar rutina' : 'Nueva rutina'}</h3><form id="f">
    <label class="field"><span>Nombre</span><input name="name" maxlength="40" placeholder="Ej. Pecho y tríceps" value="${esc(tp?.name || '')}" required></label>
    <label class="field"><span>Ejercicios (uno por renglón)</span><textarea name="ex" style="min-height:150px" placeholder="Press de banca&#10;Aperturas&#10;Fondos">${esc(tp?.ex.join('\n') || '')}</textarea></label>
    <div class="chips" id="sug">${EX_SUGGEST.slice(0, 12).map(n => `<button type="button" class="chip" data-n="${esc(n)}">+ ${esc(n)}</button>`).join('')}</div>
    <button class="btn block">Guardar</button>${tp ? '<button type="button" class="btn danger block" id="del">Eliminar rutina</button>' : ''}</form>`, s => {
    const f = $('#f', s);
    $('#sug', s).addEventListener('click', e => { const b = e.target.closest('[data-n]'); if (!b) return; f.ex.value = (f.ex.value.trim() ? f.ex.value.trim() + '\n' : '') + b.dataset.n; });
    f.addEventListener('submit', e => { e.preventDefault(); const d = { name: f.name.value.trim(), ex: f.ex.value.split('\n').map(x => x.trim()).filter(Boolean) }; if (tp) Object.assign(tp, d); else db.wtemplates.push({ id: uid(), ...d }); save(); closeSheet(); render(); });
    $('#del', s)?.addEventListener('click', () => { db.wtemplates = db.wtemplates.filter(x => x.id !== id); save(); closeSheet(); render(); });
  });
}
function openExProgress(name) {
  const h = exHistory(name);
  const ws = h.filter(x => x.max > 0);
  openSheet(`<h3>${esc(name)}</h3>
    ${ws.length > 1 ? `<div class="small">Peso máximo por entreno</div>${sparkline(ws.map(x => x.max))}<div class="small">${ws[0].max} kg → ${ws[ws.length - 1].max} kg (${ws[ws.length - 1].max - ws[0].max >= 0 ? '+' : ''}${(ws[ws.length - 1].max - ws[0].max).toFixed(1)} kg)</div>` : '<p class="small">Haz este ejercicio en más entrenos para ver tu gráfica de progreso.</p>'}
    <ul class="list" style="margin-top:10px">${[...h].reverse().slice(0, 12).map(x => `<li><div class="grow"><div class="t">${dayLabel(x.date)}</div></div><div class="amt">${x.max ? x.max + ' kg' : ''}${x.reps ? ' × ' + x.reps : ''}</div></li>`).join('')}</ul>`);
}
function openWorkoutView(id) {
  const w = db.workouts.find(x => x.id === id); if (!w) return;
  openSheet(`<h3>${esc(w.name)}</h3><div class="small" style="margin-bottom:8px">${fmtDay(w.date)}${w.dur ? ` · ${w.dur} min` : ''}</div>
    ${w.ex.map(e => `<div style="margin-bottom:10px"><b>${esc(e.name)}</b><div class="small">${e.sets.map(s => `${s.weight ? s.weight + 'kg×' : ''}${s.reps}`).join(' · ')}</div></div>`).join('')}
    <div class="row" style="margin-top:10px"><button class="btn ghost" id="tpl">Guardar como rutina</button><button class="btn danger" id="del" style="border:1px solid var(--red)">Eliminar</button></div>`, s => {
    $('#tpl', s).addEventListener('click', () => { db.wtemplates.push({ id: uid(), name: w.name, ex: w.ex.map(e => e.name) }); save(); closeSheet(); render(); toast('Rutina guardada'); });
    $('#del', s).addEventListener('click', async () => { if (!(await ask('¿Eliminar este entreno?'))) return; db.workouts = db.workouts.filter(x => x.id !== id); save(); closeSheet(); render(); });
  });
}

/* ============ 2. CANDADO CON PIN ============ */
async function hashPin(pin) {
  try { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('mivida:' + pin)); return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join(''); }
  catch { let h = 0; for (const c of 'mivida:' + pin) h = (h * 31 + c.charCodeAt(0)) | 0; return 'x' + h; }
}
function storedPinHash() { try { return JSON.parse(localStorage.getItem('mivida-amigo.v1') || '{}').settings?.pinHash || null; } catch { return null; } }
function showLock() {
  if (document.querySelector('.lock')) return;
  const el = document.createElement('div');
  el.className = 'lock';
  el.innerHTML = `<div class="lock-box"><div style="font-size:40px">🔒</div><b>Mi Vida</b><small>Escribe tu PIN</small>
    <div class="pin-dots"><i></i><i></i><i></i><i></i></div>
    <div class="pad">${[1, 2, 3, 4, 5, 6, 7, 8, 9, '', 0, '⌫'].map(k => `<button ${k === '' ? 'disabled style="visibility:hidden"' : ''} data-k="${k}">${k}</button>`).join('')}</div></div>`;
  document.body.append(el);
  let pin = '';
  const paint = () => el.querySelectorAll('.pin-dots i').forEach((d, i) => d.classList.toggle('on', i < pin.length));
  el.querySelector('.pad').addEventListener('click', async e => {
    const b = e.target.closest('[data-k]'); if (!b) return;
    const k = b.dataset.k;
    if (k === '⌫') pin = pin.slice(0, -1); else if (pin.length < 4) pin += k;
    paint();
    if (pin.length === 4) {
      if (await hashPin(pin) === storedPinHash()) { el.remove(); }
      else { el.querySelector('.pin-dots').classList.add('shake'); if (navigator.vibrate) navigator.vibrate(120); setTimeout(() => { pin = ''; paint(); el.querySelector('.pin-dots').classList.remove('shake'); }, 450); }
    }
  });
}
if (storedPinHash()) showLock();
let hiddenAt = 0;
document.addEventListener('visibilitychange', () => {
  if (document.hidden) hiddenAt = Date.now();
  else if (storedPinHash() && Date.now() - hiddenAt > 60000) showLock();
});
function openPinSetup() {
  const has = !!db.settings.pinHash;
  openSheet(`<h3>🔒 Candado con PIN</h3>
    <p class="small">La app te pedirá un PIN de 4 dígitos al abrirla y si regresas después de 1 minuto. Si lo olvidas, solo se puede quitar restaurando un respaldo, así que apúntalo en un lugar seguro.</p>
    <form id="f">
      ${has ? '<label class="field"><span>PIN actual</span><input name="old" type="password" inputmode="numeric" pattern="[0-9]{4}" maxlength="4" required></label>' : ''}
      <label class="field"><span>${has ? 'PIN nuevo (vacío para quitar el candado)' : 'Nuevo PIN'}</span><input name="pin" type="password" inputmode="numeric" pattern="[0-9]{4}" maxlength="4" ${has ? '' : 'required'}></label>
      <label class="field"><span>Repite el PIN</span><input name="pin2" type="password" inputmode="numeric" pattern="[0-9]{4}" maxlength="4"></label>
      <button class="btn block">Guardar</button>
    </form>`, s => {
    const f = $('#f', s);
    f.addEventListener('submit', async e => {
      e.preventDefault();
      if (has && await hashPin(f.old.value) !== db.settings.pinHash) { toast('El PIN actual no es correcto'); return; }
      if (f.pin.value !== f.pin2.value) { toast('Los PIN no coinciden'); return; }
      if (!f.pin.value) { delete db.settings.pinHash; save(); closeSheet(); toast('Candado quitado'); return; }
      if (!/^\d{4}$/.test(f.pin.value)) { toast('Usa 4 números'); return; }
      db.settings.pinHash = await hashPin(f.pin.value); save(); closeSheet(); toast('🔒 Candado activado');
    });
  });
}

/* ============ 3. RESPALDO ============ */
async function doBackup() {
  const name = `mivida-respaldo-${today()}.json`;
  const blob = new Blob([JSON.stringify(db, null, 2)], { type: 'application/json' });
  const file = new File([blob], name, { type: 'application/json' });
  const mark = () => { db.settings.lastBackup = today(); save(); render(); toast('Respaldo listo ✅'); };
  try {
    if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], title: 'Respaldo Mi Vida' }); mark(); return; }
  } catch (err) { if (err.name === 'AbortError') return; }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  mark();
}
function backupDue() {
  const last = db.settings.lastBackup;
  const hasData = db.tx.length || db.habits.length || db.notes.length || db.tasks.length;
  if (!hasData) return false;
  return !last || daysBetween(last, today()) >= 7;
}
function homeBackupCard() {
  if (!backupDue()) return '';
  const last = db.settings.lastBackup;
  return `<div class="card" style="border:2px dashed var(--amber)"><h2 style="color:var(--amber)">💾 Toca respaldar</h2>
    <div class="small" style="margin-bottom:10px">${last ? `Tu último respaldo fue hace ${daysBetween(last, today())} días.` : 'Aún no tienes respaldo.'} Guárdalo en Archivos o mándatelo por WhatsApp o correo, para no perder nada si cambias de celular.</div>
    <button class="btn block" data-act="backup">Descargar respaldo</button></div>`;
}

/* ============ 5. PAGOS FIJOS Y SUSCRIPCIONES ============ */
const BILL_KINDS = { servicio: ['💡', 'Servicio', 'servicios'], suscripcion: ['📺', 'Suscripción', 'subs'], renta: ['🏠', 'Renta / casa', 'casa'], otro: ['📌', 'Otro', 'otro'] };
function billStart(b) { // primer mes que cuenta (YYYY-MM)
  if (b.start) return b.start;
  const t = parseD(today());
  return t.getDate() <= b.day ? mkey(t) : mkey(new Date(t.getFullYear(), t.getMonth() + 1, 1));
}
/* Cobros de pagos fijos pendientes entre dos fechas, para la proyección del plan */
function billOccurrences(from, to) {
  const out = [], t = today();
  for (const b of db.bills) {
    const st = billStart(b);
    for (let d = parseD(st + '-01'); dkey(d) <= to; d = new Date(d.getFullYear(), d.getMonth() + 1, 1)) {
      const ym = mkey(d); if (b.paid?.[ym]) continue;
      const day = Math.min(b.day, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate());
      const k = `${ym}-${pad(day)}`;
      if (k > to) continue;
      out.push({ id: `bill-${b.id}-${ym}`, bill: true, billId: b.id, ym, kind: 'pago', name: b.name, amount: b.amount, date: k < from ? from : k, late: k < t });
    }
  }
  return out;
}
function billNext(b) {
  const occ = billOccurrences(today(), dkey(addDays(new Date(), 400))).filter(o => o.billId === b.id)[0];
  if (occ) { const orig = `${occ.ym}-${pad(Math.min(b.day, new Date(+occ.ym.slice(0, 4), +occ.ym.slice(5), 0).getDate()))}`; return { date: orig, left: daysBetween(today(), orig), paidThisMonth: !!b.paid?.[mkey()], ym: occ.ym }; }
  return { date: today(), left: 0, paidThisMonth: true };
}
function billNextOld(b) {
  const t = parseD(today()), mk = mkey(t);
  const dayIn = (y, m) => Math.min(b.day, new Date(y, m + 1, 0).getDate());
  let d = new Date(t.getFullYear(), t.getMonth(), dayIn(t.getFullYear(), t.getMonth()));
  if (b.paid?.[mk]) d = new Date(t.getFullYear(), t.getMonth() + 1, dayIn(t.getFullYear(), t.getMonth() + 1));
  return { date: dkey(d), left: daysBetween(today(), dkey(d)), paidThisMonth: !!b.paid?.[mk] };
}
function viewPagos() {
  const list = db.bills.map(b => ({ b, n: billNext(b) })).sort((x, y) => x.n.left - y.n.left);
  const monthly = r2(db.bills.reduce((a, b) => a + b.amount, 0));
  const subs = r2(db.bills.filter(b => b.kind === 'suscripcion').reduce((a, b) => a + b.amount, 0));
  return `
    <div class="card"><div class="stats">
      <div class="stat"><div class="lbl">Al mes</div><div class="val">${mxn(monthly)}</div></div>
      <div class="stat"><div class="lbl">Suscripciones</div><div class="val">${mxn(subs)}</div></div>
      <div class="stat"><div class="lbl">Al año</div><div class="val">${mxn(r2(monthly * 12))}</div></div></div>
      ${subs ? `<div class="small" style="margin-top:8px">💡 Tus suscripciones cuestan ${mxn(r2(subs * 12))} al año. ¿Usas todas?</div>` : ''}
    </div>
    <div class="card">${list.length ? `<ul class="list">${list.map(({ b, n }) => {
      const [e, l] = BILL_KINDS[b.kind] || BILL_KINDS.otro;
      return `<li><div class="emoji">${esc(b.e || e)}</div>
        <div class="grow" data-act="editBill" data-id="${b.id}"><div class="t">${esc(b.name)}</div><div class="s">${l} · día ${b.day} · ${n.paidThisMonth ? '<span class="pos">Pagado este mes ✓</span>' : `<span class="${n.left < 0 ? 'neg' : n.left <= 3 ? 'neg' : ''}">${n.left < 0 ? `Venció hace ${-n.left} días` : leftTxt(n.left)}</span>`}</div></div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px"><span class="amt">${mxn(b.amount)}</span>${n.paidThisMonth ? '' : `<button class="link" data-act="payBill" data-id="${b.id}">Pagar</button>`}</div></li>`;
    }).join('')}</ul>` : '<div class="empty">Agrega luz, agua, internet, teléfono, Netflix, Spotify, gym… con el día que te cobran. Entran a tu plan de deudas (no a tu gasto semanal) y te avisamos en Inicio antes de que lleguen.</div>'}</div>
    <button class="fab" data-act="addBill" aria-label="Nuevo pago fijo">+</button>`;
}
function openBill(id) {
  const b = id ? db.bills.find(x => x.id === id) : null; let kind = b?.kind || 'servicio';
  openSheet(`<h3>${b ? 'Editar pago fijo' : 'Nuevo pago fijo'}</h3><form id="f">
    <div class="catpick" id="bk" style="margin-bottom:12px">${Object.entries(BILL_KINDS).map(([k, [e, l]]) => `<button type="button" data-k="${k}" class="${k === kind ? 'on' : ''}"><b>${e}</b>${l.split(' ')[0]}</button>`).join('')}</div>
    <label class="field"><span>Nombre</span><input name="name" maxlength="40" placeholder="Ej. Luz CFE, Netflix, Telcel" value="${esc(b?.name || '')}" required></label>
    <div class="row2"><label class="field"><span>Monto</span><input name="amount" type="number" inputmode="decimal" step="0.01" min="0" value="${b?.amount ?? ''}" required></label>
    <label class="field"><span>Día de cobro</span><input name="day" type="number" inputmode="numeric" min="1" max="31" value="${b?.day || ''}" required></label></div>
    <button class="btn block">Guardar</button>${b ? '<button type="button" class="btn danger block" id="del">Eliminar</button>' : ''}</form>`, s => {
    const f = $('#f', s);
    $('#bk', s).addEventListener('click', e => { const x = e.target.closest('[data-k]'); if (!x) return; kind = x.dataset.k; s.querySelectorAll('#bk button').forEach(z => z.classList.toggle('on', z === x)); });
    f.addEventListener('submit', e => { e.preventDefault(); const d = { name: f.name.value.trim(), amount: r2(+f.amount.value), day: Math.max(1, Math.min(31, +f.day.value)), kind }; if (b) Object.assign(b, d); else { const nb = { id: uid(), paid: {}, ...d }; nb.start = billStart(nb); db.bills.push(nb); } save(); closeSheet(); render(); const P = projectPlan(); if (P.firstNeg) toast(`⚠️ Con este pago fijo el ${shortD(P.firstNeg.date)} quedarías en ${mxn(P.firstNeg.amount)}`); });
    $('#del', s)?.addEventListener('click', () => { db.bills = db.bills.filter(x => x.id !== id); save(); closeSheet(); render(); });
  });
}
async function payBill(id) {
  const b = db.bills.find(x => x.id === id); if (!b) return;
  if (!(await ask(`¿Registrar el pago de ${b.name} por ${mxn(b.amount)}? Se anota en Finanzas y se palomea en tu plan.`, 'Sí, pagado'))) return;
  const n = billNext(b); const ym = n.ym || mkey();
  b.paid ||= {}; b.paid[ym] = today(); b.paidLate ||= {}; if (n.left < 0) b.paidLate[ym] = true;
  db.tx.push({ id: uid(), created: Date.now(), billId: b.id, billYm: ym, type: 'gasto', cat: 'fijos', amount: b.amount, note: b.name, date: today() });
  save(); render(); toast(`${b.name} pagado ✅`);
}
function homeBillsCard() {
  const due = db.bills.map(b => ({ b, n: billNext(b) })).filter(x => x.n.left <= 5).sort((a, b) => a.n.left - b.n.left);
  if (!due.length) return '';
  return `<div class="card"><h2>Pagos fijos por llegar <button class="link" data-act="go" data-id="pagos">Ver</button></h2><ul class="list">${due.map(({ b, n }) => `
    <li><div class="emoji">${(BILL_KINDS[b.kind] || BILL_KINDS.otro)[0]}</div><div class="grow"><div class="t">${esc(b.name)}</div><div class="s ${n.left <= 1 ? 'neg' : ''}">${n.left < 0 ? `Venció hace ${-n.left} días` : leftTxt(n.left)}</div></div>
    <span class="amt">${mxn(b.amount)}</span><button class="link" style="margin-left:8px" data-act="payBill" data-id="${b.id}">Pagar</button></li>`).join('')}</ul></div>`;
}

/* ============ 6. METAS DE AHORRO ============ */
const SAVE_EMOJIS = ['🐷', '🛟', '✈️', '🚗', '🏠', '🎓', '💻', '📱', '🎁', '💍', '🏖️', '💰'];
const saved = s => r2((s.moves || []).reduce((a, m) => a + m.amount, 0));
function viewAhorro() {
  const total = r2(db.savings.reduce((a, s) => a + saved(s), 0));
  return `
    <div class="card" style="text-align:center"><div class="small">Total ahorrado</div><div style="font-size:32px;font-weight:800" class="pos">${mxn(total)}</div>
      <div class="small">Este dinero está apartado: ya no cuenta en tu "dinero hoy".</div></div>
    ${db.savings.length ? db.savings.map(s => {
      const v = saved(s), pct = s.target ? Math.min(100, v / s.target * 100) : 0;
      const left = s.deadline ? daysBetween(today(), s.deadline) : null;
      const perWeek = s.deadline && left > 0 && s.target > v ? r2((s.target - v) / Math.max(1, left / 7)) : null;
      return `<div class="card"><div style="display:flex;align-items:center;gap:12px">
        <span class="emoji" style="width:48px;height:48px;font-size:26px">${esc(s.e || '🐷')}</span>
        <div class="grow" style="flex:1" data-act="editSaving" data-id="${s.id}"><b>${esc(s.name)}</b><div class="small">${mxn(v)} de ${mxn(s.target)}${pct >= 100 ? ' · 🎉 ¡Lograda!' : ''}</div></div>
        <b>${Math.round(pct)}%</b></div>
        <div class="bar" style="height:10px"><i style="width:${pct}%;background:var(--green)"></i></div>
        ${perWeek ? `<div class="small" style="margin-top:6px">Para llegar el ${ddmm(s.deadline)} necesitas ${mxn(perWeek)} por semana.</div>` : ''}
        <div class="row" style="margin-top:10px"><button class="btn ghost" data-act="saveMove" data-id="${s.id}|1">+ Depositar</button><button class="btn ghost" data-act="saveMove" data-id="${s.id}|-1" ${v > 0 ? '' : 'disabled'}>− Retirar</button></div>
      </div>`;
    }).join('') : `<div class="card empty">Crea alcancías como "Fondo de emergencia" o "Viaje". Ponles una meta y ve guardando poco a poco.</div>`}
    <button class="fab" data-act="addSaving" aria-label="Nueva alcancía">+</button>`;
}
function openSaving(id) {
  const s = id ? db.savings.find(x => x.id === id) : null; let e = s?.e || '🐷';
  openSheet(`<h3>${s ? 'Editar alcancía' : 'Nueva alcancía'}</h3><form id="f">
    <div class="catpick" id="se" style="grid-template-columns:repeat(6,1fr);margin-bottom:12px">${SAVE_EMOJIS.map(x => `<button type="button" data-e="${x}" class="${x === e ? 'on' : ''}"><b>${x}</b></button>`).join('')}</div>
    <label class="field"><span>Nombre</span><input name="name" maxlength="40" placeholder="Ej. Fondo de emergencia" value="${esc(s?.name || '')}" required></label>
    <div class="row2"><label class="field"><span>Meta</span><input name="target" type="number" inputmode="decimal" min="1" value="${s?.target || ''}" required></label>
    <label class="field"><span>Para cuándo (opcional)</span><input name="deadline" type="date" value="${s?.deadline || ''}"></label></div>
    <button class="btn block">Guardar</button>${s ? '<button type="button" class="btn danger block" id="del">Eliminar alcancía</button>' : ''}</form>`, sh => {
    const f = $('#f', sh);
    $('#se', sh).addEventListener('click', ev => { const b = ev.target.closest('[data-e]'); if (!b) return; e = b.dataset.e; sh.querySelectorAll('#se button').forEach(z => z.classList.toggle('on', z === b)); });
    f.addEventListener('submit', ev => { ev.preventDefault(); const d = { e, name: f.name.value.trim(), target: r2(+f.target.value), deadline: f.deadline.value }; if (s) Object.assign(s, d); else db.savings.push({ id: uid(), moves: [], ...d }); save(); closeSheet(); render(); });
    $('#del', sh)?.addEventListener('click', async () => {
      if (saved(s) > 0 && !(await ask(`Tiene ${mxn(saved(s))}. Al eliminarla ese dinero regresa a tu dinero disponible. ¿Continuar?`))) return;
      if (saved(s) > 0) db.tx.push({ id: uid(), created: Date.now(), type: 'ingreso', cat: 'ahorro', amount: saved(s), note: `Retiro: ${s.name}`, date: today() });
      db.savings = db.savings.filter(x => x.id !== id); save(); closeSheet(); render();
    });
  });
}
function openSaveMove(ref) {
  const [id, sign] = ref.split('|'); const s = db.savings.find(x => x.id === id); if (!s) return;
  const dep = sign === '1';
  openSheet(`<h3>${dep ? 'Depositar en' : 'Retirar de'} ${esc(s.name)}</h3><form id="f">
    <label class="field"><span>Monto</span><input class="big-amount" name="a" type="number" inputmode="decimal" step="0.01" min="0" max="${dep ? '' : saved(s)}" required></label>
    <p class="small">${dep ? `Tienes ${mxn(planCash())} disponibles. Se aparta de tu dinero y no cuenta como gasto de la semana.` : `Hay ${mxn(saved(s))} en esta alcancía.`}</p>
    <button class="btn block">${dep ? 'Depositar' : 'Retirar'}</button></form>`, sh => {
    const f = $('#f', sh); setTimeout(() => f.a.focus(), 250);
    f.addEventListener('submit', e => {
      e.preventDefault(); let a = r2(+f.a.value); if (!(a > 0)) return;
      if (!dep) a = Math.min(a, saved(s));
      s.moves.push({ id: uid(), amount: dep ? a : -a, date: today() });
      db.tx.push({ id: uid(), created: Date.now(), savingId: s.id, type: dep ? 'gasto' : 'ingreso', cat: 'ahorro', amount: a, note: `${dep ? 'Ahorro' : 'Retiro'}: ${s.name}`, date: today() });
      save(); closeSheet(); render();
      const P = projectPlan();
      if (dep && P.firstNeg) toast(`⚠️ Ojo: con este ahorro tu plan quedaría en ${mxn(P.firstNeg.amount)} el ${shortD(P.firstNeg.date)}`);
      else if (dep && saved(s) >= s.target) celebrate(`${s.e} ¡Meta de ahorro lograda!`, `${s.name}: ${mxn(saved(s))}`);
      else toast(dep ? `🐷 +${mxn(a)} ahorrados` : 'Retiro registrado');
    });
  });
}

/* ============ 7. ENFOQUE (POMODORO) ============ */
const FOCUS_PRESETS = [[25, 5], [50, 10], [15, 3]];
let focusPreset = 0, focusTick = null;
function focusLeft() { const t = db.focusTimer; if (!t) return 0; return t.pausedLeft != null ? t.pausedLeft : Math.max(0, t.end - Date.now()); }
const mmss = ms => { const s = Math.ceil(ms / 1000); return `${pad(Math.floor(s / 60))}:${pad(s % 60)}`; };
function viewEnfoque() {
  const t = db.focusTimer, [w, b] = FOCUS_PRESETS[focusPreset];
  const todayMin = db.focus.filter(f => f.date === today()).reduce((a, f) => a + f.min, 0);
  const weekMin = db.focus.filter(f => f.date >= weekMon(today())).reduce((a, f) => a + f.min, 0);
  const total = t ? t.dur * 60000 : w * 60000, left = t ? focusLeft() : w * 60000;
  const pct = 1 - left / total;
  const R = 110, C = 2 * Math.PI * R;
  const openTasks = db.tasks.filter(x => !x.done).sort(sortTasks).slice(0, 10);
  return `
    <div class="card" style="text-align:center">
      ${t ? `<div class="small" style="margin-bottom:6px">${t.mode === 'work' ? '🎯 Enfocado' : '☕ Descanso'}${t.label ? ': ' + esc(t.label) : ''}</div>` : `<div class="seg" style="margin-bottom:10px">${FOCUS_PRESETS.map(([a, c], i) => `<button class="${i === focusPreset ? 'on' : ''}" data-act="focusPreset" data-id="${i}">${a}/${c} min</button>`).join('')}</div>`}
      <div class="ring"><svg viewBox="0 0 260 260"><circle cx="130" cy="130" r="${R}" fill="none" stroke="var(--line)" stroke-width="14"/>
        <circle id="fring" cx="130" cy="130" r="${R}" fill="none" stroke="${t?.mode === 'break' ? 'var(--green)' : 'var(--accent)'}" stroke-width="14" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - pct)}" transform="rotate(-90 130 130)"/></svg>
        <div id="ftime">${mmss(left)}</div></div>
      ${t ? `<div class="row" style="margin-top:12px">${t.pausedLeft != null ? '<button class="btn" data-act="focusResume">▶️ Seguir</button>' : '<button class="btn ghost" data-act="focusPause">⏸️ Pausa</button>'}<button class="btn danger" data-act="focusStop" style="border:1px solid var(--red)">Terminar</button></div>`
        : `<label class="field" style="text-align:left;margin-top:12px"><span>¿En qué te vas a enfocar?</span><input id="flabel" list="ftasks" maxlength="60" placeholder="Ej. Estudiar cálculo"><datalist id="ftasks">${openTasks.map(x => `<option value="${esc(x.title)}">`).join('')}</datalist></label>
           <button class="btn block" data-act="focusStart">▶️ Empezar ${w} minutos</button>`}
      <div class="small" style="margin-top:10px">Mantén la app abierta o regresa cuando termine: el tiempo sigue corriendo aunque la cierres.</div>
    </div>
    <div class="card"><div class="stats">
      <div class="stat"><div class="lbl">Hoy</div><div class="val">${fmtDur(todayMin) || '0 min'}</div></div>
      <div class="stat"><div class="lbl">Esta semana</div><div class="val">${weekMin ? fmtDur(weekMin) : '0 min'}</div></div>
      <div class="stat"><div class="lbl">Pomodoros</div><div class="val">🍅 ${db.focus.length}</div></div></div></div>
    ${db.focus.length ? `<div class="card"><h2>Últimas sesiones</h2><ul class="list">${[...db.focus].reverse().slice(0, 8).map(f => `<li><div class="emoji">🍅</div><div class="grow"><div class="t">${esc(f.label || 'Enfoque')}</div><div class="s">${dayLabel(f.date)}</div></div><div class="amt">${f.min} min</div></li>`).join('')}</ul></div>` : ''}`;
}
function focusStart(mode, dur, label) { db.focusTimer = { mode, dur, label, end: Date.now() + dur * 60000 }; save(); render(); ensureFocusTick(); }
function ensureFocusTick() {
  if (focusTick) return;
  focusTick = setInterval(() => {
    const t = db.focusTimer;
    if (!t) { clearInterval(focusTick); focusTick = null; return; }
    if (t.pausedLeft != null) return;
    const left = focusLeft();
    const el = document.getElementById('ftime'); if (el) el.textContent = mmss(left);
    const ring = document.getElementById('fring');
    if (ring) { const C = 2 * Math.PI * 110; ring.setAttribute('stroke-dashoffset', C * (left / (t.dur * 60000))); }
    if (left <= 0) focusComplete();
  }, 1000);
}
function focusComplete() {
  const t = db.focusTimer; if (!t) return;
  db.focusTimer = null;
  if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
  if (t.mode === 'work') {
    db.focus.push({ id: uid(), date: today(), min: t.dur, label: t.label || '' });
    save(); render();
    celebrate('🍅 ¡Pomodoro completado!', `+15 XP · ${t.dur} min de enfoque. Toma tu descanso.`);
    const brk = (FOCUS_PRESETS.find(p => p[0] === t.dur) || [0, 5])[1];
    setTimeout(async () => { if (await ask(`¿Empezar descanso de ${brk} minutos?`, 'Sí, descansar')) focusStart('break', brk, ''); }, 3200);
  } else { save(); render(); celebrate('☕ Descanso terminado', '¿Otro pomodoro?'); }
}
function homeFocusCard() {
  const t = db.focusTimer; if (!t) return '';
  return `<button class="card prompt" style="border:2px solid var(--accent)" data-act="go" data-id="enfoque"><span class="emoji">${t.mode === 'work' ? '🍅' : '☕'}</span><span><b>${t.mode === 'work' ? 'Enfocado' : 'Descanso'}${t.label ? ': ' + esc(t.label) : ''}</b><small>Quedan ${mmss(focusLeft())}</small></span></button>`;
}

/* ============ 8. FRASE DEL DÍA ============ */
const QUOTES = [
  'Un pago a la vez, un día a la vez. Así se sale de cualquier deuda.',
  'La disciplina es elegir entre lo que quieres ahora y lo que más quieres.',
  'No tienes que ser extremo, solo constante.',
  'Lo que haces todos los días importa más que lo que haces de vez en cuando.',
  'Cada peso que no gastas hoy es libertad mañana.',
  'Empieza donde estás, usa lo que tienes, haz lo que puedas.',
  'Las rachas no se rompen por un mal día, se rompen por rendirse.',
  'Hoy es un buen día para cumplirle a tu yo del futuro.',
  'Pequeños pasos todos los días llevan a lugares grandes.',
  'La motivación te pone en marcha; el hábito te mantiene avanzando.',
  'No cuentes los días, haz que los días cuenten.',
  'Lo difícil hoy es lo fácil de mañana.',
  'Si te caes, cuenta como entrenamiento. Levántate.',
  'Tu futuro se construye con lo que haces hoy, no mañana.',
  'Gastar menos de lo que ganas es el superpoder más subestimado.',
  'Hecho es mejor que perfecto.',
  'Un mal día no borra todo tu progreso.',
  'El orden en tu dinero trae paz a tu cabeza.',
  'Compárate con quien eras ayer, no con nadie más.',
  'Lo que se mide, mejora.',
  'Primero lo importante, luego lo urgente.',
  'Duerme bien: tu cerebro también necesita su descanso para ganar.',
  'La constancia le gana al talento cuando el talento no es constante.',
  'Hoy no tienes que hacerlo todo, solo lo siguiente.',
  'Cada deuda pagada es una cadena menos.',
  'Tu energía es limitada: inviértela en lo que te acerca a tus metas.',
  'Agradece lo que tienes mientras trabajas por lo que quieres.',
  'Los grandes cambios se ven pequeños mientras los vives.',
  'Si no está en tu agenda, no es prioridad.',
  'Celebra los avances, aunque sean chiquitos.',
  'El mejor momento para empezar fue ayer; el segundo mejor es hoy.',
  'Cuida tu cuerpo, es el único lugar donde vas a vivir.',
  'Ahorrar no es privarte, es escoger qué te importa más.',
  'Hoy siembras, después cosechas.',
  'La paciencia también es parte del plan.',
  'Hazlo por la persona que vas a ser en 6 meses.',
  'El progreso lento sigue siendo progreso.',
  'Sé el tipo de persona que termina lo que empieza.',
  'Tus hábitos de hoy son tu vida de mañana.',
  'Respira. Ordena. Avanza.',
];
function homeQuote() {
  const n = Math.floor(parseD(today()).getTime() / 864e5);
  return `<div class="quote">“${QUOTES[n % QUOTES.length]}”</div>`;
}

/* ============ XP y logros extra ============ */
function extraXp() {
  return [
    ['Ejercicio', db.workouts.length * 25],
    ['Enfoque', db.focus.length * 15],
    ['Ahorro', db.savings.reduce((a, s) => a + (s.moves || []).filter(m => m.amount > 0).length, 0) * 10],
    ['Pagos fijos', db.bills.reduce((a, b) => a + Object.keys(b.paid || {}).filter(k => !b.paidLate?.[k]).length, 0) * 10],
  ];
}
const totalSaved = () => db.savings.reduce((a, s) => a + saved(s), 0);
const prCount = () => { let n = 0; const best = {}; for (const w of [...db.workouts].sort((a, b) => a.date.localeCompare(b.date))) for (const e of w.ex) { const m = Math.max(0, ...e.sets.map(s => s.weight)); if (best[e.name] != null && m > best[e.name]) n++; best[e.name] = Math.max(best[e.name] ?? 0, m); } return n; };
ACHIEVEMENTS.splice(ACHIEVEMENTS.findIndex(a => a.lvl), 0,
  { id: 'gym1', cat: 'Ejercicio', e: '🏋️', t: 'A sudar', d: 'Registra tu primer entreno', tier: 'bronce', p: () => [db.workouts.length, 1] },
  { id: 'gym_pr', cat: 'Ejercicio', e: '📈', t: 'Más fuerte que ayer', d: 'Rompe un récord personal', tier: 'bronce', p: () => [prCount(), 1] },
  { id: 'gym10', cat: 'Ejercicio', e: '💪', t: 'Gym rat', d: '10 entrenos', tier: 'plata', p: () => [db.workouts.length, 10] },
  { id: 'gym_pr10', cat: 'Ejercicio', e: '🦾', t: 'Rompe récords', d: '10 récords personales', tier: 'oro', p: () => [prCount(), 10] },
  { id: 'gym50', cat: 'Ejercicio', e: '🏅', t: 'Atleta', d: '50 entrenos', tier: 'oro', p: () => [db.workouts.length, 50] },
  { id: 'gym150', cat: 'Ejercicio', e: '🦍', t: 'Bestia', d: '150 entrenos', tier: 'diamante', p: () => [db.workouts.length, 150] },
  { id: 'foc1', cat: 'Enfoque', e: '🍅', t: 'Primer tomate', d: 'Completa un pomodoro', tier: 'bronce', p: () => [db.focus.length, 1] },
  { id: 'foc25', cat: 'Enfoque', e: '🧘', t: 'Mente enfocada', d: '25 pomodoros', tier: 'plata', p: () => [db.focus.length, 25] },
  { id: 'foc100', cat: 'Enfoque', e: '🧠', t: 'Modo monje', d: '100 pomodoros', tier: 'oro', p: () => [db.focus.length, 100] },
  { id: 'sav1', cat: 'Ahorro', e: '🐷', t: 'Primer cochinito', d: 'Haz tu primer depósito de ahorro', tier: 'bronce', p: () => [db.savings.some(s => saved(s) > 0) ? 1 : 0, 1] },
  { id: 'sav5k', cat: 'Ahorro', e: '💰', t: 'Colchón', d: 'Junta $5,000 ahorrados', tier: 'plata', p: () => [Math.round(totalSaved()), 5000] },
  { id: 'sav_goal', cat: 'Ahorro', e: '🎉', t: 'Meta de ahorro', d: 'Llena una alcancía', tier: 'oro', p: () => [db.savings.filter(s => s.target && saved(s) >= s.target).length, 1] },
  { id: 'sav25k', cat: 'Ahorro', e: '🏰', t: 'Fortaleza financiera', d: 'Junta $25,000 ahorrados', tier: 'diamante', p: () => [Math.round(totalSaved()), 25000] },
  { id: 'bill6', cat: 'Ahorro', e: '🧾', t: 'Puntual', d: 'Paga 6 pagos fijos a tiempo', tier: 'plata', p: () => [db.bills.reduce((a, b) => a + Object.keys(b.paid || {}).filter(k => !b.paidLate?.[k]).length, 0), 6] },
);

/* ============ Registro ============ */
Object.assign(MORE_TITLES, { ejercicio: 'Ejercicio', entreno: 'Entreno', pagos: 'Pagos fijos', ahorro: 'Metas de ahorro', enfoque: 'Enfoque' });
Object.assign(MORE_PARENT, { ejercicio: 'mas', entreno: 'ejercicio', pagos: 'mas', ahorro: 'mas', enfoque: 'mas' });
Object.assign(MORE_VIEWS, { ejercicio: viewEjercicio, entreno: viewEntreno, pagos: viewPagos, ahorro: viewAhorro, enfoque: viewEnfoque });
Object.assign(MORE_MOUNT, { entreno: mountEntreno, enfoque: () => { if (db.focusTimer) ensureFocusTick(); } });
Object.assign(MORE_ACTIONS, {
  startWorkout: id => startWorkout(id),
  cancelWorkout: async () => { if (await ask('¿Cancelar este entreno? No se guardará.', 'Sí, cancelar')) { db.activeWorkout = null; save(); go('ejercicio'); } },
  finishWorkout: () => finishWorkout(),
  addTemplate: () => openTemplate(),
  editTemplate: id => openTemplate(id),
  exProgress: n => openExProgress(n),
  viewWorkout: id => openWorkoutView(id),
  backup: () => doBackup(),
  pinSetup: () => openPinSetup(),
  addBill: () => openBill(),
  editBill: id => openBill(id),
  payBill: id => payBill(id),
  addSaving: () => openSaving(),
  editSaving: id => openSaving(id),
  saveMove: ref => openSaveMove(ref),
  focusPreset: i => { focusPreset = +i; render(); },
  focusStart: () => { const [w] = FOCUS_PRESETS[focusPreset]; focusStart('work', w, $('#flabel')?.value.trim() || ''); },
  focusPause: () => { const t = db.focusTimer; if (t) { t.pausedLeft = focusLeft(); save(); render(); } },
  focusResume: () => { const t = db.focusTimer; if (t) { t.end = Date.now() + t.pausedLeft; delete t.pausedLeft; save(); render(); ensureFocusTick(); } },
  focusStop: async () => { if (await ask('¿Terminar sin completar? Este pomodoro no contará.', 'Terminar')) { db.focusTimer = null; save(); render(); } },
});
// Revisa el temporizador al abrir/volver a la app
document.addEventListener('DOMContentLoaded', () => { if (typeof db !== 'undefined' && db.focusTimer) { if (db.focusTimer.pausedLeft == null && focusLeft() <= 0) focusComplete(); else ensureFocusTick(); } });
document.addEventListener('visibilitychange', () => { if (!document.hidden && typeof db !== 'undefined' && db.focusTimer && db.focusTimer.pausedLeft == null && focusLeft() <= 0) focusComplete(); });
