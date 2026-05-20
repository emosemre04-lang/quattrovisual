// Vercel Serverless Function — Soumission landing (Supabase + Telegram)
// Variables d'environnement Vercel requises :
//   SUPABASE_SERVICE_KEY  — cle service_role Supabase (Dashboard > Settings > API)
//   TELEGRAM_BOT_TOKEN
//   TELEGRAM_CHAT_ID

const SUPABASE_URL = "https://poyrteyprzjojwcqrujg.supabase.co";

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")   return res.status(405).json({ error: "Method not allowed" });

  const { prenom, nom, whatsapp, service, prix, delai } = req.body || {};

  if (!prenom || !nom || !whatsapp || !service) {
    return res.status(400).json({ error: "Champs manquants" });
  }

  const now = new Date();
  const dateFR = now.toLocaleString("fr-FR", {
    timeZone: "Europe/Paris",
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit"
  });

  /* ── 1. Supabase INSERT ── */
  const SUPA_KEY = process.env.SUPABASE_SERVICE_KEY;
  let supaOk = false;

  if (SUPA_KEY) {
    try {
      const supaRes = await fetch(SUPABASE_URL + "/rest/v1/leads_landing", {
        method: "POST",
        headers: {
          "Content-Type":  "application/json",
          "Authorization": "Bearer " + SUPA_KEY,
          "apikey":        SUPA_KEY,
          "Prefer":        "return=minimal"
        },
        body: JSON.stringify({ prenom, nom, whatsapp, service, prix: Number(prix) || 0, delai })
      });
      supaOk = supaRes.ok;
      if (!supaRes.ok) {
        const err = await supaRes.text();
        console.error("[landing-submit] Supabase error:", err);
      }
    } catch (e) {
      console.error("[landing-submit] Supabase fetch failed:", e);
    }
  } else {
    console.warn("[landing-submit] SUPABASE_SERVICE_KEY manquant");
  }

  /* ── 2. Telegram notification (awaitee pour eviter coupure Vercel) ── */
  const TOKEN   = process.env.TELEGRAM_BOT_TOKEN;
  const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

  let tgOk = false;
  if (TOKEN && CHAT_ID) {
    const msg =
      "\uD83D\uDD25 NOUVEAU LEAD LANDING — QUATTRO VISUAL\n\n" +
      "\uD83D\uDC64 " + prenom + " " + nom + "\n" +
      "\uD83D\uDCF1 WhatsApp : +" + whatsapp + "\n" +
      "\uD83D\uDCBC Service : " + service + " \u2014 " + (prix || 0) + "\u20ac\n" +
      "\u23F0 D\u00e9lai : " + delai + "\n" +
      "\uD83D\uDCC5 " + dateFR;

    try {
      const tgRes = await fetch(
        "https://api.telegram.org/bot" + TOKEN + "/sendMessage",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: CHAT_ID, text: msg })
        }
      );
      const tgData = await tgRes.json();
      tgOk = tgData.ok;
      if (!tgData.ok) console.error("[landing-submit] Telegram error:", tgData);
    } catch (e) {
      console.error("[landing-submit] Telegram fetch failed:", e);
    }
  } else {
    console.warn("[landing-submit] TELEGRAM_BOT_TOKEN ou TELEGRAM_CHAT_ID manquant");
  }

  return res.status(200).json({ ok: true, saved: supaOk, tg: tgOk });
};
