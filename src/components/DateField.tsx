import { useId, useState, type ReactNode } from "react"
import { AlertTriangle, CalendarCheck } from "lucide-react"
import { cx } from "../lib/format"
import { inputCls } from "./ui"

const longFmt = new Intl.DateTimeFormat("en-GB", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
})

function isoToText(iso: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  return m ? `${m[3]}/${m[2]}/${m[1]}` : ""
}

function mask(raw: string) {
  const d = raw.replace(/\D/g, "").slice(0, 8)
  if (d.length <= 2) return d
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`
}

/** Returns yyyy-mm-dd for a real calendar date, otherwise null. */
function parse(text: string): string | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text)
  if (!m) return null
  const [day, month, year] = [Number(m[1]), Number(m[2]), Number(m[3])]
  if (year < 1990 || year > 2100 || month < 1 || month > 12) return null
  const dt = new Date(Date.UTC(year, month - 1, day))
  if (dt.getUTCDate() !== day) return null
  return `${m[3]}-${m[2]}-${m[1]}`
}

/** "14 December 2025" style echo for a yyyy-mm-dd value. */
export function dateInWords(iso: string) {
  return longFmt.format(new Date(`${iso}T00:00:00Z`))
}

/**
 * DD/MM/YYYY text entry with automatic slashes. Echoes the parsed date in words so a
 * swapped day and month is caught before submission. Emits yyyy-mm-dd, or "" when
 * the entry is incomplete or not a real date.
 */
export function DateField({
  id,
  label,
  value,
  onChange,
  error,
  warning,
  hint,
}: {
  id: string
  label: string
  value: string
  onChange: (iso: string) => void
  error?: string
  warning?: ReactNode
  hint?: string
}) {
  const uid = useId()
  const [text, setText] = useState(() => isoToText(value))
  const [dirty, setDirty] = useState(false)
  const [blurred, setBlurred] = useState(false)
  const parsed = parse(text)

  const own =
    text.length === 10 && !parsed
      ? "That is not a real date. Check the day and month."
      : blurred && dirty && text.length > 0 && text.length < 10
        ? "Enter the full date as DD/MM/YYYY."
        : undefined
  const shownError = own ?? error
  const describedBy = [`${uid}-fmt`, parsed && `${uid}-echo`, shownError && `${uid}-err`, warning && !shownError && `${uid}-warn`]
    .filter(Boolean)
    .join(" ")

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-[13px] font-medium text-ink-2">
        {label}
      </label>
      <input
        id={id}
        inputMode="numeric"
        autoComplete="off"
        placeholder="DD/MM/YYYY"
        maxLength={10}
        className={cx(inputCls, "font-mono tnum")}
        value={text}
        aria-invalid={Boolean(shownError)}
        aria-describedby={describedBy}
        onChange={(e) => {
          const next = mask(e.target.value)
          setText(next)
          setDirty(true)
          onChange(parse(next) ?? "")
        }}
        onBlur={() => setBlurred(true)}
      />
      <p id={`${uid}-fmt`} className="sr-only">
        Format day, month, year. {hint}
      </p>
      <div aria-live="polite">
        {parsed && (
          <p id={`${uid}-echo`} className="mt-1 flex items-center gap-1.5 text-[13px] font-medium text-ink-2">
            <CalendarCheck aria-hidden className="size-3.5 shrink-0 text-green-fg" />
            {dateInWords(parsed)}
          </p>
        )}
        {shownError ? (
          <p id={`${uid}-err`} className="mt-1 text-[13px] text-red-fg">
            {shownError}
          </p>
        ) : warning ? (
          <p id={`${uid}-warn`} className="mt-1.5 flex items-start gap-1.5 rounded-md border border-[#efd3a3] bg-amber-bg px-2.5 py-1.5 text-[13px] text-amber-fg">
            <AlertTriangle aria-hidden className="mt-0.5 size-3.5 shrink-0" />
            <span>{warning}</span>
          </p>
        ) : !parsed && hint ? (
          <p className="mt-1 text-[13px] text-muted">{hint}</p>
        ) : null}
      </div>
    </div>
  )
}
