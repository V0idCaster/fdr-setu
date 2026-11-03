import { daysSince, daysUntil, fmtDate, fmtDayMonth } from "../lib/dates"
import { fmtINR, maskRef } from "../lib/format"
import { INSTITUTIONS } from "./seed"
import type {
  Fdr,
  FlagType,
  Reminder,
  Role,
  Settings,
  Stage,
  User,
} from "./types"

export type Tone = "amber" | "red" | "green" | "slate" | "neutral"

export const FLAG_LABEL: Record<FlagType, string> = {
  date_mismatch: "Date mismatch",
  missing_document: "Missing document",
  amount_mismatch: "Amount mismatch",
  bank_detail_mismatch: "Bank detail mismatch",
  other: "Other discrepancy",
}

export const STAGE_LABEL: Record<Stage, string> = {
  submitted: "Submitted",
  under_review: "Under review",
  correction_requested: "Correction requested",
  accepted: "Accepted",
  renewal_initiated: "Renewal in progress",
  superseded: "Superseded",
  release_requested: "Release / refund in process",
  released: "Released",
  refunded: "Refunded",
}

export const ROLE_LABEL: Record<Role | "system", string> = {
  institution: "Institution",
  scrutiny: "Scrutiny official",
  authority: "Approving authority",
  system: "System",
}

export const CLOSED: Stage[] = ["superseded", "released", "refunded"]
export const isActive = (f: Fdr) => !CLOSED.includes(f.stage)
export const openFlags = (f: Fdr) => f.flags.filter((x) => !x.resolvedAt)

export function institutionName(id: string) {
  return INSTITUTIONS.find((i) => i.id === id)?.name ?? id
}

export function statusOf(
  f: Fdr,
  all: Fdr[] = [],
  settings?: Settings,
): { label: string; tone: Tone } {
  const maxWindow = settings ? Math.max(...settings.reminderWindows) : 60
  const days = daysUntil(f.maturityDate)
  const flags = openFlags(f)
  switch (f.stage) {
    case "released":
      return { label: "Released · closed", tone: "neutral" }
    case "refunded":
      return { label: "Refunded · closed", tone: "neutral" }
    case "superseded": {
      const next = all.find((x) => x.id === f.nextFdrId)
      return {
        label: next ? `Superseded → ${maskRef(next.fdrNumber)}` : "Superseded",
        tone: "neutral",
      }
    }
    case "release_requested": {
      const kind = f.release?.type === "refund" ? "Refund" : "Release"
      const at =
        f.release?.stage === "scrutiny_cleared" ? "authority" : "scrutiny"
      return { label: `${kind} pending · ${at}`, tone: "slate" }
    }
  }
  if (flags.length) {
    const extra = flags.length > 1 ? ` +${flags.length - 1}` : ""
    return {
      label: `${FLAG_LABEL[flags[0].type]}${extra} · review`,
      tone: "red",
    }
  }
  if (f.stage === "submitted" || f.stage === "under_review") {
    const resubmitted = f.flags.some((x) => x.resolvedAt)
    return {
      label: resubmitted ? "Resubmitted · review" : "Pending review",
      tone: "slate",
    }
  }
  if (days < 0) return { label: `Matured ${-days} days ago · act`, tone: "red" }
  if (f.stage === "renewal_initiated")
    return { label: `Renewal in progress · ${days} days`, tone: "amber" }
  if (days <= maxWindow)
    return { label: `Renewal due · ${days} days`, tone: "amber" }
  return { label: "Accepted · monitoring", tone: "green" }
}

export function visibleFdrs(fdrs: Fdr[], user: User | null) {
  if (!user) return []
  // Mirrors the RLS policy: institution users only see rows for their institution_id.
  if (user.role === "institution")
    return fdrs.filter((f) => f.institutionId === user.institutionId)
  return fdrs
}

export function kpis(fdrs: Fdr[]) {
  const active = fdrs.filter(isActive)
  return {
    active: active.length,
    activeValue: active.reduce((s, f) => s + f.amount, 0),
    expiring30: active.filter((f) => {
      const d = daysUntil(f.maturityDate)
      return d >= 0 && d <= 30 && f.stage !== "release_requested"
    }).length,
    pendingReview: fdrs.filter(
      (f) => f.stage === "submitted" || f.stage === "under_review",
    ).length,
    corrections: fdrs.filter((f) => f.stage === "correction_requested").length,
    releasePending: fdrs.filter((f) => f.stage === "release_requested").length,
  }
}

