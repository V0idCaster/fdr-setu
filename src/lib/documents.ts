import type { DocumentMeta, Fdr } from "../data/types"
import { nowIso } from "./dates"

/** Builds document metadata for a file the user just uploaded in this browser session. */
export function toDocMeta(file: File, detected: string): DocumentMeta {
  const kind = detected as DocumentMeta["kind"]
  // Stored under a generated name; the user-supplied filename is kept only as display metadata.
  return {
    name: file.name.replace(/[^\w.\- ]+/g, "_").slice(0, 80),
    kind,
    sizeKb: Math.max(1, Math.round(file.size / 1024)),
    uploadedAt: nowIso(),
    localUrl: URL.createObjectURL(file),
    storagePath: `fdr-documents/${crypto.randomUUID()}.${kind === "jpeg" ? "jpg" : kind}`,
    source: "upload",
  }
}

/**
 * How the document on a case can be shown in this session:
 * - "sample": synthetic seed receipt, rendered for demonstration only
 * - "file":   a real file uploaded in this session (contents not machine-read)
 * - "unavailable": a real upload from an earlier session; the file itself was never persisted
 */
export function documentAvailability(fdr: Fdr): "sample" | "file" | "unavailable" | "none" {
  const d = fdr.document
  if (!d) return "none"
  if (d.source !== "upload") return "sample"
  return d.localUrl ? "file" : "unavailable"
}
