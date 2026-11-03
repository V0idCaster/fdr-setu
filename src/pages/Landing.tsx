import {
  ArrowRight,
  Menu,
  X,
  BellRing,
  Building2,
  CalendarClock,
  FileCheck2,
  FileSearch,
  FolderInput,
  KeyRound,
  LogIn,
  Landmark,
  Lock,
  RefreshCcw,
  ScrollText,
  ServerCog,
  Stamp,
  UserRoundCheck,
  Users,
} from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { Footer, PrototypeBanner } from "../components/AppShell"
import { scrollToSection, sectionLink } from "../lib/scroll"
import { Wordmark } from "../components/Logo"
import { StatusTag, type Status } from "../components/StatusTag"
import { Chip, DISCLAIMER_TRACKING, DISCLAIMER_UPLOAD, LinkButton } from "../components/ui"

const PROBLEMS = [
  { problem: "Scattered paper files", response: "One central repository", icon: FolderInput },
  { problem: "Missed renewals", response: "60 / 30 / 7-day reminders", icon: CalendarClock },
  { problem: "Unclear case ownership", response: "Owner and deadline on every case", icon: UserRoundCheck },
]

const STEPS = [
  { title: "Submit FDR", text: "Details and receipt upload", icon: FolderInput },
  { title: "Validate", text: "Fields, dates and file checks", icon: FileCheck2 },
  { title: "Review", text: "Accept or request correction", icon: FileSearch },
  { title: "Maturity check", text: "Reminders and escalation", icon: BellRing },
  { title: "Renew", text: "New FDR linked to old", icon: RefreshCcw },
  { title: "Release / refund", text: "Authority decision", icon: Stamp },
]

const ROLES = [
  { role: "Institution", icon: Building2, points: ["Submit and track FDRs", "Respond to corrections", "Renew or request release"] },
  { role: "Scrutiny official", icon: FileSearch, points: ["Work queue by urgency", "Flag discrepancies", "Record bank confirmation"] },
  { role: "Approving authority", icon: Landmark, points: ["Release / refund decisions", "Escalation alerts", "Reports and CSV export"] },
]

const SAFEGUARDS: { title: string; icon: typeof Users; status: Status }[] = [
  { title: "File upload checks", icon: FileCheck2, status: "working" },
  { title: "No secrets in browser", icon: KeyRound, status: "working" },
  { title: "Minimal personal data", icon: UserRoundCheck, status: "working" },
  { title: "Role-based access", icon: Users, status: "simulated" },
  { title: "Private documents and signed links", icon: Lock, status: "simulated" },
  { title: "Append-only audit", icon: ScrollText, status: "simulated" },
  { title: "Server re-check of uploads", icon: ServerCog, status: "planned" },
  { title: "Personal sign-in", icon: LogIn, status: "planned" },
]

function SectionTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="mb-8 text-center">
      <p className="mb-2 text-[13px] font-semibold uppercase tracking-[0.14em] text-gold-700">{eyebrow}</p>
      <h2 className="text-[28px] font-semibold leading-tight sm:text-[32px]">{title}</h2>
    </div>
  )
}

