// Admin-only team management: list, add, change role, turn off, reset password.
// Runs on the server because it needs the master database key. Every call first proves
// the caller is a signed-in, active admin using their own login token.
const ROLES = ['admin', 'broker', 'dispatcher', 'sales'];
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

    if (req.method === 'GET') {
      const au = await (await svc('/auth/v1/admin/users?per_page=200')).json();
      const profs = await (await svc('/rest/v1/profiles?select=*')).json();
      const byId = Object.fromEntries((au.users || []).map(u => [u.id, u]));
      return res.status(200).json({ users: profs.map(p => ({ id: p.id, full_name: p.full_name, role: p.role, active: p.active, email: (byId[p.id] || {}).email, last_sign_in_at: (byId[p.id] || {}).last_sign_in_at })) });
    }
    const b = await body(req);
    if (req.method === 'POST') {
      const email = String(b.email || '').trim().toLowerCase(), name = String(b.full_name || '').trim().slice(0, 120);
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || !name || !ROLES.includes(b.role)) return res.status(400).json({ error: 'Enter a name, a valid email and a role.' });
      if (String(b.password || '').length < 12) return res.status(400).json({ error: 'Password needs at least 12 characters.' });
      const cr = await svc('/auth/v1/admin/users', { method: 'POST', body: JSON.stringify({ email, password: b.password, email_confirm: true }) });
      const cj = await cr.json();
      if (!cr.ok) return res.status(400).json({ error: cj.msg || cj.message || 'Could not create that login.' });
      let pi = await asUser(token, '/rest/v1/profiles', { method: 'POST', body: JSON.stringify({ id: cj.id, full_name: name, role: b.role }) });
      if (!pi.ok) pi = await svc('/rest/v1/profiles', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ id: cj.id, full_name: name, role: b.role }) });
      if (!pi.ok) { await svc('/auth/v1/admin/users/' + cj.id, { method: 'DELETE' }); return res.status(500).json({ error: 'Could not save the profile.' }); }
      return res.status(200).json({ ok: true });
    }
    if (req.method === 'PATCH') {
      const id = String(b.id || '');
      if (!/^[0-9a-f-]{36}$/.test(id)) return res.status(400).json({ error: 'Unknown person.' });
      if (id === me.id && ((b.role && b.role !== 'admin') || b.active === false)) return res.status(400).json({ error: 'You cannot turn off or demote your own admin login.' });
      const patch = {};
      if (b.role !== undefined) { if (!ROLES.includes(b.role)) return res.status(400).json({ error: 'Unknown role.' }); patch.role = b.role; }
      if (b.active !== undefined) patch.active = !!b.active;
      if (b.full_name) patch.full_name = String(b.full_name).slice(0, 120);
      if (Object.keys(patch).length) {
        let pu = await asUser(token, `/rest/v1/profiles?id=eq.${id}`, { method: 'PATCH', body: JSON.stringify(patch) });
        if (!pu.ok) pu = await svc(`/rest/v1/profiles?id=eq.${id}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(patch) });
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
