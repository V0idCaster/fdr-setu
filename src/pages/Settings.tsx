import { useRef, useState } from "react"
import {
  ArrowDownWideNarrow,
  Bell,
  CircleDashed,
  CircleX,
  Database,
  FileCheck2,
  FlaskConical,
  HardDrive,
  KeyRound,
  Lock,
  LogIn,
  Plug,
  RotateCcw,
  ScrollText,
  ServerCog,
  UserRoundCheck,
} from "lucide-react"
import { useStore } from "../data/store"
import type { Settings as PolicySettings, User } from "../data/types"
import { cx } from "../lib/format"
import { Button, Card, CardHeader, Disclaimer, DISCLAIMER_UPLOAD, inputCls, PageHeader } from "../components/ui"
import { ConfirmDialog, type ConfirmSpec } from "../components/ConfirmDialog"
import { STATUS, StatusTag, type Status } from "../components/StatusTag"

/* ------------------------------------------------------------------ */
/* Security model                                                      */
/* ------------------------------------------------------------------ */

function StatusLabel({ status, note }: { status: Status; note?: string }) {
  return (
    <p>
      <StatusTag status={status} note={note} />
    </p>
  )
}

type Control = { icon: typeof Database; title: string; plain: string; status: Status; note?: string; tech: string[] }

const CONTROLS: Control[] = [
  {
    icon: FileCheck2,
    title: "Upload checks",
    plain: "Only PDF, PNG or JPEG files up to 5 MB are accepted, and each file’s contents must match its type.",
    status: "working",
    note: "checks run in your browser",
    tech: [
      "Follows the OWASP File Upload guidance: extension and MIME-type allowlists, a magic-byte (file signature) check, a 5 MB limit, rejection of double extensions, and server-generated file names.",
      "The matching server-side re-check is listed separately as planned.",
    ],
  },
  {
    icon: KeyRound,
    title: "No secrets in the browser",
    plain: "The app contains no passwords or private keys that someone could copy from the web page.",
    status: "working",
    tech: [
      "This build ships with no keys at all.",
      "In production only the public Supabase anon key reaches the browser; the service-role key is used solely inside server-side Edge Functions.",
    ],
  },
  {
    icon: UserRoundCheck,
    title: "Minimal personal data",
    plain: "Each user is stored with just a name and job title. No phone numbers, ID numbers or addresses.",
    status: "working",
    tech: [
      "Profile fields: display_name, designation, role, institution_id.",
      "Audit rows carry the display name and a masked FDR reference only. Applied to all synthetic seed data.",
    ],
  },
  {
    icon: Database,
    title: "Who sees which records",
    plain: "Institution users see only their own institution’s FDRs; officials see every institution.",
    status: "simulated",
    note: "filtered in the browser",
    tech: [
      "Production: PostgreSQL Row Level Security (RLS) policies on fdrs, documents and reminders match profile.institution_id; officials read all rows; writes are gated by role and stage.",
      "Prototype: the same rule is applied by the interface, so it is not a security boundary yet.",
    ],
  },
  {
    icon: HardDrive,
    title: "Private documents",
    plain: "Receipts are kept private and open only through a link that expires after 60 seconds.",
    status: "simulated",
    note: "files stay in this browser",
    tech: [
      "Production: a private Supabase Storage bucket (fdr-documents). Signed URLs with a 60-second lifetime are issued after an RLS check and renewed while the preview stays open.",
      "Prototype: link issue, expiry and renewal are imitated; nothing is uploaded.",
    ],
  },
  {
    icon: ScrollText,
    title: "Tamper-proof audit trail",
    plain: "Every action is recorded, and the record can only be added to, never changed.",
    status: "simulated",
    note: "no edit path in the interface",
    tech: [
      "Production: INSERT-only grant on the audit table; UPDATE and DELETE revoked for every role and rejected by a trigger; rows written by database triggers, not by the browser.",
      "Prototype: entries are appended to browser storage and the interface offers no way to edit or delete them.",
    ],
  },
  {
    icon: ServerCog,
    title: "Second check on the server",
    plain: "Every upload will be checked again on the server before it is stored.",
    status: "planned",
    tech: [
      "A Supabase Edge Function repeats the extension, MIME, magic-byte and size checks, renames the file to a random UUID and writes it to the private bucket using the service-role key.",
    ],
  },
  {
    icon: LogIn,
    title: "Personal sign-in",
    plain: "Each person will sign in with their own account, and administrators, not users, will assign roles.",
    status: "planned",
    tech: [
      "Supabase Auth sessions; role and institution read from a server-side profiles table and enforced by RLS.",
      "The prototype uses synthetic demo accounts chosen on the sign-in page.",
    ],
  },
]

