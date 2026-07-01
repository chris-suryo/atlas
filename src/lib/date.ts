// Date helpers kept out of component render scope (purity lint).
export const TZ = "America/New_York"; // Chris is in the Boston area

export function todayLabel(): string {
  return new Date().toLocaleDateString("en-US", {
    weekday: "short",
    day: "numeric",
    timeZone: TZ,
  });
}

const YMD = new Intl.DateTimeFormat("en-CA", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Boston-local YYYY-MM-DD for a UTC instant — the day WHOOP data belongs to.
 *  Pure given the input; ICU handles DST. */
export function localDayFromISO(iso: string): string {
  return YMD.format(new Date(iso));
}

/** Today's Boston-local YYYY-MM-DD (wall clock — server/cron use). */
export function todayLocalISO(): string {
  return YMD.format(new Date());
}
