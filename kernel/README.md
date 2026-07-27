# UrbanOS Feature 1 geometry kernel

This package is the fail-closed geometry and export core for the new Feature 1
workflow. It is separate from the frozen prototype in `../src`.

## What it does

- Resolves survey inputs into canonical planar metres.
- Accepts arbitrary surveyed coordinates and a fail-closed four-sides-plus-
  diagonal reconstruction route for deed/sketch inputs.
- Validates closure, topology, area, evidence, orientation, access, setbacks,
  exclusions, footprints, optional site features, and dimension requests.
- Produces a deeply frozen, digest-branded `ValidatedSitePlan` only after the
  owner explicitly requests **Ready for Professional Review**.
- Builds one canonical drawing model and serializes deterministic DXF R12 and
  vector PDF outputs from that same model.
- Refuses silent closure, snapping, rescaling, default setbacks, unsupported
  geometry, incomplete evidence, and `For Construction` status.

## Verification

```bash
npm run typecheck
npm test
```

The acceptance runner covers fixtures 1–41, three digest/immutability
guardrails, browser-safe hashing, DXF/PDF coordinate parity, both form input
routes, and inseparable reconstructed-boundary provenance. Kernel tests import
only the public surface in `src/index.ts`; the form-route cases exercise the
public `feature1/src/formModel.ts` adapter as an end-to-end contract consumer.

## Boundaries

- The kernel contains no jurisdiction-specific setback values.
- DDA/Haryana profiles select intake conventions; authoritative project values
  must still come from sourced evidence.
- DXF and PDF are local and deterministic. DWG remains disabled until an
  approved conversion route can be round-trip verified.
- “Ready for Professional Review” is not approval for construction or a
  complete authority submission.
