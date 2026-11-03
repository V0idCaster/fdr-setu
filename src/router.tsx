import { useEffect, useState, type AnchorHTMLAttributes } from "react"

function current() {
  return window.location.hash.replace(/^#/, "") || "/"
}

export function useRoute() {
  const [path, setPath] = useState(current)
  useEffect(() => {
    const on = () => {
      setPath(current())
      window.scrollTo({ top: 0 })
    }
    window.addEventListener("hashchange", on)
    return () => window.removeEventListener("hashchange", on)
  }, [])
  return path
}

export function navigate(to: string) {
  window.location.hash = to
}

export function match(
  pattern: string,
  path: string,
): Record<string, string> | null {
  const p = pattern.split("/").filter(Boolean)
  const a = path.split("?")[0].split("/").filter(Boolean)
  if (p.length !== a.length) return null
  const params: Record<string, string> = {}
  for (let i = 0; i < p.length; i++) {
    if (p[i].startsWith(":")) params[p[i].slice(1)] = decodeURIComponent(a[i])
    else if (p[i] !== a[i]) return null
  }
  return params
}

export function Link({
  to,
  ...rest
}: { to: string } & AnchorHTMLAttributes<HTMLAnchorElement>) {
  return <a href={`#${to}`} {...rest} />
}
