import { daysUntil } from "./dates"

export const MAX_FILE_BYTES = 5 * 1024 * 1024
export const ALLOWED_EXT = ["pdf", "png", "jpg", "jpeg"] as const
const ALLOWED_MIME = ["application/pdf", "image/png", "image/jpeg"]

export type FdrDraft = {
  fdrNumber: string
  bank: string
  branch: string
  amount: string
  issueDate: string
  maturityDate: string
  beneficiary: string
}

export type Check = { id: string; label: string; ok: boolean; hint?: string }

export function fieldChecks(
  d: FdrDraft,
  hasFile: boolean,
  fileOk: boolean,
): Check[] {
  const amt = Number(d.amount)
  const datesPresent = Boolean(d.issueDate && d.maturityDate)
  const order = datesPresent && new Date(d.maturityDate) > new Date(d.issueDate)
  return [
    {
      id: "fdrNumber",
      label: "FDR number (6–20 digits)",
      ok: /^\d{6,20}$/.test(d.fdrNumber.trim()),
      hint: "Digits only, as printed on the receipt.",
    },
    {
      id: "bank",
      label: "Issuing bank selected",
      ok: d.bank.trim().length > 0,
    },
    { id: "branch", label: "Branch named", ok: d.branch.trim().length >= 2 },
    {
      id: "amount",
      label: "Amount is a positive figure",
      ok: Number.isFinite(amt) && amt > 0,
      hint: "Enter in rupees without commas.",
    },
    {
      id: "dates",
      label: "Issue and maturity dates entered",
      ok: datesPresent,
    },
    {
      id: "order",
      label: "Maturity falls after issue date",
      ok: Boolean(order),
      hint:
        datesPresent && !order
          ? "Maturity date must be later than issue date."
          : undefined,
    },
    {
      id: "future",
      label: "Maturity is not already past",
      ok: Boolean(d.maturityDate) && daysUntil(d.maturityDate) > 0,
    },
    {
      id: "beneficiary",
      label: "Beneficiary named",
      ok: d.beneficiary.trim().length >= 3,
    },
    {
      id: "file",
      label: "Receipt attached (PDF, PNG or JPEG, ≤ 5 MB)",
      ok: hasFile && fileOk,
    },
  ]
}

export type FileVerdict = { ok: boolean; reasons: string[]; detected?: string }

/**
 * Client-side pre-check following OWASP File Upload guidance: extension allowlist,
 * declared MIME allowlist, size limit and magic-byte signature check. The same checks
 * must be repeated server-side before a file is accepted into the private bucket.
 */
export async function inspectFile(file: File): Promise<FileVerdict> {
  const reasons: string[] = []
  const name = file.name
  const parts = name.split(".")
  const ext = parts.length > 1 ? parts.pop()!.toLowerCase() : ""
  const risky = [
    ...ALLOWED_EXT,
    "exe",
    "js",
    "php",
    "html",
    "htm",
    "svg",
    "sh",
    "bat",
    "cmd",
    "jsp",
    "asp",
  ]
  if (
    parts.length > 1 &&
    parts.slice(1).some((p) => risky.includes(p.toLowerCase() as never))
  ) {
    reasons.push("Double extensions are not accepted.")
  }
  if (!ALLOWED_EXT.includes(ext as never))
    reasons.push(`.${ext || "?"} files are not accepted.`)
  if (!ALLOWED_MIME.includes(file.type))
    reasons.push("Declared file type is not PDF, PNG or JPEG.")
  if (file.size > MAX_FILE_BYTES) reasons.push("File is larger than 5 MB.")
  if (file.size === 0) reasons.push("File is empty.")

  let detected: string | undefined
  try {
    const head = new Uint8Array(await file.slice(0, 8).arrayBuffer())
    const hex = Array.from(head, (b) => b.toString(16).padStart(2, "0")).join(
      "",
    )
    if (hex.startsWith("25504446")) detected = "pdf"
    else if (hex.startsWith("89504e470d0a1a0a")) detected = "png"
    else if (hex.startsWith("ffd8ff")) detected = "jpeg"
  } catch {
    /* unreadable */
  }
  if (!detected)
    reasons.push("File contents do not match a PDF, PNG or JPEG signature.")
  else {
    const extFamily = ext === "jpg" ? "jpeg" : ext
    if (ALLOWED_EXT.includes(ext as never) && extFamily !== detected) {
      reasons.push(
        `Extension says .${ext} but contents look like ${detected.toUpperCase()}.`,
      )
    }
  }
  return { ok: reasons.length === 0, reasons, detected }
}

/**
 * Non-blocking check: security-deposit FDRs normally run exactly 1, 2 or 3 years.
 * Takes yyyy-mm-dd strings; returns a warning sentence when the term is unusual.
 */
export function termWarning(issue: string, maturity: string): string | undefined {
  if (!issue || !maturity) return undefined
  const a = new Date(`${issue.slice(0, 10)}T00:00:00Z`)
  const b = new Date(`${maturity.slice(0, 10)}T00:00:00Z`)
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime()) || b <= a) return undefined
  for (const n of [1, 2, 3]) {
    const x = new Date(a)
    x.setUTCFullYear(a.getUTCFullYear() + n)
    if (x.getTime() === b.getTime()) return undefined
  }
  let months = (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + (b.getUTCMonth() - a.getUTCMonth())
  let days = b.getUTCDate() - a.getUTCDate()
  if (days < 0) {
    months -= 1
    days += new Date(Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), 0)).getUTCDate()
  }
  const y = Math.floor(months / 12)
  const m = months % 12
  const parts = [y && `${y} year${y > 1 ? "s" : ""}`, m && `${m} month${m > 1 ? "s" : ""}`, days && `${days} day${days > 1 ? "s" : ""}`].filter(Boolean)
  return `Term is ${parts.join(", ")}. Security deposit FDRs are usually exactly 1, 2 or 3 years. Check both dates against the receipt. You can still submit.`
}
