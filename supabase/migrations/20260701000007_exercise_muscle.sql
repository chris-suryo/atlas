-- Primary mover per lift, for the rule-based suggestion engine's muscle-gap
-- signal (design §7.3). Single primary mover per exercise (compounds get their
-- main mover). Plain nullable text — the vocabulary is open and may grow;
-- created-on-the-fly rows stay NULL. Backfill the 45 seeded rows by muscle.
alter table public.exercises add column if not exists muscle text;

update public.exercises set muscle='chest'       where name in ('Incline DB Press','Flat DB Press','Chest Press Machine','Incline Chest Press Machine','Pec Deck','Smith Flat Press');
update public.exercises set muscle='front_delts' where name in ('Seated DB Shoulder Press','Smith Shoulder Press','Shoulder Press Machine');
update public.exercises set muscle='side_delts'  where name in ('DB Lateral Raise','Cable Lateral Raise');
update public.exercises set muscle='triceps'     where name in ('Tricep Press Machine','Tricep Pushdown','Overhead Cable Tricep Ext');
update public.exercises set muscle='lats'        where name in ('Lat Pulldown','Assisted Pull-up');
update public.exercises set muscle='upper_back'  where name in ('Seated Cable Row','Seated Row Machine');
update public.exercises set muscle='rear_delts'  where name in ('Face Pulls','Rear Delt Fly Machine');
update public.exercises set muscle='biceps'      where name in ('Bicep Curl Machine','DB Curl','Cable Curl','Hammer Curl');
update public.exercises set muscle='quads'       where name in ('Leg Press','Hack Squat','Smith Squat','Goblet Squat','Leg Extension','DB Walking Lunge');
update public.exercises set muscle='hamstrings'  where name in ('Smith RDL','DB Romanian Deadlift','Seated Leg Curl');
update public.exercises set muscle='glutes'      where name in ('Hip Abductor','Hip Adductor');
update public.exercises set muscle='calves'      where name in ('Calf Raise','Single-leg Calf Raise');
update public.exercises set muscle='abs'         where name in ('Ab Crunch Machine','Cable Crunch','Plank');
update public.exercises set muscle='ankle'       where name in ('Single-leg Balance','Banded Ankle Eversion','Banded Ankle Inversion','Heel Walks','Toe Walks');
