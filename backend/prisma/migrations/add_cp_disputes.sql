CREATE TABLE IF NOT EXISTS cp_disputes (
  id TEXT PRIMARY KEY,
  partner_id TEXT NOT NULL REFERENCES channel_partners(id) ON DELETE CASCADE,
  booking_id TEXT REFERENCES bookings(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('COMMISSION_SHORTAGE','LEAD_POACHING','OTHER')),
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','INVESTIGATING','RESOLVED','DISMISSED')),
  resolution TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cp_disputes_partner ON cp_disputes(partner_id);
CREATE INDEX IF NOT EXISTS idx_cp_disputes_status ON cp_disputes(status);
