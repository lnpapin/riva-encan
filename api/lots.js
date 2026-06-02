const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// Vérifier si l'encan est terminé et fermer tous les lots si c'est le cas
async function verifierEtFermerSiNecessaire() {
  const { data: setting } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'close_datetime')
    .single();

  if (!setting) return false;

  const estFerme = new Date(setting.value) <= new Date();
  if (estFerme) {
    // Fermer tous les lots qui ne sont pas déjà fermés
    const { error } = await supabase
      .from('lots')
      .update({ status: 'closed' })
      .neq('status', 'closed');
    if (!error) console.log('✅ Fermeture automatique de tous les lots');
    return true;
  }
  return false;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    // Vérifier et fermer automatiquement si l'heure est dépassée
    await verifierEtFermerSiNecessaire();

    const { data: lots, error } = await supabase
      .from('lots')
      .select('*, bids(id, name, amount, email, created_at)')
      .order('id');

    if (error) return res.status(500).json({ error: error.message });

    const formatted = lots.map(l => ({
      ...l,
      history: (l.bids || [])
        .sort((a, b) => b.amount - a.amount)
        .map(b => ({
          name:   b.name,
          amount: b.amount,
          email:  b.email,
          time:   new Date(b.created_at).toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' })
        }))
    }));

    return res.status(200).json(formatted);
  }

  if (req.method === 'POST') {
    const { num, emoji, name, description, mise, retail, status, category, image_url } = req.body;
    const { data, error } = await supabase
      .from('lots')
      .insert([{ num, emoji, name, description, mise, retail, current: mise, status: status || 'new', category, image_url }])
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json(data);
  }

  if (req.method === 'PUT') {
    const { id, ...updates } = req.body;
    const { data, error } = await supabase
      .from('lots')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data);
  }

  if (req.method === 'DELETE') {
    const { id } = req.query;
    const { error } = await supabase.from('lots').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Méthode non autorisée' });
};
