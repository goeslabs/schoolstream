module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    res.status(500).json({ error: 'Missing RESEND_API_KEY' });
    return;
  }

  const { email } = req.body || {};
  if (!email || typeof email !== 'string') {
    res.status(400).json({ error: 'Missing email' });
    return;
  }

  const adminEmail = process.env.ADMIN_NOTIFY_EMAIL || 'info@goeslabs.com';
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'SchoolStream <onboarding@resend.dev>';

  try {
    const resendResp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [adminEmail],
        subject: 'New parent registration awaiting approval',
        html: `
          <p>A new parent has registered for SchoolStream and is awaiting approval.</p>
          <p><strong>User email:</strong> ${email}</p>
          <p>Please log in to the app and approve this user.</p>
        `
      })
    });

    if (!resendResp.ok) {
      const resendError = await resendResp.text();
      res.status(502).json({ error: 'Failed to send email', details: resendError });
      return;
    }

    const result = await resendResp.json();
    res.status(200).json({ ok: true, id: result.id });
  } catch (error) {
    res.status(500).json({ error: 'Unexpected error', details: error.message });
  }
};
