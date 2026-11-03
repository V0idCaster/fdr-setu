import { BellRing, Play, Send } from "lucide-react"
import { useStore } from "../data/store"
import { institutionName, visibleFdrs, windowTone } from "../data/selectors"
import { daysUntil, fmtDate } from "../lib/dates"
import { cx, maskRef } from "../lib/format"
import {
  Button,
  Card,
  CardHeader,
  Chip,
  Disclaimer,
  Empty,
  PageHeader,
} from "../components/ui"
import { OwnerChip, ReminderTrack } from "../components/Provenance"
import { Link } from "../router"

export default function Alerts() {
  const { state, user, actions } = useStore()
  if (!user) return null
  const mine = visibleFdrs(state.fdrs, user)
  const ids = new Set(mine.map((f) => f.id))
  const reminders = state.reminders
    .filter((r) => ids.has(r.fdrId))
    .sort((a, b) => b.generatedAt.localeCompare(a.generatedAt))
  const windows = [...state.settings.reminderWindows].sort((a, b) => b - a)
  const max = windows[0]
  const upcoming = mine
    .filter((f) => ["accepted", "renewal_initiated"].includes(f.stage))
    .map((f) => ({ f, d: daysUntil(f.maturityDate) }))
    .filter((x) => x.d <= max)
    .sort((a, b) => a.d - b.d)
  const official = user.role !== "institution"
  const stat = {
    generated: reminders.length,
    delivered: reminders.filter((r) => r.delivery === "delivered").length,
    failed: reminders.filter((r) => r.delivery === "failed").length,
    renewed: new Set(
      reminders
        .filter(
          (r) => mine.find((f) => f.id === r.fdrId)?.stage === "superseded",
        )
        .map((r) => r.fdrId),
    ).size,
  }
  const escalations = reminders.filter((r) => r.escalated)

  return (
    <>
      <PageHeader
        eyebrow="Monitoring"
        title="Alerts centre"
        sub={`Upcoming maturities and escalations. Reminder windows: ${windows.join(" / ")} days; escalation at ≤ ${state.settings.escalateAtDays} days without renewal.`}
        actions={
          official && (
            <>
              <Button variant="secondary" onClick={actions.dispatchReminders}>
                <Send aria-hidden className="size-4" /> Deliver queued
              </Button>
              <Button onClick={actions.runMaturityCheck}>
                <Play aria-hidden className="size-4" /> Run maturity check now
              </Button>
            </>
          )
        }
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-4">
        {[
          { k: "Reminders generated", v: stat.generated, cls: "text-ink" },
          { k: "Delivered", v: stat.delivered, cls: "text-green-fg" },
          {
            k: "Failed / queued",
            v: stat.generated - stat.delivered,
            cls: stat.failed ? "text-red-fg" : "text-amber-fg",
          },
          { k: "Renewals completed", v: stat.renewed, cls: "text-ink" },
        ].map((s, i) => (
          <div
            key={s.k}
            className="relative rounded-xl border border-line bg-surface px-4 py-3.5"
          >
            {i > 0 && (
              <span
                aria-hidden
                className="absolute -left-2.5 top-1/2 hidden -translate-y-1/2 bg-paper px-0.5 text-[13px] text-line-strong sm:block"
              >
                ≠
              </span>
            )}
            <p className="text-[13px] text-muted">{s.k}</p>
            <p
              className={cx(
                "font-display text-[28px] font-semibold tnum",
                s.cls,
              )}
            >
              {s.v}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Card>
          <CardHeader
            title="Upcoming maturities"
            sub={`Within ${max} days, nearest first`}
          />
          {upcoming.length === 0 ? (
            <div className="p-5">
              <Empty title="Nothing maturing soon" />
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {upcoming.map(({ f, d }) => (
                <li key={f.id} className="px-5 py-3.5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <Link to={`/app/fdr/${f.id}`} className="hover:underline">
                      <p className="text-[14px] font-medium">
                        {institutionName(f.institutionId)} ·{" "}
                        <span className="font-mono">
                          {maskRef(f.fdrNumber)}
                        </span>
                      </p>
                      <p className="text-[13px] text-muted tnum">
                        {f.bank} · matures {fmtDate(f.maturityDate)}
                      </p>
                    </Link>
                    <Chip
                      tone={windowTone(d, state.settings)}
                    >
                      {d < 0 ? `${-d} days past` : `${d} days`}
                    </Chip>
                  </div>
                  <div
                    className="mt-2 flex flex-wrap gap-1.5"
                    aria-label="Reminder windows"
                  >
                    {windows.map((w) => {
                      const r = state.reminders.find(
                        (x) => x.fdrId === f.id && x.window === w,
                      )
                      const reached = d <= w
                      return (
                        <span
                          key={w}
                          className={cx(
                            "rounded px-1.5 py-0.5 text-[13px] font-medium tnum",
                            r
                              ? r.delivery === "delivered"
                                ? "bg-green-bg text-green-fg"
                                : r.delivery === "failed"
                                  ? "bg-red-bg text-red-fg"
                                  : "bg-amber-bg text-amber-fg"
                              : reached
                                ? "bg-red-bg/60 text-red-fg ring-1 ring-inset ring-[#efc2bf]"
                                : "bg-paper-2 text-muted",
                          )}
                        >
                          {w}d ·{" "}
                          {r
                            ? r.delivery
                            : reached
                              ? "not generated"
                              : "upcoming"}
                        </span>
                      )
                    })}
                    {f.stage === "renewal_initiated" && (
                      <span className="rounded bg-amber-bg px-1.5 py-0.5 text-[13px] font-medium text-amber-fg">
                        renewal in progress
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader
            title="Escalations"
            sub="Raised when the escalation window is reached with no renewal"
            action={<BellRing aria-hidden className="size-4 text-red-fg" />}
          />
          {escalations.length === 0 ? (
            <div className="p-5">
              <Empty title="No escalations" />
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {escalations.map((r) => {
                const f = state.fdrs.find((x) => x.id === r.fdrId)!
                return (
                  <li key={r.id} className="space-y-2 px-5 py-3.5">
                    <Link
                      to={`/app/fdr/${f.id}`}
                      className="text-[14px] font-medium hover:underline"
                    >
                      {institutionName(f.institutionId)} ·{" "}
                      <span className="font-mono">{maskRef(f.fdrNumber)}</span>
                    </Link>
                    <p className="text-[13px] text-muted tnum">
                      Escalated {fmtDate(r.escalatedAt)} · matures{" "}
                      {fmtDate(f.maturityDate)}
                    </p>
                    <OwnerChip fdr={f} />
                  </li>
                )
              })}
            </ul>
          )}
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader
          title="Reminder log"
          sub="Each reminder tracks generation, delivery and renewal separately"
        />
        {reminders.length === 0 ? (
          <div className="p-5">
            <Empty title="No reminders yet" />
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {reminders.map((r) => {
              const f = state.fdrs.find((x) => x.id === r.fdrId)!
              return (
                <li
                  key={r.id}
                  className="flex flex-col gap-2 px-5 py-3.5 lg:flex-row lg:items-center lg:justify-between"
                >
                  <div className="min-w-[220px]">
                    <Link
                      to={`/app/fdr/${f.id}`}
                      className="text-[13.5px] font-medium hover:underline"
                    >
                      {institutionName(f.institutionId)} ·{" "}
                      <span className="font-mono">{maskRef(f.fdrNumber)}</span>
                    </Link>
                    <p className="text-[13px] text-muted">
                      {r.window}-day window · {r.channel}
                      {r.escalated && (
                        <span className="font-medium text-red-fg">
                          {" "}
                          · escalated
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <ReminderTrack reminder={r} fdr={f} />
                    {user.role === "institution" &&
                      r.delivery === "delivered" &&
                      (r.acknowledgedAt ? (
                        <span className="text-[13px] text-muted">
                          Acknowledged {fmtDate(r.acknowledgedAt)}
                        </span>
                      ) : (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => actions.acknowledgeReminder(r.id)}
                        >
                          Acknowledge
                        </Button>
                      ))}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </Card>

      <Disclaimer className="mt-6">
        In production the maturity check runs as a scheduled Supabase Edge
        Function (daily, 06:00 IST) using the service-role key server-side.
        Generating a reminder, delivering it and completing the renewal are
        recorded as three separate facts. “Run maturity check now” simulates
        that job in this prototype.
      </Disclaimer>
    </>
  )
}
