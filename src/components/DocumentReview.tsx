import { useEffect, useState } from "react"
import { AlertOctagon, CheckCircle2, Eye, EyeOff, FileQuestion, FileWarning, ScanSearch } from "lucide-react"
import { useStore } from "../data/store"
import { openFlags } from "../data/selectors"
import type { Fdr, FlagType } from "../data/types"
import { fmtDate } from "../lib/dates"
import { cx, fmtINR, maskRef } from "../lib/format"
import { DocumentPreview, groupDigits, type DocField } from "./DocumentPreview"
import { documentAvailability } from "../lib/documents"
import { Button, Card, CardHeader, Disclaimer, DISCLAIMER_UPLOAD } from "./ui"

type Result = "match" | "mismatch" | "missing" | "unknown" | "unavailable"
type Row = { key: DocField; label: string; form: string; doc: string | null; result: Result; flagged: boolean }

const FLAG_FIELDS: Record<FlagType, DocField[]> = {
  date_mismatch: ["issueDate", "maturityDate"],
  amount_mismatch: ["amount"],
  missing_document: ["docType"],
  bank_detail_mismatch: ["bank", "branch"],
  other: [],
}

const RESULT: Record<Result, { Icon: typeof CheckCircle2; text: string; cls: string }> = {
  match: { Icon: CheckCircle2, text: "Matches", cls: "text-green-fg" },
  mismatch: { Icon: AlertOctagon, text: "Mismatch", cls: "text-red-fg" },
  missing: { Icon: FileWarning, text: "Not on document", cls: "text-red-fg" },
  unknown: { Icon: ScanSearch, text: "Check visually", cls: "text-slate-fg" },
  unavailable: { Icon: FileQuestion, text: "Not compared", cls: "text-muted" },
}

/**
 * Compares entered form values with what the receipt shows. In this prototype the
 * receipt values come from synthetic `printed` metadata; for files uploaded in this
 * session the content is unknown, so each row asks for a visual check instead.
 */
export function compareDocument(fdr: Fdr, revealed: boolean): Row[] {
  const d = fdr.document
  const p = d?.printed ?? {}
  const availability = documentAvailability(fdr)
  // Only the illustrative sample receipt has known contents; real uploads are never machine-read here.
  const uploaded = availability !== "sample"
  const notReceipt = Boolean(p.title)
  const flaggedFields = new Set(openFlags(fdr).flatMap((f) => FLAG_FIELDS[f.type]))
  const num = revealed ? groupDigits(fdr.fdrNumber) : maskRef(fdr.fdrNumber)

  const spec: [DocField, string, string, string | null | undefined][] = [
    ["docType", "Document type", "Fixed Deposit Receipt", uploaded ? undefined : (p.title ?? "Fixed Deposit Receipt")],
    ["fdrNumber", "FDR number", num, uploaded ? undefined : notReceipt ? null : num],
    ["bank", "Issuing bank", fdr.bank, uploaded ? undefined : fdr.bank],
    ["branch", "Branch", fdr.branch, uploaded ? undefined : fdr.branch],
    ["amount", "Amount", fmtINR(fdr.amount), uploaded ? undefined : fmtINR(p.amount ?? fdr.amount)],
    ["issueDate", "Issue date", fmtDate(fdr.issueDate), uploaded ? undefined : notReceipt ? null : fmtDate(p.issueDate ?? fdr.issueDate)],
    ["maturityDate", "Maturity date", fmtDate(fdr.maturityDate), uploaded ? undefined : notReceipt ? null : fmtDate(fdr.maturityDate)],
    ["beneficiary", "Beneficiary", fdr.beneficiary, uploaded ? undefined : notReceipt ? null : fdr.beneficiary],
  ]
  return spec.map(([key, label, form, doc]) => ({
    key,
    label,
    form,
    doc: doc ?? null,
    result:
      availability === "unavailable" || availability === "none"
        ? "unavailable"
        : doc === undefined
          ? "unknown"
          : doc === null
            ? "missing"
            : doc === form
              ? "match"
              : "mismatch",
    flagged: flaggedFields.has(key),
  }))
}

const REVEAL_MS = 60_000

