async function requireAdmin(req, res) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.SUPABASE_ANON_KEY || serviceRoleKey;
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

  if (!supabaseUrl || !serviceRoleKey) {
    res.status(500).json({ error: 'Missing Supabase server environment variables' });
    return null;
  }

  if (!token) {
    res.status(401).json({ error: 'Missing auth token' });
    return null;
  }

  const userResp = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: anonKey
    }
  });

  if (!userResp.ok) {
    res.status(401).json({ error: 'Invalid session token' });
    return null;
  }

  const sessionUser = await userResp.json();
  const userId = sessionUser?.id;
  if (!userId) {
    res.status(401).json({ error: 'Invalid user session' });
    return null;
  }

  const roleResp = await fetch(
    `${supabaseUrl}/rest/v1/profiles?select=role&id=eq.${encodeURIComponent(userId)}&limit=1`,
    {
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`
      }
    }
  );

  if (!roleResp.ok) {
    res.status(500).json({ error: 'Could not verify admin role' });
    return null;
  }

  const rows = await roleResp.json();
  const role = (rows?.[0]?.role || '').toLowerCase();
  if (role !== 'admin') {
    res.status(403).json({ error: 'Admin access required' });
    return null;
  }

  return { supabaseUrl, serviceRoleKey, userId };
}

module.exports = { requireAdmin };
