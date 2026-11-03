import { useEffect, useRef, useState } from "react"
import { ArrowDown, ArrowUp, ArrowUpDown, Check, Download, RotateCcw, Search } from "lucide-react"
import { useStore } from "../data/store"
import { BANKS, INSTITUTIONS } from "../data/seed"
import { CLOSED, institutionName, openFlags, statusOf, visibleFdrs, type Tone } from "../data/selectors"
import type { Fdr, Settings } from "../data/types"
import { daysUntil, fmtDate } from "../lib/dates"
import { cx, downloadCsv, fmtINR, maskRef } from "../lib/format"
import { Button, Card, Chip, Empty, inputCls, LinkButton, PageHeader } from "../components/ui"
import { EvidenceIndicators, EvidenceLegend, evidenceStates } from "../components/Provenance"
import { Link } from "../router"

const FILTERS = {
  all: { label: "All statuses", test: () => true },
  expiring: {
    label: "Expiring ≤ 30 days",
    test: (f: Fdr) => f.stage !== "release_requested" && daysUntil(f.maturityDate) >= 0 && daysUntil(f.maturityDate) <= 30,
  },
  review: { label: "Pending review", test: (f: Fdr) => f.stage === "submitted" || f.stage === "under_review" },
  discrepancy: { label: "Discrepancy open", test: (f: Fdr) => openFlags(f).length > 0 },
  release: { label: "Release / refund pending", test: (f: Fdr) => f.stage === "release_requested" },
} as const
type FilterKey = keyof typeof FILTERS

type SortKey = "institution" | "ref" | "bank" | "amount" | "maturity" | "deadline" | "evidence" | "status"
type Sort = { key: SortKey; dir: "asc" | "desc" }
type Prefs = { filter: FilterKey; bank: string; inst: string; showClosed: boolean; sort: Sort }

const SORT_LABEL: Record<SortKey, string> = {
  institution: "Institution",
  ref: "FDR ref",
  bank: "Issuing bank",
  amount: "Amount",
  maturity: "Maturity",
  deadline: "Next deadline",
  evidence: "Evidence",
  status: "Status",
}

const PREFS_KEY = "fdr-setu-register-prefs-v1"
const PAGE_SIZE = 25

/** Page numbers to show: first, last, and the current page with one neighbour each side. */
function pageList(current: number, count: number): (number | "gap")[] {
  const want = new Set([1, count, current - 1, current, current + 1].filter((n) => n >= 1 && n <= count))
  const sorted = [...want].sort((a, b) => a - b)
  const out: (number | "gap")[] = []
  sorted.forEach((n, i) => {
    if (i > 0 && n - sorted[i - 1] > 1) out.push("gap")
    out.push(n)
  })
  return out
}

function Pager({ current, count, total, first, onGo }: { current: number; count: number; total: number; first: number; onGo: (n: number) => void }) {
  const btn = "inline-flex h-8 min-w-8 items-center justify-center rounded-md border px-2 text-[13px] font-medium tnum"
  return (
    <nav aria-label="Register pages" className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-4 py-2.5">
      <p className="text-[13px] text-muted tnum">
        Showing {first + 1}–{Math.min(first + PAGE_SIZE, total)} of {total}
      </p>
      <ul className="flex flex-wrap items-center gap-1">
        <li>
          <button type="button" className={cx(btn, "border-line-strong bg-white text-ink-2 hover:bg-paper disabled:opacity-45")} disabled={current === 1} onClick={() => onGo(current - 1)}>
            Previous
          </button>
        </li>
        {pageList(current, count).map((n, i) =>
          n === "gap" ? (
            <li key={`gap-${i}`} aria-hidden className="px-1 text-muted">
              …
            </li>
          ) : (
            <li key={n}>
              <button
                type="button"
                aria-current={n === current ? "page" : undefined}
                aria-label={`Page ${n}`}
                onClick={() => onGo(n)}
                className={cx(btn, n === current ? "border-brand bg-brand text-white" : "border-line-strong bg-white text-ink-2 hover:bg-paper")}
              >
                {n}
              </button>
            </li>
          ),
        )}
        <li>
          <button type="button" className={cx(btn, "border-line-strong bg-white text-ink-2 hover:bg-paper disabled:opacity-45")} disabled={current === count} onClick={() => onGo(current + 1)}>
            Next
          </button>
        </li>
      </ul>
    </nav>
  )
}
const DEFAULT_PREFS: Prefs = { filter: "all", bank: "", inst: "", showClosed: false, sort: { key: "deadline", dir: "asc" } }

