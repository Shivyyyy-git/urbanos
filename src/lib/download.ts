// Browser download helpers for generated files (DXF, PDF).

/** Hand `data` to the browser as a file download named `filename`. */
export function downloadFile(filename: string, data: string | Uint8Array, mime: string): void {
  const blob = new Blob([data as BlobPart], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  a.remove()
  // Revoked on a later tick — Safari needs the URL alive while it handles the
  // synthetic click.
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

/** Filesystem-safe slug from a project name. */
export function slug(s: string): string {
  const out = s
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
  return out || 'urbanos-drawing'
}
