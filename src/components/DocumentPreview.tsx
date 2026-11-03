import { useEffect, useState } from "react"
import { Eye, EyeOff, FileQuestion, FileText, FlaskConical, LockKeyhole, RefreshCw } from "lucide-react"
import { useStore } from "../data/store"
import type { Fdr } from "../data/types"
import { fmtDate } from "../lib/dates"
import { cx, fmtINR, maskRef } from "../lib/format"
import { Button } from "./ui"
import { UploadZone, type Picked } from "./UploadZone"
import { documentAvailability, toDocMeta } from "../lib/documents"

const TTL = 60
const RENEW_AT = 10

export type DocField = "docType" | "fdrNumber" | "bank" | "branch" | "amount" | "issueDate" | "maturityDate" | "beneficiary"

export function groupDigits(n: string) {
  return n.replace(/(\d{4})(?=\d)/g, "$1 ")
}

function Val({ field, bad, children, className }: { field: DocField; bad?: Set<DocField>; children: React.ReactNode; className?: string }) {
  const off = bad?.has(field)
  return (
    <dd className={cx(className, off && "-mx-1 rounded bg-red-bg px-1 text-red-fg ring-1 ring-inset ring-red-dot")}>
      {children}
      {off && <span className="ml-1 font-sans text-[13px] font-semibold uppercase">≠ form</span>}
    </dd>
  )
}

function SyntheticReceipt({ fdr, revealed, mismatches }: { fdr: Fdr; revealed?: boolean; mismatches?: Set<DocField> }) {
  const p = fdr.document?.printed ?? {}
  const title = p.title ?? "Fixed Deposit Receipt"
  const letter = Boolean(p.title)
  const label = "font-sans text-[13px] uppercase tracking-[0.1em] opacity-70"
  return (
    <div className="relative overflow-hidden rounded-md border border-[#d9cfb9] bg-[#fbf8f1] p-5 font-serif text-[#3a352b] shadow-inner">
      <div aria-hidden className="pointer-events-none absolute inset-0 grid place-items-center">
        <span className="-rotate-[18deg] select-none whitespace-nowrap font-sans text-[30px] font-bold tracking-[0.2em] text-[#b9a77e]/25">
          SYNTHETIC SAMPLE
        </span>
      </div>
      <div className="flex items-start justify-between border-b border-[#d9cfb9] pb-3">
        <div>
          <p className="font-display text-[16px] font-semibold">{fdr.bank}</p>
          <p className="text-[13px]">{fdr.branch} Branch</p>
        </div>
        <p
          className={cx(
            "text-right font-sans text-[13px] uppercase tracking-[0.14em]",
            mismatches?.has("docType") && "rounded bg-red-bg px-1 font-semibold text-red-fg ring-1 ring-inset ring-red-dot",
          )}
        >
          {title}
        </p>
      </div>
      {letter ? (
        <div className="space-y-2 pt-3 text-[13px] leading-relaxed">
          <p>To whom it may concern,</p>
          <p>
            This is to state that a deposit of{" "}
            <strong className={cx(mismatches?.has("amount") && "rounded bg-red-bg px-1 text-red-fg ring-1 ring-inset ring-red-dot")}>
              {fmtINR(p.amount ?? fdr.amount)}
            </strong>{" "}
            is being arranged in favour of the beneficiary. The receipt will follow separately.
          </p>
          <p className="pt-2">— Branch Manager (illustrative)</p>
        </div>
      ) : (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 pt-3 text-[13px]">
          <div>
            <dt className={label}>Receipt no.</dt>
            <Val field="fdrNumber" bad={mismatches} className="font-mono">
              {revealed ? groupDigits(fdr.fdrNumber) : maskRef(fdr.fdrNumber)}
            </Val>
          </div>
          <div>
            <dt className={label}>Amount</dt>
            <Val field="amount" bad={mismatches} className="tnum">
              {fmtINR(p.amount ?? fdr.amount)}
            </Val>
          </div>
          <div>
            <dt className={label}>Date of issue</dt>
            <Val field="issueDate" bad={mismatches} className="tnum">
              {fmtDate(p.issueDate ?? fdr.issueDate)}
            </Val>
          </div>
          <div>
            <dt className={label}>Date of maturity</dt>
            <Val field="maturityDate" bad={mismatches} className="tnum">
              {fmtDate(fdr.maturityDate)}
            </Val>
          </div>
          <div className="col-span-2">
            <dt className={label}>In favour of</dt>
            <Val field="beneficiary" bad={mismatches}>
              {fdr.beneficiary}
            </Val>
          </div>
        </dl>
      )}
    </div>
  )
}

/**
 * Simulates a private-bucket object opened through a short-lived signed URL.
 * Once opened, the link is re-issued in the background before it expires, so the
 * preview never closes mid-review. Re-issue pauses while the browser tab is hidden.
 */
