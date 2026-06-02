const { createClient } = require('@supabase/supabase-js');
const nodemailer = require('nodemailer');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// Créer le transporteur Gmail avec mot de passe d'application
function createTransporter() {
  return nodemailer.createTransporter({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_PASSWORD
    }
  });
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Méthode non autorisée' });

  const { lot_id, lot_name, lot_num, new_amount, new_bidder } = req.body;
  if (!lot_id || !lot_name || !new_amount || !new_bidder) {
    return res.status(400).json({ error: 'Champs manquants' });
  }

  // Récupérer tous les participants avec courriel surpassés sur ce lot
  const { data: bids, error } = await supabase
    .from('bids')
    .select('name, email, amount')
    .eq('lot_id', lot_id)
    .not('email', 'is', null)
    .lt('amount', new_amount);

  if (error) return res.status(500).json({ error: error.message });

  // Dédoublonner par courriel — garder la meilleure offre par personne
  const uniqueBidders = {};
  bids.forEach(b => {
    if (b.email && b.email.includes('@')) {
      if (!uniqueBidders[b.email] || b.amount > uniqueBidders[b.email].amount) {
        uniqueBidders[b.email] = b;
      }
    }
  });

  const recipients = Object.values(uniqueBidders);
  if (recipients.length === 0) {
    return res.status(200).json({ success: true, sent: 0, message: 'Aucun participant à notifier' });
  }

  const appUrl = process.env.APP_URL || 'https://riva-encan.vercel.app';
  const transporter = createTransporter();
  let sent = 0;
  const errors = [];

  for (const bidder of recipients) {
    const htmlContent = `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#e8f0f6;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#e8f0f6;padding:30px 0;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #c0d4e4;max-width:560px;">

  <tr>
    <td style="background:#00559f;padding:20px 30px;">
      <table width="100%" cellpadding="0" cellspacing="0"><tr>
        <td><span style="color:#fff;font-size:18px;font-weight:bold;">⚖️ Riva — Encan silencieux</span></td>
        <td align="right"><span style="background:#2cace3;color:#fff;font-size:11px;font-weight:bold;padding:4px 10px;border-radius:20px;">EN DIRECT</span></td>
      </tr></table>
    </td>
  </tr>

  <tr>
    <td style="background:#fff3cc;border-bottom:2px solid #d4a800;padding:16px 30px;">
      <table cellpadding="0" cellspacing="0"><tr>
        <td style="font-size:28px;padding-right:12px;">🔔</td>
        <td>
          <div style="font-size:16px;font-weight:bold;color:#7a5000;">Vous avez été surpassé !</div>
          <div style="font-size:13px;color:#8a6000;margin-top:2px;">Quelqu'un vient de faire une offre plus élevée sur un lot que vous convoitez.</div>
        </td>
      </tr></table>
    </td>
  </tr>

  <tr>
    <td style="padding:24px 30px;">
      <div style="font-size:12px;color:#5a8aaa;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">${lot_num}</div>
      <div style="font-size:20px;font-weight:bold;color:#00559f;margin-bottom:20px;">${lot_name}</div>

      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
        <tr>
          <td width="48%" style="background:#f5e0e0;border-radius:8px;padding:14px;text-align:center;">
            <div style="font-size:11px;font-weight:bold;color:#8a0000;margin-bottom:4px;">VOTRE OFFRE</div>
            <div style="font-size:22px;font-weight:bold;color:#8a0000;">${bidder.amount} $</div>
          </td>
          <td width="4%" align="center" style="font-size:20px;color:#aacce0;">→</td>
          <td width="48%" style="background:#eaf4ec;border-radius:8px;padding:14px;text-align:center;">
            <div style="font-size:11px;font-weight:bold;color:#1a5a30;margin-bottom:4px;">NOUVELLE OFFRE</div>
            <div style="font-size:22px;font-weight:bold;color:#1a7a40;">${new_amount} $</div>
          </td>
        </tr>
      </table>

      <div style="background:#ddeef9;border-radius:8px;padding:12px 16px;margin-bottom:20px;font-size:13px;color:#003d75;">
        <strong>${new_bidder}</strong> vient de surenchérir avec une offre de <strong>${new_amount} $</strong>.
      </div>

      <table width="100%" cellpadding="0" cellspacing="0">
        <tr><td align="center">
          <a href="${appUrl}" style="display:inline-block;background:#00559f;color:#fff;font-size:14px;font-weight:bold;padding:13px 30px;border-radius:8px;text-decoration:none;">
            ⚖️ Faire une nouvelle offre
          </a>
        </td></tr>
      </table>
    </td>
  </tr>

  <tr>
    <td style="background:#f0f5f9;border-top:1px solid #c0d4e4;padding:16px 30px;text-align:center;">
      <div style="font-size:12px;color:#5a8aaa;">
        Bonjour ${bidder.name} 👋 — Vous recevez ce courriel car vous avez activé les notifications pour ce lot.<br/>
        Bonne chance dans vos enchères !
      </div>
    </td>
  </tr>

</table>
</td></tr>
</table>
</body>
</html>`;

    try {
      await transporter.sendMail({
        from: `"Encan Riva" <${process.env.GMAIL_USER}>`,
        to: `${bidder.name} <${bidder.email}>`,
        subject: `🔔 Vous avez été surpassé — ${lot_num} ${lot_name}`,
        html: htmlContent
      });
      sent++;
    } catch (err) {
      errors.push({ email: bidder.email, error: err.message });
    }
  }

  return res.status(200).json({
    success: true,
    sent,
    total: recipients.length,
    errors: errors.length > 0 ? errors : undefined
  });
};
