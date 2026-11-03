import { useState } from "react"
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  FileSearch,
  Landmark,
  LockKeyhole,
} from "lucide-react"
import { PrototypeBanner } from "../components/AppShell"
import { Wordmark } from "../components/Logo"
import { Button, Disclaimer } from "../components/ui"
import { useStore } from "../data/store"
import { USERS } from "../data/seed"
import { institutionName, ROLE_LABEL } from "../data/selectors"
import { cx } from "../lib/format"
import { Link, navigate } from "../router"

const ICON = {
  institution: Building2,
  scrutiny: FileSearch,
  authority: Landmark,
}
const SCOPE = {
  institution:
    "Submit, correct, renew and request release — own institution only.",
  scrutiny:
    "Review submissions, raise discrepancies, record bank confirmation.",
  authority: "Decide release or refund; reports across all institutions.",
}

export default function Login() {
  const { actions, user } = useStore()
  const [pick, setPick] = useState(user?.id ?? USERS[0].id)

  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <PrototypeBanner />
      <div className="grid flex-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,560px)]">
        <aside className="relative hidden overflow-hidden border-r border-line bg-paper p-12 text-ink lg:flex lg:flex-col lg:justify-between">
          <Wordmark />
          <div className="max-w-md">
            <p className="font-display text-[38px] font-semibold leading-[1.1]">
              One instrument. One evidence trail.{" "}
              <span className="text-brand">Every deadline visible.</span>
            </p>
            <p className="mt-5 text-[15px] leading-relaxed text-muted">
              Access is scoped by role. Institution users see only their own
              records; officials see the cases assigned to their desk.
            </p>
          </div>
          <p className="text-[13px] text-muted">
            Built by Team Odyssey · Smart India Hackathon 2026 · SIH26265
          </p>
          <svg
            aria-hidden
            viewBox="0 0 400 200"
            className="pointer-events-none absolute -right-20 bottom-24 w-[560px] opacity-[0.10]"
          >
            <path
              d="M10 180 C 90 40, 310 40, 390 180"
              fill="none"
              stroke="#c9a45c"
              strokeWidth="3"
            />
            <path d="M10 185 H390" stroke="#2b2a27" strokeWidth="2" />
            {[60, 110, 160, 200, 240, 290, 340].map((x) => (
              <path
                key={x}
                d={`M${x} 185 V ${185 - 120 * Math.sin((Math.PI * (x - 10)) / 380)}`}
                stroke="#2b2a27"
                strokeWidth="1.5"
              />
            ))}
          </svg>
        </aside>

        <main className="flex items-center justify-center px-5 py-10 sm:px-10">
          <div className="w-full max-w-[460px]">
            <Link
              to="/"
              className="mb-8 inline-flex items-center gap-1.5 text-[13px] text-muted hover:text-ink"
            >
              <ArrowLeft aria-hidden className="size-3.5" /> Back to overview
            </Link>
            <div className="mb-6 lg:hidden">
              <Wordmark />
            </div>
            <h1 className="text-[30px] font-semibold">Sign in</h1>
            <p className="mt-1.5 text-[14.5px] text-muted">
              Choose a synthetic demo account to explore each role.
            </p>

            <form
              className="mt-6"
              onSubmit={(e) => {
                e.preventDefault()
                actions.login(pick)
                navigate("/app")
              }}
            >
              <fieldset>
                <legend className="mb-2 text-[13px] font-medium text-ink-2">
                  Demo account
                </legend>
                <div className="space-y-2">
                  {USERS.map((u) => {
                    const Icon = ICON[u.role]
                    const on = pick === u.id
                    return (
                      <label
                        key={u.id}
                        className={cx(
                          "flex cursor-pointer items-start gap-3 rounded-lg border bg-surface px-4 py-3 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-gold-600",
                          on
                            ? "border-brand ring-1 ring-brand"
                            : "border-line hover:border-line-strong",
                        )}
                      >
                        <input
                          type="radio"
                          name="account"
                          value={u.id}
                          checked={on}
                          onChange={() => setPick(u.id)}
                          className="sr-only"
                        />
                        <span
                          className={cx(
                            "grid size-9 shrink-0 place-items-center rounded-md",
                            on ? "bg-brand text-white" : "bg-paper-2 text-ink-3",
                          )}
                        >
                          <Icon aria-hidden className="size-[18px]" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-baseline justify-between gap-x-2">
                            <span className="text-[14.5px] font-semibold text-ink">
                              {u.name}
                              <span className="font-normal text-muted">
                                {" "}
                                ·{" "}
                                {u.institutionId
                                  ? institutionName(u.institutionId)
                                  : u.designation}
                              </span>
                            </span>
                            <span className="text-[13px] font-semibold uppercase tracking-[0.1em] text-gold-700">
                              {ROLE_LABEL[u.role]}
                            </span>
                          </span>
                          <span className="mt-0.5 block text-[13px] leading-snug text-muted">
                            {SCOPE[u.role]}
                          </span>
                        </span>
                      </label>
                    )
                  })}
                </div>
              </fieldset>
              <Button type="submit" size="lg" className="mt-5 w-full">
                Continue <ArrowRight aria-hidden className="size-4" />
              </Button>
            </form>

            <Disclaimer className="mt-6">
              <span className="inline-flex items-center gap-1.5 font-semibold">
                <LockKeyhole aria-hidden className="size-3.5" /> Production
                sign-in
              </span>
              <br />
              Live deployments authenticate through Supabase Auth. Roles and
              institution scope are read from a server-side profile table and
              enforced by Row Level Security — never chosen in the browser as
              they are in this demo.
            </Disclaimer>
          </div>
        </main>
      </div>
    </div>
  )
}