function SecurityModel() {
  const counts = (Object.keys(STATUS) as Status[]).map((k) => [k, CONTROLS.filter((c) => c.status === k).length] as const)
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader title="What the status labels mean" sub="An honest view of what this prototype does today and what the live system will add." />
        <ul className="grid gap-4 p-5 md:grid-cols-3">
          {counts.map(([k, n]) => (
            <li key={k} className="space-y-2">
              <StatusLabel status={k} />
              <p className="text-[13.5px] leading-relaxed text-ink-3">{STATUS[k].meaning}</p>
              <p className="text-[13px] text-muted tnum">
                {n} control{n === 1 ? "" : "s"}
              </p>
            </li>
          ))}
        </ul>
      </Card>

      <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {CONTROLS.map((c) => (
          <li key={c.title} className="flex flex-col rounded-xl border border-line bg-surface p-5">
            <div className="mb-2 flex items-center gap-2.5">
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-gold-soft text-gold-700">
                <c.icon aria-hidden className="size-[18px]" />
              </span>
              <h3 className="text-[16px] font-semibold text-ink">{c.title}</h3>
            </div>
            <p className="text-[14px] leading-relaxed text-ink-2">{c.plain}</p>
            <div className="mt-3">
              <StatusLabel status={c.status} note={c.note} />
            </div>
            <details className="group mt-auto pt-4">
              <summary className="inline-flex cursor-pointer list-none items-center gap-1 rounded text-[13px] font-medium text-gold-700 hover:underline [&::-webkit-details-marker]:hidden">
                <span aria-hidden className="inline-block transition-transform group-open:rotate-90">
                  ›
                </span>
                Technical detail
              </summary>
              <div className="mt-2 space-y-1.5 rounded-md bg-paper px-3 py-2.5 text-[13px] leading-relaxed text-ink-3">
                {c.tech.map((t) => (
                  <p key={t}>{t}</p>
                ))}
              </div>
            </details>
          </li>
        ))}
      </ul>

      <Card>
        <CardHeader
          title="Integrations"
          sub="External connections require formal authorisation before they are built"
          action={<Plug aria-hidden className="size-4 text-muted" />}
        />
        <ul className="divide-y divide-line">
          {[
            { t: "AICTE portal integration", d: "Institution master data and approval references." },
            { t: "Bank confirmation API", d: "Direct confirmation of FDR existence and lien from issuing banks." },
            { t: "Email / SMS gateway", d: "Reminder delivery beyond in-app notices." },
          ].map((i) => (
            <li key={i.t} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
              <div>
                <p className="text-[14px] font-medium text-ink">{i.t}</p>
                <p className="text-[13px] text-muted">{i.d}</p>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-line-strong px-2.5 py-0.5 text-[13px] text-muted">
                <CircleDashed aria-hidden className="size-3" /> Future, with formal authorization
              </span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Policy settings                                                     */
/* ------------------------------------------------------------------ */

type Issue = "number" | "range" | "duplicate" | "order"
type Token = { raw: string; n: number | null; issue?: Issue }

const MAX_WINDOWS = 5

/** Reminder windows must be whole numbers 1–365, unique, and listed largest first. */
export function analyseWindows(text: string) {
  const tokens: Token[] = text
    .split(/[,\s]+/)
    .filter(Boolean)
    .map((raw) => ({ raw, n: /^\d+$/.test(raw) ? Number(raw) : null }))
  const seen = new Set<number>()
  let prev = Number.POSITIVE_INFINITY
  for (const t of tokens) {
    if (t.n === null) t.issue = "number"
    else if (t.n < 1 || t.n > 365) t.issue = "range"
    else if (seen.has(t.n)) t.issue = "duplicate"
    else {
      seen.add(t.n)
      if (t.n > prev) t.issue = "order"
      else prev = t.n
    }
  }
  // Report the most fundamental problem first: not a number, then range, duplicates, order.
  const first = (["number", "range", "duplicate", "order"] as Issue[]).map((k) => tokens.find((t) => t.issue === k)).find(Boolean)
  let error: string | undefined
  if (!tokens.length) error = "Enter at least one window, for example 60, 30, 7."
  else if (first?.issue === "number") error = `“${first.raw}” is not a whole number. Use digits separated by commas.`
  else if (first?.issue === "range") error = `${first.n} is outside the allowed range of 1 to 365 days.`
  else if (first?.issue === "duplicate") error = `${first.n} days is listed more than once. Remove the duplicate.`
  else if (first?.issue === "order") error = "List windows from largest to smallest, for example 60, 30, 7."
  else if (tokens.length > MAX_WINDOWS) error = `Use up to ${MAX_WINDOWS} windows.`
  const fixable = tokens.length > 0 && tokens.every((t) => !t.issue || t.issue === "duplicate" || t.issue === "order")
  const tidy = [...new Set(tokens.filter((t) => t.n !== null && t.n >= 1 && t.n <= 365).map((t) => t.n!))].sort((a, b) => b - a)
  return { tokens, error, values: error ? [] : tokens.map((t) => t.n!), fixable: Boolean(error) && fixable, tidy }
}

const ISSUE_TEXT: Record<Issue, string> = {
  number: "not a number",
  range: "out of range",
  duplicate: "duplicate",
  order: "out of order",
}

function dayCount(v: string, max: number) {
  if (!/^\d+$/.test(v.trim())) return "Use digits only."
  const n = Number(v)
  if (n < 1 || n > max) return `Enter a number from 1 to ${max}.`
  return undefined
}

const readOnlyCls =
  "read-only:cursor-not-allowed read-only:border-dashed read-only:bg-paper-2 read-only:text-ink-3 read-only:focus:outline-line-strong"

function PolicyInput({
  id,
  label,
  value,
  onChange,
  appliesTo,
  error,
  readOnly,
  suffix,
  wide,
}: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  appliesTo: string
  error?: string
  readOnly: boolean
  suffix?: string
  wide?: boolean
}) {
  return (
    <div className={wide ? "sm:col-span-2" : undefined}>
      <label htmlFor={id} className="mb-1.5 flex items-center gap-1.5 text-[13px] font-medium text-ink-2">
        {label}
        {readOnly && (
          <>
            <Lock aria-hidden className="size-3.5 text-muted" />
            <span className="sr-only">(read-only)</span>
          </>
        )}
      </label>
      <div className="relative">
        <input
          id={id}
          value={value}
          readOnly={readOnly}
          onChange={(e) => onChange(e.target.value)}
          inputMode={suffix ? "numeric" : undefined}
          aria-invalid={Boolean(error) && !readOnly}
          aria-describedby={`${id}-applies${error && !readOnly ? ` ${id}-err` : ""}`}
          className={cx(inputCls, readOnlyCls, "tnum", (readOnly || suffix) && "pr-14")}
        />
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center gap-1.5 text-[13px] text-muted">
          {suffix}
          {readOnly && <Lock aria-hidden className="size-3.5" />}
        </span>
      </div>
      <p id={`${id}-applies`} className="mt-1 text-[13px] leading-snug text-muted">
        {appliesTo}
      </p>
      {error && !readOnly && (
        <p id={`${id}-err`} className="mt-1 text-[13px] text-red-fg">
          {error}
        </p>
      )}
    </div>
  )
}

function PolicyForm({ settings, user }: { settings: PolicySettings; user: User }) {
  const { actions } = useStore()
  const readOnly = user.role === "institution"
  const [windows, setWindows] = useState(settings.reminderWindows.join(", "))
  const [esc, setEsc] = useState(String(settings.escalateAtDays))
  const [review, setReview] = useState(String(settings.reviewSlaDays))
  const [corr, setCorr] = useState(String(settings.correctionSlaDays))

  const win = analyseWindows(windows)
  const escErr = dayCount(esc, 90)
  const reviewErr = dayCount(review, 90)
  const corrErr = dayCount(corr, 90)
  const valid = !win.error && !escErr && !reviewErr && !corrErr
  const next: PolicySettings = {
    reminderWindows: win.values,
    escalateAtDays: Number(esc),
    reviewSlaDays: Number(review),
    correctionSlaDays: Number(corr),
  }
  const dirty = JSON.stringify(next) !== JSON.stringify(settings)
  const escN = Number(esc)
  const validTokens = win.tokens.filter((t) => !t.issue)

  return (
    <Card>
      <CardHeader
        title="Reminder & deadline policy"
        sub={readOnly ? "Set by the regulator. Shown here so you know which deadlines apply to you." : "Changes apply to the next maturity check and are recorded in the audit log."}
      />
      {readOnly && (
        <p className="mx-5 mt-5 flex items-start gap-2 rounded-md border border-line bg-paper px-3 py-2.5 text-[13.5px] text-ink-3">
          <Lock aria-hidden className="mt-0.5 size-4 shrink-0 text-muted" />
          Read-only for institution users. If a deadline cannot be met, contact the scrutiny desk.
        </p>
      )}
      <form
        className="grid gap-5 p-5 sm:grid-cols-2"
        noValidate
        onSubmit={(e) => {
          e.preventDefault()
          if (!readOnly && valid && dirty) actions.updateSettings(next)
        }}
      >
        <div className="sm:col-span-2">
          <PolicyInput
            id="windows"
            label="Reminder windows (days before maturity)"
            value={windows}
            onChange={setWindows}
            readOnly={readOnly}
            error={win.error}
            appliesTo="Applies to institutions: the institution holding the FDR is reminded at each of these points before maturity. Largest first, separated by commas."
            wide
          />
          {win.fixable && !readOnly && (
            <Button type="button" size="sm" variant="secondary" className="mt-2" onClick={() => setWindows(win.tidy.join(", "))}>
              <ArrowDownWideNarrow aria-hidden className="size-3.5" /> Remove duplicates and sort largest first
            </Button>
          )}
          <div className="mt-3" aria-live="polite">
            <p className="sr-only">
              {validTokens.length ? `Preview: reminders at ${validTokens.map((t) => t.n).join(", ")} days before maturity.` : "No valid windows yet."}
            </p>
            <ul aria-hidden className="flex flex-wrap gap-1.5">
              {win.tokens.map((t, i) =>
                t.issue ? (
                  <li
                    key={`${t.raw}-${i}`}
                    className="inline-flex items-center gap-1.5 rounded-full border border-[#efc2bf] bg-red-bg px-2.5 py-0.5 text-[13px] font-medium text-red-fg tnum"
                  >
                    <CircleX className="size-3.5" />
                    {t.raw} · {ISSUE_TEXT[t.issue]}
                  </li>
                ) : (
                  <li
                    key={`${t.raw}-${i}`}
                    className={cx(
                      "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[13px] font-medium tnum",
                      t.n! <= escN ? "border-[#efd3a3] bg-amber-bg text-amber-fg" : "border-[#d3d9e2] bg-slate-bg text-slate-fg",
                    )}
                  >
                    <Bell className="size-3.5" />
                    {t.n} days{t.n! <= escN && " · escalates"}
                  </li>
                ),
              )}
            </ul>
            {!win.error && validTokens.length > 0 && (
              <p className="mt-2 text-[13px] text-ink-3">
                Institutions are reminded {validTokens.map((t) => t.n).join(", ")} days before maturity.
                {escErr ? "" : ` Cases with no renewal ${escN} or fewer days out are escalated.`}
              </p>
            )}
          </div>
        </div>

        <PolicyInput
          id="esc"
          label="Escalate when this many days remain"
          value={esc}
          onChange={setEsc}
          readOnly={readOnly}
          error={escErr}
          suffix="days"
          appliesTo="Applies to the Approving Authority: cases with no renewal started by this point move to their desk."
        />
        <PolicyInput
          id="review"
          label="Review deadline"
          value={review}
          onChange={setReview}
          readOnly={readOnly}
          error={reviewErr}
          suffix="days"
          appliesTo="Applies to scrutiny officials: time allowed to review a new or resubmitted FDR."
        />
        <PolicyInput
          id="corr"
          label="Correction deadline"
          value={corr}
          onChange={setCorr}
          readOnly={readOnly}
          error={corrErr}
          suffix="days"
          appliesTo="Applies to institutions: time allowed to answer a correction request."
        />

        {!readOnly && (
          <div className="flex flex-col justify-end gap-2">
            <Button type="submit" variant={valid && dirty ? "primary" : "inactive"} aria-disabled={!valid || !dirty} className="w-full">
              Save policy
            </Button>
            <p className="text-center text-[13px] text-muted" aria-live="polite">
              {!valid ? "Fix the highlighted fields to save." : dirty ? "Unsaved changes." : "No changes to save."}
            </p>
            {dirty && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => {
                  setWindows(settings.reminderWindows.join(", "))
                  setEsc(String(settings.escalateAtDays))
                  setReview(String(settings.reviewSlaDays))
                  setCorr(String(settings.correctionSlaDays))
                }}
              >
                Discard changes
              </Button>
            )}
          </div>
        )}
      </form>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

const TABS = [
  { key: "policy", label: "Policy settings" },
  { key: "security", label: "Security model" },
] as const

export default function Settings() {
  const { state, user, actions } = useStore()
  const [tab, setTab] = useState(0)
  const [confirm, setConfirm] = useState<ConfirmSpec | null>(null)
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  if (!user) return null

  return (
    <>
      <PageHeader eyebrow="Configuration" title="Policy & security" sub="Reminder and deadline policy, and an honest view of the security model behind the portal." />

      <div role="tablist" aria-label="Policy and security sections" className="mb-6 inline-flex gap-1 rounded-lg border border-line bg-surface p-1">
        {TABS.map((t, i) => (
          <button
            key={t.key}
            ref={(el) => {
              refs.current[i] = el
            }}
            role="tab"
            id={`settings-tab-${t.key}`}
            aria-selected={tab === i}
            aria-controls={`settings-panel-${t.key}`}
            tabIndex={tab === i ? 0 : -1}
            onClick={() => setTab(i)}
            onKeyDown={(e) => {
              const last = TABS.length - 1
              const n =
                e.key === "ArrowRight" ? (i === last ? 0 : i + 1)
                : e.key === "ArrowLeft" ? (i === 0 ? last : i - 1)
                : e.key === "Home" ? 0
                : e.key === "End" ? last
                : null
              if (n === null) return
              e.preventDefault()
              setTab(n)
              refs.current[n]?.focus()
            }}
            className={cx("rounded-md px-4 py-2 text-[14px] font-medium transition-colors", tab === i ? "bg-brand text-white" : "text-ink-3 hover:bg-paper-2")}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`settings-panel-${TABS[tab].key}`} aria-labelledby={`settings-tab-${TABS[tab].key}`} tabIndex={0} className="rounded-xl focus-visible:outline-offset-4">
        {tab === 0 ? <PolicyForm key={JSON.stringify(state.settings)} settings={state.settings} user={user} /> : <SecurityModel />}
      </div>

      <Disclaimer variant="warn" className="mt-6">
        {DISCLAIMER_UPLOAD}
      </Disclaimer>

      <section aria-labelledby="demo-reset-title" className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-dashed border-line-strong bg-white px-5 py-4">
        <div className="max-w-2xl">
          <p className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#d3d9e2] bg-slate-bg px-2.5 py-0.5 text-[13px] font-semibold text-slate-fg">
              <FlaskConical aria-hidden className="size-3.5" /> Demo only
            </span>
            <span id="demo-reset-title" className="text-[14.5px] font-semibold text-ink">
              Reset demo data
            </span>
          </p>
          <p className="mt-1 text-[13.5px] text-muted">
            Restores the original synthetic records kept in this browser. A live deployment has no reset.
          </p>
        </div>
        <Button
          variant="secondary"
          onClick={() =>
            setConfirm({
              title: "Reset demo data?",
              summary:
                "Replace everything created in this browser (FDRs, reminders, policy changes and audit entries) with the original synthetic records. This cannot be reversed.",
              detail: `You will stay signed in as ${user.name}.`,
              confirmLabel: "Reset demo data",
              tone: "danger",
              footnote: "Demo only. A live deployment has no reset, and its audit log can never be cleared.",
              run: actions.reset,
            })
          }
        >
          <RotateCcw aria-hidden className="size-4" /> Reset demo data
        </Button>
      </section>
      <ConfirmDialog spec={confirm} onClose={() => setConfirm(null)} />
    </>
  )
}
