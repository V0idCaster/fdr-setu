export type Role = "institution" | "scrutiny" | "authority"

export type User = {
  id: string
  /** Minimal personal data: display name and designation only. */
  name: string
  designation: string
  role: Role
  institutionId?: string
}

export type Institution = { id: string; name: string; code: string; city: string }

export type Stage = "submitted" | "under_review" | "correction_requested" | "accepted" | "renewal_initiated" | "superseded" | "release_requested" | "released" | "refunded"

export type FlagType = "date_mismatch" | "missing_document" | "amount_mismatch" | "bank_detail_mismatch" | "other"

export type Discrepancy = {
  id: string
  type: FlagType
  note: string
  raisedBy: string
  raisedAt: string
  resolvedAt?: string
  response?: string
}

export type BankConfirmation = "not_requested" | "requested" | "confirmed"

export type DocumentMeta = {
  name: string
  kind: "pdf" | "png" | "jpeg"
  sizeKb: number
  uploadedAt: string
  /** Session-only object URL for files uploaded in this browser tab. */
  localUrl?: string
  storagePath: string
  /** "upload" = provided by a user in this app; absent for synthetic seed documents. */
  source?: "upload"
  /** Values as printed on the receipt (synthetic), used to illustrate mismatches. */
  printed?: { issueDate?: string; amount?: number; title?: string }
}

export type TimelineEvent = {
  id: string
  at: string
  actor: string
  role: Role | "system"
  kind: "submitted" | "validated" | "review_started" | "flagged" | "correction_submitted" | "accepted" | "bank_requested" | "bank_confirmed" | "reminder" | "escalated" | "escalation_reminder" | "escalation_acknowledged" | "renewal_started" | "renewed" | "release_requested" | "release_forwarded" | "decision"
  note: string
}

export type ReleaseRequest = {
  type: "release" | "refund"
  reason: string
  requestedAt: string
  requestedBy: string
  stage: "requested" | "scrutiny_cleared" | "decided"
  scrutinyNote?: string
  decision?: "approved" | "declined"
  decisionNote?: string
  decidedAt?: string
}

export type Owner = { role: Role; label: string; deadline: string; since: string }

export type Fdr = {
  id: string
  institutionId: string
  fdrNumber: string
  bank: string
  branch: string
  amount: number
  issueDate: string
  maturityDate: string
  beneficiary: string
  stage: Stage
  submittedAt: string
  submittedBy: string
  reviewedAt?: string
  reviewedBy?: string
  bankConfirmation: BankConfirmation
  bankConfirmedAt?: string
  bankConfirmationRef?: string
  flags: Discrepancy[]
  owner: Owner
  document?: DocumentMeta
  previousFdrId?: string
  nextFdrId?: string
  release?: ReleaseRequest
  /** Approving Authority's handling of a maturity escalation. */
  escalation?: { remindedAt?: string; remindedBy?: string; acknowledgedAt?: string; acknowledgedBy?: string; note?: string }
  events: TimelineEvent[]
}

export type ReminderWindow = number

export type Reminder = {
  id: string
  fdrId: string
  window: ReminderWindow
  generatedAt: string
  delivery: "queued" | "delivered" | "failed"
  deliveredAt?: string
  channel: "email" | "in-app"
  escalated: boolean
  escalatedAt?: string
  acknowledgedAt?: string
}

export type AuditEntry = {
  id: string
  at: string
  actor: string
  role: Role | "system"
  action: string
  target: string
  detail: string
}

export type Settings = {
  reminderWindows: number[]
  escalateAtDays: number
  reviewSlaDays: number
  correctionSlaDays: number
}
