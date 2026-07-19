-- Prevent double-booking at the DB level: only one ACTIVE hold per unit
CREATE UNIQUE INDEX IF NOT EXISTS idx_unit_holds_active_unit ON unit_holds(unit_id) WHERE status = 'ACTIVE';
