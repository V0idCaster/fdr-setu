import { Component, type ReactNode } from "react"
import { RotateCcw, RefreshCw, TriangleAlert } from "lucide-react"

const DEMO_KEYS = ["fdr-setu-prototype-v2", "fdr-setu-register-prefs-v1"]

type State = { error: Error | null; confirmReset: boolean }

/**
 * Catches render errors anywhere in the app. Deliberately independent of the store,
 * so it still works when stored demo data is what caused the crash.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null, confirmReset: false }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error }
  }


  // A crash during the very first render lands here rather than in componentDidUpdate.
  componentDidMount() {
    if (this.state.error) document.getElementById("crash-title")?.focus()
  }

  componentDidUpdate(_: unknown, prev: State) {
    if (!prev.error && this.state.error) document.getElementById("crash-title")?.focus()
  }

  reset = () => {
    try {
      DEMO_KEYS.forEach((k) => localStorage.removeItem(k))
    } catch {
      /* storage unavailable; reload anyway */
    }
    window.location.hash = "/login"
    window.location.reload()
  }

  render() {
    const { error, confirmReset } = this.state
    if (!error) return this.props.children
    const btn = "inline-flex h-10 items-center justify-center gap-2 rounded-md px-4 text-sm font-medium"
    return (
      <div className="min-h-screen bg-paper">
        <div className="border-b border-[#e6d3a8] bg-gold-soft px-4 py-1.5 text-center text-[13px] font-medium text-gold-700">
          Illustrative prototype data · synthetic records
        </div>
        <main className="mx-auto flex max-w-xl flex-col items-center px-4 py-20 text-center">
          <span className="grid size-14 place-items-center rounded-2xl bg-red-bg text-red-fg">
            <TriangleAlert aria-hidden className="size-7" />
          </span>
          <h1 id="crash-title" tabIndex={-1} className="mt-5 text-[28px] font-semibold text-ink focus:outline-none">
            Something went wrong
          </h1>
          <p className="mt-2 text-[15px] leading-relaxed text-ink-3">
            FDR SETU hit an unexpected error and stopped this screen. Reloading usually fixes it. If it keeps happening, the demo data saved in
            this browser may be damaged; resetting restores the original synthetic records.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-2">
            <button type="button" onClick={() => window.location.reload()} className={`${btn} border border-brand bg-brand text-white hover:bg-brand-hover`}>
              <RefreshCw aria-hidden className="size-4" /> Reload
            </button>
            {!confirmReset ? (
              <button
                type="button"
                onClick={() => this.setState({ confirmReset: true })}
                className={`${btn} border border-line-strong bg-white text-ink hover:bg-paper-2`}
              >
                <RotateCcw aria-hidden className="size-4" /> Reset demo data
              </button>
            ) : (
              <div role="group" aria-label="Confirm reset" className="flex w-full flex-col items-center gap-2 rounded-lg border border-[#efd3a3] bg-amber-bg p-3 text-[13.5px] text-amber-fg sm:w-auto">
                <p>Replace all demo data in this browser with the original synthetic records? This cannot be reversed. Demo only.</p>
                <div className="flex gap-2">
                  <button type="button" autoFocus onClick={() => this.setState({ confirmReset: false })} className={`${btn} border border-line-strong bg-white text-ink`}>
                    Cancel
                  </button>
                  <button type="button" onClick={this.reset} className={`${btn} border border-[#e7b9b6] bg-white text-red-fg hover:bg-red-bg`}>
                    Yes, reset demo data
                  </button>
                </div>
              </div>
            )}
          </div>
          <details className="mt-8 w-full text-left text-[13px] text-muted">
            <summary className="cursor-pointer text-center">Technical detail</summary>
            <pre className="mt-2 overflow-x-auto whitespace-pre-wrap rounded-md bg-paper-2 p-3 font-mono">{error.message}</pre>
          </details>
        </main>
      </div>
    )
  }
}
