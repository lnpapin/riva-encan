const { createClient } = require('@supabase/supabase-js');
const tls = require('tls');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// Vérifier si l'encan est fermé selon la date configurée
async function encantEstFerme() {
  const { data, error } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'close_datetime')
    .single();
  if (error || !data) return false;
  return new Date(data.value) <= new Date();
}

// Fermer tous les lots automatiquement
async function fermerTousLesLots() {
  await supabase
    .from('lots')
    .update({ status: 'closed' })
    .neq('status', 'closed');
  console.log('✅ Tous les lots ont été fermés automatiquement.');
}

// Envoi SMTP natif Gmail
function envoyerSMTP(destinataire, nomDestinataire, sujet, htmlContent) {
  return new Promise((resolve, reject) => {
    const gmailUser = process.env.GMAIL_USER;
    const gmailPass = process.env.GMAIL_PASSWORD;
    const message = [
      `From: "Encan Riva" <${gmailUser}>`,
      `To: "${nomDestinataire}" <${destinataire}>`,
      `Subject: ${sujet}`,
      `MIME-Version: 1.0`,
      `Content-Type: text/html; charset=UTF-8`,
      ``,
      htmlContent
    ].join('\r\n');
    const credentials = Buffer.from(`\0${gmailUser}\0${gmailPass}`).toString('base64');
    let step = 0;
    let socket;
    const commandes = [
      () => socket.write(`EHLO riva-encan\r\n`),
      () => socket.write(`AUTH PLAIN ${credentials}\r\n`),
      () => socket.write(`MAIL FROM:<${gmailUser}>\r\n`),
      () => socket.write(`RCPT TO:<${destinataire}>\r\n`),
      () => socket.write(`DATA\r\n`),
      () => socket.write(`${message}\r\n.\r\n`),
      () => { socket.write(`QUIT\r\n`); resolve('ok'); }
    ];
    socket = tls.connect({ host: 'smtp.gmail.com', port: 465 }, () => {});
    socket.on('data', (data) => {
      const resp = data.toString();
      if (resp.startsWith('220') || resp.startsWith('235') ||
          resp.startsWith('250') || resp.startsWith('354') ||
          resp.startsWith('334') || resp.startsWith('221')) {
        if (step < commandes.length) { commandes[step](); step++; }
      } else if (resp.startsWith('5') || resp.startsWith('4')) {
        reject(new Error('SMTP: ' + resp.substring(0, 100)));
        socket.destroy();
      }
    });
    socket.on('error', (err) => reject(err));
    setTimeout(() => { reject(new Error('SMTP timeout')); socket.destroy(); }, 15000);
  });
}

