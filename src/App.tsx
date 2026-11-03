import { useEffect } from "react"
import { AppShell, Footer, PrototypeBanner } from "./components/AppShell"
import { ErrorBoundary } from "./components/ErrorBoundary"
import { ErrorScreen } from "./components/ErrorScreen"
import { LANDING_SECTIONS } from "./lib/scroll"
import { StoreProvider, useStore } from "./data/store"
import { match, navigate, useRoute } from "./router"
import AuditLog from "./pages/AuditLog"
import Alerts from "./pages/Alerts"
import Dashboard from "./pages/Dashboard"
import FdrDetail from "./pages/FdrDetail"
import Landing from "./pages/Landing"
import Login from "./pages/Login"
import Queue from "./pages/Queue"
import Register from "./pages/Register"
import Reports from "./pages/Reports"
import Settings from "./pages/Settings"
import SubmitFdr from "./pages/SubmitFdr"

function Routes() {
  const path = useRoute()
  const { user } = useStore()
  const [base, qs] = path.split("?")
  const query = new URLSearchParams(qs ?? "")
  const inApp = base.startsWith("/app")

  useEffect(() => {
    if (inApp && !user) navigate("/login")
  }, [inApp, user])

  useEffect(() => {
    document.title = "FDR SETU · Security Deposit & FDR Management"
  }, [])

  if (!inApp) {
    if (base === "/login") return <Login />
    if (base === "/" || base === "") return <Landing />
    // In-page anchors (e.g. /#workflow) belong to the landing page, not to the router.
    if ((LANDING_SECTIONS as readonly string[]).includes(base)) return <Landing initialSection={base} />
    return (
      <div className="flex min-h-screen flex-col bg-paper">
        <PrototypeBanner />
        <main id="main" className="flex-1">
          <ErrorScreen title="Page not found" actions={[{ to: "/", label: "Back to home", primary: true }, { to: "/login", label: "Sign in" }]}>
            There is no page at <code className="rounded bg-paper-2 px-1.5 py-0.5 font-mono text-[14px]">{base}</code>. Check the address, or
            go back to the FDR SETU home page.
          </ErrorScreen>
        </main>
        <Footer />
      </div>
    )
  }
  if (!user) return null

  let page
  let p: Record<string, string> | null
  if (base === "/app") page = <Dashboard />
  else if (base === "/app/register") page = <Register key={qs} query={query} />
  else if (base === "/app/submit") page = <SubmitFdr />
  else if ((p = match("/app/renew/:id", base)))
    page = <SubmitFdr key={p.id} renewId={p.id} />
  else if ((p = match("/app/fdr/:id", base))) page = <FdrDetail id={p.id} />
  else if (base === "/app/queue") page = <Queue key={user.id} />
  else if (base === "/app/alerts") page = <Alerts />
  else if (base === "/app/reports") page = <Reports />
  else if (base === "/app/audit") page = <AuditLog />
  else if (base === "/app/settings") page = <Settings />
  else
    page = (
      <ErrorScreen
        title="Page not found"
        actions={[
          { to: "/app", label: "Go to dashboard", primary: true },
          { to: "/app/register", label: "Open FDR register" },
        ]}
      >
        There is no page at <code className="rounded bg-paper-2 px-1.5 py-0.5 font-mono text-[14px]">{base}</code>. It may have been moved,
        or the address may be mistyped.
      </ErrorScreen>
    )

  return <AppShell path={base}>{page}</AppShell>
}

export default function App() {
  return (
    <ErrorBoundary>
      <StoreProvider>
        <Routes />
      </StoreProvider>
    </ErrorBoundary>
  )
}
