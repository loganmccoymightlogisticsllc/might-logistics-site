// Admin-only team management: list, add, change role, turn off, reset password. Also creates shipper-portal logins (role 'shipper', tied to one shipper company).
// Runs on the server because it needs the master database key. Every call first proves
// the caller is a signed-in, active admin using their own login token.
const ROLES = ['admin', 'broker', 'dispatcher', 'sales'];
const UUID = /^[0-9a-f-]{36}$/;
const URL_ = () => process.env.SUPABASE_URL, KEY = () => process.env.SUPABASE_SERVICE_ROLE_KEY;

const svc = (path, opts = {}) => fetch(URL_() + path, { ...opts, headers: { apikey: KEY(), Authorization: 'Bearer ' + KEY(), 'Content-Type': 'application/json', ...(opts.headers || {}) } });
// Writes made with the admin's own token, so the change log names the admin.
const asUser = (token, path, opts = {}) => fetch(URL_() + path, { ...opts, headers: { apikey: KEY(), Authorization: 'Bearer ' + token, 'Content-Type': 'application/json', Prefer: 'return=minimal', ...(opts.headers || {}) } });

async function body(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  const chunks = []; for await (const c of req) chunks.push(c);
  try { return JSON.parse(Buffer.concat(chunks).toString() || '{}'); } catch { return {}; }
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (!URL_() || !KEY()) return res.status(503).json({ error: 'The back end is not configured yet.' });
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ error: 'Please sign in again.' });
  try {
    const who = await fetch(URL_() + '/auth/v1/user', { headers: { apikey: KEY(), Authorization: 'Bearer ' + token } });
    if (!who.ok) return res.status(401).json({ error: 'Please sign in again.' });
    const me = await who.json();
    const pr = await (await svc(`/rest/v1/profiles?id=eq.${me.id}&select=role,active`)).json();
    if (!pr[0] || pr[0].role !== 'admin' || !pr[0].active) return res.status(403).json({ error: 'Only an admin can manage the team.' });
    // If this admin has two-step sign-in turned on, the session must have passed the code check.
    let aal = ''; try { aal = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString()).aal || ''; } catch {}
    if ((me.factors || []).some(f => f.status === 'verified') && aal !== 'aal2') return res.status(403).json({ error: 'Enter your two-step code to continue.' });

    if (req.method === 'GET') {
      const au = await (await svc('/auth/v1/admin/users?per_page=200')).json();
      const profs = await (await svc('/rest/v1/profiles?select=*')).json();
      const byId = Object.fromEntries((au.users || []).map(u => [u.id, u]));
      const sh = await (await svc('/rest/v1/shipper_users?select=*')).json();
      const accs = await (await svc('/rest/v1/accounts?type=eq.Shipper&select=id,name')).json();
      const an = Object.fromEntries((Array.isArray(accs) ? accs : []).map(a => [a.id, a.name]));
      const staff = profs.map(p => ({ id: p.id, full_name: p.full_name, role: p.role, active: p.active, email: (byId[p.id] || {}).email, last_sign_in_at: (byId[p.id] || {}).last_sign_in_at }));
      const ships = (Array.isArray(sh) ? sh : []).map(p => ({ id: p.id, full_name: p.full_name, role: 'shipper', active: p.active, company: an[p.account_id] || '', account_id: p.account_id, email: (byId[p.id] || {}).email, last_sign_in_at: (byId[p.id] || {}).last_sign_in_at }));
      return res.status(200).json({ users: staff.concat(ships) });
    }
    const b = await body(req);
    if (req.method === 'POST') {
      const email = String(b.email || '').trim().toLowerCase(), name = String(b.full_name || '').trim().slice(0, 120);
      const isShip = b.role === 'shipper';
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || !name || !(isShip || ROLES.includes(b.role))) return res.status(400).json({ error: 'Enter a name, a valid email and a role.' });
      if (String(b.password || '').length < 12) return res.status(400).json({ error: 'Password needs at least 12 characters.' });
      if (isShip) {
        if (!UUID.test(String(b.account_id || ''))) return res.status(400).json({ error: 'Pick which shipper company this login belongs to.' });
        const ac = await (await svc(`/rest/v1/accounts?id=eq.${b.account_id}&type=eq.Shipper&select=id`)).json();
        if (!Array.isArray(ac) || !ac[0]) return res.status(400).json({ error: 'That shipper company was not found.' });
      }
      const cr = await svc('/auth/v1/admin/users', { method: 'POST', body: JSON.stringify({ email, password: b.password, email_confirm: true }) });
      const cj = await cr.json();
      if (!cr.ok) return res.status(400).json({ error: cj.msg || cj.message || 'Could not create that login.' });
      const tbl = isShip ? 'shipper_users' : 'profiles', row = isShip ? { id: cj.id, full_name: name, account_id: b.account_id } : { id: cj.id, full_name: name, role: b.role };
      let pi = await asUser(token, '/rest/v1/' + tbl, { method: 'POST', body: JSON.stringify(row) });
      if (!pi.ok) pi = await svc('/rest/v1/' + tbl, { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(row) });
      if (!pi.ok) { await svc('/auth/v1/admin/users/' + cj.id, { method: 'DELETE' }); return res.status(500).json({ error: 'Could not save the profile.' }); }
      return res.status(200).json({ ok: true });
    }
    if (req.method === 'PATCH') {
      const id = String(b.id || '');
      if (!/^[0-9a-f-]{36}$/.test(id)) return res.status(400).json({ error: 'Unknown person.' });
      if (id === me.id && ((b.role && b.role !== 'admin') || b.active === false)) return res.status(400).json({ error: 'You cannot turn off or demote your own admin login.' });
      const patch = {};
      const isShipUser = (await (await svc(`/rest/v1/shipper_users?id=eq.${id}&select=id`)).json() || []).length > 0;
      if (isShipUser && b.role !== undefined && b.role !== 'shipper') return res.status(400).json({ error: 'A shipper login cannot become staff. Add a separate staff login instead.' });
      if (!isShipUser && b.role === 'shipper') return res.status(400).json({ error: 'A staff login cannot become a shipper. Add a separate shipper login instead.' });
      if (b.role !== undefined && !isShipUser) { if (!ROLES.includes(b.role)) return res.status(400).json({ error: 'Unknown role.' }); patch.role = b.role; }
      if (b.active !== undefined) patch.active = !!b.active;
      if (b.full_name) patch.full_name = String(b.full_name).slice(0, 120);
      if (Object.keys(patch).length) {
        const pt = isShipUser ? 'shipper_users' : 'profiles';
        let pu = await asUser(token, `/rest/v1/${pt}?id=eq.${id}`, { method: 'PATCH', body: JSON.stringify(patch) });
        if (!pu.ok) pu = await svc(`/rest/v1/${pt}?id=eq.${id}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(patch) });
        if (!pu.ok) return res.status(500).json({ error: 'Could not save.' });
      }
      const au = {};
      if (b.password) { if (String(b.password).length < 12) return res.status(400).json({ error: 'Password needs at least 12 characters.' }); au.password = b.password; }
      if (b.active !== undefined) au.ban_duration = b.active ? 'none' : '876000h';   // turned-off people cannot sign in
      if (Object.keys(au).length) { const ar = await svc('/auth/v1/admin/users/' + id, { method: 'PUT', body: JSON.stringify(au) }); if (!ar.ok) return res.status(500).json({ error: 'Could not update the login.' }); }
      return res.status(200).json({ ok: true });
    }
    return res.status(405).json({ error: 'Not allowed.' });
  } catch (e) { return res.status(500).json({ error: 'Something went wrong.' }); }
};