export function urgency(f: Fdr) {
  return daysUntil(f.owner.deadline)
}

export function caseAge(f: Fdr) {
  return daysSince(f.owner.since)
}

export function remindersFor(reminders: Reminder[], fdrId: string) {
  return reminders
    .filter((r) => r.fdrId === fdrId)
    .sort((a, b) => b.window - a.window)
}

export function deadlineTone(days: number): Tone {
  if (days < 0) return "red"
  if (days <= 3) return "red"
  if (days <= 10) return "amber"
  return "slate"
}

const FLAG_VERB: Record<FlagType, string> = {
  date_mismatch: "correct issue date",
  amount_mismatch: "confirm amount",
  missing_document: "upload the FDR receipt",
  bank_detail_mismatch: "correct bank details",
  other: "answer the query",
}

function joinWords(words: string[]) {
  if (words.length <= 1) return words[0] ?? ""
  return `${words.slice(0, -1).join(", ")} and ${words[words.length - 1]}`
}

export type NextStep = {
  /** The single primary status line, written for the viewer's role. */
  line: string
  kind: "action" | "waiting" | "escalated" | "closed" | "monitoring"
  urgent?: boolean
  due?: string
  note?: string
  /** Main action. `to` navigates; otherwise the page scrolls to the Actions panel. */
  cta?: { label: string; to?: string }
}

const OWNER_NAME: Record<Role, string> = {
  institution: "institution",
  scrutiny: "scrutiny desk",
  authority: "approving authority",
}

