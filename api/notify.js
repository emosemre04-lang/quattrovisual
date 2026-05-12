// Vercel Serverless Function — Telegram notification
// Le token reste cote serveur, jamais expose dans le navigateur.
// Variables a definir dans Vercel Dashboard > Settings > Environment Variables :
//   TELEGRAM_BOT_TOKEN
//   TELEGRAM_CHAT_ID

module.exports = async function handler(req, res) {
  // CORS — meme domaine uniquement en prod, plus souple en dev
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const TOKEN   = process.env.TELEGRAM_BOT_TOKEN;
  const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

  if (!TOKEN || !CHAT_ID) {
    console.error("Telegram env vars manquantes");
    return res.status(500).json({ error: "Telegram not configured" });
  }

  const a = req.body;
  if (!a) {
    return res.status(400).json({ error: "No body" });
  }

  const prix =
    a.typeSite === "Boutique"   ? "790\u20ac" :
    a.typeSite === "Sur-mesure" ? "sur devis" : "490\u20ac";

  const msg =
    "\uD83D\uDD25 NOUVEAU LEAD QUATTRO VISUAL\n\n" +
    "\uD83D\uDC64 " + (a.prenom || "") + " \u2014 " + (a.nomEntreprise || "") + "\n" +
    "\uD83D\uDCCD " + (a.ville || "") + "\n" +
    "\uD83D\uDCDE " + (a.telephone || "") + "\n\n" +
    "\uD83D\uDCBC Type : " + (a.typeSite || "") + " \u2014 " + prix + "\n" +
    "\uD83D\uDEE0 M\u00e9tier : " + (a.metier || "") + "\n" +
    "\uD83D\uDCC5 Pour quand : " + (a.timing || "") + "\n" +
    "\uD83C\uDFAF D\u00e9sir : " + (a.desirPrincipal || "") + "\n\n" +
    "\u23F0 Re\u00e7u \u00e0 l\u2019instant \u2014 Rappeler dans l\u2019heure";

  try {
    const tgRes = await fetch(
      "https://api.telegram.org/bot" + TOKEN + "/sendMessage",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: CHAT_ID,
          text: msg,
          parse_mode: "HTML"
        })
      }
    );

    const tgData = await tgRes.json();

    if (!tgData.ok) {
      console.error("Telegram error:", tgData);
      return res.status(502).json({ error: "Telegram error", detail: tgData });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("Fetch error:", err);
    return res.status(500).json({ error: "Internal error" });
  }
};
