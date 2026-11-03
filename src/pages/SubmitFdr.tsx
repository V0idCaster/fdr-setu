import { useState } from "react"
import { AlertTriangle, Check, ChevronDown, Circle, GitBranch, Send } from "lucide-react"
import { useStore } from "../data/store"
import { BANKS } from "../data/seed"
import { institutionName, visibleFdrs } from "../data/selectors"
import { daysUntil, fmtDate, TODAY, toInputDate } from "../lib/dates"
import { cx, fmtINR, maskRef } from "../lib/format"
import { fieldChecks, termWarning, type Check as CheckItem, type FdrDraft } from "../lib/validation"
import {
  Button,
  Card,
  CardHeader,
  Disclaimer,
  DISCLAIMER_UPLOAD,
  Field,
  inputCls,
  PageHeader,
} from "../components/ui"
import { UploadZone, type Picked } from "../components/UploadZone"
import { toDocMeta } from "../lib/documents"

export { toDocMeta }
import { DateField } from "../components/DateField"
import { navigate } from "../router"
import { ErrorScreen } from "../components/ErrorScreen"


/** Where to send focus for each failing check. */
const CHECK_TARGET: Record<string, string> = {
  fdrNumber: "#fdrNumber",
  bank: "#bank",
  branch: "#branch",
  amount: "#amount",
  dates: "#issueDate",
  order: "#maturityDate",
  future: "#maturityDate",
  beneficiary: "#beneficiary",
  file: "[data-upload-zone] button",
}

function Checklist({ checks, tried }: { checks: CheckItem[]; tried: boolean }) {
  return (
    <ul className="space-y-2">
      {checks.map((c) => (
        <li key={c.id} className={cx("flex items-start gap-2 text-[13px]", c.ok ? "text-green-fg" : tried ? "text-red-fg" : "text-muted")}>
          {c.ok ? <Check aria-hidden className="mt-0.5 size-3.5 shrink-0" /> : <Circle aria-hidden className="mt-1 size-2.5 shrink-0" />}
          <span>
            <span className="sr-only">{c.ok ? "Passed: " : "Pending: "}</span>
            {c.label}
          </span>
        </li>
      ))}
    </ul>
  )
}

function ProgressBar({ done, total, ready }: { done: number; total: number; ready: boolean }) {
  return (
    <div
      className="h-2 flex-1 overflow-hidden rounded-full bg-paper-2"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={done}
      aria-label="Checks passed"
    >
      <div className={cx("h-full rounded-full transition-all", ready ? "bg-green-dot" : "bg-gold-600")} style={{ width: `${(done / total) * 100}%` }} />
    </div>
  )
}