async function envoyerNotifications(lot_id, lot_name, lot_num, new_amount, new_bidder) {
  try {
    const { data: bids, error } = await supabase
      .from('bids')
      .select('name, email, amount')
      .eq('lot_id', lot_id)
      .not('email', 'is', null)
      .lt('amount', new_amount);
    if (error || !bids || bids.length === 0) return;
    const uniqueBidders = {};
    bids.forEach(b => {
      if (b.email && b.email.includes('@')) {
        if (!uniqueBidders[b.email] || b.amount > uniqueBidders[b.email].amount) {
          uniqueBidders[b.email] = b;
        }
      }
    });
    const recipients = Object.values(uniqueBidders);
    if (recipients.length === 0) return;
    const appUrl = process.env.APP_URL || 'https://riva-encan.vercel.app';
    for (const bidder of recipients) {
      const html = `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#e8f0f6;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#e8f0f6;padding:30px 0;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;border:1px solid #c0d4e4;max-width:560px;">
<tr><td style="background:#00559f;padding:20px 30px;">
  <table width="100%" cellpadding="0" cellspacing="0"><tr>
    <td><span style="color:#fff;font-size:18px;font-weight:bold;">⚖️ Riva — Encan silencieux</span></td>
    <td align="right"><span style="background:#2cace3;color:#fff;font-size:11px;font-weight:bold;padding:4px 10px;border-radius:20px;">EN DIRECT</span></td>
  </tr></table>
</td></tr>
<tr><td style="background:#fff3cc;border-bottom:2px solid #d4a800;padding:16px 30px;">
  <table cellpadding="0" cellspacing="0"><tr>
    <td style="font-size:28px;padding-right:12px;">🔔</td>
    <td>
      <div style="font-size:16px;font-weight:bold;color:#7a5000;">Vous avez été surpassé !</div>
      <div style="font-size:13px;color:#8a6000;margin-top:2px;">Quelqu'un vient de faire une offre plus élevée sur un lot que vous convoitez.</div>
    </td>
  </tr></table>
</td></tr>
<tr><td style="padding:24px 30px;">
  <div style="font-size:12px;color:#5a8aaa;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">${lot_num}</div>
  <div style="font-size:20px;font-weight:bold;color:#00559f;margin-bottom:20px;">${lot_name}</div>
  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;"><tr>
    <td width="48%" style="background:#f5e0e0;border-radius:8px;padding:14px;text-align:center;">
      <div style="font-size:11px;font-weight:bold;color:#8a0000;margin-bottom:4px;">VOTRE OFFRE</div>
      <div style="font-size:22px;font-weight:bold;color:#8a0000;">${bidder.amount} $</div>
    </td>
    <td width="4%" align="center" style="font-size:20px;color:#aacce0;">→</td>
    <td width="48%" style="background:#eaf4ec;border-radius:8px;padding:14px;text-align:center;">
      <div style="font-size:11px;font-weight:bold;color:#1a5a30;margin-bottom:4px;">NOUVELLE OFFRE</div>
      <div style="font-size:22px;font-weight:bold;color:#1a7a40;">${new_amount} $</div>
    </td>
  </tr></table>
  <div style="background:#ddeef9;border-radius:8px;padding:12px 16px;margin-bottom:20px;font-size:13px;color:#003d75;">
    <strong>${new_bidder}</strong> vient de surenchérir avec une offre de <strong>${new_amount} $</strong>.
  </div>
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
    <a href="${appUrl}" style="display:inline-block;background:#00559f;color:#fff;font-size:14px;font-weight:bold;padding:13px 30px;border-radius:8px;text-decoration:none;">⚖️ Faire une nouvelle offre</a>
  </td></tr></table>
</td></tr>
<tr><td style="background:#f0f5f9;border-top:1px solid #c0d4e4;padding:16px 30px;text-align:center;">
  <div style="font-size:12px;color:#5a8aaa;">Bonjour ${bidder.name} 👋 — Bonne chance dans vos enchères !</div>
</td></tr>
</table></td></tr></table>
</body></html>`;
      try {
        await envoyerSMTP(bidder.email, bidder.name, `🔔 Surpassé — ${lot_num} ${lot_name}`, html);
        console.log(`✅ Notification envoyée à ${bidder.email}`);
      } catch (err) {
        console.error(`❌ Erreur envoi à ${bidder.email}:`, err.message);
      }
    }
  } catch (err) {
    console.error('Erreur notifications:', err.message);
  }
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Méthode non autorisée' });

  const { lot_id, name, amount, email } = req.body;
  if (!lot_id || !name || !amount) {
    return res.status(400).json({ error: 'Champs manquants' });
  }

  // ── Vérifier si l'encan global est fermé ──
  const ferme = await encantEstFerme();
  if (ferme) {
    // Fermer tous les lots dans la base de données
    await fermerTousLesLots();
    return res.status(400).json({ error: "L'encan est terminé. Les enchères sont maintenant fermées." });
  }

  // Vérifier que le lot existe et est ouvert
  const { data: lot, error: lotError } = await supabase
    .from('lots')
    .select('id, num, name, current, status')
    .eq('id', lot_id)
    .single();

  if (lotError || !lot) return res.status(404).json({ error: 'Lot introuvable' });
  if (lot.status === 'closed') return res.status(400).json({ error: 'Ce lot est fermé aux enchères' });
  if (amount <= lot.current) return res.status(400).json({ error: `L'offre doit être supérieure à ${lot.current} $` });

  // Enregistrer l'enchère
  const { data: bid, error: bidError } = await supabase
    .from('bids')
    .insert([{ lot_id, name, amount, email: email || null }])
    .select()
    .single();

  if (bidError) return res.status(500).json({ error: bidError.message });

  // Mettre à jour le statut du lot
  const { count } = await supabase
    .from('bids')
    .select('*', { count: 'exact', head: true })
    .eq('lot_id', lot_id);

  const newStatus = (count >= 3) ? 'hot' : 'active';
  await supabase.from('lots').update({ current: amount, status: newStatus }).eq('id', lot_id);

  // Envoyer notifications
  await envoyerNotifications(lot_id, lot.name, lot.num, amount, name);

  return res.status(201).json({ success: true, bid });
};