export function nextStep(f: Fdr, user: User, all: Fdr[], settings: Settings): NextStep {
  const role = user.role
  const due = f.owner.deadline
  const waiting = (note = "No action needed from you right now."): NextStep => ({
    line: `Waiting on ${OWNER_NAME[f.owner.role]} · due ${fmtDayMonth(due)}`,
    kind: "waiting",
    due,
    note,
  })
  const kind = f.release?.type === "refund" ? "refund" : "release"

  if (f.stage === "released" || f.stage === "refunded") {
    return {
      line: `Closed · ${f.stage} on ${fmtDate(f.release?.decidedAt)}`,
      kind: "closed",
      note: "No further action. The record is retained for audit.",
    }
  }
  if (f.stage === "superseded") {
    const next = all.find((x) => x.id === f.nextFdrId)
    return {
      line: next ? `Closed · superseded by ${maskRef(next.fdrNumber)}` : "Closed · superseded",
      kind: "closed",
      note: "This instrument was replaced through renewal.",
      cta: next ? { label: "Open current FDR", to: `/app/fdr/${next.id}` } : undefined,
    }
  }
  if (f.stage === "correction_requested") {
    if (role !== "institution") return waiting("Correction requested from the institution.")
    const verbs = [...new Set(openFlags(f).map((x) => FLAG_VERB[x.type]))]
    return {
      line: `Action needed: ${joinWords(verbs)} by ${fmtDayMonth(due)}`,
      kind: "action",
      urgent: daysUntil(due) <= 3,
      due,
      note: "Review is paused until you respond.",
      cta: { label: "Respond to correction" },
    }
  }
  if (f.stage === "submitted" || f.stage === "under_review") {
    if (role !== "scrutiny") return waiting(role === "institution" ? "Your submission is with the scrutiny desk." : undefined)
    const again = f.flags.some((x) => x.resolvedAt)
    return {
      line: `Action needed: review ${again ? "resubmission" : "submission"} by ${fmtDayMonth(due)}`,
      kind: "action",
      urgent: daysUntil(due) <= 1,
      due,
      note: "Accept, or flag what does not match the receipt.",
      cta: { label: "Review now" },
    }
  }
  if (f.stage === "release_requested") {
    if (f.release?.stage === "requested" && role === "scrutiny") {
      return {
        line: `Action needed: check ${kind} request by ${fmtDayMonth(due)}`,
        kind: "action",
        due,
        note: "Clear scrutiny and forward to the Approving Authority.",
        cta: { label: "Check request" },
      }
    }
    if (f.release?.stage === "scrutiny_cleared" && role === "authority") {
      return {
        line: `Action needed: decide ${kind} of ${fmtINR(f.amount)} by ${fmtDayMonth(due)}`,
        kind: "action",
        due,
        note: "Scrutiny has cleared this request.",
        cta: { label: "Record decision" },
      }
    }
    return waiting()
  }
  if (f.stage === "renewal_initiated") {
    const next = all.find((x) => x.id === f.nextFdrId)
    if (role === "scrutiny" && next) {
      return {
        line: `Action needed: review renewal ${maskRef(next.fdrNumber)} by ${fmtDayMonth(next.owner.deadline)}`,
        kind: "action",
        due: next.owner.deadline,
        note: "This FDR closes once the replacement is accepted.",
        cta: { label: "Open renewal", to: `/app/fdr/${next.id}` },
      }
    }
    return waiting(role === "institution" ? "Your renewal is with the scrutiny desk." : undefined)
  }

  // accepted
  const days = daysUntil(f.maturityDate)
  const max = Math.max(...settings.reminderWindows)
  const renewTo = `/app/renew/${f.id}`
  if (f.owner.label.startsWith("Escalated")) {
    if (role === "institution") {
      return {
        line: `Action needed: start renewal before ${fmtDayMonth(f.maturityDate)}`,
        kind: "action",
        urgent: true,
        due: f.maturityDate,
        note: "This case has been escalated to the Approving Authority.",
        cta: { label: "Start renewal", to: renewTo },
      }
    }
    const reminded = f.escalation?.remindedAt ? `Reminder sent to the institution on ${fmtDate(f.escalation.remindedAt)}. ` : ""
    if (role === "authority") {
      return {
        line: `Escalated to you · matures ${fmtDayMonth(f.maturityDate)}, renewal not started`,
        kind: "escalated",
        due: f.maturityDate,
        note: `${reminded}Send the institution a reminder, or add a note and acknowledge.`,
        cta: { label: "Respond to escalation" },
      }
    }
    return {
      line: `Escalated to approving authority · matures ${fmtDayMonth(f.maturityDate)}`,
      kind: "escalated",
      due: f.maturityDate,
      note: `${reminded}Renewal must be submitted by the institution.`,
    }
  }
  if (days < 0) {
    if (role === "institution") {
      return {
        line: `Action needed: renew or request release · matured ${-days} days ago`,
        kind: "action",
        urgent: true,
        due: f.maturityDate,
        cta: { label: "Start renewal", to: renewTo },
      }
    }
    return { line: `Waiting on institution · matured ${fmtDayMonth(f.maturityDate)}`, kind: "waiting", urgent: true, due: f.maturityDate }
  }
  if (f.owner.role === "scrutiny" && f.bankConfirmation === "requested") {
    if (role === "scrutiny") {
      return {
        line: `Action needed: record bank confirmation by ${fmtDayMonth(due)}`,
        kind: "action",
        due,
        note: "Record only once the bank’s own letter is in hand.",
        cta: { label: "Record confirmation" },
      }
    }
    return waiting("Bank confirmation is being obtained by the scrutiny desk.")
  }
  if (days <= max) {
    const renewDue = f.owner.role === "institution" ? due : f.maturityDate
    if (role === "institution") {
      return {
        line: `Action needed: start renewal by ${fmtDayMonth(renewDue)}`,
        kind: "action",
        urgent: daysUntil(renewDue) <= 7,
        due: renewDue,
        note: `FDR matures on ${fmtDate(f.maturityDate)}.`,
        cta: { label: "Start renewal", to: renewTo },
      }
    }
    return {
      line: `Waiting on institution · due ${fmtDayMonth(renewDue)}`,
      kind: "waiting",
      due: renewDue,
      note: `Renewal expected before maturity on ${fmtDate(f.maturityDate)}.`,
    }
  }
  return {
    line: `Accepted · monitoring until maturity on ${fmtDate(f.maturityDate)}`,
    kind: "monitoring",
    note: `Reminders begin ${max} days before maturity.`,
  }
}

/**
 * Urgency band for days to maturity, driven by the reminder policy:
 * red at or inside the escalation point, amber inside the second-tightest reminder window
 * (or the only window), otherwise slate. With 60/30/7 and escalation at 7 this gives ≤7 / ≤30 / beyond.
 */
export function windowTone(days: number, settings: Settings): Tone {
  const sorted = [...settings.reminderWindows].sort((a, b) => a - b)
  if (days <= settings.escalateAtDays) return "red"
  const amberUntil = sorted.length >= 2 ? sorted[1] : (sorted[0] ?? 30)
  return days <= amberUntil ? "amber" : "slate"
}
