import { useId, useRef, useState } from "react"
import { CheckCircle2, FileUp, FileWarning, Loader2, X } from "lucide-react"
import { cx } from "../lib/format"
import { inspectFile, type FileVerdict } from "../lib/validation"

export type Picked = { file: File; verdict: FileVerdict } | null

export function UploadZone({
  value,
  onChange,
  label = "FDR receipt",
}: {
  value: Picked
  onChange: (p: Picked) => void
  label?: string
}) {
  const input = useRef<HTMLInputElement>(null)
  const id = useId()
  const [drag, setDrag] = useState(false)
  const [busy, setBusy] = useState(false)

  const take = async (file?: File) => {
    if (!file) return
    setBusy(true)
    const verdict = await inspectFile(file)
    setBusy(false)
    onChange({ file, verdict })
  }

  return (
    <div>
      <p
        id={`${id}-label`}
        className="mb-1.5 text-[13px] font-medium text-ink-2"
      >
        {label}
      </p>
      {!value ? (
        <div
          onDragOver={(e) => {
            e.preventDefault()
            setDrag(true)
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDrag(false)
            take(e.dataTransfer.files[0])
          }}
          className={cx(
            "flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-8 text-center transition-colors",
            drag
              ? "border-gold-600 bg-gold-soft/60"
              : "border-line-strong bg-paper",
          )}
        >
          {busy ? (
            <Loader2
              aria-hidden
              className="size-7 animate-spin text-gold-700"
            />
          ) : (
            <FileUp aria-hidden className="size-7 text-gold-700" />
          )}
          <p className="mt-3 text-[14.5px] font-medium text-ink">
            Drag the receipt here, or
          </p>
          <button
            type="button"
            data-upload-trigger
            onClick={() => input.current?.click()}
            aria-describedby={`${id}-rules`}
            className="mt-2 rounded-md border border-brand bg-brand px-4 py-2 text-[13.5px] font-medium text-white hover:bg-brand-hover"
          >
            Choose file
          </button>
          <p id={`${id}-rules`} className="mt-3 text-[13px] text-muted">
            PDF, PNG or JPEG · up to 5 MB · one file · contents are checked, not
            just the extension
          </p>
          <input
            ref={input}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
            className="sr-only"
            tabIndex={-1}
            aria-labelledby={`${id}-label`}
            onChange={(e) => {
              take(e.target.files?.[0])
              e.target.value = ""
            }}
          />
        </div>
      ) : (
        <div
          className={cx(
            "rounded-xl border px-4 py-3.5",
            value.verdict.ok
              ? "border-[#bcdcc8] bg-green-bg/50"
              : "border-[#efc2bf] bg-red-bg/60",
          )}
          aria-live="polite"
        >
          <div className="flex items-start gap-3">
            {value.verdict.ok ? (
              <CheckCircle2
                aria-hidden
                className="mt-0.5 size-5 shrink-0 text-green-fg"
              />
            ) : (
              <FileWarning
                aria-hidden
                className="mt-0.5 size-5 shrink-0 text-red-fg"
              />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-[14px] font-medium text-ink">
                {value.file.name}
              </p>
              <p className="text-[13px] text-muted tnum">
                {(value.file.size / 1024).toFixed(0)} KB · declared{" "}
                {value.file.type || "unknown"}
                {value.verdict.detected &&
                  ` · signature ${value.verdict.detected.toUpperCase()}`}
              </p>
              {value.verdict.ok ? (
                <p className="mt-1 text-[13px] text-green-fg">
                  Passed type, size and signature checks. In this prototype the file stays in your browser; private storage is simulated.
                </p>
              ) : (
                <ul className="mt-1 list-disc pl-4 text-[13px] text-red-fg">
                  {value.verdict.reasons.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
              )}
            </div>
            <button
              type="button"
              onClick={() => onChange(null)}
              aria-label="Remove file"
              className="rounded p-1 text-muted hover:bg-surface hover:text-ink"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
