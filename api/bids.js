const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Méthode non autorisée' });

  const { lot_id, name, amount, email } = req.body;
  if (!lot_id || !name || !amount) return res.status(400).json({ error: 'Champs manquants' });

  const { data: lot, error: lotError } = await supabase.from('lots').select('id, current, status').eq('id', lot_id).single();
  if (lotError || !lot) return res.status(404).json({ error: 'Lot introuvable' });
  if (lot.status === 'closed') return res.status(400).json({ error: 'Ce lot est fermé' });
  if (amount <= lot.current) return res.status(400).json({ error: `L'offre doit être supérieure à ${lot.current} $` });

  const { data: bid, error: bidError } = await supabase.from('bids')
    .insert([{ lot_id, name, amount, email: email || null }]).select().single();
  if (bidError) return res.status(500).json({ error: bidError.message });

  const { count } = await supabase.from('bids').select('*', { count: 'exact', head: true }).eq('lot_id', lot_id);
  const newStatus = (count >= 3) ? 'hot' : 'active';
  await supabase.from('lots').update({ current: amount, status: newStatus }).eq('id', lot_id);

  return res.status(201).json({ success: true, bid });
};
