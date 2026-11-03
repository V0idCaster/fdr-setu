import { useEffect, useRef, useState, type ReactNode } from "react"
import {
  BellRing,
  ClipboardCheck,
  HardDriveDownload,
  FilePlus2,
  FileSpreadsheet,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Menu,
  ScrollText,
  Settings2,
  TableProperties,
  X,
} from "lucide-react"
import { useStore } from "../data/store"
import { institutionName, ROLE_LABEL, visibleFdrs } from "../data/selectors"
import type { Role } from "../data/types"
import { cx } from "../lib/format"
import { Link, navigate } from "../router"
import { Wordmark } from "./Logo"
import { DISCLAIMER_TRACKING } from "./ui"

type NavItem = {
  to: string
  label: string
  icon: typeof LayoutDashboard
  roles: Role[]
  badge?: number
  /** Plain-language explanation of the badge count, shown on hover and focus. */
  hint?: string
}

export function PrototypeBanner() {
  return (
    <div className="border-b border-[#e6d3a8] bg-gold-soft text-gold-700">
      <p className="mx-auto flex max-w-[1500px] flex-wrap items-center justify-center gap-x-3 gap-y-0.5 px-4 py-1.5 text-center text-[13px] font-medium">
        <span>Illustrative prototype data · synthetic records</span>
        <span aria-hidden className="hidden sm:inline">
          |
        </span>
        <span className="tnum">Simulated date: 01 Aug 2026</span>
      </p>
    </div>
  )
}

export function Footer() {
  return (
    <footer className="border-t border-line bg-white text-[13px] text-muted">
      <div className="mx-auto flex max-w-[1500px] flex-col gap-2 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-2xl">{DISCLAIMER_TRACKING}</p>
        <p className="shrink-0 font-medium">
          Built by Team Odyssey · Smart India Hackathon 2026 ·{" "}
          <span className="tnum">SIH26265</span>
        </p>
      </div>
    </footer>
  )
}

