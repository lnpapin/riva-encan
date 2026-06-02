-- ================================================
-- RIVA ENCAN SILENCIEUX — Script de base de données
-- À exécuter dans Supabase > SQL Editor
-- ================================================

-- Table des lots
CREATE TABLE lots (
  id          SERIAL PRIMARY KEY,
  num         TEXT NOT NULL,
  emoji       TEXT DEFAULT '🎁',
  image_url   TEXT,
  name        TEXT NOT NULL,
  description TEXT NOT NULL,
  mise        INTEGER NOT NULL,
  retail      INTEGER NOT NULL,
  current     INTEGER NOT NULL,
  status      TEXT DEFAULT 'new' CHECK (status IN ('new', 'active', 'hot', 'closed')),
  category    TEXT DEFAULT 'autre' CHECK (category IN ('sport', 'experience', 'cadeau', 'autre')),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Table des enchères
CREATE TABLE bids (
  id         SERIAL PRIMARY KEY,
  lot_id     INTEGER REFERENCES lots(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  amount     INTEGER NOT NULL,
  email      TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table des paramètres de l'événement
CREATE TABLE settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Insérer la date de fermeture par défaut (modifiable depuis l'admin)
INSERT INTO settings (key, value)
VALUES ('close_datetime', NOW() + INTERVAL '48 hours');

-- ================================================
-- Données de démonstration (optionnel)
-- ================================================
INSERT INTO lots (num, emoji, name, description, mise, retail, current, status, category) VALUES
  ('LOT 01', '🏒', 'Billets Canadiens de Montréal', '2 billets — section 300, rang K', 80, 220, 155, 'hot', 'sport'),
  ('LOT 02', '🧺', 'Panier gourmand artisan', 'Produits locaux du Québec', 40, 95, 65, 'active', 'cadeau'),
  ('LOT 03', '💆', 'Forfait spa détente', 'Massage + soins 2h pour 2 personnes', 75, 180, 110, 'hot', 'experience'),
  ('LOT 04', '🍷', 'Coffret vin rouge premium', 'Sélection de 6 bouteilles', 60, 130, 60, 'new', 'cadeau'),
  ('LOT 05', '🎾', 'Leçons de tennis — 4 séances', 'Avec instructeur certifié', 50, 120, 85, 'active', 'experience'),
  ('LOT 06', '🛍️', 'Carte-cadeau Simons', 'Valeur de 250 $', 100, 250, 180, 'hot', 'autre'),
  ('LOT 07', '⚽', 'Billets CF Montréal', '4 billets — carré VIP + stationnement', 90, 200, 140, 'active', 'sport'),
  ('LOT 08', '🍽️', 'Souper gastronomique', 'Table pour 2 — restaurant étoilé', 120, 280, 195, 'hot', 'experience');

-- Activer la sécurité (Row Level Security)
ALTER TABLE lots     ENABLE ROW LEVEL SECURITY;
ALTER TABLE bids     ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Permettre la lecture publique des lots et enchères
CREATE POLICY "Lecture publique lots"     ON lots     FOR SELECT USING (true);
CREATE POLICY "Lecture publique enchères" ON bids     FOR SELECT USING (true);
CREATE POLICY "Lecture publique settings" ON settings FOR SELECT USING (true);

-- Permettre l'insertion d'enchères (sans authentification)
CREATE POLICY "Insertion enchères"  ON bids FOR INSERT WITH CHECK (true);

-- Permettre la modification des lots via la clé service (admin)
CREATE POLICY "Modification lots"     ON lots     FOR ALL USING (true);
CREATE POLICY "Modification settings" ON settings FOR ALL USING (true);
