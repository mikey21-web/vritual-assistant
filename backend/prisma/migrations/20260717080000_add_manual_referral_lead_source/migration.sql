-- Manual lead entry for leads that come from outside Mikey's coverage
-- (walk-ins, referrals, offline sources an agent enters by hand).
ALTER TYPE "LeadSource" ADD VALUE 'MANUAL';
ALTER TYPE "LeadSource" ADD VALUE 'REFERRAL';
