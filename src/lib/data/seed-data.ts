import type { DefaultUnit } from "@/lib/parser";

export type SeedExercise = {
  name: string;
  category: string;
  equipment: string;
  is_anchor: boolean;
  aliases: string[];
  default_unit: DefaultUnit;
  /** 'primary' = compound/main lift, 'accessory' = isolation/complementary. */
  tier: "primary" | "accessory";
};

// The 45 Planet-Fitness-aware exercises (mirrors supabase/seed.sql). Source of
// truth for first-run auto-seed. Anchors: Incline DB Press, Seated DB Shoulder
// Press, Lat Pulldown, Seated Cable Row, Leg Press.
export const SEED_EXERCISES: SeedExercise[] = [
  // PUSH
  { name: "Incline DB Press", category: "push", equipment: "dumbbell", is_anchor: true, aliases: ["incline db", "incline dumbbell", "incline press", "incline db press", "incline"], default_unit: "lbs", tier: "primary" },
  { name: "Flat DB Press", category: "push", equipment: "dumbbell", is_anchor: false, aliases: ["flat db", "flat db press", "flat dumbbell press", "db bench press", "db bench"], default_unit: "lbs", tier: "primary" },
  { name: "Chest Press Machine", category: "push", equipment: "machine", is_anchor: false, aliases: ["chest press", "machine chest press", "chest press machine"], default_unit: "lbs", tier: "primary" },
  { name: "Incline Chest Press Machine", category: "push", equipment: "machine", is_anchor: false, aliases: ["incline chest press", "incline machine", "incline chest press machine"], default_unit: "lbs", tier: "primary" },
  { name: "Pec Deck", category: "push", equipment: "machine", is_anchor: false, aliases: ["pec deck", "pec fly", "chest fly"], default_unit: "lbs", tier: "accessory" },
  { name: "Smith Flat Press", category: "push", equipment: "smith", is_anchor: false, aliases: ["smith bench", "smith flat", "smith flat press", "smith bench press"], default_unit: "lbs", tier: "primary" },
  { name: "Seated DB Shoulder Press", category: "push", equipment: "dumbbell", is_anchor: true, aliases: ["db shoulder press", "db shoulder", "seated db shoulder", "ohp", "shoulder press"], default_unit: "lbs", tier: "primary" },
  { name: "Smith Shoulder Press", category: "push", equipment: "smith", is_anchor: false, aliases: ["smith shoulder", "smith ohp", "smith shoulder press"], default_unit: "lbs", tier: "primary" },
  { name: "Shoulder Press Machine", category: "push", equipment: "machine", is_anchor: false, aliases: ["shoulder press machine", "machine shoulder", "overhead press machine"], default_unit: "lbs", tier: "primary" },
  { name: "DB Lateral Raise", category: "push", equipment: "dumbbell", is_anchor: false, aliases: ["lateral raise", "lat raise", "side raise", "laterals", "db lateral raise"], default_unit: "lbs", tier: "accessory" },
  { name: "Cable Lateral Raise", category: "push", equipment: "cable", is_anchor: false, aliases: ["cable lateral", "cable lat raise", "cable side raise", "cable laterals"], default_unit: "lbs", tier: "accessory" },
  { name: "Tricep Press Machine", category: "push", equipment: "machine", is_anchor: false, aliases: ["tricep press", "tri press", "tricep press machine", "machine dip"], default_unit: "lbs", tier: "accessory" },
  { name: "Tricep Pushdown", category: "push", equipment: "cable", is_anchor: false, aliases: ["pushdowns", "pushdown", "tris", "tri pushdown", "triceps", "tricep pushdown", "rope pushdown"], default_unit: "lbs", tier: "accessory" },
  { name: "Overhead Cable Tricep Ext", category: "push", equipment: "cable", is_anchor: false, aliases: ["overhead tricep", "overhead extension", "tricep extension", "cable overhead tricep"], default_unit: "lbs", tier: "accessory" },
  // PULL
  { name: "Lat Pulldown", category: "pull", equipment: "cable", is_anchor: true, aliases: ["lat pulldown", "pulldown", "pulldowns", "lats", "lat pull", "pull down"], default_unit: "lbs", tier: "primary" },
  { name: "Seated Cable Row", category: "pull", equipment: "cable", is_anchor: true, aliases: ["seated row", "cable row", "rows", "row", "seated cable row"], default_unit: "lbs", tier: "primary" },
  { name: "Seated Row Machine", category: "pull", equipment: "machine", is_anchor: false, aliases: ["row machine", "machine row", "seated row machine", "chest supported row", "hammer row"], default_unit: "lbs", tier: "primary" },
  { name: "Assisted Pull-up", category: "pull", equipment: "machine", is_anchor: false, aliases: ["assisted pullup", "assisted pull-up", "pull up", "pullup", "chin up"], default_unit: "lbs", tier: "primary" },
  { name: "Face Pulls", category: "pull", equipment: "cable", is_anchor: false, aliases: ["face pull", "face pulls", "facepull", "rope face pull"], default_unit: "lbs", tier: "accessory" },
  { name: "Rear Delt Fly Machine", category: "pull", equipment: "machine", is_anchor: false, aliases: ["rear delt", "rear delt fly", "reverse fly", "reverse pec deck", "rear fly"], default_unit: "lbs", tier: "accessory" },
  { name: "Bicep Curl Machine", category: "pull", equipment: "machine", is_anchor: false, aliases: ["curl machine", "machine curl", "bicep machine", "preacher machine"], default_unit: "lbs", tier: "accessory" },
  { name: "DB Curl", category: "pull", equipment: "dumbbell", is_anchor: false, aliases: ["db curl", "dumbbell curl", "curl", "curls", "biceps", "bicep curl"], default_unit: "lbs", tier: "accessory" },
  { name: "Cable Curl", category: "pull", equipment: "cable", is_anchor: false, aliases: ["cable curl", "cable bicep", "rope curl"], default_unit: "lbs", tier: "accessory" },
  { name: "Hammer Curl", category: "pull", equipment: "dumbbell", is_anchor: false, aliases: ["hammer curl", "hammers", "hammer", "db hammer curl"], default_unit: "lbs", tier: "accessory" },
  // LEGS
  { name: "Leg Press", category: "legs", equipment: "machine", is_anchor: true, aliases: ["leg press", "legs", "leg press machine"], default_unit: "lbs", tier: "primary" },
  { name: "Hack Squat", category: "legs", equipment: "machine", is_anchor: false, aliases: ["hack squat", "hack", "hacks"], default_unit: "lbs", tier: "primary" },
  { name: "Smith Squat", category: "legs", equipment: "smith", is_anchor: false, aliases: ["smith squat", "smith squats"], default_unit: "lbs", tier: "primary" },
  { name: "Smith RDL", category: "legs", equipment: "smith", is_anchor: false, aliases: ["smith rdl", "smith romanian", "smith deadlift", "smith hinge", "rdl"], default_unit: "lbs", tier: "primary" },
  { name: "DB Romanian Deadlift", category: "legs", equipment: "dumbbell", is_anchor: false, aliases: ["db rdl", "dumbbell rdl", "db romanian", "db romanian deadlift"], default_unit: "lbs", tier: "primary" },
  { name: "Goblet Squat", category: "legs", equipment: "dumbbell", is_anchor: false, aliases: ["goblet", "goblet squat", "goblets"], default_unit: "lbs", tier: "primary" },
  { name: "Leg Extension", category: "legs", equipment: "machine", is_anchor: false, aliases: ["leg extension", "leg ext", "extensions", "quad extension"], default_unit: "lbs", tier: "accessory" },
  { name: "Seated Leg Curl", category: "legs", equipment: "machine", is_anchor: false, aliases: ["leg curl", "seated leg curl", "hamstring curl", "leg curls"], default_unit: "lbs", tier: "accessory" },
  { name: "Hip Abductor", category: "legs", equipment: "machine", is_anchor: false, aliases: ["abductor", "hip abductor", "abduction", "outer thigh"], default_unit: "lbs", tier: "accessory" },
  { name: "Hip Adductor", category: "legs", equipment: "machine", is_anchor: false, aliases: ["adductor", "hip adductor", "adduction", "inner thigh"], default_unit: "lbs", tier: "accessory" },
  { name: "Calf Raise", category: "legs", equipment: "machine", is_anchor: false, aliases: ["calf raise", "calves", "calf", "calf raises"], default_unit: "lbs", tier: "accessory" },
  { name: "DB Walking Lunge", category: "legs", equipment: "dumbbell", is_anchor: false, aliases: ["walking lunge", "lunges", "db lunge", "walking lunges", "lunge"], default_unit: "lbs", tier: "primary" },
  // CORE
  { name: "Ab Crunch Machine", category: "core", equipment: "machine", is_anchor: false, aliases: ["ab crunch", "crunch machine", "ab machine"], default_unit: "lbs", tier: "accessory" },
  { name: "Cable Crunch", category: "core", equipment: "cable", is_anchor: false, aliases: ["cable crunch", "kneeling crunch", "rope crunch"], default_unit: "lbs", tier: "accessory" },
  { name: "Plank", category: "core", equipment: "bodyweight", is_anchor: false, aliases: ["plank", "planks", "front plank"], default_unit: "time", tier: "accessory" },
  // MOBILITY / ANKLE
  { name: "Single-leg Balance", category: "mobility", equipment: "bodyweight", is_anchor: false, aliases: ["single leg balance", "balance", "sl balance", "one leg balance"], default_unit: "time", tier: "accessory" },
  { name: "Banded Ankle Eversion", category: "mobility", equipment: "band", is_anchor: false, aliases: ["ankle eversion", "eversion", "banded eversion", "band eversion"], default_unit: "band", tier: "accessory" },
  { name: "Banded Ankle Inversion", category: "mobility", equipment: "band", is_anchor: false, aliases: ["ankle inversion", "inversion", "banded inversion", "band inversion"], default_unit: "band", tier: "accessory" },
  { name: "Single-leg Calf Raise", category: "mobility", equipment: "bodyweight", is_anchor: false, aliases: ["single leg calf", "sl calf", "single-leg calf raise", "one leg calf raise"], default_unit: "bodyweight", tier: "accessory" },
  { name: "Heel Walks", category: "mobility", equipment: "bodyweight", is_anchor: false, aliases: ["heel walks", "heel walk"], default_unit: "bodyweight", tier: "accessory" },
  { name: "Toe Walks", category: "mobility", equipment: "bodyweight", is_anchor: false, aliases: ["toe walks", "toe walk"], default_unit: "bodyweight", tier: "accessory" },
];
