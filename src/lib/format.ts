export function maskRef(fdrNumber: string) {
  const digits = fdrNumber.replace(/\D/g, "")
  return `••••${digits.slice(-4)}`
}

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
})

export function fmtINR(n: number) {
  return inr.format(n)
}

export function fmtINRCompact(n: number) {
  if (n >= 1_00_00_000) return `₹${(n / 1_00_00_000).toFixed(2)} Cr`
  if (n >= 1_00_000) return `₹${(n / 1_00_000).toFixed(2)} L`
  return fmtINR(n)
}

export function cx(...parts: Array<string | false | null | undefined | 0>) {
  return parts.filter(Boolean).join(" ")
}

export function downloadCsv(
  filename: string,
  rows: Array<Array<string | number>>,
) {
  const esc = (v: string | number) => {
    const s = String(v)
    // Neutralise spreadsheet formula injection and quote every cell.
    const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s
    return `"${safe.replace(/"/g, '""')}"`
  }
  const csv = rows.map((r) => r.map(esc).join(",")).join("\r\n")
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
