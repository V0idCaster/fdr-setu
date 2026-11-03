import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { addDays, daysUntil, nowIso, syncClock } from "../lib/dates"
import { maskRef, fmtINR } from "../lib/format"
import type { FdrDraft } from "../lib/validation"
import {
  DEFAULT_SETTINGS,
  USERS,
  seedAudit,
  seedFdrs,
  seedReminders,
} from "./seed"
import { FLAG_LABEL, institutionName } from "./selectors"
import type {
  AuditEntry,
  DocumentMeta,
  Fdr,
  FlagType,
  Reminder,
  Role,
  Settings,
  TimelineEvent,
  User,
} from "./types"

type State = {
  fdrs: Fdr[]
  reminders: Reminder[]
  audit: AuditEntry[]
  settings: Settings
  userId: string | null
}

const KEY = "fdr-setu-prototype-v2"
/** Earlier builds stored different seed data under these keys; discard them. */
const LEGACY_KEYS = ["fdr-setu-prototype-v1"]

function initial(): State {
  try {
    LEGACY_KEYS.forEach((k) => localStorage.removeItem(k))
  } catch {
    /* storage unavailable */
  }
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const saved = JSON.parse(raw) as State
      syncClock(savedTimes(saved))
      return saved
    }
  } catch {
    /* ignore */
  }
  return fresh()
}

/** Every stored timestamp, used to resume the simulated clock after a refresh. */
function* savedTimes(s: State): Generator<string> {
  for (const a of s.audit ?? []) yield a.at
  for (const f of s.fdrs ?? []) for (const e of f.events ?? []) yield e.at
  for (const r of s.reminders ?? []) {
    yield r.generatedAt
    if (r.deliveredAt) yield r.deliveredAt
  }
}

function fresh(): State {
  return {
    fdrs: seedFdrs(),
    reminders: seedReminders(),
    audit: seedAudit(),
    settings: DEFAULT_SETTINGS,
    userId: null,
  }
}

let seq = 0
const uid = (p: string) =>
  `${p}-${Date.now().toString(36)}-${(seq++).toString(36)}`

export type Toast = { id: string; text: string; tone: "ok" | "warn" }

type Actor = { name: string; role: Role | "system" }

