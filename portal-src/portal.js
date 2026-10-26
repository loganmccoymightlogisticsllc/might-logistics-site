/* Might Shipper Portal: real logins, real freight. A shipper sees only their own company's loads, quotes and invoices.
   Every read goes through narrow database functions (shipper_loads, shipper_quotes, ...) that never return carrier names,
   carrier pay or profit, and never another company's data. */
(function () {
var SB_URL = '__SB_URL__', SB_KEY = '__SB_KEY__';
var SB = window.__SB_MOCK || (window.supabase ? window.supabase.createClient(SB_URL, SB_KEY, { auth: { persistSession: true, autoRefreshToken: true } }) : null);
var PHONE = '(201) 377-7043', EMAIL = 'info@mightlogistics.com';
var ME = null, LOADS = [], QUOTES = [], S = { view: 'overview', f: 'Active', q: '', panel: null, modal: null };

function $(s) { return document.querySelector(s); }
function esc(t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
function dt(s) { return new Date(String(s).slice(0, 10) + 'T12:00:00'); }
function fd(s) { return s ? dt(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'TBD'; }
function fdy(s) { return s ? dt(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''; }
function usd(n) { return '$' + Math.round(+n || 0).toLocaleString('en-US'); }
function sum(a) { return a.reduce(function (x, y) { return x + y; }, 0); }
function pill(t, c) { return '<span class="pill ' + c + '">' + esc(t) + '</span>'; }
function toast(t) { var e = $('#toast'); e.textContent = t; e.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(function () { e.hidden = true; }, 3200); }
function errMsg(e) { var m = (e && (e.message || e.details)) || 'Something went wrong.'; return m.replace(/^.*?ERROR:\s*/, ''); }
function must(r) { if (r && r.error) throw r.error; return r; }

var ST = { Booked: ['Booked', 'warn'], Shipped: ['In transit', 'info'], Delivered: ['Delivered', 'ok'] };
var STEPS = ['Booked', 'Shipped', 'Delivered'];
function inv(l) {
  if (l.invoice_status === 'Paid') return ['Paid', 'ok'];
  if (l.invoice_status === 'Invoiced') return ['Invoice sent', 'warn'];
  if (l.invoice_status === 'Ready') return ['Invoice being prepared', 'idle'];
  return null;
}
function trk(l) { var i = STEPS.indexOf(l.status), p = i <= 0 ? 8 : i === 1 ? 50 : 100; return '<div class="trk" role="img" aria-label="' + esc(ST[l.status][0]) + '"><i style="width:' + p + '%"></i><em style="left:' + p + '%"></em></div>'; }
function L(id) { return LOADS.filter(function (x) { return x.id === id; })[0]; }

async function load() {
  var a = must(await SB.rpc('shipper_loads')), b = must(await SB.rpc('shipper_quotes'));
  LOADS = a.data || []; QUOTES = b.data || [];
}

/* ---------- screens ---------- */
function openInv() { return LOADS.filter(function (l) { return l.invoice_status === 'Invoiced'; }); }
function overview() {
  var road = LOADS.filter(function (l) { return l.status === 'Shipped'; }),
      up = LOADS.filter(function (l) { return l.status === 'Booked'; }),
      oi = openInv(), qs = QUOTES.filter(function (q) { return q.status === 'Sent'; }),
      done = LOADS.filter(function (l) { return l.status === 'Delivered'; }).slice(0, 5);
  var att = [];
  qs.forEach(function (q) { att.push({ s: 'info', t: 'Quote ' + q.id + ' is ready: ' + usd(q.total) + ' (' + esc(q.origin) + ' to ' + esc(q.destination) + ')', m: 'Call or email us to accept it.', a: 'nav', v: 'quotes' }); });
  oi.forEach(function (l) { att.push({ s: 'warn', t: 'Invoice for ' + l.id + ': ' + usd(l.amount), m: l.origin + ' to ' + l.destination, a: 'load', v: l.id }); });
  var row = function (l) { return '<li data-a="load" data-v="' + esc(l.id) + '"><div class="r1"><b>' + esc(l.origin) + ' to ' + esc(l.destination) + '</b>' + pill(ST[l.status][0], ST[l.status][1]) + '</div><div class="sub"><span class="mono">' + esc(l.id) + '</span> · pickup ' + fd(l.pickup_date) + (l.miles ? ' · ' + l.miles.toLocaleString('en-US') + ' mi' : '') + '</div>' + trk(l) + '</li>'; };
  return '<div class="stats"><div class="stat"><span>On the road</span><b>' + road.length + '</b></div><div class="stat"><span>Upcoming pickups</span><b>' + up.length + '</b></div><div class="stat"><span>Quotes to review</span><b>' + qs.length + '</b></div><div class="stat"><span>Open invoices</span><b>' + usd(sum(oi.map(function (l) { return +l.amount; }))) + '</b></div></div>'
    + '<div class="cols"><div style="display:grid;gap:16px;align-content:start;min-width:0"><div class="panel"><h2>On the road now</h2>' + (road.length ? '<ul class="road">' + road.map(row).join('') + '</ul>' : '<div class="pb sub">Nothing is on the road right now.</div>') + '</div>'
    + '<div class="panel"><h2>Upcoming pickups</h2>' + (up.length ? '<ul class="road">' + up.map(row).join('') + '</ul>' : '<div class="pb sub">No loads waiting to pick up.</div>') + '</div></div>'
    + '<div style="display:grid;gap:16px;align-content:start;min-width:0"><div class="panel"><h2>Needs your attention</h2>' + (att.length ? '<ul class="att">' + att.map(function (a) { return '<li data-a="' + a.a + '" data-v="' + esc(a.v) + '"><span class="sev ' + a.s + '"></span><p><b>' + a.t + '</b><br><span class="sub">' + esc(a.m) + '</span></p></li>'; }).join('') + '</ul>' : '<div class="pb sub">You are all caught up.</div>') + '</div>'
    + '<div class="panel"><h2>Recent deliveries</h2><div class="tw"><table><tbody>' + (done.map(function (l) { return '<tr class="row" data-a="load" data-v="' + esc(l.id) + '"><td class="mono">' + esc(l.id) + '</td><td>' + esc(l.origin) + ' to ' + esc(l.destination) + '</td><td>' + fd(l.pickup_date) + '</td></tr>'; }).join('') || '<tr><td class="sub">No deliveries yet.</td></tr>') + '</tbody></table></div></div></div></div>';
}
function shipments() {
  var ls = LOADS.filter(function (l) {
    var act = l.status !== 'Delivered';
    return (S.f === 'All' || (S.f === 'Active' ? act : !act)) && (!S.q || (l.id + l.origin + l.destination).toLowerCase().indexOf(S.q.toLowerCase()) > -1);
  });
  var chips = ['Active', 'Delivered', 'All'].map(function (s) { return '<button type="button" class="chip" aria-pressed="' + (S.f === s) + '" data-a="filter" data-v="' + s + '">' + s + '</button>'; }).join('');
  return '<div class="tools"><input type="search" id="q" placeholder="Search load number or city" value="' + esc(S.q) + '" aria-label="Search shipments"><div class="chips">' + chips + '</div></div>'
    + '<div class="panel"><div class="tw"><table><thead><tr><th>Load</th><th>Lane</th><th>Miles</th><th>Pickup</th><th>Status</th><th>Documents</th><th>Invoice</th></tr></thead><tbody>'
    + (ls.map(function (l) { var iv = inv(l); return '<tr class="row" data-a="load" data-v="' + esc(l.id) + '"><td class="mono">' + esc(l.id) + '</td><td>' + esc(l.origin) + ' to ' + esc(l.destination) + '</td><td>' + (l.miles ? l.miles.toLocaleString('en-US') : '') + '</td><td>' + fd(l.pickup_date) + '</td><td>' + pill(ST[l.status][0], ST[l.status][1]) + '</td><td class="sub">' + [l.has_bol ? 'BOL' : '', l.has_pod ? 'POD' : ''].filter(Boolean).join(', ') + '</td><td>' + (iv ? pill(iv[0], iv[1]) : '') + '</td></tr>'; }).join('') || '<tr><td colspan="7" class="sub">No shipments match.</td></tr>')
    + '</tbody></table></div></div>';
}
function quotes() {
  var lab = { Sent: ['Ready for your answer', 'info'], Won: ['Accepted', 'ok'], Lost: ['Closed', 'idle'] };
  return '<div class="panel pb" style="margin-bottom:16px"><b>Need a price?</b> <span class="sub">Send the details and your broker will reply with a price.</span></div>'
    + (QUOTES.length ? '<div class="qcards">' + QUOTES.map(function (q) {
      var l = lab[q.status] || ['', 'idle'];
      return '<div class="qc"><div class="top"><span class="mono sub">' + esc(q.id) + '</span>' + pill(l[0], l[1]) + '</div><div class="lane">' + esc(q.origin) + ' to ' + esc(q.destination) + '</div><div class="sub">' + (q.miles ? q.miles.toLocaleString('en-US') + ' mi · ' : '') + 'sent ' + fd(q.sent_on) + '</div>'
        + '<div class="price">' + usd(q.total) + '</div><div class="sub">$' + (+q.rate_per_mile).toFixed(2) + ' per mile'
        + (q.status === 'Sent' ? '<br>To accept, call ' + PHONE + ' or reply to your broker.' : '') + '</div></div>';
    }).join('') + '</div>' : '<div class="panel pb sub">No quotes yet. Press Request a quote.</div>');
}
function invoices() {
  var is = LOADS.filter(function (l) { return l.invoice_status === 'Invoiced' || l.invoice_status === 'Paid'; }),
      out = is.filter(function (l) { return l.invoice_status === 'Invoiced'; });
  return '<div class="stats"><div class="stat"><span>Balance due</span><b>' + usd(sum(out.map(function (l) { return +l.amount; }))) + '</b></div><div class="stat"><span>Open invoices</span><b>' + out.length + '</b></div><div class="stat"><span>Paid</span><b>' + usd(sum(is.filter(function (l) { return l.invoice_status === 'Paid'; }).map(function (l) { return +l.amount; }))) + '</b></div></div>'
    + '<div class="cols"><div class="panel"><h2>Invoices</h2><div class="tw"><table><thead><tr><th>Load</th><th>Lane</th><th>Pickup</th><th class="num">Amount</th><th>Status</th></tr></thead><tbody>'
    + (is.map(function (l) { return '<tr class="row" data-a="load" data-v="' + esc(l.id) + '"><td class="mono">' + esc(l.id) + '</td><td>' + esc(l.origin) + ' to ' + esc(l.destination) + '</td><td>' + fd(l.pickup_date) + '</td><td class="num">' + usd(l.amount) + '</td><td>' + pill(l.invoice_status === 'Paid' ? 'Paid' : 'Due', l.invoice_status === 'Paid' ? 'ok' : 'warn') + '</td></tr>'; }).join('') || '<tr><td colspan="5" class="sub">No invoices yet.</td></tr>')
    + '</tbody></table></div></div><div class="panel"><h2>Questions about a charge or how to pay?</h2><div class="pb"><p style="margin-top:0">Payment instructions are printed on every invoice. Please include the load number with your payment.</p><p class="sub">Call ' + PHONE + ' or email ' + EMAIL + '.</p></div></div></div>';
}
function account() {
  return '<div class="cols"><div class="panel"><h2>Your login</h2><div class="pb"><b>' + esc(ME.name) + '</b><div class="sub">' + esc(ME.email) + '</div><div style="margin-top:6px">' + esc(ME.company) + '</div><div style="margin-top:14px;display:flex;gap:8px;flex-wrap:wrap"><button class="btn" type="button" data-a="pw">Change password</button><button class="btn" type="button" data-a="out">Sign out</button></div></div></div>'
    + '<div class="panel"><h2>Need help?</h2><div class="pb"><p style="margin-top:0">Call <b>' + PHONE + '</b> or email <b>' + EMAIL + '</b>.</p><p class="sub">Need another person at your company to have access? Ask us and we will add them.</p></div></div></div>';
}
var TT = { overview: ['Overview', function () { return 'Welcome, ' + ME.company; }], shipments: ['Shipments', 'Track every load from booking to delivery'], quotes: ['Quotes', 'Request a price and see your quotes'], invoices: ['Invoices', 'Balances and payment status'], account: ['Account', 'Your login and how to reach us'] };
function render() {
  var t = TT[S.view];
  $('#ttl').textContent = t[0]; $('#sub').textContent = typeof t[1] === 'function' ? t[1]() : t[1];
  $('#tabs').innerHTML = Object.keys(TT).map(function (k) { return '<button type="button" data-a="nav" data-v="' + k + '"' + (S.view === k ? ' aria-current="page"' : '') + '>' + TT[k][0] + '</button>'; }).join('');
  $('#act').innerHTML = '<button class="btn" type="button" data-a="refresh">Refresh</button> <button class="btn pri" type="button" data-a="newq">Request a quote</button>';
  $('#who').textContent = ME.name;
  $('#view').innerHTML = { overview: overview, shipments: shipments, quotes: quotes, invoices: invoices, account: account }[S.view]();
  var q = $('#q'); if (q && S.fq) { q.focus(); q.setSelectionRange(q.value.length, q.value.length); }
  drawerR(); modalR();
}
function drawerR() {
  var e = $('#drawer'); if (!S.panel) { e.hidden = true; return; }
  var l = L(S.panel); if (!l) { e.hidden = true; return; }
  var i = STEPS.indexOf(l.status), iv = inv(l);
  var steps = [['Booked', 'We have your load and are working it'], ['In transit', 'Picked up and on the road'], ['Delivered', 'Delivered to the receiver']].map(function (s, k) { return '<li class="' + (k < i ? 'done' : k === i ? (i === 2 ? 'done' : 'cur') : '') + '"><div>' + s[0] + '<small>' + s[1] + '</small></div></li>'; }).join('');
  var docs = (l.has_bol ? '<button type="button" data-a="doc" data-v="' + esc(l.id) + '|bol"><span>Bill of lading</span><span class="sub">View</span></button>' : '') + (l.has_pod ? '<button type="button" data-a="doc" data-v="' + esc(l.id) + '|pod"><span>Proof of delivery</span><span class="sub">View</span></button>' : '');
  e.hidden = false;
  e.innerHTML = '<div class="dr" role="dialog" aria-label="Shipment ' + esc(l.id) + '"><header><div><h2 class="mono" style="font-family:var(--f-mono);font-size:1.2rem">' + esc(l.id) + '</h2>' + pill(ST[l.status][0], ST[l.status][1]) + '</div><button class="x" type="button" data-a="close" aria-label="Close">&times;</button></header>'
    + '<p class="lane">' + esc(l.origin) + ' to ' + esc(l.destination) + '</p>' + trk(l)
    + '<div class="kv"><div><span>Pickup date</span>' + fdy(l.pickup_date) + '</div><div><span>Distance</span>' + (l.miles ? l.miles.toLocaleString('en-US') + ' mi' : 'TBD') + '</div></div>'
    + '<div class="sec">Progress</div><ul class="tl">' + steps + '</ul>'
    + '<div class="sec">Documents</div>' + (docs ? '<div class="docs">' + docs + '</div>' : '<div class="sub">Documents appear here as soon as we have them.</div>')
    + (iv ? '<div class="sec">Invoice</div><div class="box">' + pill(iv[0], iv[1]) + (l.amount != null ? ' <b style="margin-left:8px">' + usd(l.amount) + '</b>' : '') + '<div class="sub" style="margin-top:6px">Questions? Call ' + PHONE + '.</div></div>' : '')
    + '</div>';
}
function modalR() {
  var e = $('#modal'); if (!S.modal) { e.hidden = true; e.innerHTML = ''; return; }
  e.hidden = false;
  if (S.modal === 'q') e.innerHTML = '<div class="mb" role="dialog" aria-label="Request a quote"><form class="form" id="fq"><h2>Request a quote</h2><div class="sub">Your broker will reply with a price.</div><div class="g2"><label for="qo">Pick up in<input id="qo" required placeholder="City, ST" maxlength="120"></label><label for="qd">Deliver to<input id="qd" required placeholder="City, ST" maxlength="120"></label></div><div class="g2"><label for="qe">Equipment<select id="qe"><option>Dry van</option><option>Refrigerated</option><option>Flatbed</option><option>Step deck</option><option>Other</option></select></label><label for="qp">Pickup date<input id="qp" type="date"></label></div><label for="qw">Approximate weight (lbs)<input id="qw" inputmode="numeric" maxlength="20"></label><label for="qn">Anything else we should know?<textarea id="qn" rows="3" maxlength="1000"></textarea></label><div style="display:flex;gap:8px;justify-content:flex-end;margin-top:6px"><button class="btn" type="button" data-a="mclose">Cancel</button><button class="btn pri" type="submit">Send request</button></div></form></div>';
  if (S.modal === 'pw') e.innerHTML = '<div class="mb" role="dialog" aria-label="Change password"><form class="form" id="fpw"><h2>Change password</h2><div class="sub">At least 12 characters.</div><label for="pw1">New password<input id="pw1" type="password" minlength="12" autocomplete="new-password" required></label><div style="display:flex;gap:8px;justify-content:flex-end;margin-top:6px"><button class="btn" type="button" data-a="mclose">Cancel</button><button class="btn pri" type="submit">Save</button></div></form></div>';
}

/* ---------- actions ---------- */
async function refresh(quiet) { try { await load(); render(); if (!quiet) toast('Up to date.'); } catch (e) { toast(errMsg(e)); } }
async function openDoc(id, kind) {
  var w = window.open('', '_blank');
  try {
    var p = must(await SB.rpc('shipper_doc_path', { p_load: id, p_kind: kind })).data;
    if (!p) throw new Error('That document is not available yet.');
    var u = must(await SB.storage.from('load-docs').createSignedUrl(p, 300)).data.signedUrl;
    if (w) w.location = u; else toast('Allow pop-ups to open the document.');
  } catch (e) { if (w) w.close(); toast(errMsg(e)); }
}
var A = {
  nav: function (t) { S.view = t.dataset.v; S.panel = null; S.fq = false; render(); window.scrollTo(0, 0); },
  filter: function (t) { S.f = t.dataset.v; S.fq = false; render(); },
  load: function (t) { S.panel = t.dataset.v; render(); },
  close: function () { S.panel = null; render(); },
  newq: function () { S.modal = 'q'; render(); var o = $('#qo'); if (o) o.focus(); },
  pw: function () { S.modal = 'pw'; render(); },
  mclose: function () { S.modal = null; render(); },
  refresh: function () { refresh(); },
  doc: function (t) { var p = t.dataset.v.split('|'); openDoc(p[0], p[1]); },
  out: function () { SB.auth.signOut().then(function () { location.reload(); }); }
};
document.addEventListener('click', function (ev) {
  var t = ev.target.closest('[data-a]');
  if (!t) { if (ev.target.id === 'drawer') { S.panel = null; render(); } if (ev.target.id === 'modal') { S.modal = null; render(); } return; }
  if (A[t.dataset.a]) { ev.preventDefault(); A[t.dataset.a](t); }
});
document.addEventListener('input', function (e) { if (e.target.id === 'q') { S.q = e.target.value; S.fq = true; render(); } });
document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { if (S.modal) S.modal = null; else S.panel = null; render(); } });
document.addEventListener('submit', async function (ev) {
  var id = ev.target.id;
  if (id === 'fq') {
    ev.preventDefault();
    try {
      must(await SB.rpc('shipper_request_quote', { p_origin: $('#qo').value, p_dest: $('#qd').value, p_equip: $('#qe').value, p_pickup: $('#qp').value, p_weight: $('#qw').value, p_notes: $('#qn').value }));
      S.modal = null; render(); toast('Sent. Your broker will reply with a price.');
    } catch (e) { toast(errMsg(e)); }
  }
  if (id === 'fpw') {
    ev.preventDefault();
    var p = $('#pw1').value; if (p.length < 12) { toast('Use at least 12 characters.'); return; }
    try { must(await SB.auth.updateUser({ password: p })); S.modal = null; render(); toast('Password changed.'); } catch (e) { toast(errMsg(e)); }
  }
});

/* ---------- sign in ---------- */
async function boot() {
  var msg = $('#lgmsg'), recovering = /type=recovery/.test(location.hash);
  function show(t) { msg.textContent = t || ''; }
  function pane(id) { ['lgf', 'lgr'].forEach(function (k) { $('#' + k).hidden = (k !== id); }); show(''); }
  if (!SB) { show('Could not load the sign-in service. Check your connection and refresh.'); return; }
  if (SB.auth.onAuthStateChange) SB.auth.onAuthStateChange(function (ev) { if (ev === 'PASSWORD_RECOVERY') { recovering = true; pane('lgr'); } });
  async function enter() {
    try {
      var r = must(await SB.rpc('shipper_me')).data;
      if (!r) { await SB.auth.signOut(); pane('lgf'); show('This login is not set up for the shipper portal. Staff sign in at /crm. Customers: call ' + PHONE + '.'); return; }
      ME = r; await load(); $('#login').hidden = true; $('#app').hidden = false; S.view = 'overview'; render();
      setInterval(function () { if (!document.hidden && !S.modal) refresh(true); }, 300000);
    } catch (e) { pane('lgf'); show(errMsg(e)); }
  }
  var s0 = await SB.auth.getSession(); if (s0.data && s0.data.session && !recovering) await enter();
  if (recovering) pane('lgr');
  $('#lgf').addEventListener('submit', async function (ev) {
    ev.preventDefault(); show(''); var b = $('#lgb'); b.disabled = true; b.textContent = 'Signing in...';
    var r = await SB.auth.signInWithPassword({ email: $('#lge').value.trim(), password: $('#lgp').value });
    b.disabled = false; b.textContent = 'Sign in';
    if (r.error) { show('That email and password did not match.'); return; }
    await enter();
  });
  $('#lgfp').addEventListener('click', async function () {
    var em = $('#lge').value.trim(); if (!em) { show('Type your email above first, then press Forgot password.'); return; }
    await SB.auth.resetPasswordForEmail(em, { redirectTo: location.origin + '/portal' });
    show('If that email has a login, a reset link is on its way. Check your spam folder too.');
  });
  $('#lgr').addEventListener('submit', async function (ev) {
    ev.preventDefault(); var p = $('#lgn').value; if (p.length < 12) { show('Use at least 12 characters.'); return; }
    var r = await SB.auth.updateUser({ password: p }); if (r.error) { show(errMsg(r.error)); return; }
    recovering = false; history.replaceState(null, '', location.pathname); await enter();
  });
}
boot();
})();
