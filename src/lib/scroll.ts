import type { MouseEvent } from "react"

/**
 * Ids on the landing page that in-page links may target. The app uses hash routing,
 * so these must never be written to location.hash (that would be read as a route).
 */
export const LANDING_SECTIONS = ["workflow", "roles", "security", "content"] as const

/**
 * Scrolls to an element without touching the URL. Smooth unless the user prefers
 * reduced motion. Moves focus to the target so keyboard and screen-reader users land there too.
 */
export function scrollToSection(id: string) {
  const el = document.getElementById(id)
  if (!el) return false
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
  el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" })
  if (!el.hasAttribute("tabindex")) el.setAttribute("tabindex", "-1")
  el.focus({ preventScroll: true })
  return true
}

/** onClick handler for an <a href="#id"> that scrolls in-page instead of changing the route. */
export function sectionLink(id: string, after?: () => void) {
  return (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    scrollToSection(id)
    after?.()
  }
}
