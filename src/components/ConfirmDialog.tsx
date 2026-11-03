import { useEffect, useRef } from "react"
import { Lock } from "lucide-react"
import { Button } from "./ui"

export type ConfirmSpec = {
  title: string
  /** Plain-language summary of the effect, ending with "This cannot be reversed." */
  summary: string
  detail?: string
  confirmLabel: string
  /** Replaces the default audit-log note when it would not be accurate. */
  footnote?: string
  tone?: "primary" | "danger"
  run: () => void
}

/** Modal confirmation built on <dialog>: focus is contained and Escape cancels. */
export function ConfirmDialog({ spec, onClose }: { spec: ConfirmSpec | null; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (spec && !d.open) d.showModal()
    if (!spec && d.open) d.close()
  }, [spec])

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-labelledby="confirm-title"
      aria-describedby="confirm-summary"
      className="m-auto w-[min(92vw,480px)] rounded-xl border border-line bg-white p-0 text-ink shadow-2xl backdrop:bg-ink/40"
    >
      {spec && (
        <div className="p-6">
          <h2 id="confirm-title" className="text-[21px] font-semibold">
            {spec.title}
          </h2>
          <p id="confirm-summary" className="mt-3 text-[15.5px] leading-relaxed text-ink tnum">
            {spec.summary}
          </p>
          {spec.detail && <p className="mt-2 text-[13.5px] leading-relaxed text-muted">{spec.detail}</p>}
          <p className="mt-4 flex items-center gap-2 rounded-md border border-[#efd3a3] bg-amber-bg px-3 py-2 text-[13px] text-amber-fg">
            <Lock aria-hidden className="size-3.5 shrink-0" />
            {spec.footnote ?? "Recorded permanently in the append-only audit log."}
          </p>
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            {/* Listed first in the DOM so it receives initial focus: the safe default. */}
            <Button variant="secondary" onClick={() => ref.current?.close()} className="sm:order-first">
              Go back
            </Button>
            <Button
              variant={spec.tone === "danger" ? "danger" : "primary"}
              onClick={() => {
                spec.run()
                ref.current?.close()
              }}
            >
              {spec.confirmLabel}
            </Button>
          </div>
        </div>
      )}
    </dialog>
  )
}
