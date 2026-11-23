'use strict';
/* ============ Cuentas (tarjetas, efectivo, ahorro) ============
   Se carga después de stitch.js.
   Datos nuevos (se agregan, no cambian lo que ya existe):
   - db.wallets = [{ id, name, kind, last4, start }]
   - cada movimiento puede tener tx.wallet = id de la cuenta.
   Los movimientos sin cuenta (todos los anteriores) cuentan en "Efectivo / principal". */

const WKINDS = {
  debito: ['💳', 'Débito'], credito: ['💳', 'Crédito'], efectivo: ['💵', 'Efectivo'], ahorro: ['🏦', 'Ahorro'],
};
const WMAIN = 'principal';
/* colores de tarjeta (degradados) */
const WCOLORS = {
  esmeralda: ['#064e3b', '#10b981'], cian: ['#164e63', '#06b6d4'], azul: ['#1e3a8a', '#3b82f6'], morado: ['#3b0764', '#8b5cf6'],
  rosa: ['#831843', '#ec4899'], rojo: ['#7f1d1d', '#ef4444'], naranja: ['#7c2d12', '#f97316'], oro: ['#713f12', '#eab308'],
  grafito: ['#111827', '#4b5563'], plata: ['#475569', '#cbd5e1'], negro: ['#000000', '#1f2937'], menta: ['#134e4a', '#5eead4'],
};
const WDEF = { debito: 'azul', credito: 'morado', efectivo: 'esmeralda', ahorro: 'oro' };
const wColor = w => WCOLORS[w.color] || WCOLORS[WDEF[w.kind] || 'azul'];
const wBg = w => { const [a, b] = wColor(w); return `background:linear-gradient(135deg, ${b} 0%, ${a} 100%)`; };
const wallets = () => (db.wallets ||= []);
const wMainName = () => db.settings.walletMainName || 'Efectivo';
const wTxSum = id => r2(db.tx.filter(t => (t.wallet || WMAIN) === id).reduce((a, t) => a + (t.type === 'ingreso' ? t.amount : -t.amount), 0));
/* saldo que se muestra: en crédito es lo que debes (negativo) */
function wBalance(w) {
  if (w.id === WMAIN) return r2(planCash() - wallets().reduce((a, x) => a + (x.kind === 'credito' ? wTxSum(x.id) : (+x.start || 0) + wTxSum(x.id)), 0));
  return r2((w.kind === 'credito' ? -(+w.start || 0) : (+w.start || 0)) + wTxSum(w.id));
}
const wMain = () => ({ id: WMAIN, name: wMainName(), kind: 'efectivo', main: true, color: db.settings.walletMainColor });
const allWallets = () => [wMain(), ...wallets()];
const wById = id => allWallets().find(w => w.id === (id || WMAIN)) || wMain();
const wLabel = w => `${(WKINDS[w.kind] || WKINDS.debito)[0]} ${w.name}`;

function walletsSection() {
  const list = allWallets();
  return `<div class="sec"><h3>Mis cuentas</h3><button class="slink" data-act="wTransfer">⇄ Transferir</button></div>
    <div class="wscroll">${list.map((w, i) => {
      const bal = wBalance(w), [, kl] = WKINDS[w.kind] || WKINDS.debito;
      return `<button class="wcard" style="${wBg(w)}" data-act="wOpen" data-id="${w.id}">
        <div class="wc-top"><span class="wc-kind">${kl}${w.main ? ' · principal' : ''}</span>${w.kind === 'credito' || w.kind === 'debito' ? '<span class="wc-chip"></span>' : `<span class="wc-ico">${(WKINDS[w.kind] || WKINDS.debito)[0]}</span>`}</div>
        <b class="wc-name">${esc(w.name)}</b>
        <div class="wc-bal">${mxn(bal)}</div>
        <div class="wc-foot"><span>${w.last4 ? '•••• ' + esc(w.last4) : (w.kind === 'credito' ? 'Deuda actual' : '&nbsp;')}</span><span class="wc-logo"><i></i><i></i></span></div>
      </button>`;
    }).join('')}
      <button class="wcard add" data-act="wEdit"><span class="fic g">${ico('plus')}</span><b>Agregar cuenta</b><small>Tarjeta, efectivo o ahorro</small></button>
    </div>`;
}

function wPicker(sel, label) {
  return `<div class="field"><span>${label}</span><div class="wpick" id="wpick">${allWallets().map(w => `<button type="button" class="${w.id === sel ? 'on' : ''}" data-w="${w.id}"><b>${(WKINDS[w.kind] || WKINDS.debito)[0]}</b>${esc(w.name)}<small>${mxn(wBalance(w))}</small></button>`).join('')}
    <button type="button" data-w="__new"><b>＋</b>Nueva<small>cuenta</small></button></div></div>`;
}

