import { useState, type ReactNode } from "react"
import {
  AlertOctagon,
  AlertTriangle,
  Archive,
  ArrowLeft,
  ArrowRight,
  BellRing,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  FileCheck2,
  FileSearch,
  FolderInput,
  GitBranch,
  Hourglass,
  RefreshCcw,
  Stamp,
} from "lucide-react"
import { useStore } from "../data/store"
import {
  FLAG_LABEL,
  institutionName,
  nextStep,
  openFlags,
  remindersFor,
  ROLE_LABEL,
  STAGE_LABEL,
  statusOf,
} from "../data/selectors"
import type { Fdr, FlagType, TimelineEvent, User } from "../data/types"
import { addDays, daysUntil, fmtDate, fmtDateTime, fmtDayMonth, TODAY, toInputDate } from "../lib/dates"
import { termWarning } from "../lib/validation"
import { DateField } from "../components/DateField"
import { AuditWhat } from "../components/AuditSentence"
import { cx, fmtINR, maskRef } from "../lib/format"
import {
  Button,
  Card,
  CardHeader,
  Chip,
  Disclaimer,
  DISCLAIMER_UPLOAD,
  Field,
  inputCls,
  LinkButton,
  SegmentedRadio,
} from "../components/ui"
import {
  OwnerChip,
  ProvenanceTrio,
  ReminderTrack,
} from "../components/Provenance"
import { DocumentPreview } from "../components/DocumentPreview"
import { DocumentReview } from "../components/DocumentReview"
import { UploadZone, type Picked } from "../components/UploadZone"
import { ConfirmDialog, type ConfirmSpec } from "../components/ConfirmDialog"
import { Link, navigate } from "../router"
import { ErrorScreen } from "../components/ErrorScreen"
import { toDocMeta } from "./SubmitFdr"

const STAGES = [
  { title: "Submit", icon: FolderInput },
  { title: "Validate", icon: FileCheck2 },
  { title: "Review", icon: FileSearch },
  { title: "Maturity check", icon: BellRing },
  { title: "Renewal", icon: RefreshCcw },
  { title: "Release / refund", icon: Stamp },
]

const EVENT_STAGE: Record<TimelineEvent["kind"], number> = {
  submitted: 0,
  validated: 1,
  review_started: 2,
  flagged: 2,
  correction_submitted: 2,
  accepted: 2,
  bank_requested: 2,
  bank_confirmed: 2,
  reminder: 3,
  escalated: 3,
  escalation_reminder: 3,
  escalation_acknowledged: 3,
  renewal_started: 4,
  renewed: 4,
  release_requested: 5,
  release_forwarded: 5,
  decision: 5,
}

type SState = "done" | "current" | "flagged" | "upcoming" | "skipped"

/** Stage-card states. `firstWindow` is the widest reminder window from the policy settings. */
function stageStates(f: Fdr, hasReminders: boolean, firstWindow: number): SState[] {
  const s = f.stage
  const review: SState = f.reviewedAt
    ? "done"
    : s === "correction_requested"
      ? "flagged"
      : "current"
  const days = daysUntil(f.maturityDate)
  const maturity: SState = !f.reviewedAt
    ? "upcoming"
    : ["superseded", "released", "refunded", "release_requested"].includes(s)
      ? "done"
      : days <= firstWindow
        ? "current"
        : hasReminders
          ? "done"
          : "upcoming"
  const renewal: SState =
    s === "superseded" || f.previousFdrId
      ? "done"
      : s === "renewal_initiated"
        ? "current"
        : ["released", "refunded"].includes(s)
          ? "skipped"
          : "upcoming"
  const release: SState = ["released", "refunded"].includes(s)
    ? "done"
    : s === "release_requested"
      ? "current"
      : s === "superseded"
        ? "skipped"
        : "upcoming"
  return ["done", "done", review, maturity, renewal, release]
}

function Stepper({
  states,
  active,
  onPick,
  counts,
}: {
  states: SState[]
  active: number | null
  onPick: (i: number | null) => void
  counts: number[]
}) {
  return (
    <ol
      className="grid grid-cols-3 gap-2 sm:grid-cols-6"
      aria-label="Lifecycle stages. Select a stage to filter the timeline."
    >
      {STAGES.map((st, i) => {
        const s = states[i]
        const on = active === i
        return (
          <li key={st.title}>
            <button
              onClick={() => onPick(on ? null : i)}
              aria-pressed={on}
              className={cx(
                "flex h-full w-full flex-col items-start gap-1.5 rounded-lg border px-2.5 py-2 text-left transition-colors",
                on
                  ? "border-ink ring-1 ring-ink"
                  : "border-line hover:border-line-strong",
                s === "done" && "bg-surface",
                s === "current" && "bg-amber-bg/60",
                s === "flagged" && "bg-red-bg/70",
                (s === "upcoming" || s === "skipped") && "bg-paper",
              )}
            >
              <span className="flex w-full items-center justify-between">
                <span
                  className={cx(
                    "grid size-6 place-items-center rounded-full",
                    s === "done" && "bg-green-dot text-white",
                    s === "current" && "bg-amber-dot text-white",
                    s === "flagged" && "bg-red-dot text-white",
                    (s === "upcoming" || s === "skipped") &&
                      "bg-paper-2 text-muted",
                  )}
                >
                  {s === "done" ? (
                    <Check aria-hidden className="size-3.5" />
                  ) : s === "flagged" ? (
                    <AlertOctagon aria-hidden className="size-3.5" />
                  ) : (
                    <st.icon aria-hidden className="size-3.5" />
                  )}
                </span>
                {counts[i] > 0 && (
                  <span className="text-[13px] text-muted tnum">
                    {counts[i]}
                  </span>
                )}
              </span>
              <span className="text-[13px] font-semibold leading-tight text-ink">
                {st.title}
              </span>
              <span className="text-[13px] capitalize text-muted">
                {s === "skipped" ? "not needed" : s}
              </span>
            </button>
          </li>
        )
      })}
    </ol>
  )
}

