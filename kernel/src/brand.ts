// ---------------------------------------------------------------------------
// The kernel brand.
//
// A ValidatedSitePlan carries this symbol as a key. Because the symbol is not
// re-exported from index.ts, ordinary callers cannot construct a plan literal:
// they have no way to name the key. That stops accidental misuse at compile time.
//
// It is NOT a security boundary, and the spec says so explicitly (§7.6). A deep
// import of this module, an `as unknown as ValidatedSitePlan` cast, or a
// structuredClone that drops the symbol all defeat it. That is precisely why
// assertExportable re-verifies the digest at runtime rather than trusting the
// brand's presence.
// ---------------------------------------------------------------------------

export const KERNEL_BRAND: unique symbol = Symbol('urbanos.kernel.validated')
export type KERNEL_BRAND = typeof KERNEL_BRAND
