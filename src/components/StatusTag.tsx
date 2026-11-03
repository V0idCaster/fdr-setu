import { CalendarClock, CheckCircle2, FlaskConical } from "lucide-react"
import { cx } from "../lib/format"

export type Status = "working" | "simulated" | "planned"

export const STATUS: Record<Status, { label: string; short: string; Icon: typeof CheckCircle2; cls: string; meaning: string }> = {
  working: {
    label: "Working in prototype",
    short: "Working",
    Icon: CheckCircle2,
    cls: "border border-[#bcdcc8] bg-green-bg text-green-fg",
    meaning: "Runs in this build today.",
  },
  simulated: {
    label: "Simulated",
    short: "Simulated",
    Icon: FlaskConical,
    cls: "border border-[#d3d9e2] bg-slate-bg text-slate-fg",
    meaning: "Imitated with synthetic data in the browser. Not yet enforced by a server.",
  },
  planned: {
    label: "Planned for production",
    short: "Planned",
    Icon: CalendarClock,
    cls: "border border-dashed border-[#c9b27f] bg-white text-gold-700",
    meaning: "Designed, and built once the live backend is connected.",
  },
}

/** Status pill: icon + text, never colour alone. */
export function StatusTag({ status, compact, note }: { status: Status; compact?: boolean; note?: string }) {
  const s = STATUS[status]
  return (
    <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
      <span className={cx("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[13px] font-semibold", s.cls)}>
        <s.Icon aria-hidden className="size-3.5" />
        <span className="sr-only">Status: </span>
        {compact ? s.short : s.label}
      </span>
      {note && <span className="text-[13px] text-muted">({note})</span>}
    </span>
  )
}
