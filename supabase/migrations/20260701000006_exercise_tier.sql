-- Tier a lift as a main (compound) or accessory (isolation/complementary) so the
-- Picker can group "Main lifts" above "Accessories" within each focus — mirroring
-- how a session is built: compounds first, then complementary work.
-- Nullable so unclassified/future rows are untouched; anchors are a subset of primary.
alter table public.exercises
  add column if not exists tier text check (tier in ('primary','accessory'));

-- Backfill the 45 seeded rows by name (per-user library is unique on name).
update public.exercises set tier = 'primary' where name in (
  'Incline DB Press','Flat DB Press','Chest Press Machine','Incline Chest Press Machine',
  'Smith Flat Press','Seated DB Shoulder Press','Smith Shoulder Press','Shoulder Press Machine',
  'Lat Pulldown','Seated Cable Row','Seated Row Machine','Assisted Pull-up',
  'Leg Press','Hack Squat','Smith Squat','Smith RDL','DB Romanian Deadlift','Goblet Squat',
  'DB Walking Lunge'
);
update public.exercises set tier = 'accessory' where name in (
  'Pec Deck','DB Lateral Raise','Cable Lateral Raise','Tricep Press Machine','Tricep Pushdown',
  'Overhead Cable Tricep Ext','Face Pulls','Rear Delt Fly Machine','Bicep Curl Machine',
  'DB Curl','Cable Curl','Hammer Curl','Leg Extension','Seated Leg Curl','Hip Abductor',
  'Hip Adductor','Calf Raise','Ab Crunch Machine','Cable Crunch','Plank','Single-leg Balance',
  'Banded Ankle Eversion','Banded Ankle Inversion','Single-leg Calf Raise','Heel Walks','Toe Walks'
);
