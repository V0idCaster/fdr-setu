import { useRef, useState } from "react"
import { useStore } from "../data/store"
import {
  ROLE_LABEL,
  caseAge,
  FLAG_LABEL,
  institutionName,
  openFlags,
  statusOf,
  urgency,
  visibleFdrs,
} from "../data/selectors"
import { fmtDate } from "../lib/dates"
import { cx, fmtINR, maskRef } from "../lib/format"
import { Card, Chip, Empty, PageHeader } from "../components/ui"
import { OwnerChip } from "../components/Provenance"
import { Link } from "../router"
import type { Fdr } from "../data/types"
import { DeadlineBadge } from "./Dashboard"

type Tab = { key: string; label: string; items: Fdr[] }

export default function Queue() {
  const { state, user } = useStore()
  const [tab, setTab] = useState(0)
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])
  if (!user) return null
  const mine = visibleFdrs(state.fdrs, user)
  const byUrgency = (a: Fdr, b: Fdr) => urgency(a) - urgency(b)

  let tabs: Tab[]
  let title: string
  let sub: string
  if (user.role === "scrutiny") {
    title = "Work queue"
    sub =
      "Sorted by deadline urgency. The case owner and deadline are shown on every row."
    tabs = [
      {
        key: "review",
        label: "New & resubmitted",
        items: mine
          .filter((f) => f.stage === "submitted" || f.stage === "under_review")
          .sort(byUrgency),
      },
      {
        key: "release",
        label: "Release / refund checks",
        items: mine
          .filter(
            (f) =>
              f.stage === "release_requested" &&
              f.release?.stage === "requested",
          )
          .sort(byUrgency),
      },
      {
        key: "bank",
        label: "Awaiting bank letter",
        items: mine
          .filter((f) => f.bankConfirmation === "requested" && f.reviewedAt)
          .sort(byUrgency),
      },
      {
        key: "corrections",
        label: "With institution",
        items: mine
          .filter((f) => f.stage === "correction_requested")
          .sort(byUrgency),
      },
    ]
  } else if (user.role === "authority") {
    title = "Work queue"
    sub =
      "Release and refund requests cleared by scrutiny, and escalated maturities."
    tabs = [
      {
        key: "decide",
        label: "Awaiting decision",
        items: mine
          .filter(
            (f) =>
              f.stage === "release_requested" &&
              f.release?.stage === "scrutiny_cleared",
          )
          .sort(byUrgency),
      },
      {
        key: "esc",
        label: "Escalated",
        items: mine
          .filter((f) => f.owner.label.startsWith("Escalated"))
          .sort(byUrgency),
      },
      {
        key: "pipeline",
        label: "In scrutiny",
        items: mine
          .filter(
            (f) =>
              f.stage === "release_requested" &&
              f.release?.stage === "requested",
          )
          .sort(byUrgency),
      },
    ]
  } else {
    title = "Work queue"
    sub =
      "Corrections requested, renewals coming due and decisions on your requests."
    tabs = [
      {
        key: "corr",
        label: "Corrections requested",
        items: mine
          .filter((f) => f.stage === "correction_requested")
          .sort(byUrgency),
      },
      {
        key: "renew",
        label: "Renewals due",
        items: mine
          .filter(
            (f) => f.owner.role === "institution" && f.stage === "accepted",
          )
          .sort(byUrgency),
      },
      {
        key: "wait",
        label: "With officials",
        items: mine
          .filter(
            (f) =>
              f.owner.role !== "institution" &&
              !f.owner.label.startsWith("Closed"),
          )
          .sort(byUrgency),
      },
    ]
  }
  const active = tabs[Math.min(tab, tabs.length - 1)]

  return (
    <>
      <PageHeader eyebrow={ROLE_LABEL[user.role]} title={title} sub={sub} />
      <div
        role="tablist"
        aria-label="Queue sections"
        className="mb-4 flex gap-1 overflow-x-auto rounded-lg border border-line bg-surface p-1"
      >
        {tabs.map((t, i) => (
          <button
            key={t.key}
            role="tab"
            id={`tab-${t.key}`}
            aria-selected={i === tab}
            aria-controls={`panel-${t.key}`}
            ref={(el) => {
              tabRefs.current[i] = el
            }}
            tabIndex={i === tab ? 0 : -1}
            onKeyDown={(e) => {
              // Roving tabindex: arrow keys, Home and End move both selection and focus.
              const last = tabs.length - 1
              const next =
                e.key === "ArrowRight" ? (i === last ? 0 : i + 1)
                : e.key === "ArrowLeft" ? (i === 0 ? last : i - 1)
                : e.key === "Home" ? 0
                : e.key === "End" ? last
                : null
              if (next === null) return
              e.preventDefault()
              setTab(next)
              tabRefs.current[next]?.focus()
            }}
            onClick={() => setTab(i)}
            className={cx(
              "flex shrink-0 items-center gap-2 rounded-md px-3.5 py-2 text-[13.5px] font-medium transition-colors",
              i === tab ? "bg-brand text-white" : "text-ink-3 hover:bg-paper-2",
            )}
          >
            {t.label}
            <span
              className={cx(
                "rounded-full px-1.5 text-[13px] tnum",
                i === tab ? "bg-white text-brand" : "bg-paper-2 text-muted",
              )}
            >
              {t.items.length}
            </span>
          </button>
        ))}
      </div>

      <div
        role="tabpanel"
        id={`panel-${active.key}`}
        aria-labelledby={`tab-${active.key}`}
      >
        {active.items.length === 0 ? (
          <Empty title="Queue clear">Nothing in this section right now.</Empty>
        ) : (
          <ol className="space-y-3">
            {active.items.map((f, i) => {
              const s = statusOf(f, state.fdrs, state.settings)
              const flags = openFlags(f)
              return (
                <li key={f.id}>
                  <Card
                    as="article"
                    className="transition-colors hover:border-line-strong"
                  >
                    <div className="flex flex-col gap-4 p-4 sm:p-5 lg:flex-row lg:items-center">
                      <span className="hidden size-8 shrink-0 place-items-center rounded-md bg-paper-2 font-display text-[15px] font-semibold text-muted tnum lg:grid">
                        {i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            to={`/app/fdr/${f.id}`}
                            className="text-[16px] font-semibold text-ink hover:underline"
                          >
                            {institutionName(f.institutionId)} ·{" "}
                            <span className="font-mono text-[14.5px]">
                              {maskRef(f.fdrNumber)}
                            </span>
                          </Link>
                          <Chip tone={s.tone}>{s.label}</Chip>
                        </div>
                        <p className="mt-1 text-[13px] text-muted tnum">
                          {f.bank} · {fmtINR(f.amount)} · matures{" "}
                          {fmtDate(f.maturityDate)} · in this stage {caseAge(f)}{" "}
                          days
                          {f.release &&
                            f.stage === "release_requested" &&
                            ` · ${f.release.type} requested ${fmtDate(f.release.requestedAt)}`}
                        </p>
                        {flags.length > 0 && (
                          <ul className="mt-2 flex flex-wrap gap-1.5">
                            {flags.map((fl) => (
                              <li
                                key={fl.id}
                                className="rounded bg-red-bg px-2 py-0.5 text-[13px] text-red-fg"
                              >
                                {FLAG_LABEL[fl.type]}
                              </li>
                            ))}
                          </ul>
                        )}
                        <div className="mt-3">
                          <OwnerChip fdr={f} />
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-3 lg:flex-col lg:items-end">
                        <DeadlineBadge days={urgency(f)} />
                        <Link
                          to={`/app/fdr/${f.id}`}
                          className="inline-flex h-9 items-center rounded-md bg-brand px-4 text-[13.5px] font-medium text-white hover:bg-brand-hover"
                        >
                          Open case
                        </Link>
                      </div>
                    </div>
                  </Card>
                </li>
              )
            })}
          </ol>
        )}
      </div>
    </>
  )
}