function Detail({ k, v, mono }: { k: string; v: ReactNode; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-4 border-b border-line py-2.5 last:border-0">
      <dt className="text-[13px] text-muted">{k}</dt>
      <dd
        className={cx(
          "text-right text-[13.5px] font-medium text-ink tnum",
          mono && "font-mono",
        )}
      >
        {v}
      </dd>
    </div>
  )
}

export default function FdrDetail({ id }: { id: string }) {
  const { state, user } = useStore()
  const [stageFilter, setStageFilter] = useState<number | null>(null)
  const fdr = state.fdrs.find((f) => f.id === id)

  // Mirrors RLS: an institution user requesting another institution's row gets nothing back.
  if (
    !user ||
    !fdr ||
    (user.role === "institution" && fdr.institutionId !== user.institutionId)
  ) {
    return (
      <ErrorScreen
        title="Case not found"
        actions={[
          { to: "/app/register", label: "Back to FDR register", primary: true },
          { to: "/app", label: "Go to dashboard" },
        ]}
      >
        This FDR does not exist, or it is outside your access. Institution users can open only their own institution’s records.
      </ErrorScreen>
    )
  }

  const status = statusOf(fdr, state.fdrs, state.settings)
  const reminders = remindersFor(state.reminders, fdr.id)
  const states = stageStates(fdr, reminders.length > 0, Math.max(...state.settings.reminderWindows))
  const counts = STAGES.map(
    (_, i) => fdr.events.filter((e) => EVENT_STAGE[e.kind] === i).length,
  )
  const events = [...fdr.events]
    .filter((e) => stageFilter === null || EVENT_STAGE[e.kind] === stageFilter)
    .reverse()
  const ref = maskRef(fdr.fdrNumber)
  const audit = state.audit
    .filter((a) => a.target === ref)
    .slice()
    .reverse()
  const chain: Fdr[] = []
  {
    let cur: Fdr | undefined = fdr
    while (cur?.previousFdrId)
      cur = state.fdrs.find((x) => x.id === cur!.previousFdrId)
    while (cur) {
      chain.push(cur)
      cur = cur.nextFdrId
        ? state.fdrs.find((x) => x.id === cur!.nextFdrId)
        : undefined
    }
  }
  const days = daysUntil(fdr.maturityDate)
  const official = user.role === "scrutiny" || user.role === "authority"

  return (
    <>
      <nav
        aria-label="Breadcrumb"
        className="mb-4 flex items-center gap-1.5 text-[13px] text-muted"
      >
        <Link
          to="/app/register"
          className="inline-flex items-center gap-1 hover:text-ink"
        >
          <ArrowLeft aria-hidden className="size-3.5" /> FDR register
        </Link>
        <ChevronRight aria-hidden className="size-3.5" />
        <span aria-current="page" className="font-mono text-ink">
          {ref}
        </span>
      </nav>

      <header className="mb-5">
        <p className="text-[13px] font-semibold uppercase tracking-[0.12em] text-gold-700">
          {institutionName(fdr.institutionId)}
        </p>
        <h1 className="mt-1 text-[30px] font-semibold leading-tight sm:text-[34px]">
          FDR <span className="font-mono text-[26px] sm:text-[30px]">{ref}</span>
        </h1>
        <p className="mt-1.5 text-[14px] text-muted tnum">
          {fdr.bank}, {fdr.branch} · {fmtINR(fdr.amount)} · matures {fmtDate(fdr.maturityDate)}
        </p>
      </header>

      <NextStepBar fdr={fdr} user={user} />

      {/* Supporting detail: deliberately smaller than the primary status line above. */}
      <div className="mb-6 mt-3 flex flex-wrap items-center gap-2 text-[13px]" aria-label="Case details">
        <Chip tone={status.tone}>{status.label}</Chip>
        <span className="rounded-md border border-line bg-white px-2 py-1 text-ink-2">
          <span className="text-muted">Stage:</span> {STAGE_LABEL[fdr.stage]}
        </span>
        <OwnerChip fdr={fdr} showSince hideDeadline />
      </div>

      <div className="mb-6">
        <ProvenanceTrio fdr={fdr} />
      </div>

      {official && <DocumentReview fdr={fdr} />}

      {/* Below xl the Actions panel sits above the timeline; on xl it moves to the right column. */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_400px] xl:grid-rows-[auto_1fr]">
        <div className="min-w-0 xl:col-start-2 xl:row-start-1">
          <ActionPanel key={fdr.id} fdr={fdr} />
        </div>
        <div className="min-w-0 space-y-6 xl:col-start-1 xl:row-span-2 xl:row-start-1">
          <Card>
            <CardHeader
              title="Lifecycle"
              sub="Select a stage to see only its events"
            />
            <div className="p-5">
              <Stepper
                states={states}
                active={stageFilter}
                onPick={setStageFilter}
                counts={counts}
              />
              <ol className="mt-5 space-y-0" aria-label="Timeline">
                {events.length === 0 && (
                  <li className="py-6 text-center text-[13.5px] text-muted">
                    No events recorded for this stage yet.
                  </li>
                )}
                {events.map((e, i) => (
                  <li key={e.id} className="relative flex gap-3 pb-4 last:pb-0">
                    {i < events.length - 1 && (
                      <span
                        aria-hidden
                        className="absolute left-[7px] top-5 h-full w-px bg-line"
                      />
                    )}
                    <span
                      aria-hidden
                      className={cx(
                        "relative mt-1 size-[15px] shrink-0 rounded-full border-2 border-surface ring-1",
                        e.kind === "flagged" || e.kind === "escalated"
                          ? "bg-red-dot ring-red-dot"
                          : e.kind === "accepted" ||
                              e.kind === "bank_confirmed" ||
                              e.kind === "decision" ||
                              e.kind === "renewed"
                            ? "bg-green-dot ring-green-dot"
                            : e.role === "system"
                              ? "bg-gold ring-gold-600"
                              : "bg-ink-3 ring-ink-3",
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-[13.5px] text-ink">{e.note}</p>
                      <p className="mt-0.5 text-[13px] text-muted tnum">
                        {fmtDateTime(e.at)} · {e.actor} · {ROLE_LABEL[e.role]} ·{" "}
                        <span className="text-gold-700">
                          {STAGES[EVENT_STAGE[e.kind]].title}
                        </span>
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </Card>

          {!official && (
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader title="Instrument" />
              <dl className="px-5 py-2">
                <Detail k="FDR number" v={ref} mono />
                <Detail k="Issuing bank" v={fdr.bank} />
                <Detail k="Branch" v={fdr.branch} />
                <Detail k="Amount" v={fmtINR(fdr.amount)} />
                <Detail k="Issue date" v={fmtDate(fdr.issueDate)} />
                <Detail
                  k="Maturity date"
                  v={
                    <span>
                      {fmtDate(fdr.maturityDate)}{" "}
                      <span
                        className={cx(
                          "ml-1 text-[13px]",
                          days <= 30 ? "text-amber-fg" : "text-muted",
                        )}
                      >
                        ({days < 0 ? `${-days}d ago` : `${days}d`})
                      </span>
                    </span>
                  }
                />
                <Detail
                  k="Beneficiary"
                  v={<span className="text-[13px]">{fdr.beneficiary}</span>}
                />
                <Detail
                  k="Bank confirmation"
                  v={
                    fdr.bankConfirmationRef ??
                    (fdr.bankConfirmation === "requested"
                      ? "Requested, awaiting"
                      : "Not requested")
                  }
                />
              </dl>
            </Card>
            <Card>
              <CardHeader title="Document" />
              <div className="p-5">
                <DocumentPreview fdr={fdr} />
                <Disclaimer variant="warn" className="mt-4">
                  {DISCLAIMER_UPLOAD}
                </Disclaimer>
              </div>
            </Card>
          </div>
          )}

          <Card>
            <CardHeader
              title="Discrepancy flags"
              sub={`${openFlags(fdr).length} open · ${fdr.flags.length - openFlags(fdr).length} resolved`}
            />
            {fdr.flags.length === 0 ? (
              <p className="px-5 py-6 text-[13.5px] text-muted">
                No discrepancies raised on this instrument.
              </p>
            ) : (
              <ul className="divide-y divide-line">
                {fdr.flags.map((fl) => (
                  <li key={fl.id} className="flex gap-3 px-5 py-4">
                    {fl.resolvedAt ? (
                      <CheckCircle2
                        aria-hidden
                        className="mt-0.5 size-4 shrink-0 text-green-fg"
                      />
                    ) : (
                      <AlertOctagon
                        aria-hidden
                        className="mt-0.5 size-4 shrink-0 text-red-fg"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-[14px] font-semibold text-ink">
                          {FLAG_LABEL[fl.type]}
                        </p>
                        <Chip tone={fl.resolvedAt ? "green" : "red"}>
                          {fl.resolvedAt ? "Response received" : "Open"}
                        </Chip>
                      </div>
                      <p className="mt-1 text-[13.5px] text-ink-3">{fl.note}</p>
                      <p className="mt-1 text-[13px] text-muted tnum">
                        Raised by {fl.raisedBy} · {fmtDateTime(fl.raisedAt)}
                      </p>
                      {fl.response && (
                        <p className="mt-2 rounded-md bg-paper px-3 py-2 text-[13px] text-ink-3">
                          <span className="font-medium text-ink">
                            Institution response ({fmtDate(fl.resolvedAt)}):
                          </span>{" "}
                          {fl.response}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <CardHeader
              title="Audit trail"
              sub="Every action on this instrument · append-only"
            />
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-[13px]">
                <thead>
                  <tr className="border-b border-line bg-paper text-[13px] text-muted">
                    <th scope="col" className="px-5 py-2 font-semibold">
                      When
                    </th>
                    <th scope="col" className="px-3 py-2 font-semibold">
                      Who
                    </th>
                    <th scope="col" className="px-5 py-2 font-semibold">
                      What happened
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {audit.map((a) => (
                    <tr key={a.id} className="align-top">
                      <td className="whitespace-nowrap px-5 py-2.5 text-muted tnum">{fmtDateTime(a.at)}</td>
                      <td className="px-3 py-2.5">
                        {a.actor}
                        <span className="block text-[13px] text-muted">{ROLE_LABEL[a.role]}</span>
                      </td>
                      <td className="px-5 py-2.5">
                        <AuditWhat entry={a} />
                      </td>
                    </tr>
                  ))}
                  {audit.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-5 py-6 text-center text-muted">
                        Seeded history predates audit capture for this record.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        <aside className="min-w-0 space-y-6 xl:col-start-2 xl:row-start-2 xl:self-start">

          <Card>
            <CardHeader
              title="Reminders"
              sub="Generated ≠ delivered ≠ renewal completed"
            />
            {reminders.length === 0 ? (
              <p className="px-5 py-6 text-[13.5px] text-muted">
                {days > Math.max(...state.settings.reminderWindows)
                  ? `First reminder at ${Math.max(...state.settings.reminderWindows)} days before maturity.`
                  : "No reminders generated yet."}
              </p>
            ) : (
              <ul className="divide-y divide-line">
                {reminders.map((r) => (
                  <li key={r.id} className="px-5 py-3.5">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-[13.5px] font-semibold text-ink">
                        {r.window}-day reminder
                      </p>
                      {r.escalated && <Chip tone="red">Escalated</Chip>}
                    </div>
                    <ReminderTrack reminder={r} fdr={fdr} />
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {chain.length > 1 && (
            <Card>
              <CardHeader
                title="Instrument history"
                sub="Renewal chain, oldest first"
                action={
                  <GitBranch aria-hidden className="size-4 text-gold-700" />
                }
              />
              <ol className="p-5">
                {chain.map((c, i) => (
                  <li key={c.id} className="relative flex gap-3 pb-4 last:pb-0">
                    {i < chain.length - 1 && (
                      <span
                        aria-hidden
                        className="absolute left-[9px] top-6 h-full w-px bg-line-strong"
                      />
                    )}
                    <CircleDot
                      aria-hidden
                      className={cx(
                        "relative mt-0.5 size-[19px] shrink-0",
                        c.id === fdr.id ? "text-gold-600" : "text-muted",
                      )}
                    />
                    <div>
                      {c.id === fdr.id ? (
                        <p className="font-mono text-[13.5px] font-semibold">
                          {maskRef(c.fdrNumber)} · this case
                        </p>
                      ) : (
                        <Link
                          to={`/app/fdr/${c.id}`}
                          className="font-mono text-[13.5px] font-semibold underline underline-offset-4"
                        >
                          {maskRef(c.fdrNumber)}
                        </Link>
                      )}
                      <p className="text-[13px] text-muted tnum">
                        {fmtDate(c.issueDate)} → {fmtDate(c.maturityDate)} ·{" "}
                        {STAGE_LABEL[c.stage]}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </Card>
          )}
        </aside>
      </div>
    </>
  )
}

function focusActions() {
  const el = document.getElementById("actions")
  if (!el) return
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
  el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" })
  el.focus({ preventScroll: true })
}

function NextStepBar({ fdr, user }: { fdr: Fdr; user: User }) {
  const { state } = useStore()
  const step = nextStep(fdr, user, state.fdrs, state.settings)
  const days = step.due ? daysUntil(step.due) : undefined
  const style = {
    action: step.urgent
      ? { box: "border-[#efc2bf] bg-red-bg/60", bar: "bg-red-dot", icon: "text-red-fg", Icon: ArrowRight }
      : { box: "border-[#e6d3a8] bg-gold-soft/70", bar: "bg-brand", icon: "text-brand", Icon: ArrowRight },
    waiting: { box: "border-[#d3d9e2] bg-slate-bg/70", bar: "bg-slate-dot", icon: "text-slate-fg", Icon: Hourglass },
    escalated: { box: "border-[#efc2bf] bg-red-bg/60", bar: "bg-red-dot", icon: "text-red-fg", Icon: AlertTriangle },
    closed: { box: "border-line bg-paper", bar: "bg-line-strong", icon: "text-muted", Icon: Archive },
    monitoring: { box: "border-[#bcdcc8] bg-green-bg/60", bar: "bg-green-dot", icon: "text-green-fg", Icon: CheckCircle2 },
  }[step.kind]
  const rel =
    days === undefined ? "" : days < 0 ? `Overdue by ${-days} day${days === -1 ? "" : "s"}` : days === 0 ? "Due today" : `In ${days} day${days === 1 ? "" : "s"}`

  return (
    <section
      aria-labelledby="next-step-label"
      className={cx("relative flex flex-col gap-4 overflow-hidden rounded-xl border py-4 pl-6 pr-4 sm:flex-row sm:items-center sm:pr-5", style.box)}
    >
      <span aria-hidden className={cx("absolute inset-y-0 left-0 w-1.5", style.bar)} />
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <style.Icon aria-hidden className={cx("mt-1 size-5 shrink-0", style.icon)} />
        <div className="min-w-0">
          <p id="next-step-label" className="text-[13px] font-semibold uppercase tracking-[0.12em] text-muted">
            Your next step
          </p>
          <p className="mt-0.5 text-[18px] font-semibold leading-snug text-ink tnum sm:text-[19px]">{step.line}</p>
          {step.note && <p className="mt-0.5 text-[13px] text-ink-3">{step.note}</p>}
        </div>
      </div>
      {(step.due || step.cta) && (
        <div className="flex shrink-0 flex-wrap items-center gap-4 pl-8 sm:pl-0">
          {step.due && (
            <div className="sm:text-right">
              <p className="text-[13px] font-semibold uppercase tracking-[0.12em] text-muted">Deadline</p>
              <p className="text-[15px] font-semibold text-ink tnum">{fmtDate(step.due)}</p>
              <p
                className={cx(
                  "text-[13px] font-medium tnum",
                  days !== undefined && days <= 3 ? "text-red-fg" : days !== undefined && days <= 10 ? "text-amber-fg" : "text-muted",
                )}
              >
                {rel}
              </p>
            </div>
          )}
          {step.cta && (
            <Button size="lg" onClick={() => (step.cta!.to ? navigate(step.cta!.to) : focusActions())}>
              {step.cta.label} <ArrowRight aria-hidden className="size-4" />
            </Button>
          )}
        </div>
      )}
    </section>
  )
}

const FLAG_TYPES: FlagType[] = [
  "date_mismatch",
  "amount_mismatch",
  "missing_document",
  "bank_detail_mismatch",
  "other",
]

function ActionPanel({ fdr }: { fdr: Fdr }) {
  const { user, actions, state } = useStore()
  const [note, setNote] = useState("")
  const [flags, setFlags] = useState<Partial<Record<FlagType, string>>>({})
  const [mode, setMode] = useState<"accept" | "flag">("accept")
  const [bankRef, setBankRef] = useState("")
  const [relType, setRelType] = useState<"release" | "refund">("release")
  const [response, setResponse] = useState("")
  const [issue, setIssue] = useState("")
  const [amount, setAmount] = useState("")
  const [file, setFile] = useState<Picked>(null)
  const [confirm, setConfirm] = useState<ConfirmSpec | null>(null)
  const [ackNote, setAckNote] = useState("")
  if (!user) return null

  const inst = institutionName(fdr.institutionId)
  const ref = maskRef(fdr.fdrNumber)
  const amt = fmtINR(fdr.amount)

  const days = daysUntil(fdr.maturityDate)
  const blocks: ReactNode[] = []
  const ta = `${inputCls} h-auto min-h-[76px] py-2`

  if (
    user.role === "scrutiny" &&
    (fdr.stage === "submitted" || fdr.stage === "under_review")
  ) {
    const picked = Object.entries(flags).filter(
      ([, v]) => v !== undefined,
    ) as [FlagType, string][]
    const flagValid =
      picked.length > 0 && picked.every(([, v]) => v.trim().length >= 5)
    blocks.push(
      <div key="review" className="space-y-4">
        {fdr.stage === "submitted" && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => actions.startReview(fdr.id)}
          >
            Pick up for review
          </Button>
        )}
        <SegmentedRadio
          name={`review-outcome-${fdr.id}`}
          legend="Review outcome"
          value={mode}
          onChange={setMode}
          options={[
            { value: "accept", label: "Accept" },
            { value: "flag", label: "Flag a problem" },
          ]}
        />
        {mode === "accept" ? (
          <>
            <Field label="Review note (optional)" htmlFor="rv-note">
              <textarea
                id="rv-note"
                className={ta}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Details match receipt."
              />
            </Field>
            <p className="text-[13px] text-muted">
              Accepting records the review outcome only. Bank confirmation stays
              a separate step.
            </p>
            <Button
              className="w-full"
              onClick={() =>
                setConfirm({
                  title: "Accept this FDR?",
                  summary: `Accept FDR ${ref} (${amt}, ${fdr.bank}) from ${inst} as reviewed. This cannot be reversed.`,
                  detail: "Bank confirmation stays a separate step. The case moves to the institution for maturity monitoring.",
                  confirmLabel: "Accept FDR",
                  run: () => actions.accept(fdr.id, note.trim()),
                })
              }
            >
              <CheckCircle2 aria-hidden className="size-4" /> Record: accepted
            </Button>
          </>
        ) : (
          <>
            <fieldset className="space-y-2">
              <legend className="mb-1 text-[13px] font-medium text-ink-2">
                Discrepancies
              </legend>
              {FLAG_TYPES.map((t) => {
                const on = flags[t] !== undefined
                return (
                  <div
                    key={t}
                    className={cx(
                      "rounded-lg border px-3 py-2",
                      on ? "border-[#efc2bf] bg-red-bg/40" : "border-line",
                    )}
                  >
                    <label className="flex items-center gap-2 text-[13.5px]">
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={() =>
                          setFlags((f) => ({ ...f, [t]: on ? undefined : "" }))
                        }
                        className="size-4 accent-[#9c1c1c]"
                      />
                      {FLAG_LABEL[t]}
                    </label>
                    {on && (
                      <>
                        <label htmlFor={`fl-${t}`} className="sr-only">
                          Note for {FLAG_LABEL[t]}
                        </label>
                        <textarea
                          id={`fl-${t}`}
                          className={`${ta} mt-2 min-h-[60px]`}
                          value={flags[t]}
                          onChange={(e) =>
                            setFlags((f) => ({ ...f, [t]: e.target.value }))
                          }
                          placeholder="What exactly does not match?"
                        />
                      </>
                    )}
                  </div>
                )
              })}
            </fieldset>
            <Button
              variant="danger"
              className="w-full"
              disabled={!flagValid}
              onClick={() => {
                const labels = picked.map(([t]) => FLAG_LABEL[t])
                setConfirm({
                  title: "Request a correction?",
                  summary: `Return FDR ${ref} to ${inst} with ${labels.length} discrepanc${labels.length === 1 ? "y" : "ies"}: ${labels.join(", ")}. This cannot be reversed.`,
                  detail: `${inst} must respond by ${fmtDayMonth(addDays(TODAY, state.settings.correctionSlaDays))}. Review is paused until then.`,
                  confirmLabel: "Send correction request",
                  tone: "danger",
                  run: () => {
                    actions.flag(fdr.id, picked.map(([type, n]) => ({ type, note: n.trim() })))
                    setFlags({})
                  },
                })
              }}
            >
              <AlertOctagon aria-hidden className="size-4" /> Request correction
            </Button>
            {!flagValid && (
              <p className="text-[13px] text-muted">
                Select at least one discrepancy and describe it (5+ characters).
              </p>
            )}
          </>
        )}
      </div>,
    )
  }

  if (
    user.role === "scrutiny" &&
    fdr.reviewedAt &&
    fdr.bankConfirmation !== "confirmed" &&
    !["superseded", "released", "refunded"].includes(fdr.stage)
  ) {
    blocks.push(
      <div key="bank" className="space-y-3">
        <p className="text-[13.5px] font-semibold text-ink">
          Bank confirmation
        </p>
        {fdr.bankConfirmation === "not_requested" ? (
          <Button
            variant="secondary"
            className="w-full"
            onClick={() => actions.requestBank(fdr.id)}
          >
            Log request to issuing branch
          </Button>
        ) : (
          <>
            <Field
              label="Bank letter reference"
              htmlFor="bank-ref"
              hint="Record only after the bank’s own confirmation is in hand."
            >
              <input
                id="bank-ref"
                className={inputCls}
                value={bankRef}
                onChange={(e) => setBankRef(e.target.value)}
                placeholder="e.g. BL/A/2301 (manual)"
              />
            </Field>
            <Button
              className="w-full"
              disabled={bankRef.trim().length < 4}
              onClick={() => actions.recordBank(fdr.id, bankRef.trim())}
            >
              Record bank confirmation
            </Button>
          </>
        )}
        <p className="text-[13px] text-muted">
          Bank API: Future, with formal authorization.
        </p>
      </div>,
    )
  }

  if (
    user.role === "scrutiny" &&
    fdr.stage === "release_requested" &&
    fdr.release?.stage === "requested"
  ) {
    blocks.push(
      <div key="fwd" className="space-y-3">
        <ReleaseSummary fdr={fdr} />
        <Field label="Scrutiny note" htmlFor="fwd-note">
          <textarea
            id="fwd-note"
            className={ta}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="No dues recorded."
          />
        </Field>
        <Button
          className="w-full"
          disabled={note.trim().length < 3}
          onClick={() =>
            setConfirm({
              title: "Forward to the Approving Authority?",
              summary: `Forward the ${fdr.release!.type} request of ${amt} from ${inst} to the Approving Authority as scrutiny-cleared. This cannot be reversed.`,
              detail: "The Authority records the final decision.",
              confirmLabel: "Forward request",
              run: () => actions.forwardRelease(fdr.id, note.trim()),
            })
          }
        >
          Clear scrutiny & forward to authority
        </Button>
      </div>,
    )
  }

  if (user.role === "authority" && fdr.owner.label.startsWith("Escalated")) {
    const matures = fmtDate(fdr.maturityDate)
    blocks.push(
      <div key="escalation" className="space-y-4">
        <div className="rounded-lg border border-[#efc2bf] bg-red-bg/60 px-3.5 py-3 text-[13.5px] text-red-fg">
          <p className="font-semibold">Escalated: no renewal started</p>
          <p className="mt-0.5">
            {inst} must renew {ref} before it matures on {matures}.
            {fdr.escalation?.remindedAt && ` You sent a reminder on ${fmtDate(fdr.escalation.remindedAt)}.`}
          </p>
        </div>
        <div className="space-y-2">
          <p className="text-[13.5px] font-semibold text-ink">Send reminder to institution</p>
          <p className="text-[13px] text-muted">The case stays on your desk. Delivery is simulated in this prototype.</p>
          <Button
            variant="secondary"
            className="w-full"
            onClick={() =>
              setConfirm({
                title: "Send a reminder to the institution?",
                summary: `Send ${inst} a reminder to renew FDR ${ref} (${amt}) before it matures on ${matures}. This cannot be reversed.`,
                detail: "The case stays escalated on your desk until you acknowledge it. Delivery is simulated in this prototype.",
                confirmLabel: "Send reminder",
                run: () => actions.sendEscalationReminder(fdr.id),
              })
            }
          >
            <BellRing aria-hidden className="size-4" /> Send reminder to institution
          </Button>
        </div>
        <div className="space-y-2 border-t border-line pt-4">
          <p className="text-[13.5px] font-semibold text-ink">Add note and acknowledge</p>
          <Field label="Note for the record" htmlFor="esc-note" hint="Recorded verbatim in the timeline and audit log.">
            <textarea
              id="esc-note"
              className={ta}
              value={ackNote}
              onChange={(e) => setAckNote(e.target.value)}
              placeholder="e.g. Spoke to the registrar; renewal FDR expected this week."
            />
          </Field>
          <Button
            className="w-full"
            disabled={ackNote.trim().length < 5}
            onClick={() =>
              setConfirm({
                title: "Acknowledge this escalation?",
                summary: `Acknowledge the escalation on FDR ${ref} and return it to ${inst} for renewal, with your note: “${ackNote.trim()}”. This cannot be reversed.`,
                detail: `The institution's deadline stays the maturity date, ${matures}.`,
                confirmLabel: "Acknowledge escalation",
                run: () => {
                  actions.acknowledgeEscalation(fdr.id, ackNote.trim())
                  setAckNote("")
                },
              })
            }
          >
            <CheckCircle2 aria-hidden className="size-4" /> Add note and acknowledge
          </Button>
          {ackNote.trim().length < 5 && <p className="text-[13px] text-muted">Write a short note (5+ characters) to acknowledge.</p>}
        </div>
      </div>,
    )
  }

  if (user.role === "authority" && fdr.stage === "release_requested") {
    blocks.push(
      <div key="decide" className="space-y-3">
        <ReleaseSummary fdr={fdr} />
        {fdr.release?.stage === "scrutiny_cleared" ? (
          <>
            <Field
              label="Decision note"
              htmlFor="dec-note"
              hint="Recorded verbatim in the audit log."
            >
              <textarea
                id="dec-note"
                className={ta}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </Field>
            <Button
              className="w-full"
              disabled={note.trim().length < 3}
              onClick={() =>
                setConfirm({
                  title: `Approve ${fdr.release!.type}?`,
                  summary: `Approve ${fdr.release!.type} of ${amt} to ${inst}. This cannot be reversed.`,
                  detail: `FDR ${ref} will be closed as ${fdr.release!.type === "refund" ? "refunded" : "released"}.`,
                  confirmLabel: `Approve ${fdr.release!.type}`,
                  run: () => actions.decideRelease(fdr.id, "approved", note.trim()),
                })
              }
            >
              <CheckCircle2 aria-hidden className="size-4" /> Approve {fdr.release.type}
            </Button>
            <div aria-hidden className="flex items-center gap-3 py-1 text-[13px] text-muted">
              <span className="h-px flex-1 bg-line" />
              or
              <span className="h-px flex-1 bg-line" />
            </div>
            <Button
              variant="secondary"
              className="w-full"
              disabled={note.trim().length < 3}
              onClick={() =>
                setConfirm({
                  title: "Decline this request?",
                  summary: `Decline the ${fdr.release!.type} request of ${amt} from ${inst}. This cannot be reversed.`,
                  detail: `FDR ${ref} returns to active monitoring and the institution is notified.`,
                  confirmLabel: "Decline request",
                  tone: "danger",
                  run: () => actions.decideRelease(fdr.id, "declined", note.trim()),
                })
              }
            >
              Decline request
            </Button>
            {note.trim().length < 3 && (
              <p className="text-[13px] text-muted">Add a decision note to enable both options.</p>
            )}
          </>
        ) : (
          <p className="text-[13px] text-muted">
            Awaiting scrutiny clearance before a decision can be recorded.
          </p>
        )}
      </div>,
    )
  }

  if (user.role === "institution" && fdr.stage === "correction_requested") {
    const fileOk = !file || file.verdict.ok
    const issueValid = !issue || new Date(fdr.maturityDate) > new Date(issue)
    blocks.push(
      <div key="corr" className="space-y-3">
        <p className="text-[13.5px] font-semibold text-ink">
          Respond to correction
        </p>
        <ul className="space-y-1">
          {openFlags(fdr).map((f) => (
            <li
              key={f.id}
              className="rounded bg-red-bg px-2.5 py-1.5 text-[13px] text-red-fg"
            >
              <strong>{FLAG_LABEL[f.type]}:</strong> {f.note}
            </li>
          ))}
        </ul>
        {openFlags(fdr).some((f) => f.type === "date_mismatch") && (
          <DateField
            id="c-issue"
            label="Corrected issue date (DD/MM/YYYY)"
            value={issue}
            onChange={setIssue}
            error={issueValid ? undefined : "Issue date must be before the maturity date."}
            warning={termWarning(issue, toInputDate(fdr.maturityDate))}
            hint={`Maturity date on file: ${fmtDate(fdr.maturityDate)}.`}
          />
        )}
        {openFlags(fdr).some((f) => f.type === "amount_mismatch") && (
          <Field label="Confirmed amount (₹)" htmlFor="c-amt">
            <input
              id="c-amt"
              inputMode="numeric"
              className={inputCls}
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))}
              placeholder={String(fdr.amount)}
            />
          </Field>
        )}
        <UploadZone
          value={file}
          onChange={setFile}
          label="Replacement document (optional)"
        />
        <Field label="Response to scrutiny" htmlFor="c-resp">
          <textarea
            id="c-resp"
            className={ta}
            value={response}
            onChange={(e) => setResponse(e.target.value)}
            placeholder="Explain what was corrected."
          />
        </Field>
        <Button
          className="w-full"
          disabled={response.trim().length < 5 || !fileOk || !issueValid}
          onClick={() => {
            const changes: Partial<Fdr> = {}
            if (issue) changes.issueDate = new Date(issue).toISOString()
            if (amount) changes.amount = Number(amount)
            actions.respondCorrection(
              fdr.id,
              response.trim(),
              changes,
              file?.verdict.ok
                ? toDocMeta(file.file, file.verdict.detected!)
                : undefined,
            )
            setResponse("")
            setFile(null)
          }}
        >
          Resubmit for review
        </Button>
      </div>,
    )
  }

  if (user.role === "institution" && fdr.stage === "accepted") {
    const max = Math.max(...state.settings.reminderWindows)
    blocks.push(
      <div key="renew" className="space-y-3">
        <p className="text-[13.5px] font-semibold text-ink">
          Renewal or replacement
        </p>
        <p className="text-[13px] text-muted">
          {days <= max
            ? `Matures in ${days} days. Submit the renewed FDR; it will be linked to this one.`
            : `Renewal opens ${max} days before maturity, but you can replace early.`}
        </p>
        <LinkButton
          to={`/app/renew/${fdr.id}`}
          variant={days <= max ? "gold" : "secondary"}
          className="w-full"
        >
          <RefreshCcw aria-hidden className="size-4" /> Start renewal
        </LinkButton>
      </div>,
      <div key="release" className="space-y-3">
        <p className="text-[13.5px] font-semibold text-ink">
          Release or refund
        </p>
        {fdr.release?.decision === "declined" && (
          <p className="rounded bg-red-bg px-2.5 py-1.5 text-[13px] text-red-fg">
            Previous request declined: {fdr.release.decisionNote}
          </p>
        )}
        <SegmentedRadio
          name={`request-type-${fdr.id}`}
          legend="Request type"
          value={relType}
          onChange={setRelType}
          options={[
            { value: "release", label: "Release" },
            { value: "refund", label: "Refund" },
          ]}
        />
        <Field label="Grounds" htmlFor="rel-reason">
          <textarea
            id="rel-reason"
            className={ta}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Cite the approval or closure that supports this request."
          />
        </Field>
        <Button
          variant="secondary"
          className="w-full"
          disabled={note.trim().length < 10}
          onClick={() => actions.requestRelease(fdr.id, relType, note.trim())}
        >
          Request {relType}
        </Button>
      </div>,
    )
  }

  if (user.role === "institution" && fdr.stage === "release_requested")
    blocks.push(<ReleaseSummary key="rs" fdr={fdr} />)

  return (
    <section
      id="actions"
      tabIndex={-1}
      aria-labelledby="actions-title"
      className="scroll-mt-6 rounded-xl border border-line-strong bg-surface focus-visible:outline-2 focus-visible:outline-offset-2"
    >
      <CardHeader id="actions-title" title="Actions" sub={`As ${ROLE_LABEL[user.role]}`} />
      <div className="space-y-6 p-5 [&>*+*]:border-t [&>*+*]:border-line [&>*+*]:pt-6">
        {blocks.length ? (
          blocks
        ) : (
          <p className="text-[13.5px] text-muted">
            No action required from your role at this stage. Current owner:{" "}
            {fdr.owner.label}.
          </p>
        )}
      </div>
      <ConfirmDialog spec={confirm} onClose={() => setConfirm(null)} />
    </section>
  )
}

function ReleaseSummary({ fdr }: { fdr: Fdr }) {
  const r = fdr.release
  if (!r) return null
  const steps = [
    { label: "Requested", done: true, at: r.requestedAt },
    { label: "Scrutiny cleared", done: r.stage !== "requested", at: undefined },
    { label: "Decision", done: r.stage === "decided", at: r.decidedAt },
  ]
  return (
    <div className="rounded-lg border border-line bg-paper p-3.5">
      <p className="text-[13.5px] font-semibold capitalize text-ink">
        {r.type} request
      </p>
      <p className="mt-1 text-[13px] text-ink-3">{r.reason}</p>
      <ol className="mt-3 flex items-center gap-1.5 text-[13px]">
        {steps.map((s, i) => (
          <li key={s.label} className="flex items-center gap-1.5">
            {i > 0 && <span aria-hidden className="h-px w-3 bg-line-strong" />}
            <span
              className={cx(
                "rounded px-1.5 py-0.5 font-medium",
                s.done
                  ? "bg-green-bg text-green-fg"
                  : "bg-slate-bg text-slate-fg",
              )}
            >
              {s.label}
            </span>
          </li>
        ))}
      </ol>
      {r.scrutinyNote && (
        <p className="mt-2 text-[13px] text-muted">
          Scrutiny: {r.scrutinyNote}
        </p>
      )}
    </div>
  )
}
