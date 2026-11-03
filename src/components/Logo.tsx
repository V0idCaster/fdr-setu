import { cx } from "../lib/format"

/** Bridge (setu) mark — an arch spanning two pillars. */
export function Mark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={cx("shrink-0", className)} aria-hidden>
      <rect x="0.75" y="0.75" width="38.5" height="38.5" rx="9" fill="#fbf6ea" stroke="#d9c79f" strokeWidth="1.5" />
      <path d="M7 27c4-9 9-13 13-13s9 4 13 13" fill="none" stroke="#a7843f" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M7 29.5h26" stroke="#2b2a27" strokeWidth="2" strokeLinecap="round" />
      <path d="M13 29.5v-7M20 29.5v-11M27 29.5v-7" stroke="#2b2a27" strokeWidth="1.6" strokeLinecap="round" opacity=".75" />
    </svg>
  )
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cx("inline-flex items-center gap-2.5", className)}>
      <Mark className="size-9" />
      <span className="leading-none">
        <span className="block font-display text-[19px] font-semibold tracking-[0.02em] text-ink">
          FDR <span className="text-brand">SETU</span>
        </span>
        <span className="mt-1 block whitespace-nowrap text-[9.5px] font-medium uppercase tracking-[0.12em] text-muted">
          Security Deposit Portal
        </span>
      </span>
    </span>
  )
}