/* Formulario de gasto/ingreso con la pregunta "¿De dónde salió?" */
openTx = function (id, type = 'gasto') {
  const t = id ? db.tx.find(x => x.id === id) : null;
  const cur = { type: t?.type || type, cat: t?.cat || (type === 'ingreso' ? 'sueldo' : 'comida'), wallet: t ? (t.wallet || WMAIN) : (db.settings.lastWallet || WMAIN) };
  if (!allWallets().some(w => w.id === cur.wallet)) cur.wallet = WMAIN;
  const catsHTML = () => CATS[cur.type].map(([c, e, l]) => `<button type="button" class="${cur.cat === c ? 'on' : ''}" data-c="${c}"><b>${e}</b>${l}</button>`).join('');
  const wLbl = () => cur.type === 'gasto' ? '¿De dónde salió el dinero?' : '¿A dónde entró el dinero?';
  openSheet(`
    <h3>${t ? 'Editar movimiento' : 'Nuevo movimiento'}</h3>
    <form id="f">
      <div class="seg" id="tx-type">
        <button type="button" data-t="gasto" class="${cur.type === 'gasto' ? 'on' : ''}">Gasto</button>
        <button type="button" data-t="ingreso" class="${cur.type === 'ingreso' ? 'on' : ''}">Ingreso</button>
      </div>
      <label class="field"><span>Monto</span><input class="big-amount" name="amount" type="number" inputmode="decimal" step="0.01" min="0" placeholder="0.00" value="${t ? t.amount : ''}" required></label>
      <div id="wbox">${wPicker(cur.wallet, wLbl())}</div>
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
      $('#wbox', s).innerHTML = wPicker(cur.wallet, wLbl());
    });
    $('#catpick', s).addEventListener('click', e => {
      const b = e.target.closest('[data-c]'); if (!b) return;
      cur.cat = b.dataset.c;
      s.querySelectorAll('#catpick button').forEach(x => x.classList.toggle('on', x === b));
    });
    $('#wbox', s).addEventListener('click', e => {
      const b = e.target.closest('[data-w]'); if (!b) return;
      if (b.dataset.w === '__new') { toast('Guarda este movimiento y luego crea la cuenta en Finanzas → Mis cuentas'); return; }
      cur.wallet = b.dataset.w;
      s.querySelectorAll('#wpick button').forEach(x => x.classList.toggle('on', x === b));
    });
    f.addEventListener('submit', e => {
      e.preventDefault();
      const amount = Math.round(parseFloat(f.amount.value.replace(',', '.')) * 100) / 100;
      if (!(amount > 0)) { toast('Escribe un monto'); return; }
      const data = { type: cur.type, cat: cur.cat, amount, note: f.note.value.trim(), date: f.date.value || today() };
      const rec = t || { id: uid(), created: Date.now() };
      Object.assign(rec, data);
      if (cur.wallet === WMAIN) delete rec.wallet; else rec.wallet = cur.wallet;
      if (!t) db.tx.push(rec);
      db.settings.lastWallet = cur.wallet;
      save(); closeSheet(); render(); toast(`${t ? 'Actualizado' : 'Guardado'} · ${wById(cur.wallet).name}`);
    });
    $('#del', s)?.addEventListener('click', async () => {
      if (!(await ask('¿Eliminar este movimiento?'))) return;
      db.tx = db.tx.filter(x => x.id !== id); save(); closeSheet(); render(); toast('Eliminado');
    });
  });
};

/* Crear / editar cuenta */
function openWallet(id) {
  const w = id && id !== WMAIN ? wallets().find(x => x.id === id) : null;
  const isMain = id === WMAIN;
  let kind = w?.kind || (isMain ? 'efectivo' : 'debito');
  let color = (isMain ? db.settings.walletMainColor : w?.color) || '';
  const bal = w ? wBalance(w) : 0;
  openSheet(`
    <h3>${isMain ? 'Cuenta principal' : w ? 'Editar cuenta' : 'Nueva cuenta'}</h3>
    <form id="f">
      <label class="field"><span>Nombre</span><input name="name" maxlength="30" placeholder="Ej. BBVA débito, Nu, Cartera" value="${esc(isMain ? wMainName() : w?.name || '')}" required></label>
      ${isMain ? `<p class="small">Aquí caen tus movimientos de antes y los que no tengan otra cuenta. Su saldo es tu dinero total menos lo que tengas en tus otras cuentas.</p>` : `
      <div class="field"><span>Tipo</span><div class="wkind" id="wk">${Object.entries(WKINDS).map(([k, [e, l]]) => `<button type="button" class="${k === kind ? 'on' : ''}" data-k="${k}"><b>${e}</b>${l}</button>`).join('')}</div></div>
      <label class="field"><span>Últimos 4 dígitos (opcional)</span><input name="last4" maxlength="4" inputmode="numeric" pattern="[0-9]*" value="${esc(w?.last4 || '')}"></label>
      <label class="field"><span id="ballbl">${kind === 'credito' ? '¿Cuánto debes hoy en esta tarjeta?' : '¿Cuánto tienes hoy en esta cuenta?'}</span><input class="big-amount" name="bal" type="number" inputmode="decimal" step="0.01" value="${w ? Math.abs(bal) : ''}" placeholder="0"></label>
      <p class="small" id="balhelp">${kind === 'credito' ? 'Lo que gastes con esta tarjeta sube tu deuda; lo que le pagues la baja.' : 'Ese dinero se separa de tu cuenta principal.'}</p>`}
      <div class="field"><span>Color de la tarjeta</span><div class="wcolors" id="wc">${Object.entries(WCOLORS).map(([k, [a, b]]) => `<button type="button" class="${k === (color || WDEF[kind]) ? 'on' : ''}" data-col="${k}" style="background:linear-gradient(135deg, ${b}, ${a})" aria-label="${k}"></button>`).join('')}</div></div>
      <div class="wprev" id="wprev"></div>
      <button class="btn block">Guardar</button>
      ${w ? `<button type="button" class="btn danger block" id="del">Eliminar cuenta</button>` : ''}
    </form>`, s => {
    const f = $('#f', s);
    const prev = () => { const tmp = { kind, color: color || WDEF[kind] }; $('#wprev', s).innerHTML = `<div class="wcard" style="${wBg(tmp)}"><div class="wc-top"><span class="wc-kind">${WKINDS[kind][1]}</span>${kind === 'credito' || kind === 'debito' ? '<span class="wc-chip"></span>' : `<span class="wc-ico">${WKINDS[kind][0]}</span>`}</div><b class="wc-name">${esc(f.name.value || 'Mi tarjeta')}</b><div class="wc-bal">${mxn(isMain ? wBalance(wMain()) : (kind === 'credito' ? -1 : 1) * (parseFloat(f.bal?.value) || 0))}</div><div class="wc-foot"><span>${f.last4?.value ? '•••• ' + esc(f.last4.value) : '&nbsp;'}</span><span class="wc-logo"><i></i><i></i></span></div></div>`; };
    prev(); f.addEventListener('input', prev);
    $('#wc', s).addEventListener('click', e => {
      const b = e.target.closest('[data-col]'); if (!b) return;
      color = b.dataset.col; s.querySelectorAll('#wc button').forEach(x => x.classList.toggle('on', x === b)); prev();
    });
    $('#wk', s)?.addEventListener('click', e => {
      const b = e.target.closest('[data-k]'); if (!b) return;
      kind = b.dataset.k; s.querySelectorAll('#wk button').forEach(x => x.classList.toggle('on', x === b));
      if (!color) s.querySelectorAll('#wc button').forEach(x => x.classList.toggle('on', x.dataset.col === WDEF[kind])); prev();
      $('#ballbl', s).textContent = kind === 'credito' ? '¿Cuánto debes hoy en esta tarjeta?' : '¿Cuánto tienes hoy en esta cuenta?';
      $('#balhelp', s).textContent = kind === 'credito' ? 'Lo que gastes con esta tarjeta sube tu deuda; lo que le pagues la baja.' : 'Ese dinero se separa de tu cuenta principal.';
    });
    f.addEventListener('submit', e => {
      e.preventDefault();
      const name = f.name.value.trim(); if (!name) return;
      if (isMain) { db.settings.walletMainName = name; if (color) db.settings.walletMainColor = color; save(); closeSheet(); render(); toast('Guardado'); return; }
      const amt = r2(parseFloat(String(f.bal.value).replace(',', '.')) || 0);
      const rec = w || { id: uid() };
      rec.name = name; rec.kind = kind; if (color) rec.color = color; rec.last4 = f.last4.value.replace(/\D/g, '').slice(0, 4);
      const sum = w ? wTxSum(rec.id) : 0;
      rec.start = r2(kind === 'credito' ? amt + sum : amt - sum);
      if (!w) wallets().push(rec);
      save(); closeSheet(); render(); toast(w ? 'Cuenta actualizada' : 'Cuenta creada');
    });
    $('#del', s)?.addEventListener('click', async () => {
      if (!(await ask(`¿Eliminar "${w.name}"? Sus movimientos pasan a ${wMainName()}.`))) return;
      for (const t of db.tx) if (t.wallet === w.id) delete t.wallet;
      db.wallets = wallets().filter(x => x.id !== w.id);
      save(); closeSheet(); render(); toast('Cuenta eliminada');
    });
  });
}

/* Detalle de una cuenta */
function openWalletView(id) {
  const w = wById(id), bal = wBalance(w);
  const txs = db.tx.filter(t => (t.wallet || WMAIN) === w.id).sort((a, b) => b.date.localeCompare(a.date) || (b.created || 0) - (a.created || 0)).slice(0, 25);
  openSheet(`
    <div class="wdet" style="${wBg(w)}"><small>${(WKINDS[w.kind] || WKINDS.debito)[1]}${w.last4 ? ' · •••• ' + esc(w.last4) : ''}</small><b>${esc(w.name)}</b>
      <div class="wc-bal ${bal < 0 ? 'neg' : ''}">${mxn(bal)}</div>${w.kind === 'credito' ? '<small>Lo que debes en esta tarjeta</small>' : ''}</div>
    <div class="row" style="margin:12px 0">
      <button class="btn ghost" id="ed">✏️ Editar</button>
      <button class="btn ghost" id="tr">⇄ Transferir</button>
    </div>
    <h3 style="font-size:16px">Movimientos</h3>
    ${txs.length ? `<ul class="list">${txs.map(t => { const [, e, l] = catInfo(t.type, t.cat); return `<li data-tx="${t.id}"><div class="emoji">${e}</div><div class="grow"><div class="t">${esc(t.note || l)}</div><div class="s">${dayLabel(t.date)} · ${l}</div></div><div class="amt ${t.type === 'ingreso' ? 'pos' : ''}">${t.type === 'ingreso' ? '+' : '−'}${mxn(t.amount)}</div></li>`; }).join('')}</ul>` : '<div class="empty">Aún no hay movimientos en esta cuenta.</div>'}`, s => {
    $('#ed', s).addEventListener('click', () => openWallet(w.id));
    $('#tr', s).addEventListener('click', () => openTransfer(w.id));
    s.querySelectorAll('[data-tx]').forEach(li => li.addEventListener('click', () => openTx(li.dataset.tx)));
  });
}

/* Pasar dinero entre cuentas (por ejemplo, pagar la tarjeta de crédito) */
function openTransfer(fromId) {
  const list = allWallets();
  let from = fromId || WMAIN, to = (list.find(w => w.id !== from && w.kind === 'credito') || list.find(w => w.id !== from) || {}).id;
  if (list.length < 2) { toast('Primero agrega otra cuenta'); openWallet(); return; }
  const opts = sel => list.map(w => `<option value="${w.id}" ${w.id === sel ? 'selected' : ''}>${esc(wLabel(w))} (${mxn(wBalance(w))})</option>`).join('');
  openSheet(`
    <h3>Transferir entre cuentas</h3>
    <p class="small">Por ejemplo: pagar tu tarjeta de crédito desde tu débito, o sacar efectivo del cajero. No cuenta como gasto.</p>
    <form id="f">
      <label class="field"><span>Monto</span><input class="big-amount" name="amount" type="number" inputmode="decimal" step="0.01" min="0" required></label>
      <label class="field"><span>Sale de</span><select name="from">${opts(from)}</select></label>
      <label class="field"><span>Entra a</span><select name="to">${opts(to)}</select></label>
      <label class="field"><span>Fecha</span><input name="date" type="date" value="${today()}" required></label>
      <button class="btn block">Transferir</button>
    </form>`, s => {
    const f = $('#f', s);
    setTimeout(() => f.amount.focus(), 250);
    f.addEventListener('submit', e => {
      e.preventDefault();
      const amount = r2(parseFloat(f.amount.value.replace(',', '.')));
      if (!(amount > 0)) { toast('Escribe un monto'); return; }
      if (f.from.value === f.to.value) { toast('Elige dos cuentas distintas'); return; }
      const a = wById(f.from.value), b = wById(f.to.value), date = f.date.value || today(), tid = uid(), now = Date.now();
      const out = { id: uid(), created: now, type: 'gasto', cat: 'ajuste', amount, note: `Transferencia a ${b.name}`, date, transfer: tid };
      const inn = { id: uid(), created: now, type: 'ingreso', cat: 'ajuste', amount, note: `Transferencia de ${a.name}`, date, transfer: tid };
      if (a.id !== WMAIN) out.wallet = a.id;
      if (b.id !== WMAIN) inn.wallet = b.id;
      db.tx.push(out, inn);
      save(); closeSheet(); render(); toast(`Listo: ${mxn(amount)} de ${a.name} a ${b.name}`);
    });
  });
}

Object.assign(ACTIONS, {
  wOpen: id => openWalletView(id),
  wEdit: id => openWallet(id),
  wTransfer: () => openTransfer(),
});
render();
