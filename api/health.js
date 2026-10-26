// The website asks this once on load. It answers ok only when the back end is configured,
// so before setup the forms keep using the email fallback.
module.exports = (req, res) => {
  const ok = !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
  res.setHeader('Cache-Control', 'no-store');
  res.status(ok ? 200 : 503).json({ ok });
};
