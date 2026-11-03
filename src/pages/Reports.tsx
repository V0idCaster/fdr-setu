import { Download } from "lucide-react"
import { useStore } from "../data/store"
import { INSTITUTIONS } from "../data/seed"
import {
  caseAge,
  institutionName,
  isActive,
  kpis,
  ROLE_LABEL,
  statusOf,
  urgency,
} from "../data/selectors"
import { fmtDate } from "../lib/dates"
import { cx, downloadCsv, fmtINR, maskRef } from "../lib/format"
import {
  Button,
  Card,
  CardHeader,
  Chip,
  PageHeader,
} from "../components/ui"
import { Link } from "../router"
import { ErrorScreen } from "../components/ErrorScreen"
import type { Role } from "../data/types"

const BUCKETS = [
  { label: "0–7 days", min: 0, max: 7 },
  { label: "8–15 days", min: 8, max: 15 },
  { label: "16–30 days", min: 16, max: 30 },
  { label: "31+ days", min: 31, max: Infinity },
]

export default function Reports() {
  const { state, user } = useStore()
  if (!user || user.role === "institution")
    return (
      <ErrorScreen
        kind="forbidden"
        title="Reports are for officials"
        actions={[
          { to: "/app", label: "Back to dashboard", primary: true },
          { to: "/app/register", label: "Open FDR register" },
        ]}
      >
        Cross-institution reports are available to scrutiny officials and the Approving Authority. Your institution’s records are in the FDR
        register.
      </ErrorScreen>
    )

  const summary = INSTITUTIONS.map((i) => {
    const list = state.fdrs.filter((f) => f.institutionId === i.id)
    const k = kpis(list)
    const act = list.filter(isActive)
    return {
      i,
      k,
      bankPct: act.length
        ? Math.round(
            (act.filter((f) => f.bankConfirmation === "confirmed").length /
              act.length) *
              100,
          )
        : 0,
    }
  })
  const totals = kpis(state.fdrs)

  const open = state.fdrs.filter((f) => !f.owner.label.startsWith("Closed"))
  const roles: Role[] = ["institution", "scrutiny", "authority"]
  const grid = roles.map((r) =>
    BUCKETS.map(
      (b) =>
        open.filter(
          (f) =>
            f.owner.role === r && caseAge(f) >= b.min && caseAge(f) <= b.max,
        ).length,
    ),
  )
  const maxCell = Math.max(1, ...grid.flat())
  const pending = open
    .filter(
      (f) =>
        !(
          f.stage === "accepted" &&
          f.owner.role === "institution" &&
          urgency(f) > 30
        ),
    )
    .sort((a, b) => caseAge(b) - caseAge(a))

  const exportSummary = () =>
    downloadCsv("fdr-status-by-institution.csv", [
      [
        "Institution",
        "Code",
        "Active",
        "Value held (INR)",
        "Expiring <=30d",
        "Pending review",
        "Correction requested",
        "Release/refund pending",
        "Bank-confirmed %",
      ],
      ...summary.map(({ i, k, bankPct }) => [
        i.name,
        i.code,
        k.active,
        k.activeValue,
        k.expiring30,
        k.pendingReview,
        k.corrections,
        k.releasePending,
        bankPct,
      ]),
    ])
  const exportAging = () =>
    downloadCsv("fdr-pending-case-aging.csv", [
      [
        "Institution",
        "FDR (masked)",
        "Status",
        "Owner",
        "Owner role",
        "Held since",
        "Age (days)",
        "Deadline",
        "Days to deadline",
      ],
      ...pending.map((f) => [
        institutionName(f.institutionId),
        maskRef(f.fdrNumber),
        statusOf(f, state.fdrs, state.settings).label,
        f.owner.label,
        ROLE_LABEL[f.owner.role],
        fmtDate(f.owner.since),
        caseAge(f),
        fmtDate(f.owner.deadline),
        urgency(f),
      ]),
    ])

  return (
    <>
      <PageHeader
        eyebrow="Reporting"
        title="Reports"
        sub="Status summaries per institution and the ageing of every open case. Exports use masked FDR references."
      />

      <Card>
        <CardHeader
          title="Status by institution"
          sub={`${INSTITUTIONS.length} institutions · ${fmtINR(totals.activeValue)} held in active instruments`}
          action={
            <Button size="sm" variant="secondary" onClick={exportSummary}>
              <Download aria-hidden className="size-3.5" /> CSV
            </Button>
          }
        />
        <ul className="divide-y divide-line md:hidden">
          {summary.map(({ i, k, bankPct }) => (
            <li key={i.id} className="px-4 py-3.5">
              <p className="text-[14.5px] font-medium text-ink">{i.name}</p>
              <p className="text-[13px] text-muted">
                {i.code} · {i.city}
              </p>
              <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-[13px] tnum">
                <dt className="text-muted">Active</dt>
                <dd className="text-right text-ink-2">{k.active}</dd>
                <dt className="text-muted">Value held</dt>
                <dd className="text-right text-ink-2">{fmtINR(k.activeValue)}</dd>
                <dt className="text-muted">≤ 30 days</dt>
                <dd className={cx("text-right", k.expiring30 ? "font-semibold text-amber-fg" : "text-ink-2")}>{k.expiring30}</dd>
                <dt className="text-muted">Pending review</dt>
                <dd className="text-right text-ink-2">{k.pendingReview}</dd>
                <dt className="text-muted">Corrections</dt>
                <dd className={cx("text-right", k.corrections ? "font-semibold text-red-fg" : "text-ink-2")}>{k.corrections}</dd>
                <dt className="text-muted">Release / refund</dt>
                <dd className="text-right text-ink-2">{k.releasePending}</dd>
                <dt className="text-muted">Bank-confirmed</dt>
                <dd className="text-right text-ink-2">{bankPct}%</dd>
              </dl>
            </li>
          ))}
          <li className="bg-paper px-4 py-3 text-[13px] font-semibold text-ink tnum">
            All institutions: {totals.active} active · {fmtINR(totals.activeValue)}
          </li>
        </ul>
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[860px] text-left text-[13.5px]">
            <thead>
              <tr className="border-b border-line bg-paper text-[13px] uppercase tracking-[0.08em] text-muted">
                <th scope="col" className="px-5 py-2.5 font-semibold">
                  Institution
                </th>
                <th
                  scope="col"
                  className="px-3 py-2.5 text-right font-semibold"
                >
                  Active
                </th>
                <th
                  scope="col"
                  className="px-3 py-2.5 text-right font-semibold"
                >
                  Value held
                </th>
                <th
                  scope="col"
                  className="px-3 py-2.5 text-right font-semibold"
                >
                  ≤ 30 days
                </th>
                <th
                  scope="col"
                  className="px-3 py-2.5 text-right font-semibold"
                >
                  Pending review
                </th>
                <th
                  scope="col"
                  className="px-3 py-2.5 text-right font-semibold"
                >
                  Corrections
                </th>
                <th
                  scope="col"
                  className="px-3 py-2.5 text-right font-semibold"
                >
                  Release / refund
                </th>
                <th scope="col" className="px-5 py-2.5 font-semibold">
                  Bank-confirmed
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line tnum">
              {summary.map(({ i, k, bankPct }) => (
                <tr key={i.id}>
                  <th scope="row" className="px-5 py-3 font-medium text-ink">
                    {i.name}
                    <span className="block text-[13px] font-normal text-muted">
                      {i.code} · {i.city}
                    </span>
                  </th>
                  <td className="px-3 py-3 text-right">{k.active}</td>
                  <td className="px-3 py-3 text-right">
                    {fmtINR(k.activeValue)}
                  </td>
                  <td
                    className={cx(
                      "px-3 py-3 text-right",
                      k.expiring30 && "font-semibold text-amber-fg",
                    )}
                  >
                    {k.expiring30}
                  </td>
                  <td className="px-3 py-3 text-right">{k.pendingReview}</td>
                  <td
                    className={cx(
                      "px-3 py-3 text-right",
                      k.corrections && "font-semibold text-red-fg",
                    )}
                  >
                    {k.corrections}
                  </td>
                  <td className="px-3 py-3 text-right">{k.releasePending}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-paper-2">
                        <div
                          className="h-full rounded-full bg-gold-600"
                          style={{ width: `${bankPct}%` }}
                        />
                      </div>
                      <span className="text-[13px] text-muted">
                        {bankPct}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-line-strong bg-paper font-semibold tnum">
                <th scope="row" className="px-5 py-3">
                  All institutions
                </th>
                <td className="px-3 py-3 text-right">{totals.active}</td>
                <td className="px-3 py-3 text-right">
                  {fmtINR(totals.activeValue)}
                </td>
                <td className="px-3 py-3 text-right">{totals.expiring30}</td>
                <td className="px-3 py-3 text-right">{totals.pendingReview}</td>
                <td className="px-3 py-3 text-right">{totals.corrections}</td>
                <td className="px-3 py-3 text-right">
                  {totals.releasePending}
                </td>
                <td className="px-5 py-3" />
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>

      <div className="mt-6 grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
        <Card className="min-w-0">
          <CardHeader
            title="Ageing matrix"
            sub="Open cases by current owner and days held"
          />
          <div className="overflow-x-auto p-5">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-[13px] text-muted">
                  <th scope="col" className="pb-2 text-left font-medium">
                    Owner
                  </th>
                  {BUCKETS.map((b) => (
                    <th
                      key={b.label}
                      scope="col"
                      className="pb-2 text-center font-medium"
                    >
                      {b.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {roles.map((r, ri) => (
                  <tr key={r}>
                    <th
                      scope="row"
                      className="py-1 pr-2 text-left font-medium text-ink-2"
                    >
                      {ROLE_LABEL[r]}
                    </th>
                    {grid[ri].map((n, bi) => (
                      <td key={bi} className="p-1">
                        <div
                          className={cx(
                            "grid h-11 place-items-center rounded-md font-semibold tnum",
                            n
                              ? bi >= 2
                                ? "text-white"
                                : "text-ink"
                              : "text-muted",
                          )}
                          style={{
                            background: n
                              ? bi >= 2
                                ? `rgba(156,28,28,${0.45 + (n / maxCell) * 0.5})`
                                : `rgba(201,164,92,${0.2 + (n / maxCell) * 0.6})`
                              : "#efeae0",
                          }}
                        >
                          {n}
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="min-w-0">
          <CardHeader
            title="Pending-case ageing"
            sub="Oldest first. Routine monitoring of accepted instruments far from maturity is excluded."
            action={
              <Button size="sm" variant="secondary" onClick={exportAging}>
                <Download aria-hidden className="size-3.5" /> CSV
              </Button>
            }
          />
          <ul className="divide-y divide-line md:hidden">
            {pending.map((f) => {
              const st = statusOf(f, state.fdrs, state.settings)
              const u = urgency(f)
              return (
                <li key={f.id} className="px-4 py-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <Link to={`/app/fdr/${f.id}`} className="text-[14px] font-medium text-ink hover:underline">
                      {institutionName(f.institutionId)} <span className="font-mono text-[13px] text-muted">{maskRef(f.fdrNumber)}</span>
                    </Link>
                    <span className={cx("shrink-0 text-[13px] tnum", u < 0 ? "font-semibold text-red-fg" : u <= 3 ? "text-red-fg" : "text-ink-2")}>
                      {u < 0 ? `${-u}d overdue` : `${u}d left`}
                    </span>
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[13px] text-muted tnum">
                    <Chip tone={st.tone} className="max-w-full whitespace-normal!">
                      {st.label}
                    </Chip>
                    <span>
                      {ROLE_LABEL[f.owner.role]} · held {caseAge(f)}d
                    </span>
                  </div>
                </li>
              )
            })}
          </ul>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[640px] text-left text-[13px]">
              <thead>
                <tr className="border-b border-line bg-paper text-[13px] uppercase tracking-[0.08em] text-muted">
                  <th scope="col" className="px-5 py-2 font-semibold">
                    Case
                  </th>
                  <th scope="col" className="px-3 py-2 font-semibold">
                    Status
                  </th>
                  <th scope="col" className="px-3 py-2 font-semibold">
                    Held by
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-2 text-right font-semibold"
                  >
                    Age
                  </th>
                  <th
                    scope="col"
                    className="px-5 py-2 text-right font-semibold"
                  >
                    Deadline
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line tnum">
                {pending.map((f) => {
                  const s = statusOf(f, state.fdrs, state.settings)
                  const u = urgency(f)
                  return (
                    <tr key={f.id}>
                      <td className="px-5 py-2.5">
                        <Link
                          to={`/app/fdr/${f.id}`}
                          className="font-medium hover:underline"
                        >
                          {institutionName(f.institutionId)}
                        </Link>
                        <span className="ml-1.5 font-mono text-[13px] text-muted">
                          {maskRef(f.fdrNumber)}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <Chip tone={s.tone}>{s.label}</Chip>
                      </td>
                      <td className="px-3 py-2.5 text-muted">
                        {ROLE_LABEL[f.owner.role]}
                      </td>
                      <td className="px-3 py-2.5 text-right">{caseAge(f)}d</td>
                      <td
                        className={cx(
                          "px-5 py-2.5 text-right",
                          u < 0
                            ? "font-semibold text-red-fg"
                            : u <= 3
                              ? "text-red-fg"
                              : "text-ink-2",
                        )}
                      >
                        {u < 0 ? `${-u}d overdue` : `${u}d left`}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </>
  )
}
