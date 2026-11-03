import { useEffect, useRef, type ReactNode } from "react"
import { ArrowLeft, Compass, Lock, SearchX, TriangleAlert } from "lucide-react"
import { cx } from "../lib/format"
import { LinkButton } from "./ui"

const ICONS = { notFound: SearchX, forbidden: Lock, unavailable: Compass, crash: TriangleAlert }

/**
 * Full-page error or "you can't do this here" state: an h1, a short explanation and
 * at least one clear way back. Focus moves to the heading so screen readers announce it.
 */
export function ErrorScreen({
  kind = "notFound",
  title,
  children,
  actions,
}: {
  kind?: keyof typeof ICONS
  title: string
  children: ReactNode
  actions: { to: string; label: string; primary?: boolean }[]
}) {
  const h = useRef<HTMLHeadingElement>(null)
  useEffect(() => h.current?.focus(), [])
  const Icon = ICONS[kind]
  return (
    <section className="mx-auto flex max-w-xl flex-col items-center px-4 py-16 text-center">
      <span className={cx("grid size-14 place-items-center rounded-2xl", kind === "crash" ? "bg-red-bg text-red-fg" : "bg-gold-soft text-gold-700")}>
        <Icon aria-hidden className="size-7" />
      </span>
      <h1 ref={h} tabIndex={-1} className="mt-5 text-[28px] font-semibold leading-tight text-ink focus:outline-none">
        {title}
      </h1>
      <div className="mt-2 text-[15px] leading-relaxed text-ink-3">{children}</div>
      <div className="mt-7 flex flex-wrap justify-center gap-2">
        {actions.map((a) => (
          <LinkButton key={a.to + a.label} to={a.to} variant={a.primary ? "primary" : "secondary"}>
            {a.primary && <ArrowLeft aria-hidden className="size-4" />}
            {a.label}
          </LinkButton>
        ))}
      </div>
    </section>
  )
}
