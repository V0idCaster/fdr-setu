import {
  Check,
  CheckCircle2,
  Circle,
  CircleDashed,
  Clock3,
  XCircle,
  Landmark,
  Send,
  ShieldCheck,
  UserRound,
} from "lucide-react"
import { daysUntil, fmtDate, fmtDateTime } from "../lib/dates"
import { cx } from "../lib/format"
import { deadlineTone, ROLE_LABEL } from "../data/selectors"
import type { Fdr, Reminder } from "../data/types"
import { Chip } from "./ui"

export type StepState = "done" | "pending" | "blocked" | "waiting"

/** The three independent evidence states. Never derived from one another. */
export function evidenceStates(fdr: Fdr): { submitted: StepState; reviewed: StepState; bank: StepState } {
  return {
    submitted: "done",
    reviewed: fdr.reviewedAt ? "done" : fdr.stage === "correction_requested" ? "blocked" : "pending",
    bank: fdr.bankConfirmation === "confirmed" ? "done" : fdr.bankConfirmation === "requested" ? "waiting" : "pending",
  }
}

const EV_META: Record<StepState, { Icon: typeof Check; cls: string; word: string }> = {
  done: { Icon: CheckCircle2, cls: "text-green-fg", word: "Yes" },
  waiting: { Icon: Clock3, cls: "text-amber-fg", word: "Awaiting" },
  blocked: { Icon: XCircle, cls: "text-red-fg", word: "Held" },
  pending: { Icon: CircleDashed, cls: "text-slate-dot", word: "Not yet" },
}

/** Compact Submitted / Reviewed / Bank-confirmed indicators for list rows. Shape + text, not colour alone. */
export function EvidenceIndicators({ fdr, inline }: { fdr: Fdr; inline?: boolean }) {
  const s = evidenceStates(fdr)
  const items: [string, StepState][] = [
    ["Submitted", s.submitted],
    ["Reviewed", s.reviewed],
    ["Bank-confirmed", s.bank],
  ]
  return (
    <ul aria-label="Evidence states" className={cx(inline ? "flex flex-wrap gap-x-3 gap-y-1" : "space-y-0.5")}>
      {items.map(([label, st]) => {
        const m = EV_META[st]
        return (
          <li key={label} title={`${label}: ${m.word}`} className="flex items-center gap-1.5 whitespace-nowrap text-[13px] leading-tight">
            <m.Icon aria-hidden className={cx("size-3.5 shrink-0", m.cls)} />
            <span className={st === "pending" ? "text-muted" : "text-ink-2"}>{label}</span>
            <span className="sr-only">: {m.word}</span>
          </li>
        )
      })}
    </ul>
  )
}

export function EvidenceLegend() {
  return (
    <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-muted">
      <span className="font-medium text-ink-3">Evidence key:</span>
      {(["done", "waiting", "blocked", "pending"] as StepState[]).map((st) => {
        const m = EV_META[st]
        return (
          <span key={st} className="inline-flex items-center gap-1">
            <m.Icon aria-hidden className={cx("size-3.5", m.cls)} />
            {m.word}
          </span>
        )
      })}
    </p>
  )
}

function Step({
  icon: Icon,
  label,
  state,
  detail,
}: {
  icon: typeof Check
  label: string
  state: StepState
  detail: string
}) {
  const styles: Record<StepState, string> = {
    done: "border-[#bcdcc8] bg-green-bg text-green-fg",
    pending: "border-[#d3d9e2] bg-slate-bg text-slate-fg",
    waiting: "border-[#efd3a3] bg-amber-bg text-amber-fg",
    blocked: "border-[#efc2bf] bg-red-bg text-red-fg",
  }
  const word: Record<StepState, string> = {
    done: "Yes",
    pending: "Not yet",
    waiting: "Awaiting",
    blocked: "Held",
  }
  return (
    <li
      className={cx(
        "flex min-w-0 flex-1 items-start gap-2.5 rounded-lg border px-3 py-2.5",
        styles[state],
      )}
    >
      <Icon aria-hidden className="mt-0.5 size-4 shrink-0" />
      <div className="min-w-0">
        <p className="text-[13px] font-semibold">
          {label}: <span className="font-medium">{word[state]}</span>
        </p>
        <p className="truncate text-[13px] opacity-90">{detail}</p>
      </div>
    </li>
  )
}

