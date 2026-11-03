/** Simulated "current date" for the prototype. */
export const TODAY = new Date("2026-08-01T10:00:00+05:30")

const DAY = 86_400_000

const IST_OFFSET = 330 * 60_000

/** Calendar day number in India Standard Time, independent of the viewer's timezone. */
function istDay(d: Date) {
  return Math.floor((d.getTime() + IST_OFFSET) / DAY)
}

export function daysUntil(iso: string, from: Date = TODAY) {
  return istDay(new Date(iso)) - istDay(from)
}

export function daysSince(iso: string, from: Date = TODAY) {
  return -daysUntil(iso, from)
}

export function addDays(iso: string | Date, n: number) {
  return new Date(new Date(iso).getTime() + n * DAY).toISOString()
}

const dateFmt = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "Asia/Kolkata",
})
const timeFmt = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "Asia/Kolkata",
})

const dayMonthFmt = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  timeZone: "Asia/Kolkata",
})

/** Short form for status lines, e.g. "10 Aug". */
export function fmtDayMonth(iso?: string) {
  if (!iso) return "—"
  return dayMonthFmt.format(new Date(iso))
}

export function fmtDate(iso?: string) {
  if (!iso) return "—"
  return dateFmt.format(new Date(iso))
}

export function fmtDateTime(iso?: string) {
  if (!iso) return "—"
  const d = new Date(iso)
  return `${dateFmt.format(d)}, ${timeFmt.format(d)}`
}

/**
 * Simulated clock for new actions. Each call returns one minute after the latest
 * timestamp already issued, starting from the simulated "now". The store syncs it with
 * the newest saved timestamp on load, so actions after a refresh never sort before
 * earlier ones. Timestamps are generated once and then stored; they are never regenerated.
 */
let lastIssued = TODAY.getTime()
export function nowIso() {
  lastIssued += 60_000
  return new Date(lastIssued).toISOString()
}

/** Moves the simulated clock forward to at least the given saved timestamps. */
export function syncClock(isoTimes: Iterable<string>) {
  for (const iso of isoTimes) {
    const t = new Date(iso).getTime()
    if (Number.isFinite(t) && t > lastIssued) lastIssued = t
  }
}

export function toInputDate(iso?: string) {
  if (!iso) return ""
  return new Date(new Date(iso).getTime() + IST_OFFSET)
    .toISOString()
    .slice(0, 10)
}
