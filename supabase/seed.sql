-- Atlas exercise library seed (45 exercises) — Planet Fitness Central Square aware.
-- Owner = the single Atlas user. PREREQUISITE: that user must have signed in at
-- least once so a row exists in auth.users; this picks the earliest-created user.
-- Idempotent upsert keyed on (user_id, name) — safe to re-run; updates metadata.
-- Anchors (is_anchor=true): Incline DB Press, Seated DB Shoulder Press,
-- Lat Pulldown, Seated Cable Row, Leg Press.

with u as (
  select id from auth.users order by created_at asc limit 1
)
insert into public.exercises (user_id, name, category, equipment, is_anchor, aliases, default_unit)
select u.id, x.name, x.category, x.equipment, x.is_anchor, x.aliases, x.default_unit
from u, (values
  -- PUSH ------------------------------------------------------------------
  ('Incline DB Press','push','dumbbell',true, array['incline db','incline dumbbell','incline press','incline db press','incline'],'lbs'),
  ('Flat DB Press','push','dumbbell',false, array['flat db','flat db press','flat dumbbell press','db bench press','db bench'],'lbs'),
  ('Chest Press Machine','push','machine',false, array['chest press','machine chest press','chest press machine'],'lbs'),
  ('Incline Chest Press Machine','push','machine',false, array['incline chest press','incline machine','incline chest press machine'],'lbs'),
  ('Pec Deck','push','machine',false, array['pec deck','pec fly','chest fly'],'lbs'),
  ('Smith Flat Press','push','smith',false, array['smith bench','smith flat','smith flat press','smith bench press'],'lbs'),
  ('Seated DB Shoulder Press','push','dumbbell',true, array['db shoulder press','db shoulder','seated db shoulder','ohp','shoulder press'],'lbs'),
  ('Smith Shoulder Press','push','smith',false, array['smith shoulder','smith ohp','smith shoulder press'],'lbs'),
  ('Shoulder Press Machine','push','machine',false, array['shoulder press machine','machine shoulder','overhead press machine'],'lbs'),
  ('DB Lateral Raise','push','dumbbell',false, array['lateral raise','lat raise','side raise','laterals','db lateral raise'],'lbs'),
  ('Cable Lateral Raise','push','cable',false, array['cable lateral','cable lat raise','cable side raise','cable laterals'],'lbs'),
  ('Tricep Press Machine','push','machine',false, array['tricep press','tri press','tricep press machine','machine dip'],'lbs'),
  ('Tricep Pushdown','push','cable',false, array['pushdowns','pushdown','tris','tri pushdown','triceps','tricep pushdown','rope pushdown'],'lbs'),
  ('Overhead Cable Tricep Ext','push','cable',false, array['overhead tricep','overhead extension','tricep extension','cable overhead tricep'],'lbs'),
  -- PULL ------------------------------------------------------------------
  ('Lat Pulldown','pull','cable',true, array['lat pulldown','pulldown','pulldowns','lats','lat pull','pull down'],'lbs'),
  ('Seated Cable Row','pull','cable',true, array['seated row','cable row','rows','row','seated cable row'],'lbs'),
  ('Seated Row Machine','pull','machine',false, array['row machine','machine row','seated row machine','chest supported row','hammer row'],'lbs'),
  ('Assisted Pull-up','pull','machine',false, array['assisted pullup','assisted pull-up','pull up','pullup','chin up'],'lbs'),
  ('Face Pulls','pull','cable',false, array['face pull','face pulls','facepull','rope face pull'],'lbs'),
  ('Rear Delt Fly Machine','pull','machine',false, array['rear delt','rear delt fly','reverse fly','reverse pec deck','rear fly'],'lbs'),
  ('Bicep Curl Machine','pull','machine',false, array['curl machine','machine curl','bicep machine','preacher machine'],'lbs'),
  ('DB Curl','pull','dumbbell',false, array['db curl','dumbbell curl','curl','curls','biceps','bicep curl'],'lbs'),
  ('Cable Curl','pull','cable',false, array['cable curl','cable bicep','rope curl'],'lbs'),
  ('Hammer Curl','pull','dumbbell',false, array['hammer curl','hammers','hammer','db hammer curl'],'lbs'),
  -- LEGS ------------------------------------------------------------------
  ('Leg Press','legs','machine',true, array['leg press','legs','leg press machine'],'lbs'),
  ('Hack Squat','legs','machine',false, array['hack squat','hack','hacks'],'lbs'),
  ('Smith Squat','legs','smith',false, array['smith squat','smith squats'],'lbs'),
  ('Smith RDL','legs','smith',false, array['smith rdl','smith romanian','smith deadlift','smith hinge','rdl'],'lbs'),
  ('DB Romanian Deadlift','legs','dumbbell',false, array['db rdl','dumbbell rdl','db romanian','db romanian deadlift'],'lbs'),
  ('Goblet Squat','legs','dumbbell',false, array['goblet','goblet squat','goblets'],'lbs'),
  ('Leg Extension','legs','machine',false, array['leg extension','leg ext','extensions','quad extension'],'lbs'),
  ('Seated Leg Curl','legs','machine',false, array['leg curl','seated leg curl','hamstring curl','leg curls'],'lbs'),
  ('Hip Abductor','legs','machine',false, array['abductor','hip abductor','abduction','outer thigh'],'lbs'),
  ('Hip Adductor','legs','machine',false, array['adductor','hip adductor','adduction','inner thigh'],'lbs'),
  ('Calf Raise','legs','machine',false, array['calf raise','calves','calf','calf raises'],'lbs'),
  ('DB Walking Lunge','legs','dumbbell',false, array['walking lunge','lunges','db lunge','walking lunges','lunge'],'lbs'),
  -- CORE ------------------------------------------------------------------
  ('Ab Crunch Machine','core','machine',false, array['ab crunch','crunch machine','ab machine'],'lbs'),
  ('Cable Crunch','core','cable',false, array['cable crunch','kneeling crunch','rope crunch'],'lbs'),
  ('Plank','core','bodyweight',false, array['plank','planks','front plank'],'time'),
  -- MOBILITY / ANKLE ------------------------------------------------------
  ('Single-leg Balance','mobility','bodyweight',false, array['single leg balance','balance','sl balance','one leg balance'],'time'),
  ('Banded Ankle Eversion','mobility','band',false, array['ankle eversion','eversion','banded eversion','band eversion'],'band'),
  ('Banded Ankle Inversion','mobility','band',false, array['ankle inversion','inversion','banded inversion','band inversion'],'band'),
  ('Single-leg Calf Raise','mobility','bodyweight',false, array['single leg calf','sl calf','single-leg calf raise','one leg calf raise'],'bodyweight'),
  ('Heel Walks','mobility','bodyweight',false, array['heel walks','heel walk'],'bodyweight'),
  ('Toe Walks','mobility','bodyweight',false, array['toe walks','toe walk'],'bodyweight')
) as x (name, category, equipment, is_anchor, aliases, default_unit)
on conflict (user_id, name) do update set
  category     = excluded.category,
  equipment    = excluded.equipment,
  is_anchor    = excluded.is_anchor,
  aliases      = excluded.aliases,
  default_unit = excluded.default_unit;

-- Tier (mirrors migration 20260701000006): main lifts vs. accessories, so the
-- Picker can group "Main lifts" above "Accessories" within each focus.
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

-- Muscle (mirrors migration 20260701000007): primary mover per lift, for the
-- suggestion engine's muscle-gap signal (design §7.3).
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
