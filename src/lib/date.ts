// Date helpers kept out of component render scope (purity lint).
const TZ = "America/New_York"; // Chris is in the Boston area

export function todayLabel(): string {
  return new Date().toLocaleDateString("en-US", {
    weekday: "short",
    day: "numeric",
    timeZone: TZ,
  });
}
