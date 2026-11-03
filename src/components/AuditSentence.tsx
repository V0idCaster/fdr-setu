import type { AuditEntry } from "../data/types"

const withDetail = (s: string, d: string) => (d ? `${s} (${d}).` : `${s}.`)

/** Turns an audit row into a plain-language sentence. The raw code stays available on demand. */
export function auditSentence(a: AuditEntry): string {
  const who = a.actor
  const t = `FDR ${a.target}`
  const d = a.detail
  switch (a.action) {
    case "auth.sign_in":
      return `${who} signed in.`
    case "auth.sign_out":
      return `${who} signed out.`
    case "fdr.submitted":
      return withDetail(`${who} submitted ${t}`, d)
    case "renewal.submitted":
      return withDetail(`${who} submitted renewal ${t}`, d)
    case "document.uploaded":
      return withDetail(`${who} uploaded the receipt for ${t}`, d)
    case "document.reattached":
      return withDetail(`${who} re-attached the receipt for ${t} to compare it in this session`, d)
    case "document.viewed":
      return `${who} opened the document for ${t} through a 60-second signed link.`
    case "fdr.number_revealed":
      return `${who} revealed the full number of ${t}. It was hidden again after 60 seconds.`
    case "review.started":
      return `${who} picked up ${t} for review.`
    case "review.accepted":
      return withDetail(`${who} accepted ${t} after review`, d)
    case "review.flagged":
      return `${who} requested a correction on ${t}: ${d}.`
    case "correction.submitted":
      return withDetail(`${who} resubmitted ${t} after a correction`, d)
    case "bank.confirmation_requested":
      return `${who} logged a confirmation request to the issuing bank for ${t}.`
    case "bank.confirmation_recorded":
      return withDetail(`${who} recorded the bank’s confirmation for ${t}`, d)
    case "release.requested":
      return `${who} requested ${/refund/i.test(d) ? "a refund" : "release"} of ${t}.`
    case "release.forwarded":
      return withDetail(`${who} cleared scrutiny and forwarded the request on ${t} to the Approving Authority`, d)
    case "release.approved":
      return `${who} approved the release/refund request on ${t}: “${d}”.`
    case "release.declined":
      return `${who} declined the release/refund request on ${t}: “${d}”.`
    case "reminder.generated":
      return withDetail(`The scheduled maturity check generated a reminder for ${t}`, d)
    case "reminder.delivered":
      return withDetail(`A reminder for ${t} was delivered`, d)
    case "reminder.delivery_failed":
      return withDetail(`A reminder for ${t} could not be delivered`, d)
    case "reminder.acknowledged":
      return withDetail(`${who} acknowledged a reminder for ${t}`, d)
    case "escalation.reminder_sent":
      return `${who} sent the institution a direct reminder to renew ${t} (delivery simulated).`
    case "escalation.acknowledged":
      return `${who} acknowledged the escalation on ${t} and returned it to the institution: “${d}”.`
    case "case.escalated":
      return `The maturity check escalated ${t} to the Approving Authority because no renewal had started.`
    case "job.maturity_check":
      return withDetail("The scheduled maturity check ran", d)
    case "settings.updated":
      return withDetail(`${who} updated the reminder policy`, d)
    default:
      return withDetail(`${who} performed ${a.action} on ${a.target}`, d)
  }
}

export function AuditWhat({ entry }: { entry: AuditEntry }) {
  return (
    <div>
      <p className="text-[13.5px] text-ink">{auditSentence(entry)}</p>
      <details className="group mt-0.5">
        <summary className="inline cursor-pointer list-none rounded text-[13px] text-muted underline decoration-dotted underline-offset-2 hover:text-ink [&::-webkit-details-marker]:hidden">
          <span className="group-open:hidden">Show code</span>
          <span className="hidden group-open:inline">Hide code</span>
        </summary>
        <p className="mt-1 font-mono text-[13px] text-ink-3">
          <code className="rounded bg-paper-2 px-1.5 py-0.5">{entry.action}</code> target={entry.target}
          {entry.detail && <> detail=“{entry.detail}”</>} id={entry.id}
        </p>
      </details>
    </div>
  )
}
