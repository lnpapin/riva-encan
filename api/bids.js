// api/bids.js — Soumettre une enchère
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') return res.status(405).json({ error: 'Méthode non autorisée' });

  const { lot_id, name, amount, email } = req.body;

  // Validation
  if (!lot_id || !name || !amount) {
    return res.status(400).json({ error: 'Champs obligatoires manquants : lot_id, name, amount' });
  }

  // Vérifier que le lot existe et est ouvert
  const { data: lot, error: lotError } = await supabase
    .from('lots')
    .select('id, current, status')
    .eq('id', lot_id)
    .single();

  if (lotError || !lot) return res.status(404).json({ error: 'Lot introuvable' });
  if (lot.status === 'closed') return res.status(400).json({ error: 'Ce lot est fermé aux enchères' });
  if (amount <= lot.current) return res.status(400).json({ error: `L'offre doit être supérieure à ${lot.current} $` });

  // Insérer l'enchère
  const { data: bid, error: bidError } = await supabase
    .from('bids')
    .insert([{ lot_id, name, amount, email: email || null }])
    .select()
    .single();

  if (bidError) return res.status(500).json({ error: bidError.message });

  // Mettre à jour le montant actuel du lot
  const newStatus = lot.status !== 'hot' ? (await countBids(lot_id) >= 3 ? 'hot' : 'active') : 'hot';
  await supabase
    .from('lots')
    .update({ current: amount, status: newStatus })
    .eq('id', lot_id);

  return res.status(201).json({ success: true, bid });
}

async function countBids(lotId) {
  const { count } = await supabase
    .from('bids')
    .select('*', { count: 'exact', head: true })
    .eq('lot_id', lotId);
  return count || 0;
}
