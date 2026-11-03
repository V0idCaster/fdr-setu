import {
  AlertTriangle,
  ArrowRight,
  BellRing,
  CalendarClock,
  ClipboardList,
  FilePlus2,
  Landmark,
  Stamp,
} from "lucide-react"
import { useStore } from "../data/store"
import {
  caseAge,
  institutionName,
  isActive,
  kpis,
  statusOf,
  urgency,
  visibleFdrs,
  windowTone,
} from "../data/selectors"
import { daysUntil, fmtDate, TODAY } from "../lib/dates"
import { cx, fmtINRCompact, maskRef } from "../lib/format"
import {
  Card,
  CardHeader,
  Chip,
  Disclaimer,
  DISCLAIMER_TRACKING,
  LinkButton,
  PageHeader,
} from "../components/ui"
import { OwnerChip } from "../components/Provenance"
import { Link } from "../router"
import type { Fdr, Settings } from "../data/types"

function Kpi({
  label,
  value,
  sub,
  icon: Icon,
  tone,
  to,
}: {
  label: string
  value: number
  sub: string
  icon: typeof Landmark
  tone: string
  to: string
}) {
  return (
    <Link
      to={to}
      className="group rounded-xl border border-line bg-surface p-5 transition-colors hover:border-line-strong"
    >
      <div className="flex items-start justify-between">
        <p className="text-[13px] font-medium text-muted">{label}</p>
        <span className={cx("grid size-8 place-items-center rounded-md", tone)}>
          <Icon aria-hidden className="size-4" />
        </span>
      </div>
      <p className="mt-3 font-display text-[40px] font-semibold leading-none text-ink tnum">
        {value}
      </p>
      <p className="mt-2 flex items-center justify-between text-[13px] text-muted tnum">
        {sub}
        <ArrowRight
          aria-hidden
          className="size-3.5 opacity-0 transition-opacity group-hover:opacity-100"
        />
      </p>
    </Link>
  )
}

const TONE_DOT = { red: "bg-red-dot", amber: "bg-amber-dot", slate: "bg-slate-dot", green: "bg-green-dot", neutral: "bg-line-strong" }
const TONE_TEXT = { red: "text-red-fg", amber: "text-amber-fg", slate: "text-slate-fg", green: "text-green-fg", neutral: "text-muted" }

