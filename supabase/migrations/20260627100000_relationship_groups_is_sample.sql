-- Add is_sample flag to relationship_groups so that sample-seeded categories
-- can be targeted by the "Remove Sample Data" cleanup, just like network_contacts.
ALTER TABLE relationship_groups
  ADD COLUMN IF NOT EXISTS is_sample BOOLEAN NOT NULL DEFAULT false;
