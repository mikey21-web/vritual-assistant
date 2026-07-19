-- Add paise column for consistency with rest of pricing system
ALTER TABLE allied_inventory_items ADD COLUMN IF NOT EXISTS price_paise INTEGER NOT NULL DEFAULT 0;
UPDATE allied_inventory_items SET price_paise = ROUND(price_rupees * 100) WHERE price_paise = 0;