/** Review mode for officials: the document beside the entered fields, mismatches highlighted on both. */
export function DocumentReview({ fdr }: { fdr: Fdr }) {
  const { user, actions } = useStore()
  const [revealed, setRevealed] = useState(false)
  const canReveal = user?.role === "scrutiny" || user?.role === "authority"

  useEffect(() => {
    if (!revealed) return
    const t = setTimeout(() => setRevealed(false), REVEAL_MS)
    return () => clearTimeout(t)
  }, [revealed])

  const rows = compareDocument(fdr, revealed && canReveal)
  const bad = new Set(rows.filter((r) => r.result === "mismatch" || r.result === "missing").map((r) => r.key))
  const availability = documentAvailability(fdr)
  const counts = {
    bad: bad.size,
    match: rows.filter((r) => r.result === "match").length,
    unknown: rows.filter((r) => r.result === "unknown").length,
  }

  return (
    <Card className="mb-6">
      <CardHeader
        title="Review mode · document beside entered details"
        sub="Mismatches are highlighted on both the form values and the document."
        action={
          <p className="flex flex-wrap gap-2 text-[13px] font-medium tnum" aria-live="polite">
            {availability === "unavailable" && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-bg px-2.5 py-0.5 text-amber-fg ring-1 ring-inset ring-[#efd3a3]">
                <FileQuestion aria-hidden className="size-3.5" /> Comparison unavailable
              </span>
            )}
            {counts.bad > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-red-bg px-2.5 py-0.5 text-red-fg ring-1 ring-inset ring-[#efc2bf]">
                <AlertOctagon aria-hidden className="size-3.5" /> {counts.bad} mismatch{counts.bad === 1 ? "" : "es"}
              </span>
            )}
            {counts.match > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-green-bg px-2.5 py-0.5 text-green-fg ring-1 ring-inset ring-[#bcdcc8]">
                <CheckCircle2 aria-hidden className="size-3.5" /> {counts.match} match
              </span>
            )}
            {counts.unknown > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-bg px-2.5 py-0.5 text-slate-fg ring-1 ring-inset ring-[#d3d9e2]">
                <ScanSearch aria-hidden className="size-3.5" /> {counts.unknown} to check visually
              </span>
            )}
          </p>
        }
      />
      <div className="grid gap-6 p-5 lg:grid-cols-2">
        <div className="min-w-0">
          <h3 className="mb-3 font-sans text-[13px] font-semibold uppercase tracking-[0.12em] text-muted">Document</h3>
          <DocumentPreview fdr={fdr} revealed={revealed && canReveal} mismatches={bad} tall />
        </div>

        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-sans text-[13px] font-semibold uppercase tracking-[0.12em] text-muted">Entered on form vs document</h3>
            {canReveal &&
              (revealed ? (
                <Button size="sm" variant="ghost" onClick={() => setRevealed(false)}>
                  <EyeOff aria-hidden className="size-3.5" /> Hide full number
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    actions.revealNumber(fdr)
                    setRevealed(true)
                  }}
                >
                  <Eye aria-hidden className="size-3.5" /> Reveal full number
                </Button>
              ))}
          </div>
          <div className="overflow-hidden rounded-lg border border-line">
            <table className="w-full text-left text-[13px]">
              <caption className="sr-only">Comparison of entered values with the document</caption>
              <thead>
                <tr className="border-b border-line bg-paper text-[13px] uppercase tracking-[0.08em] text-muted">
                  <th scope="col" className="px-3 py-2 font-semibold">
                    Field
                  </th>
                  <th scope="col" className="px-3 py-2 font-semibold">
                    Form
                  </th>
                  <th scope="col" className="px-3 py-2 font-semibold">
                    Document
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((r) => {
                  const m = RESULT[r.result]
                  const off = r.result === "mismatch" || r.result === "missing"
                  return (
                    <tr key={r.key} className={cx("align-top", off && "bg-red-bg/60")}>
                      <th scope="row" className="px-3 py-2.5 font-medium text-ink">
                        {r.label}
                        <span className={cx("mt-0.5 flex items-center gap-1 text-[13px] font-semibold", m.cls)}>
                          <m.Icon aria-hidden className="size-3.5" />
                          {m.text}
                        </span>
                        {r.flagged && (
                          <span className="mt-1 inline-block rounded bg-red-fg px-1.5 py-px text-[13px] font-semibold uppercase tracking-wide text-white">
                            Flagged
                          </span>
                        )}
                      </th>
                      <td className={cx("px-3 py-2.5 text-ink-2 tnum", r.key === "fdrNumber" && "font-mono", off && "font-semibold text-ink")}>
                        {r.form}
                      </td>
                      <td
                        className={cx(
                          "px-3 py-2.5 tnum",
                          r.key === "fdrNumber" && "font-mono",
                          off ? "font-semibold text-red-fg" : r.result === "unknown" ? "text-muted" : "text-ink-2",
                        )}
                      >
                        {r.result === "missing" || r.result === "unavailable" ? "—" : r.result === "unknown" ? "See document" : r.doc}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {availability === "sample" && (
            <p className="mt-2 text-[13px] text-muted">Compared against the sample receipt (illustrative), not a bank document.</p>
          )}
          {availability === "file" && (
            <p className="mt-2 text-[13px] text-muted">The uploaded file is not read automatically. Check each field against the document.</p>
          )}
          {revealed && canReveal && (
            <p className="mt-2 text-[13px] text-muted">Full number shown for 60 seconds. This reveal has been written to the audit log.</p>
          )}
          <p className="mt-3 text-[13px] text-ink-3">
            <span className="font-medium text-ink">Bank confirmation:</span>{" "}
            {fdr.bankConfirmationRef ?? (fdr.bankConfirmation === "requested" ? "Requested, awaiting" : "Not requested")}
          </p>
          <Disclaimer variant="warn" className="mt-4">
            {DISCLAIMER_UPLOAD}
          </Disclaimer>
        </div>
      </div>
    </Card>
  )
}
