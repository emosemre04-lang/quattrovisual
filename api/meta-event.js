// Vercel Serverless Function — Meta Conversions API (CAPI) générique
// Variable d'environnement requise : META_CAPI_TOKEN
// user_data acceptés : fn, ln, em, ph, ct, zp, fbc, fbp
// test_event_code : passer ?_test=TESTxxxxx dans l'URL landing pour tester sans polluer

const crypto = require('crypto');

function sha256(str) {
  return crypto.createHash('sha256').update((str || '').trim().toLowerCase()).digest('hex');
}

/* Formatage E.164 France : "06 12 34 56 78" → "+33612345678" */
function toE164(phone) {
  let p = (phone || '').replace(/[\s.\-\(\)]/g, '');
  if (p.startsWith('00')) p = '+' + p.slice(2);
  else if (p.startsWith('0')) p = '+33' + p.slice(1);
  else if (!p.startsWith('+')) p = '+33' + p;
  return p;
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

  const {
    event_name,
    event_source_url,
    user_data = {},
    custom_data = {},
    event_id,
    test_event_code
  } = req.body || {};

  if (!event_name) {
    return res.status(400).json({ error: 'event_name requis' });
  }

  /* ── Hachage SHA-256 des champs PII ── */
  const hashedUserData = {};
  if (user_data.fn) hashedUserData.fn = sha256(user_data.fn);
  if (user_data.ln) hashedUserData.ln = sha256(user_data.ln);
  if (user_data.em) hashedUserData.em = sha256(user_data.em);
  if (user_data.ph) hashedUserData.ph = sha256(toE164(user_data.ph));
  if (user_data.ct) hashedUserData.ct = sha256(user_data.ct);
  if (user_data.zp) hashedUserData.zp = sha256(user_data.zp);

  /* fbc / fbp : transmis tels quels, Meta ne les hash pas */
  if (user_data.fbc) hashedUserData.fbc = user_data.fbc;
  if (user_data.fbp) hashedUserData.fbp = user_data.fbp;

  /* ── IP + User-Agent côté serveur (signal fort, améliore le matching) ── */
  const clientIp = (req.headers['x-forwarded-for'] || '').split(',')[0].trim()
                || req.socket?.remoteAddress || '';
  const userAgent = req.headers['user-agent'] || '';
  if (clientIp)  hashedUserData.client_ip_address = clientIp;
  if (userAgent) hashedUserData.client_user_agent  = userAgent;

  const eventPayload = {
    event_name,
    event_time:    Math.floor(Date.now() / 1000),
    action_source: 'website',
    ...(event_id         && { event_id }),
    ...(event_source_url && { event_source_url }),
    user_data: hashedUserData,
    ...(Object.keys(custom_data).length && { custom_data })
  };

  const payload = {
    data: [eventPayload],
    ...(test_event_code && { test_event_code })
  };

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
