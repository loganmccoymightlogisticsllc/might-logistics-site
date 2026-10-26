// Receives the website forms (quote request, dispatch signup, carrier onboarding),
// saves the files to a private bucket and the answers to the database.
// The database key lives only here on the server. The browser never sees it.
const crypto = require('crypto');

const KINDS = [['Quote Request', 'Quote Request'], ['Dispatch Signup', 'Dispatch Signup'], ['Carrier Onboarding', 'Carrier Onboarding']];
const MAX_FILE = 4 * 1024 * 1024;      // Vercel allows about 4.5 MB per request in total
const MAX_BODY = 4.4 * 1024 * 1024;
const MAX_FILES = 6, MAX_FIELDS = 250, MAX_VALUE = 6000;
const MAX_PER_HOUR = 8;

function sniff(buf) {                  // check the file really is what its name says
  if (buf.slice(0, 5).toString() === '%PDF-') return 'application/pdf';
  if (buf[0] === 0x89 && buf.slice(1, 4).toString() === 'PNG') return 'image/png';
  if (buf[0] === 0xff && buf[1] === 0xd8) return 'image/jpeg';
  return null;
}
const clean = s => String(s).replace(/[^A-Za-z0-9._-]+/g, '_').slice(-80);

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []; let n = 0;
    req.on('data', c => { n += c.length; if (n > MAX_BODY) { reject(Object.assign(new Error('too large'), { code: 413 })); req.destroy(); } else chunks.push(c); });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

// Minimal multipart/form-data reader (no dependencies).
async function parse(req) {
  const m = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(req.headers['content-type'] || '');
  if (!m) throw new Error('not multipart');
  const buf = await readBody(req), delim = Buffer.from('--' + (m[1] || m[2]));
  const fields = {}, files = [];
  let pos = buf.indexOf(delim), nFields = 0;
  while (pos !== -1) {
    pos += delim.length;
    if (buf.slice(pos, pos + 2).toString() === '--') break;
    pos += 2;                                                 // skip CRLF after boundary
    const headEnd = buf.indexOf('\r\n\r\n', pos);
    if (headEnd === -1) break;
    const head = buf.slice(pos, headEnd).toString('utf8');
    const next = buf.indexOf(delim, headEnd + 4);
    const end = next === -1 ? buf.length : next - 2;           // drop CRLF before next boundary
    const body = buf.slice(headEnd + 4, Math.max(headEnd + 4, end));
    const name = /name="([^"]*)"/i.exec(head), fn = /filename="([^"]*)"/i.exec(head);
    if (name) {
      if (fn !== null && fn !== undefined) {
        if (fn[1] && body.length) { if (body.length > MAX_FILE) throw Object.assign(new Error('file too large'), { code: 413 }); if (files.length < MAX_FILES) files.push({ field: name[1], name: fn[1], buf: body }); }
      } else if (++nFields <= MAX_FIELDS) {
        const v = body.toString('utf8').slice(0, MAX_VALUE);
        fields[name[1]] = fields[name[1]] !== undefined ? fields[name[1]] + ', ' + v : v;
      }
    }
    pos = next;
  }
  return { fields, files };
}

async function sb(path, opts) {
  const r = await fetch(process.env.SUPABASE_URL + path, {
    ...opts,
    headers: { apikey: process.env.SUPABASE_SERVICE_ROLE_KEY, Authorization: 'Bearer ' + process.env.SUPABASE_SERVICE_ROLE_KEY, ...(opts && opts.headers) },
  });
  return r;
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ ok: false });
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return res.status(503).json({ ok: false });
  try {
    const { fields, files } = await parse(req);
    if (fields._gotcha) return res.status(200).json({ ok: true });            // honeypot: pretend success, save nothing
    const subject = String(fields._subject || '').slice(0, 200);
    const kind = (KINDS.find(k => subject.startsWith(k[0])) || [])[1];
    if (!kind) return res.status(400).json({ ok: false });

    const ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
    const ipHash = crypto.createHash('sha256').update(ip + (process.env.IP_SALT || '')).digest('hex').slice(0, 32);
    const since = new Date(Date.now() - 3600e3).toISOString();
    const rc = await sb(`/rest/v1/intake_submissions?ip_hash=eq.${ipHash}&created_at=gte.${since}&select=id&limit=${MAX_PER_HOUR}`);
    if (rc.ok && (await rc.json()).length >= MAX_PER_HOUR) return res.status(429).json({ ok: false });

    for (const f of files) { if (!sniff(f.buf)) return res.status(400).json({ ok: false, error: 'Only PDF, PNG or JPG files are accepted.' }); }

    const id = crypto.randomUUID(), paths = [];
    for (const f of files) {
      const path = `${id}/${clean(f.field)}-${clean(f.name)}`;
      const up = await sb(`/storage/v1/object/intake-files/${path}`, { method: 'POST', headers: { 'Content-Type': sniff(f.buf), 'x-upsert': 'false' }, body: f.buf });
      if (!up.ok) throw new Error('upload failed');
      paths.push({ field: f.field, name: f.name, path });
    }
    const { _subject, _gotcha, summary, ...rest } = fields;
    const row = { id, kind, subject, summary: summary ? String(summary).slice(0, 20000) : null, fields: rest, file_paths: paths, ip_hash: ipHash };
    const ins = await sb('/rest/v1/intake_submissions', { method: 'POST', headers: { 'Content-Type': 'application/json', Prefer: 'return=minimal' }, body: JSON.stringify(row) });
    if (!ins.ok) throw new Error('save failed');
    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(e.code === 413 ? 413 : 500).json({ ok: false, error: e.code === 413 ? 'A file is too large (4 MB limit each).' : undefined });
  }
};