/** Submitted ≠ Reviewed ≠ Bank-confirmed. Each state is shown independently. */
export function ProvenanceTrio({
  fdr,
  compact,
}: {
  fdr: Fdr
  compact?: boolean
}) {
  const { reviewed, bank } = evidenceStates(fdr)
  return (
    <ol
      aria-label="Evidence provenance"
      className={cx(
        "flex gap-2",
        compact ? "flex-col" : "flex-col sm:flex-row",
      )}
    >
      <Step
        icon={Send}
        label="Submitted"
        state="done"
        detail={`${fdmt(fdr.submittedAt)} · ${fdr.submittedBy}`}
      />
      <Step
        icon={ShieldCheck}
        label="Reviewed"
        state={reviewed}
        detail={
          fdr.reviewedAt
            ? `${fdmt(fdr.reviewedAt)} · ${fdr.reviewedBy}`
            : reviewed === "blocked"
              ? "Correction requested"
              : "Scrutiny desk"
        }
      />
      <Step
        icon={Landmark}
        label="Bank-confirmed"
        state={bank}
        detail={
          fdr.bankConfirmedAt
            ? `${fdmt(fdr.bankConfirmedAt)} · manual letter`
            : bank === "waiting"
              ? "Requested offline"
              : "Not requested"
        }
      />
    </ol>
  )
}

const fdmt = (s: string) => fmtDate(s)

export function OwnerChip({
  fdr,
  showSince,
  hideDeadline,
}: {
  fdr: Fdr
  showSince?: boolean
  hideDeadline?: boolean
}) {
  const closed = fdr.owner.label.startsWith("Closed")
  const days = daysUntil(fdr.owner.deadline)
  const tone = closed ? "neutral" : deadlineTone(days)
  return (
    <div className="inline-flex flex-wrap items-center gap-2">
      <span className="inline-flex items-center gap-1.5 rounded-md border border-line bg-paper px-2 py-1 text-[13px] text-ink-2">
        <UserRound aria-hidden className="size-3.5 text-gold-700" />
        <span className="sr-only">Case owner: </span>
        <span className="font-medium">{fdr.owner.label}</span>
        {!/authority|scrutiny/i.test(fdr.owner.label) && (
          <span className="text-muted">· {ROLE_LABEL[fdr.owner.role]}</span>
        )}
      </span>
      {!closed && !hideDeadline && (
        <Chip tone={tone}>
          <Clock3 aria-hidden className="size-3" />
          {days < 0
            ? `Overdue ${-days}d`
            : days === 0
              ? "Due today"
              : `Due in ${days}d`}{" "}
          · {fmtDate(fdr.owner.deadline)}
        </Chip>
      )}
      {showSince && (
        <span className="text-[13px] text-muted">
          held since {fmtDate(fdr.owner.since)}
        </span>
      )}
    </div>
  )
}

/** Generated ≠ Delivered ≠ Renewal completed. */
export function ReminderTrack({
  reminder,
  fdr,
}: {
  reminder: Reminder
  fdr?: Fdr
}) {
  const renewal =
    fdr?.stage === "superseded"
      ? "done"
      : fdr?.stage === "renewal_initiated"
        ? "progress"
        : "none"
  const items = [
    {
      label: "Generated",
      on: true,
      tone: "done",
      text: fmtDateTime(reminder.generatedAt),
    },
    {
      label: "Delivered",
      on: reminder.delivery === "delivered",
      tone:
        reminder.delivery === "failed"
          ? "fail"
          : reminder.delivery === "delivered"
            ? "done"
            : "wait",
      text:
        reminder.delivery === "delivered"
          ? fmtDateTime(reminder.deliveredAt)
          : reminder.delivery === "failed"
            ? "Failed · retry"
            : "Queued",
    },
    {
      label: "Renewal",
      on: renewal === "done",
      tone:
        renewal === "done" ? "done" : renewal === "progress" ? "wait" : "none",
      text:
        renewal === "done"
          ? "Completed"
          : renewal === "progress"
            ? "In progress"
            : "Not started",
    },
  ] as const
  return (
    <ol
      className="flex flex-wrap items-center gap-x-1 gap-y-1 text-[13px]"
      aria-label="Reminder progress"
    >
      {items.map((it, i) => (
        <li key={it.label} className="flex items-center gap-1">
          {i > 0 && (
            <span aria-hidden className="mx-0.5 text-line-strong">
              ≠
            </span>
          )}
          <span
            className={cx(
              "inline-flex items-center gap-1 rounded px-1.5 py-0.5 tnum",
              it.tone === "done" && "bg-green-bg text-green-fg",
              it.tone === "wait" && "bg-amber-bg text-amber-fg",
              it.tone === "fail" && "bg-red-bg text-red-fg",
              it.tone === "none" && "bg-paper-2 text-muted",
            )}
          >
            {it.tone === "done" ? (
              <Check aria-hidden className="size-3" />
            ) : (
              <Circle aria-hidden className="size-2.5" />
            )}
            <span className="font-medium">{it.label}</span>
            <span className="opacity-85">· {it.text}</span>
          </span>
        </li>
      ))}
    </ol>
  )
}
