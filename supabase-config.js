/**
 * Quattro Visual — Configuration Supabase
 * ────────────────────────────────────────
 * Seules les cles publiques (anon/publishable) sont ici.
 * Le token Telegram est retire — il est desormais cote serveur
 * dans api/notify.js (variable d'environnement Vercel).
 */
window.QV_CONFIG = {

  // ── Supabase (cles publiques, safe dans le navigateur) ────
  supabaseUrl: 'https://poyrteyprzjojwcqrujg.supabase.co',
  supabaseKey: 'sb_publishable_OwSc8mu_hzgzYNPbCUcS3w_lZycLvW6',

  // ── Notification email (Edge Function) ───────────────────
  notifyEmail: 'emre@quattrovisual.com'

  // Telegram : plus de token ici — voir api/notify.js

};
