// Vercel Serverless Function — Meta Conversions API (CAPI) générique
// Variable d'environnement requise : META_CAPI_TOKEN
// Accepte : event_name, event_source_url, user_data { fn, ph }, custom_data { value, currency }, event_id

const crypto = require('crypto');

function sha256(str) {
  return crypto.createHash('sha256').update((str || '').trim().toLowerCase()).digest('hex');
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' });

  const TOKEN = process.env.META_CAPI_TOKEN;
  if (!TOKEN) {
    console.error('[CAPI] META_CAPI_TOKEN manquant');
    return res.status(500).json({ error: 'META_CAPI_TOKEN not configured' });
  }

  const { event_name, event_source_url, user_data = {}, custom_data = {}, event_id } = req.body || {};

  if (!event_name) {
    return res.status(400).json({ error: 'event_name requis' });
  }

  /* ── Hachage SHA256 des données utilisateur ── */
  const hashedUserData = {};
  if (user_data.fn) hashedUserData.fn = sha256(user_data.fn);
  if (user_data.ph) hashedUserData.ph = sha256((user_data.ph || '').replace(/\D/g, ''));

  /* ── Données IP / User-Agent côté serveur (améliore le matching) ── */
  const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || '';
  const userAgent = req.headers['user-agent'] || '';
  if (clientIp)  hashedUserData.client_ip_address  = clientIp;
  if (userAgent) hashedUserData.client_user_agent   = userAgent;

  const eventPayload = {
    event_name,
    event_time:    Math.floor(Date.now() / 1000),
    action_source: 'website',
    ...(event_id         && { event_id }),
    ...(event_source_url && { event_source_url }),
    user_data: hashedUserData,
    ...(Object.keys(custom_data).length && { custom_data })
  };

  const payload = { data: [eventPayload] };

  try {
    const metaRes = await fetch(
      `https://graph.facebook.com/v21.0/821989530976997/events?access_token=${TOKEN}`,
      {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload)
      }
    );
    const result = await metaRes.json();

    if (result.error) {
      console.error('[CAPI] Meta error:', result.error);
      return res.status(502).json({ error: 'Meta CAPI error', detail: result.error });
    }

    return res.status(200).json({ ok: true, event_id, events_received: result.events_received });
  } catch (err) {
    console.error('[CAPI] Fetch error:', err);
    return res.status(500).json({ error: 'Internal error' });
  }
};
