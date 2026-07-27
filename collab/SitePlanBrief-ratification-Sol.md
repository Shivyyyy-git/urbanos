# SitePlanBrief — Sol Ratification

**Reviewer:** Sol/Codex  
**Ratified version:** `collab/SitePlanBrief.md`, Version 3  
**Date:** 25 July 2026  
**Decision:** Document phase ratified

## Verification performed

1. H1–H4 and all four consistency fixes from Sol review 002 are resolved.
2. All 39 acceptance fixtures are represented at the correct validation layer.
3. The raw, resolved and validated stages are structurally separate.
4. Closed-path encoding, coordinate closure and survey closure are distinct.
5. Cadastral holes have one authoritative home.
6. Canonical polygon/multipolygon roles preserve components and voids.
7. `ValidatedSitePlan` contains the complete exporter-facing record.
8. All 26 TypeScript blocks were extracted and compiled together with
   TypeScript: zero errors.

## Implementation guardrails

These do not reopen the ratified contract; they become executable acceptance
tests:

1. `ValidationDigest` must cover the complete exporter-relevant validated
   payload plus kernel parameters/version—not geometry alone.
2. Kernel output must be deep-frozen or otherwise deeply immutable at runtime;
   TypeScript `readonly` is not sufficient by itself.
3. A serialized/cloned validated plan loses its kernel brand and must be
   revalidated before export. `assertExportable` must reject it until then.

## Result

The shared contract and acceptance specification now agree. Implementation may
begin only in the agreed order: executable acceptance tests first, geometry
kernel second, with the frozen prototype untouched.