export function AppShell({
  path,
  children,
}: {
  path: string
  children: ReactNode
}) {
  const { user, state, actions, toasts, storageError } = useStore()
  const [open, setOpen] = useState(false)
  const menuBtn = useRef<HTMLButtonElement>(null)
  const drawer = useRef<HTMLDivElement>(null)
  const wasOpen = useRef(false)
  useEffect(() => setOpen(false), [path])

  // Mobile menu: focus moves in, Tab is contained, Escape closes, focus returns to the menu button.
  useEffect(() => {
    if (!open) {
      if (wasOpen.current) menuBtn.current?.focus()
      wasOpen.current = false
      return
    }
    wasOpen.current = true
    const root = drawer.current
    const focusables = () =>
      Array.from(root?.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex]') ?? []).filter(
        (el) => el.getAttribute("tabindex") !== "-1",
      )
    focusables()[0]?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault()
        setOpen(false)
        return
      }
      if (e.key !== "Tab") return
      const list = focusables()
      if (!list.length) return
      const first = list[0]
      const last = list[list.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [open])

  if (!user) return null

  const mine = visibleFdrs(state.fdrs, user)
  const mineIds = new Set(mine.map((f) => f.id))
  const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`
  let queueCount: number
  let queueHint: string
  if (user.role === "scrutiny") {
    const toReview = mine.filter((f) => ["submitted", "under_review"].includes(f.stage)).length
    const checks = mine.filter((f) => f.stage === "release_requested" && f.release?.stage === "requested").length
    queueCount = toReview + checks
    queueHint = `${plural(queueCount, "case")} waiting on you: ${toReview} to review, ${plural(checks, "release/refund check")}.`
  } else if (user.role === "authority") {
    const decide = mine.filter((f) => f.stage === "release_requested" && f.release?.stage === "scrutiny_cleared").length
    const escalated = mine.filter((f) => f.owner.label.startsWith("Escalated")).length
    queueCount = decide + escalated
    queueHint = `${plural(decide, "request")} awaiting your decision and ${plural(escalated, "escalated maturity", "escalated maturities")}.`
  } else {
    queueCount = mine.filter((f) => f.stage === "correction_requested").length
    queueHint = `${plural(queueCount, "correction request")} waiting on your institution.`
  }
  const alertCount = state.reminders.filter(
    (r) =>
      mineIds.has(r.fdrId) &&
      (r.delivery !== "delivered" || r.escalated) &&
      !r.acknowledgedAt,
  ).length
  const alertHint = `${plural(alertCount, "reminder")} needing attention: not yet delivered, or escalated, and not acknowledged.`

  const nav: NavItem[] = [
    {
      to: "/app",
      label: "Dashboard",
      icon: LayoutDashboard,
      roles: ["institution", "scrutiny", "authority"],
    },
    {
      to: "/app/register",
      label: "FDR register",
      icon: TableProperties,
      roles: ["institution", "scrutiny", "authority"],
    },
    {
      to: "/app/submit",
      label: "Submit FDR",
      icon: FilePlus2,
      roles: ["institution"],
    },
    {
      to: "/app/queue",
      label: "Work queue",
      icon: user.role === "institution" ? ListChecks : ClipboardCheck,
      roles: ["institution", "scrutiny", "authority"],
      badge: queueCount,
      hint: queueHint,
    },
    {
      to: "/app/alerts",
      label: "Alerts centre",
      icon: BellRing,
      roles: ["institution", "scrutiny", "authority"],
      badge: alertCount,
      hint: alertHint,
    },
    {
      to: "/app/reports",
      label: "Reports",
      icon: FileSpreadsheet,
      roles: ["scrutiny", "authority"],
    },
    {
      to: "/app/audit",
      label: "Audit log",
      icon: ScrollText,
      roles: ["institution", "scrutiny", "authority"],
    },
    {
      to: "/app/settings",
      label: "Policy & security",
      icon: Settings2,
      roles: ["institution", "scrutiny", "authority"],
    },
  ]
  const items = nav.filter((n) => n.roles.includes(user.role))
  const isActive = (to: string) =>
    to === "/app" ? path === "/app" : path.startsWith(to)

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="px-5 pb-5 pt-5">
        <Link
          to="/"
          aria-label="FDR SETU home"
          className="inline-block rounded-md"
        >
          <Wordmark />
        </Link>
      </div>
      <nav aria-label="Primary" className="flex-1 px-3">
        <ul className="space-y-0.5">
          {items.map((n) => {
            const active = isActive(n.to)
            const hintId = `nav-hint-${n.to.replace(/\W/g, "")}`
            const showHint = Boolean(n.badge && n.hint)
            return (
              <li key={n.to} className="relative">
                <Link
                  to={n.to}
                  aria-current={active ? "page" : undefined}
                  aria-describedby={showHint ? hintId : undefined}
                  className={cx(
                    "group flex items-center gap-3 rounded-md px-3 py-2 text-[14px] transition-colors focus-visible:outline-gold",
                    active
                      ? "bg-gold-soft font-medium text-ink shadow-[inset_3px_0_0_var(--color-brand)]"
                      : "text-ink-3 hover:bg-paper hover:text-ink",
                  )}
                >
                  <n.icon
                    aria-hidden
                    className={cx(
                      "size-[18px]",
                      active
                        ? "text-brand"
                        : "text-muted group-hover:text-ink-3",
                    )}
                  />
                  <span className="flex-1">{n.label}</span>
                  {!!n.badge && (
                    <span aria-hidden className="min-w-6 rounded-full bg-brand px-1.5 text-center text-[13px] font-semibold text-white tnum">
                      {n.badge}
                    </span>
                  )}
                </Link>
                {showHint && (
                  <span
                    id={hintId}
                    role="tooltip"
                    className="pointer-events-none absolute left-3 right-1 top-full z-50 mt-1 hidden rounded-md border border-line-strong bg-white px-3 py-2 text-[13px] leading-snug text-ink-2 shadow-lg [li:hover>&]:block [li:has(a:focus-visible)>&]:block"
                  >
                    {n.hint}
                  </span>
                )}
              </li>
            )
          })}
        </ul>
      </nav>
      <div className="m-3 rounded-lg border border-line bg-paper p-3">
        <p className="text-[13px] font-semibold uppercase tracking-[0.12em] text-gold-700">
          {ROLE_LABEL[user.role]}
        </p>
        <p className="mt-1 text-[14px] font-medium text-ink">{user.name}</p>
        <p className="text-[13px] text-muted">
          {user.institutionId
            ? institutionName(user.institutionId)
            : user.designation}
        </p>
        <div className="mt-3 flex gap-2">
          <button
            onClick={() => navigate("/login")}
            className="flex-1 rounded-md border border-line-strong bg-white px-2 py-1.5 text-[13px] text-ink-2 hover:bg-paper-2"
          >
            Switch role
          </button>
          <button
            onClick={() => {
              actions.logout()
              navigate("/")
            }}
            className="inline-flex items-center gap-1 rounded-md border border-line-strong bg-white px-2 py-1.5 text-[13px] text-ink-2 hover:bg-paper-2"
          >
            <LogOut aria-hidden className="size-3.5" /> Sign out
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main"
        className="sr-only z-50 rounded bg-brand px-3 py-2 text-white focus:not-sr-only focus:fixed focus:left-3 focus:top-3"
      >
        Skip to content
      </a>
      <PrototypeBanner />
      {storageError && (
        <div role="alert" className="border-b border-[#efc2bf] bg-red-bg text-red-fg">
          <div className="mx-auto flex max-w-[1500px] flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2.5 text-[13.5px]">
            <HardDriveDownload aria-hidden className="size-4 shrink-0" />
            <p className="flex-1">
              <span className="font-semibold">Changes not saved.</span> {storageError} To free space, use Policy &amp; security → Reset demo
              data (demo only), or clear this site’s data in your browser settings.
            </p>
            <Link to="/app/settings" className="rounded font-semibold underline underline-offset-2">
              Open Policy &amp; security
            </Link>
          </div>
        </div>
      )}
      <div className="flex flex-1">
        <aside className="sticky top-0 hidden h-screen w-[248px] shrink-0 border-r border-line bg-white lg:block">
          {sidebar}
        </aside>

        {open && (
          <div
            ref={drawer}
            className="fixed inset-0 z-40 lg:hidden"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation"
          >
            <button
              aria-label="Close navigation"
              tabIndex={-1}
              className="absolute inset-0 bg-ink/30"
              onClick={() => setOpen(false)}
            />
            <div className="relative h-full w-[272px] bg-white shadow-xl">
              <button
                onClick={() => setOpen(false)}
                aria-label="Close navigation"
                className="absolute right-3 top-5 rounded-md p-1.5 text-muted hover:bg-paper-2"
              >
                <X className="size-5" />
              </button>
              {sidebar}
            </div>
          </div>
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
            <Wordmark />
            <button
              ref={menuBtn}
              onClick={() => setOpen(true)}
              aria-label="Open navigation"
              aria-expanded={open}
              className="rounded-md border border-line-strong p-2 text-ink hover:bg-paper-2"
            >
              <Menu className="size-5" />
            </button>
          </div>
          <main
            id="main"
            tabIndex={-1}
            className="mx-auto w-full max-w-[1320px] flex-1 px-4 py-7 sm:px-6 lg:px-8 lg:py-9"
          >
            {children}
          </main>
          <Footer />
        </div>
      </div>

      <div
        aria-live="polite"
        className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-[min(92vw,380px)] flex-col gap-2"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cx(
              "pointer-events-auto rounded-lg border px-4 py-3 text-[13.5px] shadow-lg",
              t.tone === "warn"
                ? "border-[#efd3a3] bg-[#fffaf0] text-amber-fg"
                : "border-[#bcdcc8] bg-white text-ink shadow-[inset_3px_0_0_var(--color-green-dot)]",
            )}
          >
            {t.text}
          </div>
        ))}
      </div>
    </div>
  )
}
