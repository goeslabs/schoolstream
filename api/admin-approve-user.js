const { requireAdmin } = require('./_admin-auth');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const adminContext = await requireAdmin(req, res);
  if (!adminContext) return;

  const { supabaseUrl, serviceRoleKey } = adminContext;
  const resendApiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'SchoolStream <noreply@school.goeslabs.com>';
  const { userId } = req.body || {};

  if (!userId || typeof userId !== 'string') {
    res.status(400).json({ error: 'Missing userId' });
    return;
  }

  const profileResp = await fetch(
    `${supabaseUrl}/rest/v1/profiles?select=id,email,status,role&id=eq.${encodeURIComponent(userId)}&limit=1`,
    {
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`
      }
    }
  );

  if (!profileResp.ok) {
    res.status(500).json({ error: 'Could not load profile to approve' });
    return;
  }

  const profileRows = await profileResp.json();
  const profile = profileRows?.[0];
  if (!profile) {
    res.status(404).json({ error: 'Profile not found' });
    return;
  }

  const approveResp = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}`, {
    method: 'PATCH',
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation'
    },
    body: JSON.stringify({ status: 'approved' })
  });

  if (!approveResp.ok) {
    const details = await approveResp.text();
    res.status(500).json({ error: 'Could not approve user', details });
    return;
  }

  let emailSent = false;
  if (resendApiKey && profile.email) {
    const resendResp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [profile.email],
        subject: 'Your SchoolStream account has been approved',
        html: `
          <p>Your SchoolStream account has been approved.</p>
          <p>Welcome! Please log in and set up your year groups to get started.</p>
        `
      })
    });

    if (resendResp.ok) emailSent = true;
  }

  res.status(200).json({ ok: true, emailSent });
};
