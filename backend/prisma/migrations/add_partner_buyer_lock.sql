-- Prevent duplicate partner-buyer associations: one partner per buyer phone
CREATE UNIQUE INDEX IF NOT EXISTS idx_lead_partner_phone ON leads(channel_partner_id, phone) WHERE channel_partner_id IS NOT NULL;
