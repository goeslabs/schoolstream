const { requireAdmin } = require('./_admin-auth');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const adminContext = await requireAdmin(req, res);
  if (!adminContext) return;

  const { supabaseUrl, serviceRoleKey } = adminContext;
  const pendingResp = await fetch(
    `${supabaseUrl}/rest/v1/profiles?select=id,email,role,created_at&status=eq.pending&role=eq.parent&order=created_at.desc`,
    {
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`
      }
    }
  );

  if (!pendingResp.ok) {
    const details = await pendingResp.text();
    res.status(500).json({ error: 'Could not load pending users', details });
    return;
  }

  const users = await pendingResp.json();
  res.status(200).json({ users });
};