function HeroPreview() {
  const rows = [
    { inst: "Aarohan Tech", ref: "••••1042", meta: "Sample Bank A · 21 Aug 2026", chip: <Chip tone="amber">Renewal due · 20 days</Chip> },
    { inst: "Pragati Institute", ref: "••••7806", meta: "Sample Bank B · 14 Dec 2026", chip: <Chip tone="red">Date mismatch · review</Chip> },
    { inst: "Vidyut Polytechnic", ref: "••••7342", meta: "Sample Bank C · 05 Jan 2027", chip: <Chip tone="green">Accepted</Chip> },
  ]
  return (
    <div aria-hidden className="rounded-2xl border border-line bg-white p-5 shadow-[0_12px_40px_-16px_rgba(23,23,26,0.18)]">
      <div className="mb-4 flex items-center justify-between">
        <p className="font-display text-[16px] font-semibold">FDR register</p>
        <span className="text-[13px] text-muted tnum">01 Aug 2026</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[
          ["Active", "11"],
          ["Expiring ≤ 30d", "2"],
          ["Pending review", "2"],
        ].map(([k, v]) => (
          <div key={k} className="rounded-lg border border-line bg-paper px-3 py-2.5">
            <p className="text-[13px] text-muted">{k}</p>
            <p className="font-display text-[24px] font-semibold tnum">{v}</p>
          </div>
        ))}
      </div>
      <div className="mt-3 divide-y divide-line rounded-lg border border-line">
        {rows.map((r) => (
          <div key={r.ref} className="flex items-center justify-between gap-3 px-3 py-2.5">
            <div className="min-w-0">
              <p className="truncate text-[13px] font-medium">{r.inst}</p>
              <p className="text-[13px] text-muted tnum">
                <span className="font-mono">{r.ref}</span> · {r.meta}
              </p>
            </div>
            <div className="shrink-0">{r.chip}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

const NAV = [
  { id: "workflow", label: "Workflow" },
  { id: "roles", label: "Roles" },
  { id: "security", label: "Security" },
]

export default function Landing({ initialSection }: { initialSection?: string }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuBtn = useRef<HTMLButtonElement>(null)

  // Old-style links such as /#workflow open the landing page at that section.
  useEffect(() => {
    if (!initialSection) return
    const t = setTimeout(() => {
      scrollToSection(initialSection)
      window.history.replaceState(null, "", "#/")
    }, 0)
    return () => clearTimeout(t)
  }, [initialSection])

  useEffect(() => {
    if (!menuOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenuOpen(false)
        menuBtn.current?.focus()
      }
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [menuOpen])

  return (
    <div className="min-h-screen bg-white">
      <a href="#content" onClick={sectionLink("content")} className="sr-only z-50 rounded bg-brand px-3 py-2 text-white focus:not-sr-only focus:fixed focus:left-3 focus:top-3">
        Skip to content
      </a>
      <PrototypeBanner />
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-[1180px] items-center justify-between px-5 py-4">
          <Wordmark />
          <nav aria-label="Sections" className="hidden items-center gap-7 text-[14px] text-ink-3 md:flex">
            {NAV.map((n) => (
              <a key={n.id} href={`#${n.id}`} onClick={sectionLink(n.id)} className="hover:text-brand">
                {n.label}
              </a>
            ))}
          </nav>
<div className="flex items-center gap-2">
            <button
              ref={menuBtn}
              type="button"
              aria-expanded={menuOpen}
              aria-controls="landing-menu"
              aria-label={menuOpen ? "Close section menu" : "Open section menu"}
              onClick={() => setMenuOpen((o) => !o)}
              className="rounded-md border border-line-strong p-2 text-ink hover:bg-paper-2 md:hidden"
            >
              {menuOpen ? <X aria-hidden className="size-4" /> : <Menu aria-hidden className="size-4" />}
            </button>
            <LinkButton to="/login" size="sm">
            Sign in
          </LinkButton>
          </div>
        </div>
        {menuOpen && (
          <nav id="landing-menu" aria-label="Sections" className="border-t border-line bg-white px-5 py-2 md:hidden">
            <ul>
              {NAV.map((n) => (
                <li key={n.id}>
                  <a
                    href={`#${n.id}`}
                    onClick={sectionLink(n.id, () => setMenuOpen(false))}
                    className="block rounded-md px-2 py-2.5 text-[15px] font-medium text-ink-2 hover:bg-paper hover:text-brand"
                  >
                    {n.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        )}
        <div aria-hidden className="h-[3px] bg-gradient-to-r from-gold-600 via-gold to-gold-600" />
      </header>

      <main id="content" className="scroll-mt-6 outline-none">
        <section className="border-b border-line bg-gradient-to-b from-[#fbf8f1] to-white">
          <div className="mx-auto grid max-w-[1180px] items-center gap-12 px-5 py-16 lg:grid-cols-2 lg:py-20">
            <div>
              <p className="mb-4 text-[13px] font-semibold uppercase tracking-[0.14em] text-gold-700">
                Security Deposit &amp; FDR Management Portal
              </p>
              <h1 className="text-[38px] font-semibold leading-[1.1] tracking-[-0.02em] sm:text-[48px]">
                One instrument. One evidence trail. <span className="text-brand">Every deadline visible.</span>
              </h1>
              <p className="mt-5 max-w-lg text-[17px] leading-relaxed text-ink-3">
                Submit, review, monitor, renew and release FDRs in one secure workflow.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <LinkButton to="/login" size="lg">
                  Sign in to portal <ArrowRight aria-hidden className="size-4" />
                </LinkButton>
                <a
                  href="#workflow"
                  onClick={sectionLink("workflow")}
                  className="inline-flex h-12 items-center rounded-md border border-line-strong bg-white px-6 text-[15px] font-medium text-ink hover:bg-paper"
                >
                  How it works
                </a>
              </div>
            </div>
            <HeroPreview />
          </div>
        </section>

        <section className="mx-auto max-w-[1180px] px-5 py-16">
          <SectionTitle eyebrow="Problem → Response" title="What FDR SETU fixes" />
          <ul className="grid gap-4 md:grid-cols-3">
            {PROBLEMS.map((p) => (
              <li key={p.problem} className="rounded-xl border border-line bg-white p-5">
                <p className="text-[14px] text-muted line-through decoration-line-strong">{p.problem}</p>
                <p className="mt-3 flex items-center gap-3 text-[16px] font-semibold text-ink">
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-gold-soft text-gold-700">
                    <p.icon aria-hidden className="size-[18px]" />
                  </span>
                  {p.response}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <section id="workflow" className="scroll-mt-6 border-y border-line bg-paper outline-none">
          <div className="mx-auto max-w-[1180px] px-5 py-16">
            <SectionTitle eyebrow="Workflow" title="Six stages, one record" />
            <ol className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {STEPS.map((s, i) => (
                <li key={s.title} className="relative rounded-xl border border-line bg-white p-4 text-center">
                  <span className="mx-auto mb-3 grid size-11 place-items-center rounded-full border border-[#e6d3a8] bg-gold-soft text-gold-700">
                    <s.icon aria-hidden className="size-5" />
                  </span>
                  <p className="text-[13px] font-semibold text-muted tnum">STEP {i + 1}</p>
                  <h3 className="mt-0.5 text-[16px] font-semibold">{s.title}</h3>
                  <p className="mt-1 text-[13px] text-muted">{s.text}</p>
                  {i < STEPS.length - 1 && (
                    <ArrowRight aria-hidden className="absolute -right-[13px] top-1/2 z-10 hidden size-4 -translate-y-1/2 text-gold-600 lg:block" />
                  )}
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="roles" className="mx-auto max-w-[1180px] scroll-mt-6 px-5 py-16 outline-none">
          <SectionTitle eyebrow="Roles" title="Who uses it" />
          <div className="grid gap-4 md:grid-cols-3">
            {ROLES.map((r) => (
              <article key={r.role} className="rounded-xl border border-line bg-white p-6">
                <div className="mb-4 flex items-center gap-3">
                  <span className="grid size-10 place-items-center rounded-lg bg-gold-soft text-gold-700">
                    <r.icon aria-hidden className="size-5" />
                  </span>
                  <h3 className="text-[19px] font-semibold">{r.role}</h3>
                </div>
                <ul className="space-y-2">
                  {r.points.map((p) => (
                    <li key={p} className="flex items-center gap-2.5 text-[14.5px] text-ink-3">
                      <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-gold-600" />
                      {p}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        <section id="security" className="scroll-mt-6 border-t border-line bg-paper outline-none">
          <div className="mx-auto max-w-[1180px] px-5 py-16">
            <SectionTitle eyebrow="Security" title="Built-in safeguards" />
            <p className="mb-4 text-center text-[13.5px] text-muted">
              Status in this prototype. “Simulated” means imitated in the browser and not yet enforced by a server.
            </p>
            <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {SAFEGUARDS.map((s) => (
                <li key={s.title} className="flex flex-col items-center gap-2 rounded-xl border border-line bg-white px-3 py-5 text-center">
                  <s.icon aria-hidden className="size-5 text-gold-700" />
                  <span className="text-[13.5px] font-medium text-ink">{s.title}</span>
                  <StatusTag status={s.status} compact />
                </li>
              ))}
            </ul>
            <p className="mt-5 text-center text-[13px] text-muted">
              AICTE and bank API integrations: <span className="font-medium text-ink-3">Future, with formal authorization</span>
            </p>
            <div className="mx-auto mt-8 max-w-3xl space-y-1.5 rounded-xl border border-line bg-white px-5 py-4 text-center text-[13px] text-muted">
              <p>{DISCLAIMER_TRACKING}</p>
              <p>{DISCLAIMER_UPLOAD}</p>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
