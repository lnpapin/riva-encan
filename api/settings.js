// api/settings.js — Paramètres de l'événement
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // ── GET : récupérer tous les paramètres ──
  if (req.method === 'GET') {
    const { data, error } = await supabase.from('settings').select('*');
    if (error) return res.status(500).json({ error: error.message });
    // Convertir en objet { key: value }
    const settings = {};
    data.forEach(row => { settings[row.key] = row.value; });
    return res.status(200).json(settings);
  }

  // ── PUT : modifier un paramètre (admin) ──
  if (req.method === 'PUT') {
    const { key, value } = req.body;
    if (!key || !value) return res.status(400).json({ error: 'key et value requis' });

    const { error } = await supabase
      .from('settings')
      .upsert({ key, value }, { onConflict: 'key' });

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Méthode non autorisée' });
}
