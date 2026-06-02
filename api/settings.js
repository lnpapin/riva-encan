const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    const { data, error } = await supabase.from('settings').select('*');
    if (error) return res.status(500).json({ error: error.message });
    const settings = {};
    data.forEach(row => { settings[row.key] = row.value; });
    return res.status(200).json(settings);
  }

  if (req.method === 'PUT') {
    const { key, value, entries } = req.body;

    // Mise à jour multiple (plusieurs clés en même temps)
    if (entries && Array.isArray(entries)) {
      for (const entry of entries) {
        if (!entry.key || entry.value === undefined) continue;
        const { error } = await supabase
          .from('settings')
          .upsert({ key: entry.key, value: entry.value }, { onConflict: 'key' });
        if (error) return res.status(500).json({ error: error.message });
      }
      return res.status(200).json({ success: true });
    }

    // Mise à jour simple (une seule clé)
    if (!key || value === undefined) return res.status(400).json({ error: 'key et value requis' });
    const { error } = await supabase
      .from('settings')
      .upsert({ key, value }, { onConflict: 'key' });
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Méthode non autorisée' });
};