function loadPrefs(urlFilter: string | null): Prefs {
  let p = DEFAULT_PREFS
  try {
    const raw = JSON.parse(localStorage.getItem(PREFS_KEY) ?? "null")
    if (raw && typeof raw === "object") {
      p = {
        filter: raw.filter in FILTERS ? raw.filter : "all",
        bank: BANKS.includes(raw.bank) ? raw.bank : "",
        inst: INSTITUTIONS.some((i) => i.id === raw.inst) ? raw.inst : "",
        showClosed: raw.showClosed === true,
        sort: raw.sort?.key in SORT_LABEL && ["asc", "desc"].includes(raw.sort?.dir) ? raw.sort : DEFAULT_PREFS.sort,
      }
    }
  } catch {
    /* ignore corrupt prefs */
  }
  // A dashboard link (e.g. ?filter=expiring) overrides the remembered filter.
  if (urlFilter && urlFilter in FILTERS) p = { ...p, filter: urlFilter as FilterKey }
  return p
}

const TONE_RANK: Record<Tone, number> = { red: 0, amber: 1, slate: 2, green: 3, neutral: 4 }
const isClosed = (f: Fdr) => CLOSED.includes(f.stage)
const deadlineDays = (f: Fdr) => (isClosed(f) ? Number.POSITIVE_INFINITY : daysUntil(f.owner.deadline))
const evidenceScore = (f: Fdr) => Object.values(evidenceStates(f)).filter((s) => s === "done").length

function compare(a: Fdr, b: Fdr, key: SortKey, all: Fdr[], settings: Settings) {
  switch (key) {
    case "institution":
      return institutionName(a.institutionId).localeCompare(institutionName(b.institutionId))
    case "ref":
      return a.fdrNumber.slice(-4).localeCompare(b.fdrNumber.slice(-4))
    case "bank":
      return a.bank.localeCompare(b.bank) || a.branch.localeCompare(b.branch)
    case "amount":
      return a.amount - b.amount
    case "maturity":
      return new Date(a.maturityDate).getTime() - new Date(b.maturityDate).getTime()
    case "deadline": {
      const x = deadlineDays(a)
      const y = deadlineDays(b)
      return x === y ? 0 : x < y ? -1 : 1
    }
    case "evidence":
      return evidenceScore(a) - evidenceScore(b)
    case "status": {
      const sa = statusOf(a, all, settings)
      const sb = statusOf(b, all, settings)
      return TONE_RANK[sa.tone] - TONE_RANK[sb.tone] || sa.label.localeCompare(sb.label)
    }
  }
}

function SortHeader({ k, sort, onSort, align }: { k: SortKey; sort: Sort; onSort: (k: SortKey) => void; align?: "right" }) {
  const active = sort.key === k
  const Icon = !active ? ArrowUpDown : sort.dir === "asc" ? ArrowUp : ArrowDown
  return (
    <th
      scope="col"
      aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
      className={cx("px-3 py-2 font-semibold", align === "right" && "text-right")}
    >
      <button
        type="button"
        onClick={() => onSort(k)}
        className={cx("-mx-1 inline-flex items-center gap-1 whitespace-nowrap rounded px-1 py-0.5 text-[13px] hover:text-ink", active && "text-ink")}
      >
        {SORT_LABEL[k]}
        <Icon aria-hidden className={cx("size-3", !active && "opacity-40")} />
      </button>
    </th>
  )
}

function DeadlineCell({ f }: { f: Fdr }) {
  if (isClosed(f)) return <span className="text-[13px] text-muted">Closed</span>
  const d = daysUntil(f.owner.deadline)
  return (
    <div className="leading-tight">
      <p className="text-ink-2 tnum">{fmtDate(f.owner.deadline)}</p>
      <p className={cx("text-[13px] font-medium tnum", d <= 3 ? "text-red-fg" : d <= 10 ? "text-amber-fg" : "text-muted")}>
        {d < 0 ? `Overdue ${-d}d` : d === 0 ? "Due today" : `In ${d}d`}
      </p>
      <p className="mt-0.5 max-w-[150px] truncate text-[13px] text-muted" title={f.owner.label}>
        {f.owner.label}
      </p>
    </div>
  )
}