export default function SubmitFdr({ renewId }: { renewId?: string }) {
  const { state, user, actions } = useStore()
  const prev = renewId ? visibleFdrs(state.fdrs, user).find((f) => f.id === renewId) : undefined
  const [d, setD] = useState<FdrDraft>(() => ({
    fdrNumber: "",
    bank: prev?.bank ?? "",
    branch: prev?.branch ?? "",
    amount: prev ? String(prev.amount) : "",
    issueDate: prev ? toInputDate(prev.maturityDate) : "",
    maturityDate: "",
    beneficiary: prev?.beneficiary ?? "Member Secretary, Regulatory Council (illustrative)",
  }))
  const [file, setFile] = useState<Picked>(null)
  // A field shows its inline error as soon as it has been typed in (or after a submit attempt).
  const [dirty, setDirty] = useState<Record<string, boolean>>({})
  const [tried, setTried] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  if (!user || user.role !== "institution")
    return (
      <ErrorScreen
        kind="forbidden"
        title="Only institutions submit FDRs"
        actions={[
          { to: "/app", label: "Back to dashboard", primary: true },
          { to: "/app/queue", label: "Open work queue" },
        ]}
      >
        Submissions and renewals are made by the institution that holds the FDR. Officials review them from the work queue.
      </ErrorScreen>
    )
  if (renewId && (!prev || prev.stage !== "accepted"))
    return (
      <ErrorScreen
        kind="unavailable"
        title="Renewal not available"
        actions={[
          prev ? { to: `/app/fdr/${prev.id}`, label: "Back to the case", primary: true } : { to: "/app/register", label: "Back to FDR register", primary: true },
          { to: "/app", label: "Go to dashboard" },
        ]}
      >
        {prev
          ? "This FDR can be renewed only after it has been accepted, and only once. Check its current stage on the case page."
          : "This FDR does not exist, or it is outside your access."}
      </ErrorScreen>
    )

  const checks = fieldChecks(d, Boolean(file), Boolean(file?.verdict.ok))
  const byId = Object.fromEntries(checks.map((c) => [c.id, c]))
  const done = checks.filter((c) => c.ok).length
  const remaining = checks.length - done
  const ready = remaining === 0
  const remainingText = ready ? "All checks passed" : `${remaining} check${remaining === 1 ? "" : "s"} remaining`
  const show = (id: string) => tried || dirty[id]
  const err = (id: string, msg?: string) => (show(id) && !byId[id].ok ? (msg ?? byId[id].hint ?? "Required.") : undefined)
  const setField = (k: keyof FdrDraft, v: string) => {
    setD((x) => ({ ...x, [k]: v }))
    setDirty((t) => ({ ...t, [k]: true }))
  }
  const issueErr = tried && !d.issueDate ? "Enter the issue date." : undefined
  const maturityErr =
    d.issueDate && d.maturityDate && !byId.order.ok
      ? byId.order.hint
      : d.maturityDate && !byId.future.ok
        ? "Maturity date has already passed."
        : tried && !d.maturityDate
          ? "Enter the maturity date."
          : undefined
  const term = termWarning(d.issueDate, d.maturityDate)
  // Warnings never block submission. The duplicate check only names the case if it is the user's own.
  const dupe =
    byId.fdrNumber.ok && d.bank ? state.fdrs.find((f) => f.fdrNumber === d.fdrNumber.trim() && f.bank === d.bank) : undefined
  const dupeWarning = dupe
    ? dupe.institutionId === user.institutionId
      ? `This number from ${d.bank} matches your existing case ${maskRef(dupe.fdrNumber)}. Check the receipt; a renewal normally has a new number. You can still submit.`
      : `An FDR with this number from ${d.bank} is already on record. Check the number against the receipt. You can still submit.`
    : undefined
  const futureWarning =
    d.issueDate && daysUntil(d.issueDate) > 0
      ? `This issue date is after today (${fmtDate(TODAY.toISOString())}, the simulated date). Check it against the receipt. You can still submit.`
      : undefined
  const warnings = [dupeWarning, futureWarning, term].filter(Boolean).length

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setTried(true)
    if (!ready || !file) {
      const first = checks.find((c) => !c.ok)
      const sel = first?.id === "dates" && d.issueDate ? "#maturityDate" : first ? CHECK_TARGET[first.id] : undefined
      const el = sel ? document.querySelector<HTMLElement>(sel) : null
      el?.focus()
      el?.scrollIntoView({ block: "center", behavior: "smooth" })
      return
    }
    const id = actions.submitFdr(d, toDocMeta(file.file, file.verdict.detected!), prev?.id)
    navigate(`/app/fdr/${id}`)
  }

  return (
    <>
      <PageHeader
        eyebrow={prev ? "Renewal" : "New submission"}
        title={prev ? `Renew FDR ${maskRef(prev.fdrNumber)}` : "Submit an FDR"}
        sub={`Lodging on behalf of ${institutionName(user.institutionId!)}. Checks run as you type; nothing is sent until you submit.`}
      />

      {/* Mobile: compact sticky progress that expands into the checklist. */}
      <div className="sticky top-[61px] z-20 -mx-4 mb-5 border-y border-line bg-white/95 px-4 py-2.5 backdrop-blur sm:-mx-6 sm:px-6 lg:hidden">
        <button
          type="button"
          aria-expanded={mobileOpen}
          aria-controls="mobile-checklist"
          onClick={() => setMobileOpen((o) => !o)}
          className="flex w-full items-center gap-3 rounded text-left"
        >
          <span className="shrink-0 text-[13px] font-semibold text-ink">Completeness</span>
          <ProgressBar done={done} total={checks.length} ready={ready} />
          <span className={cx("shrink-0 text-[13px] font-medium tnum", ready ? "text-green-fg" : "text-ink-2")}>{remainingText}</span>
          <ChevronDown aria-hidden className={cx("size-4 shrink-0 text-muted transition-transform", mobileOpen && "rotate-180")} />
        </button>
        {mobileOpen && (
          <div id="mobile-checklist" className="mt-3 border-t border-line pt-3">
            <Checklist checks={checks} tried={tried} />
          </div>
        )}
      </div>

      {prev && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-[#e6c98f] bg-amber-bg/60 px-4 py-3 text-[13.5px] text-amber-fg">
          <GitBranch aria-hidden className="mt-0.5 size-4 shrink-0" />
          <span>
            Replaces <strong className="font-mono">{maskRef(prev.fdrNumber)}</strong> · {prev.bank} · {fmtINR(prev.amount)} · matures{" "}
            {fmtDate(prev.maturityDate)}. The old record stays in the history and is marked superseded once this one is accepted.
          </span>
        </div>
      )}

      <form noValidate onSubmit={submit} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <Card>
            <CardHeader title="Instrument details" sub="As printed on the bank’s receipt" />
            <div className="grid gap-4 p-5 sm:grid-cols-2">
              <Field label="FDR number" htmlFor="fdrNumber" error={err("fdrNumber", "FDR numbers have 6 to 20 digits.")} hint="Stored in full; displayed masked as ••••1234.">
                <input
                  id="fdrNumber"
                  inputMode="numeric"
                  autoComplete="off"
                  className={`${inputCls} font-mono tnum`}
                  value={d.fdrNumber}
                  onChange={(e) => setField("fdrNumber", e.target.value.replace(/\D/g, "").slice(0, 20))}
                  aria-invalid={Boolean(err("fdrNumber"))}
                  aria-describedby={[err("fdrNumber") ? "fdrNumber-err" : "fdrNumber-hint", dupeWarning && "fdrNumber-warn"].filter(Boolean).join(" ")}
                  placeholder="e.g. 304188210xx"
                />
                {dupeWarning && (
                  <p id="fdrNumber-warn" aria-live="polite" className="mt-1.5 flex items-start gap-1.5 rounded-md border border-[#efd3a3] bg-amber-bg px-2.5 py-1.5 text-[13px] text-amber-fg">
                    <AlertTriangle aria-hidden className="mt-0.5 size-3.5 shrink-0" />
                    <span>{dupeWarning}</span>
                  </p>
                )}
              </Field>
              <Field
                label="Amount (₹)"
                htmlFor="amount"
                error={err("amount")}
                hint={d.amount && byId.amount.ok ? fmtINR(Number(d.amount)) : "Rupees, digits only."}
              >
                <input
                  id="amount"
                  inputMode="numeric"
                  className={`${inputCls} tnum`}
                  value={d.amount}
                  onChange={(e) => setField("amount", e.target.value.replace(/\D/g, "").slice(0, 12))}
                  aria-invalid={Boolean(err("amount"))}
                  aria-describedby={err("amount") ? "amount-err" : "amount-hint"}
                  placeholder="1500000"
                />
              </Field>
              <Field label="Issuing bank" htmlFor="bank" error={err("bank")}>
                <select
                  id="bank"
                  className={inputCls}
                  value={d.bank}
                  onChange={(e) => setField("bank", e.target.value)}
                  aria-invalid={Boolean(err("bank"))}
                  aria-describedby={err("bank") ? "bank-err" : undefined}
                >
                  <option value="">Select bank</option>
                  {BANKS.map((b) => (
                    <option key={b}>{b}</option>
                  ))}
                </select>
              </Field>
              <Field label="Branch" htmlFor="branch" error={err("branch", "Enter the branch name.")}>
                <input
                  id="branch"
                  className={inputCls}
                  value={d.branch}
                  onChange={(e) => setField("branch", e.target.value)}
                  aria-invalid={Boolean(err("branch", "x"))}
                  aria-describedby={err("branch", "x") ? "branch-err" : undefined}
                />
              </Field>
              <DateField
                id="issueDate"
                label="Issue date (DD/MM/YYYY)"
                value={d.issueDate}
                onChange={(v) => setD((x) => ({ ...x, issueDate: v }))}
                error={issueErr}
                warning={futureWarning}
                hint="As printed on the receipt."
              />
              <DateField
                id="maturityDate"
                label="Maturity date (DD/MM/YYYY)"
                value={d.maturityDate}
                onChange={(v) => setD((x) => ({ ...x, maturityDate: v }))}
                error={maturityErr}
                warning={term}
                hint="Usually 1, 2 or 3 years after issue."
              />
              <Field
                label="Beneficiary (in favour of)"
                htmlFor="beneficiary"
                error={err("beneficiary", "Enter the beneficiary as printed.")}
                className="sm:col-span-2"
              >
                <input
                  id="beneficiary"
                  className={inputCls}
                  value={d.beneficiary}
                  onChange={(e) => setField("beneficiary", e.target.value)}
                  aria-invalid={Boolean(err("beneficiary", "x"))}
                  aria-describedby={err("beneficiary", "x") ? "beneficiary-err" : undefined}
                />
              </Field>
            </div>
          </Card>

          <Card>
            <CardHeader title="Receipt" sub="A clear scan or photo of the original FDR" />
            <div className="space-y-4 p-5" data-upload-zone>
              <UploadZone value={file} onChange={setFile} />
              {tried && !file && <p className="text-[13px] text-red-fg">Attach the FDR receipt before submitting.</p>}
              <Disclaimer variant="warn">{DISCLAIMER_UPLOAD}</Disclaimer>
            </div>
          </Card>
        </div>

        <aside className="lg:sticky lg:top-6 lg:self-start">
          <Card>
            <div className="hidden border-b border-line px-5 py-4 lg:block">
              <h2 id="completeness" tabIndex={-1} className="text-[17px] font-semibold">
                Completeness
              </h2>
              <div className="mt-3 flex items-center gap-3">
                <ProgressBar done={done} total={checks.length} ready={ready} />
                <span className="text-[13px] font-medium text-ink-2 tnum">
                  {done}/{checks.length}
                </span>
              </div>
            </div>
            <div className="hidden px-5 py-4 lg:block" aria-live="polite">
              <Checklist checks={checks} tried={tried} />
            </div>
            <div className="border-line px-5 py-4 lg:border-t">
              <Button type="submit" className="w-full" size="lg" variant={ready ? "primary" : "inactive"} aria-disabled={!ready} aria-describedby="submit-remaining">
                <Send aria-hidden className="size-4" /> {prev ? "Submit renewal" : "Submit for review"}
              </Button>
              <p id="submit-remaining" aria-live="polite" className={cx("mt-2 text-center text-[13.5px] font-semibold tnum", ready ? "text-green-fg" : "text-ink-2")}>
                {remainingText}
              </p>
              {warnings > 0 && (
                <p className="mt-1 flex items-center justify-center gap-1.5 text-center text-[13px] font-medium text-amber-fg">
                  <AlertTriangle aria-hidden className="size-3.5" />
                  {warnings} warning{warnings === 1 ? "" : "s"} to review. You can still submit.
                </p>
              )}
              <p className="mt-2 text-[13px] leading-relaxed text-muted">
                Submitting creates the case and assigns it to the scrutiny desk with a {state.settings.reviewSlaDays}-day review deadline. Server-side
                validation repeats every check.
              </p>
            </div>
          </Card>
        </aside>
      </form>
    </>
  )
}
