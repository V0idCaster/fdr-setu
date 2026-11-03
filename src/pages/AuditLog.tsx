import { useState } from "react"
import { Download, Lock, Search } from "lucide-react"
import { useStore } from "../data/store"
import { ROLE_LABEL, visibleFdrs } from "../data/selectors"
import { fmtDateTime } from "../lib/dates"
import { downloadCsv, maskRef } from "../lib/format"
import { AuditWhat, auditSentence } from "../components/AuditSentence"
import {
  Button,
  Card,
  Disclaimer,
  inputCls,
  PageHeader,
} from "../components/ui"

export default function AuditLog() {
  const { state, user } = useStore()
  const [q, setQ] = useState("")
  const [role, setRole] = useState("")
  const [limit, setLimit] = useState(50)
  if (!user) return null

  const refs = new Set(
    visibleFdrs(state.fdrs, user).map((f) => maskRef(f.fdrNumber)),
  )
  const scoped =
    user.role === "institution"
      ? state.audit.filter((a) => refs.has(a.target) || a.actor === user.name)
      : state.audit
  const needle = q.trim().toLowerCase()
  const rows = scoped
    .filter((a) => !role || a.role === role)
    .filter(
      (a) =>
        !needle ||
        [a.actor, a.action, a.target, a.detail, auditSentence(a)]
          .join(" ")
          .toLowerCase()
          .includes(needle),
    )
    .slice()
    .sort((a, b) => b.at.localeCompare(a.at))

  return (
    <>
      <PageHeader
        eyebrow="Accountability"
        title="Audit log"
        sub={
          user.role === "institution"
            ? "Actions on your institution’s instruments."
            : "Every action across the portal: who did it, what it was and when."
        }
        actions={
          <Button
            variant="secondary"
            onClick={() =>
              downloadCsv("fdr-audit-log.csv", [
                [
                  "Timestamp (ISO)",
                  "Actor",
                  "Role",
                  "What happened",
                  "Action",
                  "Target",
                  "Detail",
                ],
                ...rows.map((a) => [
                  a.at,
                  a.actor,
                  ROLE_LABEL[a.role],
                  auditSentence(a),
                  a.action,
                  a.target,
                  a.detail,
                ]),
              ])
            }
          >
            <Download aria-hidden className="size-4" /> Export CSV
          </Button>
        }
      />

      <div className="mb-4 flex items-start gap-3 rounded-xl border border-[#e6d3a8] bg-gold-soft/60 px-4 py-3 text-[13px] text-ink-3">
        <Lock aria-hidden className="mt-0.5 size-4 shrink-0 text-gold-700" />
        <p>
          <span className="font-semibold text-ink">Append-only: simulated in this prototype.</span> Entries are added to
          this browser’s storage, and this interface offers no way to edit or remove them. In production the audit table will grant{" "}
          <code className="font-mono text-gold-700">INSERT</code> only, with <code className="font-mono text-gold-700">UPDATE</code> and{" "}
          <code className="font-mono text-gold-700">DELETE</code> revoked for every role and blocked by a trigger.
        </p>
      </div>

      <Card>
        <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row">
          <div className="relative flex-1">
            <label htmlFor="audit-q" className="sr-only">
              Search audit log
            </label>
            <Search
              aria-hidden
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted"
            />
            <input
              id="audit-q"
              type="search"
              className={`${inputCls} pl-9`}
              placeholder="Search what happened, actor, FDR or code"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <label htmlFor="audit-role" className="sr-only">
            Role
          </label>
          <select
            id="audit-role"
            className={`${inputCls} sm:w-52`}
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            <option value="">All actors</option>
            {(["institution", "scrutiny", "authority", "system"] as const).map(
              (r) => (
                <option key={r} value={r}>
                  {ROLE_LABEL[r]}
                </option>
              ),
            )}
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-[13.5px]">
            <caption className="sr-only">Audit entries, newest first</caption>
            <thead>
              <tr className="border-b border-line bg-paper text-[13px] text-muted">
                <th scope="col" className="px-5 py-2.5 font-semibold">
                  When
                </th>
                <th scope="col" className="px-3 py-2.5 font-semibold">
                  Who
                </th>
                <th scope="col" className="px-5 py-2.5 font-semibold">
                  What happened
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.slice(0, limit).map((a) => (
                <tr key={a.id} className="align-top hover:bg-paper">
                  <td className="whitespace-nowrap px-5 py-3 text-muted tnum">{fmtDateTime(a.at)}</td>
                  <td className="whitespace-nowrap px-3 py-3">
                    <span className="font-medium text-ink">{a.actor}</span>
                    <span className="block text-[13px] text-muted">{ROLE_LABEL[a.role]}</span>
                  </td>
                  <td className="px-5 py-3">
                    <AuditWhat entry={a} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-line px-5 py-3 text-[13px] text-muted tnum">
          <span>
            Showing {Math.min(limit, rows.length)} of {rows.length}
          </span>
          {rows.length > limit && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setLimit((l) => l + 50)}
            >
              Load more
            </Button>
          )}
        </div>
      </Card>
      <Disclaimer className="mt-6">
        Audit rows record the minimum needed for accountability: display name,
        role, action and masked instrument reference. No contact details or
        identifiers are stored here.
      </Disclaimer>
    </>
  )
}