export default function Register({ query }: { query: URLSearchParams }) {
  const { state, user } = useStore()
  const [prefs, setPrefs] = useState<Prefs>(() => loadPrefs(query.get("filter")))
  const [q, setQ] = useState("")
  const [page, setPage] = useState(1)
  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(prefs))
    } catch {
      /* Preferences are a convenience; the store reports storage problems. */
    }
  }, [prefs])

  // Any change to filters or sort returns to the first page.
  const update = (patch: Partial<Prefs>) => {
    setPrefs((p) => ({ ...p, ...patch }))
    setPage(1)
  }
  const onSort = (key: SortKey) =>
    update({ sort: prefs.sort.key === key ? { key, dir: prefs.sort.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" } })

  const mine = visibleFdrs(state.fdrs, user)
  const official = user?.role !== "institution"
  const needle = q.trim().toLowerCase()
  const matching = mine
    .filter(FILTERS[prefs.filter].test)
    .filter((f) => !prefs.bank || f.bank === prefs.bank)
    .filter((f) => !official || !prefs.inst || f.institutionId === prefs.inst)
    .filter((f) => {
      if (!needle) return true
      const s = statusOf(f, state.fdrs, state.settings).label
      return [institutionName(f.institutionId), f.fdrNumber.slice(-4), f.bank, f.branch, s, f.owner.label].join(" ").toLowerCase().includes(needle)
    })
  const closedCount = matching.filter(isClosed).length
  const dir = prefs.sort.dir === "asc" ? 1 : -1
  const rows = matching
    .filter((f) => prefs.showClosed || !isClosed(f))
    .sort((a, b) => dir * compare(a, b, prefs.sort.key, state.fdrs, state.settings) || compare(a, b, "deadline", state.fdrs, state.settings))
  const customised = JSON.stringify({ ...prefs, inst: official ? prefs.inst : "" }) !== JSON.stringify(DEFAULT_PREFS)

  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE))
  const current = Math.min(page, pageCount)
  const first = (current - 1) * PAGE_SIZE
  const pageRows = rows.slice(first, first + PAGE_SIZE)
  const goTo = (n: number) => {
    setPage(n)
    cardRef.current?.scrollIntoView({ block: "start", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" })
  }

  if (!user) return null

  const exportCsv = () =>
    downloadCsv("fdr-register.csv", [
      ["Institution", "FDR (masked)", "Bank", "Branch", "Amount (INR)", "Maturity date", "Next deadline", "Owner", "Submitted", "Reviewed", "Bank-confirmed", "Status"],
      ...rows.map((f) => {
        const ev = evidenceStates(f)
        return [
          institutionName(f.institutionId),
          maskRef(f.fdrNumber),
          f.bank,
          f.branch,
          f.amount,
          fmtDate(f.maturityDate),
          isClosed(f) ? "Closed" : fmtDate(f.owner.deadline),
          f.owner.label,
          ev.submitted,
          ev.reviewed,
          ev.bank,
          statusOf(f, state.fdrs, state.settings).label,
        ]
      }),
    ])

  return (
    <>
      <PageHeader
        eyebrow="Register"
        title="FDR register"
        sub={
          user.role === "institution"
            ? `Instruments lodged by ${institutionName(user.institutionId!)}, nearest deadline first.`
            : "Active instruments across institutions, nearest deadline first. FDR numbers are always displayed masked."
        }
        actions={
          <>
            <Button variant="secondary" onClick={exportCsv}>
              <Download aria-hidden className="size-4" /> Export CSV
            </Button>
            {user.role === "institution" && <LinkButton to="/app/submit">Submit FDR</LinkButton>}
          </>
        }
      />

      <div ref={cardRef} className="scroll-mt-6">
      <Card>
        <div className="flex flex-col gap-3 border-b border-line p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <label htmlFor="reg-search" className="sr-only">
                Search register
              </label>
              <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
              <input
                id="reg-search"
                type="search"
                value={q}
                onChange={(e) => {
                  setQ(e.target.value)
                  setPage(1)
                }}
                placeholder="Search institution, last 4 digits, bank, branch, status or owner"
                className={`${inputCls} pl-9`}
              />
            </div>
            <div className="grid grid-cols-2 gap-2 sm:flex">
              <label className="sr-only" htmlFor="reg-filter">
                Status
              </label>
              <select id="reg-filter" value={prefs.filter} onChange={(e) => update({ filter: e.target.value as FilterKey })} className={`${inputCls} sm:w-48`}>
                {Object.entries(FILTERS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.label}
                  </option>
                ))}
              </select>
              <label className="sr-only" htmlFor="reg-bank">
                Bank
              </label>
              <select id="reg-bank" value={prefs.bank} onChange={(e) => update({ bank: e.target.value })} className={`${inputCls} sm:w-40`}>
                <option value="">All banks</option>
                {BANKS.map((b) => (
                  <option key={b}>{b}</option>
                ))}
              </select>
              {official && (
                <>
                  <label className="sr-only" htmlFor="reg-inst">
                    Institution
                  </label>
                  <select id="reg-inst" value={prefs.inst} onChange={(e) => update({ inst: e.target.value })} className={`${inputCls} col-span-2 sm:w-52`}>
                    <option value="">All institutions</option>
                    {INSTITUTIONS.map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.name}
                      </option>
                    ))}
                  </select>
                </>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <button
              type="button"
              aria-pressed={prefs.showClosed}
              onClick={() => update({ showClosed: !prefs.showClosed })}
              className={cx(
                "inline-flex h-8 items-center gap-2 rounded-md border px-3 text-[13px] font-medium transition-colors",
                prefs.showClosed ? "border-brand bg-gold-soft text-ink" : "border-line-strong bg-white text-ink-3 hover:bg-paper",
              )}
            >
              <span
                aria-hidden
                className={cx("grid size-4 place-items-center rounded-[3px] border", prefs.showClosed ? "border-brand bg-brand text-white" : "border-line-strong")}
              >
                {prefs.showClosed && <Check className="size-3" />}
              </span>
              Show closed <span className="tnum">({closedCount})</span>
            </button>

            <div className="flex items-center gap-2 md:hidden">
              <label htmlFor="reg-sort" className="text-[13px] text-muted">
                Sort
              </label>
              <select
                id="reg-sort"
                value={`${prefs.sort.key}:${prefs.sort.dir}`}
                onChange={(e) => {
                  const [key, d] = e.target.value.split(":") as [SortKey, Sort["dir"]]
                  update({ sort: { key, dir: d } })
                }}
                className={`${inputCls} h-8 w-auto py-0 text-[13px]`}
              >
                {(Object.keys(SORT_LABEL) as SortKey[]).flatMap((k) => [
                  <option key={`${k}:asc`} value={`${k}:asc`}>
                    {SORT_LABEL[k]} ↑
                  </option>,
                  <option key={`${k}:desc`} value={`${k}:desc`}>
                    {SORT_LABEL[k]} ↓
                  </option>,
                ])}
              </select>
            </div>

            {customised && (
              <button
                type="button"
                onClick={() => {
                  setPrefs(DEFAULT_PREFS)
                  setPage(1)
                }}
                className="inline-flex items-center gap-1.5 rounded px-1 text-[13px] font-medium text-gold-700 hover:underline"
              >
                <RotateCcw aria-hidden className="size-3.5" /> Reset view
              </button>
            )}
            <div className="ml-auto hidden md:block">
              <EvidenceLegend />
            </div>
          </div>
        </div>
        <p className="sr-only" aria-live="polite">
          {rows.length} instruments match, sorted by {SORT_LABEL[prefs.sort.key]} {prefs.sort.dir === "asc" ? "ascending" : "descending"}
          {pageCount > 1 && `. Page ${current} of ${pageCount}.`}
        </p>

        {rows.length === 0 ? (
          <div className="p-6">
            <Empty title="No instruments match">
              {closedCount > 0 && !prefs.showClosed ? `${closedCount} closed instrument(s) match — use “Show closed”.` : "Try clearing a filter or searching by the last four digits."}
            </Empty>
          </div>
        ) : (
          <>
            <ul className="divide-y divide-line md:hidden">
              {pageRows.map((f) => {
                const s = statusOf(f, state.fdrs, state.settings)
                return (
                  <li key={f.id}>
                    <Link to={`/app/fdr/${f.id}`} className="block px-4 py-3.5 hover:bg-paper">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-[14.5px] font-medium text-ink">{institutionName(f.institutionId)}</p>
                        <span className="font-mono text-[13px] text-ink-2">{maskRef(f.fdrNumber)}</span>
                      </div>
                      <p className="mt-0.5 text-[13px] text-muted tnum">
                        {f.bank} · {fmtINR(f.amount)} · matures {fmtDate(f.maturityDate)}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <Chip tone={s.tone}>{s.label}</Chip>
                        {!isClosed(f) && <span className="text-[13px] text-muted tnum">Next deadline {fmtDate(f.owner.deadline)}</span>}
                      </div>
                      <div className="mt-2">
                        <EvidenceIndicators fdr={f} inline />
                      </div>
                    </Link>
                  </li>
                )
              })}
            </ul>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[1000px] text-left text-[13.5px]">
                <caption className="sr-only">
                  FDR register, sorted by {SORT_LABEL[prefs.sort.key]}. Column headers are sort buttons.
                </caption>
                <thead>
                  <tr className="border-b border-line bg-paper text-muted">
                    <SortHeader k="institution" sort={prefs.sort} onSort={onSort} />
                    <SortHeader k="ref" sort={prefs.sort} onSort={onSort} />
                    <SortHeader k="bank" sort={prefs.sort} onSort={onSort} />
                    <SortHeader k="amount" sort={prefs.sort} onSort={onSort} align="right" />
                    <SortHeader k="maturity" sort={prefs.sort} onSort={onSort} />
                    <SortHeader k="deadline" sort={prefs.sort} onSort={onSort} />
                    <SortHeader k="evidence" sort={prefs.sort} onSort={onSort} />
                    <SortHeader k="status" sort={prefs.sort} onSort={onSort} />
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {pageRows.map((f) => {
                    const s = statusOf(f, state.fdrs, state.settings)
                    const closed = isClosed(f)
                    return (
                      <tr key={f.id} className={cx("group relative align-top hover:bg-paper", closed && "bg-paper/50")}>
                        <td className="px-3 py-3">
                          <span className={cx("block max-w-[170px]", closed ? "text-muted" : "font-medium text-ink")}>{institutionName(f.institutionId)}</span>
                        </td>
                        <td className="px-3 py-3">
                          <Link
                            to={`/app/fdr/${f.id}`}
                            className="font-mono font-medium text-ink underline decoration-line-strong underline-offset-4 after:absolute after:inset-0 group-hover:decoration-gold-600"
                          >
                            {maskRef(f.fdrNumber)}
                            <span className="sr-only">, open case</span>
                          </Link>
                          {f.previousFdrId && <span className="ml-2 text-[13px] text-muted">renewal</span>}
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 text-ink-3">
                          {f.bank}
                          <span className="block text-[13px] text-muted">{f.branch}</span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 text-right text-ink-2 tnum">{fmtINR(f.amount)}</td>
                        <td className="whitespace-nowrap px-3 py-3 text-ink-2 tnum">{fmtDate(f.maturityDate)}</td>
                        <td className="px-3 py-3">
                          <DeadlineCell f={f} />
                        </td>
                        <td className="px-3 py-3">
                          <EvidenceIndicators fdr={f} />
                        </td>
                        <td className="px-3 py-3">
                          <Chip tone={s.tone} className="max-w-[180px] whitespace-normal!">
                            {s.label}
                          </Chip>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
        {pageCount > 1 && <Pager current={current} count={pageCount} total={rows.length} first={first} onGo={goTo} />}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-4 py-2.5 text-[13px] text-muted tnum">
          <span>
            {rows.length} matching{!prefs.showClosed && closedCount > 0 && ` · ${closedCount} closed hidden`} · {mine.length} total
          </span>
          <span>Total of matching {fmtINR(rows.reduce((s, f) => s + f.amount, 0))}</span>
        </div>
      </Card>
      </div>
    </>
  )
}