function MaturityStrip({ fdrs, settings }: { fdrs: Fdr[]; settings: Settings }) {
  const windows = [...settings.reminderWindows].sort((a, b) => a - b)
  // Show at least 120 days, and always 1.5x the widest reminder window (rounded to whole months).
  const horizon = Math.max(120, Math.ceil(((windows[windows.length - 1] ?? 60) * 1.5) / 30) * 30)
  const items = fdrs
    .filter((f) => ["accepted", "renewal_initiated"].includes(f.stage))
    .map((f) => ({ f, d: daysUntil(f.maturityDate) }))
    .filter((x) => x.d >= 0 && x.d <= horizon)
  return (
    <div>
      <div
        className="relative h-20"
        role="img"
        aria-label={`Maturity timeline: ${items.length} instruments mature in the next ${horizon} days`}
      >
        <div className="absolute inset-x-0 top-10 h-px bg-line-strong" />
        {windows.map((w) => (
          <div
            key={w}
            className="absolute top-3 h-14 border-l border-dashed border-gold-600/50"
            style={{ left: `${(w / horizon) * 100}%` }}
          >
            <span className="absolute -top-0.5 left-1 text-[13px] font-medium text-gold-700 tnum">
              {w}d
            </span>
          </div>
        ))}
        {items.map(({ f, d }, i) => (
          <div
            key={f.id}
            className="absolute -translate-x-1/2"
            style={{ left: `${(d / horizon) * 100}%`, top: i % 2 ? 46 : 24 }}
          >
            <span
              className={cx(
                "block size-3 rounded-full ring-2 ring-surface",
                TONE_DOT[windowTone(d, settings)],
              )}
            />
          </div>
        ))}
      </div>
      <div className="flex justify-between text-[13px] text-muted tnum">
        <span>Today · 01 Aug</span>
        <span>+{horizon} days</span>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { state, user } = useStore()
  if (!user) return null
  const mine = visibleFdrs(state.fdrs, user)
  const k = kpis(mine)
  const open = mine.filter((f) => !f.owner.label.startsWith("Closed"))
  const myDesk = open
    .filter((f) => f.owner.role === user.role)
    .sort((a, b) => urgency(a) - urgency(b))
  const upcoming = mine
    .filter(
      (f) =>
        ["accepted", "renewal_initiated"].includes(f.stage) &&
        daysUntil(f.maturityDate) >= -30,
    )
    .sort((a, b) => daysUntil(a.maturityDate) - daysUntil(b.maturityDate))
    .slice(0, 5)
  const mineIds = new Set(mine.map((f) => f.id))
  const escalations = state.reminders.filter(
    (r) => mineIds.has(r.fdrId) && r.escalated,
  )
  const greet =
    user.role === "institution"
      ? institutionName(user.institutionId!)
      : user.role === "scrutiny"
        ? "Scrutiny desk"
        : "Approving Authority"

  return (
    <>
      <PageHeader
        eyebrow={`${greet} · ${fmtDate(TODAY.toISOString())}`}
        title={`Good morning, ${user.name}`}
        sub={
          user.role === "institution"
            ? "Your institution’s security deposits, what needs your attention and when."
            : user.role === "scrutiny"
              ? "Submissions awaiting scrutiny, open discrepancies and bank confirmations across institutions."
              : "Escalations, release and refund decisions, and the portfolio across all institutions."
        }
        actions={
          user.role === "institution" ? (
            <LinkButton to="/app/submit">
              <FilePlus2 aria-hidden className="size-4" /> Submit FDR
            </LinkButton>
          ) : (
            <LinkButton to="/app/queue">
              <ClipboardList aria-hidden className="size-4" /> Open{" "}
              work queue
            </LinkButton>
          )
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          label="Active instruments"
          value={k.active}
          sub={`${fmtINRCompact(k.activeValue)} held`}
          icon={Landmark}
          tone="bg-paper-2 text-ink-3"
          to="/app/register"
        />
        <Kpi
          label="Expiring within 30 days"
          value={k.expiring30}
          sub="Renewal action window"
          icon={CalendarClock}
          tone="bg-amber-bg text-amber-fg"
          to="/app/register?filter=expiring"
        />
        <Kpi
          label="Pending review"
          value={k.pendingReview}
          sub={`+${k.corrections} awaiting correction`}
          icon={ClipboardList}
          tone="bg-slate-bg text-slate-fg"
          to="/app/register?filter=review"
        />
        <Kpi
          label="Release or refund pending"
          value={k.releasePending}
          sub="Through scrutiny to decision"
          icon={Stamp}
          tone="bg-gold-soft text-gold-700"
          to="/app/register?filter=release"
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader
            title={
              user.role === "institution" ? "Waiting on you" : "On your desk"
            }
            sub="Cases currently owned by your role, most urgent deadline first"
            action={
              <Link
                to="/app/queue"
                className="text-[13px] font-medium text-gold-700 hover:underline"
              >
                View all
              </Link>
            }
          />
          {myDesk.length === 0 ? (
            <p className="px-5 py-10 text-center text-[14px] text-muted">
              Nothing is waiting on your desk.
            </p>
          ) : (
            <ul className="divide-y divide-line">
              {myDesk.slice(0, 6).map((f) => {
                const s = statusOf(f, state.fdrs, state.settings)
                return (
                  <li key={f.id}>
                    <Link
                      to={`/app/fdr/${f.id}`}
                      className="flex flex-col gap-2 px-5 py-3.5 hover:bg-paper sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="text-[14.5px] font-medium text-ink">
                          {institutionName(f.institutionId)}{" "}
                          <span className="font-mono text-[13px] text-muted">
                            {maskRef(f.fdrNumber)}
                          </span>
                        </p>
                        <p className="mt-0.5 text-[13px] text-muted">
                          {f.owner.label} · held {caseAge(f)} days
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-wrap items-center gap-2">
                        <Chip tone={s.tone}>{s.label}</Chip>
                        <DeadlineBadge days={urgency(f)} />
                      </div>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader
            title="Maturity horizon"
            sub={`Reminder windows: ${[...state.settings.reminderWindows].sort((a, b) => b - a).join(" / ")} days`}
          />
          <div className="px-5 py-4">
            <MaturityStrip fdrs={mine} settings={state.settings} />
            <ul className="mt-4 divide-y divide-line">
              {upcoming.map((f) => {
                const d = daysUntil(f.maturityDate)
                return (
                  <li
                    key={f.id}
                    className="flex items-center justify-between gap-3 py-2.5"
                  >
                    <Link
                      to={`/app/fdr/${f.id}`}
                      className="min-w-0 hover:underline"
                    >
                      <p className="truncate text-[13.5px] font-medium">
                        {institutionName(f.institutionId)}
                      </p>
                      <p className="text-[13px] text-muted tnum">
                        <span className="font-mono">
                          {maskRef(f.fdrNumber)}
                        </span>{" "}
                        · {f.bank} · {fmtDate(f.maturityDate)}
                      </p>
                    </Link>
                    <span
                      className={cx(
                        "shrink-0 text-[13px] font-semibold tnum",
                        TONE_TEXT[windowTone(d, state.settings)],
                      )}
                    >
                      {d < 0 ? `${-d}d past` : `${d}d`}
                    </span>
                  </li>
                )
              })}
            </ul>
          </div>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Escalations"
            sub="Raised automatically by the maturity check"
            action={<BellRing aria-hidden className="size-4 text-gold-700" />}
          />
          <ul className="divide-y divide-line">
            {escalations.length === 0 && (
              <li className="px-5 py-8 text-center text-[14px] text-muted">
                No escalations.
              </li>
            )}
            {escalations.map((r) => {
              const f = state.fdrs.find((x) => x.id === r.fdrId)!
              return (
                <li key={r.id} className="flex items-start gap-3 px-5 py-3.5">
                  <AlertTriangle
                    aria-hidden
                    className="mt-0.5 size-4 shrink-0 text-red-fg"
                  />
                  <div className="min-w-0 flex-1">
                    <Link
                      to={`/app/fdr/${f.id}`}
                      className="text-[14px] font-medium hover:underline"
                    >
                      {institutionName(f.institutionId)} ·{" "}
                      <span className="font-mono">{maskRef(f.fdrNumber)}</span>
                    </Link>
                    <p className="text-[13px] text-muted">
                      {r.window}-day window · matures {fmtDate(f.maturityDate)}{" "}
                      · no renewal started
                    </p>
                    <div className="mt-2">
                      <OwnerChip fdr={f} />
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        </Card>
        <Card>
          <CardHeader
            title="Evidence status"
            sub="Active instruments by provenance state"
          />
          <div className="space-y-4 px-5 py-5">
            {(() => {
              const act = mine.filter(isActive)
              const rows = [
                { label: "Submitted", n: act.length, cls: "bg-ink-3" },
                {
                  label: "Reviewed",
                  n: act.filter((f) => f.reviewedAt).length,
                  cls: "bg-green-dot",
                },
                {
                  label: "Bank-confirmed",
                  n: act.filter((f) => f.bankConfirmation === "confirmed")
                    .length,
                  cls: "bg-gold-600",
                },
              ]
              return rows.map((r) => (
                <div key={r.label}>
                  <div className="mb-1.5 flex justify-between text-[13px]">
                    <span className="font-medium text-ink-2">{r.label}</span>
                    <span className="text-muted tnum">
                      {r.n} / {act.length}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-paper-2">
                    <div
                      className={cx("h-full rounded-full", r.cls)}
                      style={{
                        width: `${act.length ? (r.n / act.length) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
              ))
            })()}
            <p className="text-[13px] leading-relaxed text-muted">
              Three independent states. A submitted receipt is not reviewed, and
              a reviewed receipt is not bank-confirmed until the bank’s own
              confirmation is recorded.
            </p>
          </div>
        </Card>
      </div>

      <Disclaimer className="mt-6">{DISCLAIMER_TRACKING}</Disclaimer>
    </>
  )
}

export function DeadlineBadge({ days }: { days: number }) {
  const tone = days < 0 || days <= 3 ? "red" : days <= 10 ? "amber" : "slate"
  return (
    <Chip tone={tone}>
      {days < 0
        ? `Overdue ${-days}d`
        : days === 0
          ? "Due today"
          : `Due in ${days}d`}
    </Chip>
  )
}