export function DocumentPreview({
  fdr,
  revealed,
  mismatches,
  tall,
}: {
  fdr: Fdr
  revealed?: boolean
  mismatches?: Set<DocField>
  tall?: boolean
}) {
  const { actions } = useStore()
  const [expiresAt, setExpiresAt] = useState<number | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const [issued, setIssued] = useState(0)
  const [picked, setPicked] = useState<Picked>(null)
  const doc = fdr.document

  useEffect(() => {
    if (expiresAt === null) return
    const t = setInterval(() => {
      const n = Date.now()
      setNow(n)
      if (!document.hidden && expiresAt - n <= RENEW_AT * 1000) {
        setExpiresAt(n + TTL * 1000)
        setIssued((c) => c + 1)
      }
    }, 1000)
    return () => clearInterval(t)
  }, [expiresAt])

  if (!doc) return <p className="text-[13.5px] text-muted">No document on file.</p>

  const availability = documentAvailability(fdr)
  const open = expiresAt !== null
  const left = open ? Math.max(0, Math.ceil((expiresAt - now) / 1000)) : 0
  const header = (
    <div className="flex min-w-0 items-center gap-2.5">
      <span className="grid size-9 shrink-0 place-items-center rounded-md bg-paper-2 text-ink-3">
        <FileText aria-hidden className="size-[18px]" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-[13.5px] font-medium text-ink">{doc.name}</p>
        <p className="text-[13px] text-muted tnum">
          {doc.kind.toUpperCase()} · {doc.sizeKb} KB · uploaded {fmtDate(doc.uploadedAt)}
        </p>
      </div>
    </div>
  )

  if (availability === "unavailable") {
    return (
      <div>
        <div className="mb-3">{header}</div>
        <div role="status" className="rounded-md border border-[#efd3a3] bg-amber-bg px-4 py-3 text-[13.5px] text-amber-fg">
          <p className="flex items-start gap-2 font-semibold">
            <FileQuestion aria-hidden className="mt-0.5 size-4 shrink-0" />
            Document comparison unavailable in this session. Re-upload the receipt to compare.
          </p>
          <p className="mt-1 pl-6 text-[13px]">
            This prototype keeps uploaded files only in the browser tab where they were chosen, so the original file is no longer available here.
          </p>
        </div>
        <div className="mt-3">
          <UploadZone
            label="Re-upload receipt"
            value={picked}
            onChange={(p) => {
              if (p?.verdict.ok) {
                actions.reattachDocument(fdr, toDocMeta(p.file, p.verdict.detected!))
                setPicked(null)
              } else setPicked(p)
            }}
          />
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        {header}
        {open ? (
          <Button size="sm" variant="ghost" onClick={() => setExpiresAt(null)}>
            <EyeOff aria-hidden className="size-3.5" /> Close preview
          </Button>
        ) : (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              actions.logDocumentView(fdr)
              const n = Date.now()
              setNow(n)
              setExpiresAt(n + TTL * 1000)
              setIssued(1)
            }}
          >
            <Eye aria-hidden className="size-3.5" /> Open document
          </Button>
        )}
      </div>

      {open ? (
        availability === "file" && doc.kind !== "pdf" ? (
          <img
            src={doc.localUrl}
            alt={`Uploaded receipt ${doc.name}`}
            className={cx("w-full rounded-md border border-line object-contain", tall ? "max-h-[560px]" : "max-h-[420px]")}
          />
        ) : availability === "file" ? (
          <object
            data={doc.localUrl}
            type="application/pdf"
            className={cx("w-full rounded-md border border-line", tall ? "h-[560px]" : "h-[420px]")}
            aria-label={`Uploaded receipt ${doc.name}`}
          >
            <p className="p-4 text-[13.5px] text-muted">This browser cannot preview PDFs inline. Compare the fields against the original receipt.</p>
          </object>
        ) : (
          <div>
            <p className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-[#d3d9e2] bg-slate-bg px-2.5 py-0.5 text-[13px] font-semibold text-slate-fg">
              <FlaskConical aria-hidden className="size-3.5" /> Sample receipt (illustrative)
            </p>
            <SyntheticReceipt fdr={fdr} revealed={revealed} mismatches={mismatches} />
          </div>
        )
      ) : (
        <div className="hatch flex flex-col items-center justify-center rounded-md border border-dashed border-line-strong px-6 py-10 text-center">
          <LockKeyhole aria-hidden className="size-6 text-muted" />
          <p className="mt-2 text-[13.5px] font-medium text-ink-2">Private storage: simulated in this prototype</p>
          <p className="mt-1 max-w-xs text-[13px] text-muted">
            Opening imitates a {TTL}-second signed link and records the view in the audit log. In production the file sits in a private
            bucket and the link renews while the preview stays open.
          </p>
        </div>
      )}

      {open && (
        <p className="mt-2 flex flex-wrap items-center gap-1.5 text-[13px] text-slate-fg tnum">
          <RefreshCw aria-hidden className="size-3.5" />
          Signed link simulated in this prototype · renews automatically
          <span className="text-muted">
            · link {issued} · current expires in {left}s
          </span>
        </p>
      )}
      <p className="mt-1 text-[13px] text-muted">
        Production path:{" "}
        <span className="font-mono">{doc.storagePath.replace(/[^/]+$/, "<uuid>." + (doc.kind === "jpeg" ? "jpg" : doc.kind))}</span>
      </p>
    </div>
  )
}
