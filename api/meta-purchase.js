// Vercel Serverless Function — Meta Conversions API (CAPI) Purchase
// Variables Vercel Dashboard > Settings > Environment Variables :
//   META_CAPI_TOKEN

const crypto = require('crypto');

function sha256(str) {
  return crypto.createHash('sha256').update((str || '').trim().toLowerCase()).digest('hex');
}

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const TOKEN = process.env.META_CAPI_TOKEN;
  if (!TOKEN) {
    console.error('META_CAPI_TOKEN manquant');
    return res.status(500).json({ error: 'META_CAPI_TOKEN not configured' });
  }

  const { prenom, telephone, montant } = req.body || {};
  if (!prenom || !telephone || montant === undefined) {
    return res.status(400).json({ error: 'Champs manquants : prenom, telephone, montant' });
  }

  const eventId = generateUUID();
  const ph = (telephone || '').replace(/\D/g, '');

  const payload = {
    data: [{
      event_name:    'Purchase',
      event_time:    Math.floor(Date.now() / 1000),
      event_id:      eventId,
      action_source: 'website',
      user_data: {
        fn: sha256(prenom),
        ph: sha256(ph)
      },
      custom_data: {
        value:    Number(montant),
        currency: 'EUR'
      }
    }]
  };

  try {
    const tgRes = await fetch(
      `https://graph.facebook.com/v21.0/821989530976997/events?access_token=${TOKEN}`,
      {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload)
      }
    );
    const data = await tgRes.json();

    if (data.error) {
      console.error('Meta CAPI error:', data.error);
      return res.status(502).json({ error: 'Meta CAPI error', detail: data.error });
    }

    return res.status(200).json({ ok: true, eventId });
  } catch (err) {
    console.error('Fetch error:', err);
    return res.status(500).json({ error: 'Internal error' });
  }
};
