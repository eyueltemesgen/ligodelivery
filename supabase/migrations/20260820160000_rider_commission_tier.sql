-- Rider commission tiers let admins adjust payout/commission bands per rider
-- (e.g. high-volume riders graduate to a better tier).
ALTER TABLE public.riders
  ADD COLUMN IF NOT EXISTS commission_tier text NOT NULL DEFAULT 'standard'
  CHECK (commission_tier IN ('standard', 'silver', 'gold'));
