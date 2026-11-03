import type { ButtonHTMLAttributes, ReactNode } from "react"
import { Info, ShieldAlert } from "lucide-react"
import { cx } from "../lib/format"
import type { Tone } from "../data/selectors"
import { Link } from "../router"

type BtnVariant = "primary" | "gold" | "secondary" | "ghost" | "danger" | "inactive"
const BTN: Record<BtnVariant, string> = {
  primary: "bg-brand text-white hover:bg-brand-hover border border-brand",
  /** Looks unavailable but stays focusable and clickable, so it can explain what is missing. */
  inactive: "cursor-not-allowed border border-dashed border-line-strong bg-paper-2 text-muted",
  gold: "bg-gold text-ink hover:bg-[#d4b170] border border-gold-600",
  secondary:
    "bg-surface text-ink border border-line-strong hover:border-ink-3 hover:bg-paper",
  ghost: "text-ink-3 hover:bg-paper-2 border border-transparent",
  danger: "bg-surface text-red-fg border border-[#e7b9b6] hover:bg-red-bg",
}
const SIZE = {
  sm: "h-8 px-3 text-[13px] gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
  lg: "h-12 px-6 text-[15px] gap-2",
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: BtnVariant
  size?: keyof typeof SIZE
}) {
  return (
    <button
      {...rest}
      className={cx(
        "inline-flex items-center justify-center rounded-md font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-45",
        BTN[variant],
        SIZE[size],
        className,
      )}
    />
  )
}

export function LinkButton({
  to,
  variant = "primary",
  size = "md",
  className,
  children,
}: {
  to: string
  variant?: BtnVariant
  size?: keyof typeof SIZE
  className?: string
  children: ReactNode
}) {
  return (
    <Link
      to={to}
      className={cx(
        "inline-flex items-center justify-center rounded-md font-medium transition-colors",
        BTN[variant],
        SIZE[size],
        className,
      )}
    >
      {children}
    </Link>
  )
}

const TONE: Record<Tone, { chip: string; dot: string }> = {
  amber: {
    chip: "bg-amber-bg text-amber-fg ring-[#efd3a3]",
    dot: "bg-amber-dot",
  },
  red: { chip: "bg-red-bg text-red-fg ring-[#efc2bf]", dot: "bg-red-dot" },
  green: {
    chip: "bg-green-bg text-green-fg ring-[#bcdcc8]",
    dot: "bg-green-dot",
  },
  slate: {
    chip: "bg-slate-bg text-slate-fg ring-[#d3d9e2]",
    dot: "bg-slate-dot",
  },
  neutral: { chip: "bg-paper-2 text-muted ring-line", dot: "bg-line-strong" },
}

export function Chip({
  tone,
  children,
  className,
}: {
  tone: Tone
  children: ReactNode
  className?: string
}) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[13px] font-medium ring-1 ring-inset tnum",
        TONE[tone].chip,
        className,
      )}
    >
      <span
        aria-hidden
        className={cx("size-1.5 rounded-full", TONE[tone].dot)}
      />
      {children}
    </span>
  )
}

export function Card({
  children,
  className,
  as: As = "section",
}: {
  children: ReactNode
  className?: string
  as?: "section" | "div" | "article"
}) {
  return (
    <As className={cx("rounded-xl border border-line bg-surface", className)}>
      {children}
    </As>
  )
}

export function CardHeader({
  title,
  sub,
  action,
  id,
}: {
  title: ReactNode
  sub?: ReactNode
  action?: ReactNode
  id?: string
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4">
      <div>
        <h2 id={id} className="text-[17px] font-semibold text-ink">
          {title}
        </h2>
        {sub && <p className="mt-0.5 text-[13px] text-muted">{sub}</p>}
      </div>
      {action}
    </div>
  )
}

export function PageHeader({
  eyebrow,
  title,
  sub,
  actions,
}: {
  eyebrow?: string
  title: string
  sub?: ReactNode
  actions?: ReactNode
}) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-3xl">
        {eyebrow && (
          <p className="mb-1.5 text-[13px] font-semibold uppercase tracking-[0.14em] text-gold-700">
            {eyebrow}
          </p>
        )}
        <h1 className="text-[28px] font-semibold leading-tight text-ink sm:text-[32px]">
          {title}
        </h1>
        {sub && (
          <p className="mt-2 text-[15px] leading-relaxed text-muted">{sub}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  )
}

export function Disclaimer({
  children,
  variant = "info",
  className,
}: {
  children: ReactNode
  variant?: "info" | "warn"
  className?: string
}) {
  const Icon = variant === "warn" ? ShieldAlert : Info
  return (
    <div
      className={cx(
        "flex gap-2.5 rounded-lg border px-3.5 py-3 text-[13px] leading-relaxed",
        variant === "warn"
          ? "border-[#ecd6a8] bg-amber-bg/60 text-amber-fg"
          : "border-line bg-paper text-ink-3",
        className,
      )}
    >
      <Icon aria-hidden className="mt-0.5 size-4 shrink-0" />
      <div>{children}</div>
    </div>
  )
}

export const DISCLAIMER_TRACKING =
  "FDR SETU supports administrative tracking. It does not replace regulations, competent-authority decisions or bank verification."
export const DISCLAIMER_UPLOAD =
  "Uploading or validating a document does not prove a bank-issued FDR is genuine."

export function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
  className,
}: {
  label: string
  htmlFor: string
  hint?: string
  error?: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={className}>
      <label
        htmlFor={htmlFor}
        className="mb-1.5 block text-[13px] font-medium text-ink-2"
      >
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${htmlFor}-err`} className="mt-1 text-[13px] text-red-fg">
          {error}
        </p>
      ) : hint ? (
        <p id={`${htmlFor}-hint`} className="mt-1 text-[13px] text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  )
}

export const inputCls =
  "block h-10 w-full rounded-md border border-line-strong bg-surface px-3 text-[14px] text-ink placeholder:text-[#8b867c] focus:border-ink-3 focus:outline-2 focus:outline-offset-0 focus:outline-gold-600 aria-[invalid=true]:border-red-dot"

export function Empty({
  title,
  children,
}: {
  title: string
  children?: ReactNode
}) {
  return (
    <div className="hatch rounded-lg border border-dashed border-line-strong px-6 py-10 text-center">
      <p className="font-display text-[17px] font-semibold text-ink">{title}</p>
      {children && (
        <div className="mt-1 text-[13px] text-muted">{children}</div>
      )}
    </div>
  )
}

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded border border-line-strong bg-paper px-1.5 py-0.5 font-mono text-[13px] text-ink-3">
      {children}
    </kbd>
  )
}

export function SrOnly({ children }: { children: ReactNode }) {
  return <span className="sr-only">{children}</span>
}

/** Segmented control built on real radio inputs: native arrow-key movement and form semantics. */
export function SegmentedRadio<T extends string>({
  name,
  legend,
  value,
  options,
  onChange,
}: {
  name: string
  legend: string
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
}) {
  return (
    <fieldset>
      <legend className="sr-only">{legend}</legend>
      <div className="grid gap-1 rounded-lg bg-paper-2 p-1" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
        {options.map((o) => (
          <label
            key={o.value}
            className="cursor-pointer rounded-md py-1.5 text-center text-[13px] font-medium text-muted has-[:checked]:bg-surface has-[:checked]:text-ink has-[:checked]:shadow-sm has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-1 has-[:focus-visible]:outline-gold-600"
          >
            <input type="radio" name={name} value={o.value} checked={value === o.value} onChange={() => onChange(o.value)} className="sr-only" />
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  )
}