function useStoreValue() {
  const [state, setState] = useState<State>(initial)
  const [toasts, setToasts] = useState<Toast[]>([])
  /** Set when the browser refuses to save (usually storage full). Cleared after the next successful save. */
  const [storageError, setStorageError] = useState<string | null>(null)
  const user = useMemo(
    () => USERS.find((u) => u.id === state.userId) ?? null,
    [state.userId],
  )
  const userRef = useRef<User | null>(user)
  userRef.current = user

  useEffect(() => {
    const persistable = {
      ...state,
      fdrs: state.fdrs.map((f) =>
        f.document
          ? { ...f, document: { ...f.document, localUrl: undefined } }
          : f,
      ),
    }
    try {
      localStorage.setItem(KEY, JSON.stringify(persistable))
      setStorageError(null)
    } catch (e) {
      const full =
        e instanceof DOMException && (e.name === "QuotaExceededError" || e.name === "NS_ERROR_DOM_QUOTA_REACHED" || e.code === 22)
      setStorageError(
        full
          ? "Browser storage is full, so your latest changes are not being saved. They will be lost if you refresh or close this tab."
          : "This browser blocked saving, so your latest changes are not being saved. They will be lost if you refresh or close this tab.",
      )
    }
  }, [state])

  const notify = useCallback((text: string, tone: Toast["tone"] = "ok") => {
    const id = uid("t")
    setToasts((t) => [...t, { id, text, tone }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200)
  }, [])

  const actor = (): Actor => {
    const u = userRef.current
    return u
      ? { name: u.name, role: u.role }
      : { name: "System", role: "system" }
  }

  /** Applies an FDR update, appends a timeline event and an audit row in one transaction. */
  const commit = useCallback(
    (
      fdrId: string,
      patch: (f: Fdr, all: Fdr[]) => Partial<Fdr>,
      event: Omit<TimelineEvent, "id" | "at" | "actor" | "role"> | null,
      audit: { action: string; detail: string },
      by: Actor = actor(),
    ) => {
      setState((s) => {
        const target = s.fdrs.find((f) => f.id === fdrId)
        if (!target) return s
        const at = nowIso()
        const fdrs = s.fdrs.map((f) => {
          if (f.id !== fdrId) return f
          const next = { ...f, ...patch(f, s.fdrs) }
          if (event)
            next.events = [
              ...f.events,
              { id: uid("e"), at, actor: by.name, role: by.role, ...event },
            ]
          return next
        })
        return {
          ...s,
          fdrs,
          audit: [
            ...s.audit,
            {
              id: uid("a"),
              at,
              actor: by.name,
              role: by.role,
              target: maskRef(target.fdrNumber),
              ...audit,
            },
          ],
        }
      })
    },
    [],
  )

  const appendAudit = useCallback((entry: Omit<AuditEntry, "id" | "at">) => {
    setState((s) => ({
      ...s,
      audit: [...s.audit, { id: uid("a"), at: nowIso(), ...entry }],
    }))
  }, [])

  const actions = {
    login(userId: string) {
      const u = USERS.find((x) => x.id === userId)!
      setState((s) => ({ ...s, userId }))
      appendAudit({
        actor: u.name,
        role: u.role,
        action: "auth.sign_in",
        target: "session",
        detail: u.designation,
      })
    },
    logout() {
      const u = userRef.current
      if (u)
        appendAudit({
          actor: u.name,
          role: u.role,
          action: "auth.sign_out",
          target: "session",
          detail: "",
        })
      setState((s) => ({ ...s, userId: null }))
    },
    reset() {
      const keepUser = state.userId
      setState({ ...fresh(), userId: keepUser })
      notify("Synthetic demo data restored.")
    },

    submitFdr(
      draft: FdrDraft,
      doc: DocumentMeta,
      previousFdrId?: string,
    ): string {
      const u = userRef.current!
      const id = uid("f")
      const at = nowIso()
      const ref = maskRef(draft.fdrNumber)
      setState((s) => {
        const prev = previousFdrId
          ? s.fdrs.find((f) => f.id === previousFdrId)
          : undefined
        const fdr: Fdr = {
          id,
          institutionId: u.institutionId!,
          fdrNumber: draft.fdrNumber.trim(),
          bank: draft.bank,
          branch: draft.branch.trim(),
          amount: Number(draft.amount),
          issueDate: new Date(draft.issueDate).toISOString(),
          maturityDate: new Date(draft.maturityDate).toISOString(),
          beneficiary: draft.beneficiary.trim(),
          stage: "submitted",
          submittedAt: at,
          submittedBy: u.name,
          bankConfirmation: "not_requested",
          flags: [],
          owner: {
            role: "scrutiny",
            label: "Scrutiny desk · review",
            deadline: addDays(at, s.settings.reviewSlaDays),
            since: at,
          },
          document: doc,
          previousFdrId,
          events: [
            {
              id: uid("e"),
              at,
              actor: u.name,
              role: "institution",
              kind: "submitted",
              note: prev
                ? `Renewal of ${maskRef(prev.fdrNumber)} submitted.`
                : "FDR submitted with receipt.",
            },
            {
              id: uid("e"),
              at,
              actor: "Validator",
              role: "system",
              kind: "validated",
              note: "Required fields, date order and file checks passed.",
            },
          ],
        }
        const fdrs = s.fdrs.map((f) =>
          f.id === previousFdrId
            ? {
                ...f,
                stage: "renewal_initiated" as const,
                nextFdrId: id,
                owner: {
                  role: "scrutiny" as const,
                  label: `Scrutiny desk · review renewal ${ref}`,
                  deadline: fdr.owner.deadline,
                  since: at,
                },
                events: [
                  ...f.events,
                  {
                    id: uid("e"),
                    at,
                    actor: u.name,
                    role: "institution" as const,
                    kind: "renewal_started" as const,
                    note: `Renewal started; replacement ${ref} submitted.`,
                  },
                ],
              }
            : f,
        )
        const audit: AuditEntry[] = [
          {
            id: uid("a"),
            at,
            actor: u.name,
            role: "institution",
            action: prev ? "renewal.submitted" : "fdr.submitted",
            target: ref,
            detail: `${draft.bank} · ${fmtINR(Number(draft.amount))}${
              prev ? ` · replaces ${maskRef(prev.fdrNumber)}` : ""
            }`,
          },
          {
            id: uid("a"),
            at,
            actor: u.name,
            role: "institution",
            action: "document.uploaded",
            target: ref,
            detail: `${doc.kind.toUpperCase()} · ${doc.sizeKb} KB → private bucket`,
          },
        ]
        return { ...s, fdrs: [fdr, ...fdrs], audit: [...s.audit, ...audit] }
      })
      notify(
        previousFdrId
          ? `Renewal ${ref} submitted and linked.`
          : `FDR ${ref} submitted for review.`,
      )
      return id
    },

    startReview(id: string) {
      commit(
        id,
        () => ({ stage: "under_review" }),
        { kind: "review_started", note: "Picked up for scrutiny." },
        { action: "review.started", detail: "Assigned to scrutiny desk" },
      )
    },

    accept(id: string, note: string) {
      const u = userRef.current!
      setState((s) => {
        const f = s.fdrs.find((x) => x.id === id)
        if (!f) return s
        const at = nowIso()
        const days = daysUntil(f.maturityDate)
        const fdrs = s.fdrs.map((x) => {
          if (x.id === id) {
            return {
              ...x,
              stage: "accepted" as const,
              reviewedAt: at,
              reviewedBy: u.name,
              owner: {
                role: "institution" as const,
                label: `${institutionName(x.institutionId)} · monitor maturity`,
                deadline: addDays(
                  x.maturityDate,
                  -Math.max(...s.settings.reminderWindows),
                ),
                since: at,
              },
              events: [
                ...x.events,
                {
                  id: uid("e"),
                  at,
                  actor: u.name,
                  role: u.role,
                  kind: "accepted" as const,
                  note: note || "Accepted after scrutiny.",
                },
              ],
            }
          }
          if (x.id === f.previousFdrId) {
            return {
              ...x,
              stage: "superseded" as const,
              owner: {
                role: "scrutiny" as const,
                label: "Closed · superseded",
                deadline: at,
                since: at,
              },
              events: [
                ...x.events,
                {
                  id: uid("e"),
                  at,
                  actor: u.name,
                  role: u.role,
                  kind: "renewed" as const,
                  note: `Replacement ${maskRef(f.fdrNumber)} accepted. This instrument is superseded.`,
                },
              ],
            }
          }
          return x
        })
        return {
          ...s,
          fdrs,
          audit: [
            ...s.audit,
            {
              id: uid("a"),
              at,
              actor: u.name,
              role: u.role,
              action: "review.accepted",
              target: maskRef(f.fdrNumber),
              detail: `${note || "Accepted"} · matures in ${days} days`,
            },
          ],
        }
      })
      notify(
        "Review outcome recorded: accepted. Bank confirmation is tracked separately.",
      )
    },

    flag(id: string, items: { type: FlagType; note: string }[]) {
      const u = userRef.current!
      const at = nowIso()
      commit(
        id,
        (f) => ({
          stage: "correction_requested",
          flags: [
            ...f.flags,
            ...items.map((i) => ({
              id: uid("fl"),
              ...i,
              raisedBy: u.name,
              raisedAt: at,
            })),
          ],
          owner: {
            role: "institution",
            label: `${institutionName(f.institutionId)} · respond to correction`,
            deadline: addDays(at, state.settings.correctionSlaDays),
            since: at,
          },
        }),
        {
          kind: "flagged",
          note: `${items.map((i) => FLAG_LABEL[i.type]).join(", ")} raised. Correction requested.`,
        },
        {
          action: "review.flagged",
          detail: items.map((i) => FLAG_LABEL[i.type]).join("; "),
        },
      )
      notify("Correction requested. Institution notified.", "warn")
    },

    respondCorrection(
      id: string,
      response: string,
      changes: Partial<Pick<Fdr, "issueDate" | "maturityDate" | "amount">>,
      doc?: DocumentMeta,
    ) {
      const at = nowIso()
      commit(
        id,
        (f) => ({
          ...changes,
          ...(doc ? { document: doc } : {}),
          stage: "under_review",
          flags: f.flags.map((x) =>
            x.resolvedAt ? x : { ...x, resolvedAt: at, response },
          ),
          owner: {
            role: "scrutiny",
            label: "Scrutiny desk · re-review",
            deadline: addDays(at, state.settings.reviewSlaDays),
            since: at,
          },
        }),
        {
          kind: "correction_submitted",
          note: `Correction submitted${
            doc ? " with replacement document" : ""
          }: ${response}`,
        },
        {
          action: "correction.submitted",
          detail:
            [doc ? "New document" : "", Object.keys(changes).join(", ")]
              .filter(Boolean)
              .join(" · ") || "Response only",
        },
      )
      notify("Correction sent back to the scrutiny desk.")
    },

    requestBank(id: string) {
      commit(
        id,
        () => ({ bankConfirmation: "requested" }),
        {
          kind: "bank_requested",
          note: "Confirmation requested from issuing branch (offline channel).",
        },
        {
          action: "bank.confirmation_requested",
          detail: "Offline request logged",
        },
      )
      notify("Bank confirmation request logged.")
    },

    recordBank(id: string, ref: string) {
      const at = nowIso()
      commit(
        id,
        () => ({
          bankConfirmation: "confirmed",
          bankConfirmedAt: at,
          bankConfirmationRef: ref,
        }),
        { kind: "bank_confirmed", note: `Bank confirmation recorded: ${ref}` },
        { action: "bank.confirmation_recorded", detail: ref },
      )
      notify("Bank confirmation recorded.")
    },

    requestRelease(id: string, type: "release" | "refund", reason: string) {
      const u = userRef.current!
      const at = nowIso()
      commit(
        id,
        () => ({
          stage: "release_requested",
          release: {
            type,
            reason,
            requestedAt: at,
            requestedBy: u.name,
            stage: "requested",
          },
          owner: {
            role: "scrutiny",
            label: `Scrutiny desk · ${type} check`,
            deadline: addDays(at, state.settings.reviewSlaDays),
            since: at,
          },
        }),
        {
          kind: "release_requested",
          note: `${
            type === "refund" ? "Refund" : "Release"
          } requested: ${reason}`,
        },
        { action: "release.requested", detail: type },
      )
      notify(
        `${
          type === "refund" ? "Refund" : "Release"
        } request sent to the scrutiny desk.`,
      )
    },

    forwardRelease(id: string, note: string) {
      const at = nowIso()
      commit(
        id,
        (f) => ({
          release: {
            ...f.release!,
            stage: "scrutiny_cleared",
            scrutinyNote: note,
          },
          owner: {
            role: "authority",
            label: "Approving Authority · decision",
            deadline: addDays(at, 7),
            since: at,
          },
        }),
        {
          kind: "release_forwarded",
          note: `Scrutiny cleared; forwarded to Approving Authority. ${note}`,
        },
        { action: "release.forwarded", detail: note || "Scrutiny cleared" },
      )
      notify("Forwarded to the Approving Authority.")
    },

    decideRelease(id: string, decision: "approved" | "declined", note: string) {
      const at = nowIso()
      commit(
        id,
        (f) => ({
          stage:
            decision === "approved"
              ? f.release!.type === "refund"
                ? "refunded"
                : "released"
              : "accepted",
          release: {
            ...f.release!,
            stage: "decided",
            decision,
            decisionNote: note,
            decidedAt: at,
          },
          owner:
            decision === "approved"
              ? {
                  role: "authority",
                  label: `Closed · ${
                    f.release!.type === "refund" ? "refunded" : "released"
                  }`,
                  deadline: at,
                  since: at,
                }
              : {
                  role: "institution",
                  label: `${institutionName(f.institutionId)} · decision declined`,
                  deadline: addDays(at, 14),
                  since: at,
                },
        }),
        {
          kind: "decision",
          note: `${decision === "approved" ? "Approved" : "Declined"}: ${note}`,
        },
        { action: `release.${decision}`, detail: note },
      )
      notify(`Decision recorded: ${decision}.`)
    },

    /** Simulates the scheduled Edge Function. Generation, delivery and renewal are tracked separately. */
    runMaturityCheck() {
      let generated = 0
      let escalated = 0
      setState((s) => {
        const at = nowIso()
        const windows = [...s.settings.reminderWindows].sort((a, b) => a - b)
        const reminders = [...s.reminders]
        const audit = [...s.audit]
        const fdrs = s.fdrs.map((f) => {
          if (f.stage !== "accepted" && f.stage !== "renewal_initiated")
            return f
          const days = daysUntil(f.maturityDate)
          if (days < 0) return f
          const win = windows.find((w) => days <= w)
          if (win === undefined) return f
          let next = f
          const ref = maskRef(f.fdrNumber)
          if (!reminders.some((r) => r.fdrId === f.id && r.window === win)) {
            const shouldEscalate =
              days <= s.settings.escalateAtDays &&
              f.stage !== "renewal_initiated"
            reminders.push({
              id: uid("r"),
              fdrId: f.id,
              window: win,
              generatedAt: at,
              delivery: "queued",
              channel: "email",
              escalated: shouldEscalate,
              escalatedAt: shouldEscalate ? at : undefined,
            })
            generated++
            audit.push({
              id: uid("a"),
              at,
              actor: "Maturity check",
              role: "system",
              action: "reminder.generated",
              target: ref,
              detail: `${win}-day window · ${days} days left`,
            })
            next = {
              ...next,
              events: [
                ...next.events,
                {
                  id: uid("e"),
                  at,
                  actor: "Maturity check",
                  role: "system",
                  kind: "reminder",
                  note: `${win}-day reminder generated (delivery queued).`,
                },
              ],
            }
            if (shouldEscalate) {
              escalated++
              audit.push({
                id: uid("a"),
                at,
                actor: "Maturity check",
                role: "system",
                action: "case.escalated",
                target: ref,
                detail: "Escalated to Approving Authority",
              })
              next = {
                ...next,
                owner: {
                  role: "authority",
                  label: "Escalated · Approving Authority",
                  deadline: f.maturityDate,
                  since: at,
                },
                events: [
                  ...next.events,
                  {
                    id: uid("e"),
                    at,
                    actor: "Maturity check",
                    role: "system",
                    kind: "escalated",
                    note: `${days} days to maturity with no renewal. Escalated.`,
                  },
                ],
              }
            }
          }
          return next
        })
        audit.push({
          id: uid("a"),
          at,
          actor: "Maturity check",
          role: "system",
          action: "job.maturity_check",
          target: "scheduler",
          detail: `Windows ${s.settings.reminderWindows.join("/")} days`,
        })
        return { ...s, fdrs, reminders, audit }
      })
      setTimeout(
        () =>
          notify(
            generated
              ? `Maturity check: ${generated} reminder(s) generated, ${escalated} escalated. Delivery queued.`
              : "Maturity check ran. No new reminders due.",
          ),
        0,
      )
    },

    dispatchReminders() {
      let count = 0
      setState((s) => {
        const at = nowIso()
        const audit = [...s.audit]
        const reminders = s.reminders.map((r) => {
          if (r.delivery === "delivered") return r
          count++
          const f = s.fdrs.find((x) => x.id === r.fdrId)
          audit.push({
            id: uid("a"),
            at,
            actor: "Notifier",
            role: "system",
            action: "reminder.delivered",
            target: f ? maskRef(f.fdrNumber) : r.fdrId,
            detail: `${r.window}-day · ${r.channel}${
              r.delivery === "failed" ? " (retry)" : ""
            }`,
          })
          return { ...r, delivery: "delivered" as const, deliveredAt: at }
        })
        return { ...s, reminders, audit }
      })
      setTimeout(
        () =>
          notify(
            count
              ? `${count} reminder(s) delivered.`
              : "Nothing waiting in the delivery queue.",
          ),
        0,
      )
    },

    acknowledgeReminder(id: string) {
      const u = userRef.current!
      setState((s) => {
        const r = s.reminders.find((x) => x.id === id)
        const f = s.fdrs.find((x) => x.id === r?.fdrId)
        return {
          ...s,
          reminders: s.reminders.map((x) =>
            x.id === id ? { ...x, acknowledgedAt: nowIso() } : x,
          ),
          audit: [
            ...s.audit,
            {
              id: uid("a"),
              at: nowIso(),
              actor: u.name,
              role: u.role,
              action: "reminder.acknowledged",
              target: f ? maskRef(f.fdrNumber) : "",
              detail: `${r?.window}-day`,
            },
          ],
        }
      })
    },

    updateSettings(next: Settings) {
      const u = userRef.current!
      setState((s) => ({
        ...s,
        settings: next,
        audit: [
          ...s.audit,
          {
            id: uid("a"),
            at: nowIso(),
            actor: u.name,
            role: u.role,
            action: "settings.updated",
            target: "reminder policy",
            detail: `Windows ${next.reminderWindows.join("/")} · escalate ≤ ${next.escalateAtDays}d`,
          },
        ],
      }))
      notify("Reminder policy saved.")
    },

    logDocumentView(fdr: Fdr) {
      const u = userRef.current
      if (!u) return
      appendAudit({
        actor: u.name,
        role: u.role,
        action: "document.viewed",
        target: maskRef(fdr.fdrNumber),
        detail: "Signed URL issued (60 s)",
      })
    },

    /** Approving Authority nudges the institution on an escalated case. The case stays on the authority's desk. */
    sendEscalationReminder(id: string) {
      const u = userRef.current
      if (!u || u.role !== "authority") return
      const at = nowIso()
      commit(
        id,
        (f) => ({ escalation: { ...f.escalation, remindedAt: at, remindedBy: u.name } }),
        { kind: "escalation_reminder", note: "Approving Authority sent a direct reminder to the institution to renew before maturity (delivery simulated)." },
        { action: "escalation.reminder_sent", detail: "Direct reminder to institution (delivery simulated)" },
      )
      notify("Reminder sent to the institution. Delivery is simulated in this prototype.")
    },

    /** Approving Authority records a note, acknowledges the escalation and returns the case to the institution. */
    acknowledgeEscalation(id: string, note: string) {
      const u = userRef.current
      if (!u || u.role !== "authority") return
      const at = nowIso()
      commit(
        id,
        (f) => ({
          escalation: { ...f.escalation, acknowledgedAt: at, acknowledgedBy: u.name, note },
          owner: {
            role: "institution",
            label: `${institutionName(f.institutionId)} · renew before maturity (escalation acknowledged)`,
            deadline: f.maturityDate,
            since: at,
          },
        }),
        { kind: "escalation_acknowledged", note: `Escalation acknowledged by the Approving Authority: “${note}”` },
        { action: "escalation.acknowledged", detail: note },
      )
      notify("Escalation acknowledged. The case is back with the institution.")
    },

    /** Re-attaches a receipt for comparison in this browser session. Recorded in the audit log. */
    reattachDocument(fdr: Fdr, doc: DocumentMeta) {
      const u = userRef.current
      if (!u) return
      setState((s) => ({
        ...s,
        fdrs: s.fdrs.map((f) => (f.id === fdr.id ? { ...f, document: doc } : f)),
      }))
      appendAudit({
        actor: u.name,
        role: u.role,
        action: "document.reattached",
        target: maskRef(fdr.fdrNumber),
        detail: `${doc.kind.toUpperCase()} · ${doc.sizeKb} KB · for comparison in this session`,
      })
      notify("Receipt attached for this session. Compare it against the entered details.")
    },

    /** Officials only. Each reveal is an append-only audit entry. */
    revealNumber(fdr: Fdr) {
      const u = userRef.current
      if (!u || u.role === "institution") return
      appendAudit({
        actor: u.name,
        role: u.role,
        action: "fdr.number_revealed",
        target: maskRef(fdr.fdrNumber),
        detail: "Full FDR number displayed (auto-hides after 60 s)",
      })
    },
  }

  return { state, user, toasts, actions, notify, storageError }
}

type Store = ReturnType<typeof useStoreValue>
const Ctx = createContext<Store | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const value = useStoreValue()
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useStore() {
  const v = useContext(Ctx)
  if (!v) throw new Error("useStore outside provider")
  return v
}
