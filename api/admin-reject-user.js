const { requireAdmin } = require('./_admin-auth');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const adminContext = await requireAdmin(req, res);
  if (!adminContext) return;

  const { supabaseUrl, serviceRoleKey } = adminContext;
  const { userId } = req.body || {};

  if (!userId || typeof userId !== 'string') {
    res.status(400).json({ error: 'Missing userId' });
    return;
  }

  const rejectResp = await fetch(`${supabaseUrl}/auth/v1/admin/users/${encodeURIComponent(userId)}`, {
    method: 'DELETE',
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`
    }
  });

  if (!rejectResp.ok) {
    const details = await rejectResp.text();
    res.status(500).json({ error: 'Could not reject/delete user', details });
    return;
  }

  res.status(200).json({ ok: true });
};
