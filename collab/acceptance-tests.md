# Geometry Kernel — Acceptance-Test Specification

**Owner:** Sol/Codex  
**Reviewer:** Fable/Claude  
**Status:** Draft for review — specification only, no code  
**Scope:** Survey boundary truth, geometry validity, setback containment and
dimension fidelity. No UI, jurisdiction rules, layout generation or legacy-code
changes.

## 1. Acceptance principle

The kernel must fail closed:

- It may produce a **Research Draft** from incomplete or unverified data, but it
  must identify every blocker.
- It may become **Ready for Professional Review** only when every mandatory
  geometry and provenance check below passes.
- Software alone never labels a drawing **For Construction**. That status
  requires the applicable licensed professional's approval outside the kernel.
- The kernel never invents, silently closes, snaps, stretches, rotates or
  rescales a surveyed boundary to make it pass.

## 2. Canonical geometry conventions

1. Internal length unit: **metre**.
2. Internal area unit: **square metre**.
3. Numerical geometry tolerance `EPS`: **0.001 m (1 mm)**.
4. Source precision must be retained. Display rounding must never modify stored
   geometry.
5. An outer boundary may be convex or concave and may contain any number of
   surveyed vertices.
6. One site brief represents one connected outer boundary. Disconnected plots
   are separate briefs in the first kernel.
7. Zero or more explicit inner rings are supported for surveyed exclusions or
   holes. They are never inferred.
8. A canonical polygon records one outer ring and its hole rings explicitly. A
   result with disconnected buildable components is a canonical multipolygon;
   an untyped array of rings is never used because it loses whether each ring is
   an outer boundary or a hole.
9. Canonical rings use an ordered vertex list and an explicit closing edge. An
   importer may remove a repeated final vertex only after verifying it matches
   the first within `EPS`.
10. Coordinate-based polygons are preferred. Bearing-and-distance traverses and
   four-sided side-plus-diagonal reconstruction are input routes into the same
   canonical polygon; their source measurements remain attached as evidence.
11. Calculations use full available precision. There is no 0.5 m or other
    convenience grid.

Exact unit conversions:

- `1 ft = 0.3048 m`
- `1 sq yd (1 gaj) = 0.83612736 m²`

## 3. Closure and survey misclosure

### 3.1 Coordinate or polyline input

A source may encode topological closure in either of two valid ways:

- the first coordinate is repeated as the last and matches within `EPS`; or
- the source carries an explicit closed-polyline flag/closing segment, in which
  case the final-to-first segment is real boundary geometry, not a misclosure.

An input declared open or with unknown closure is not silently joined. It is a
blocking error. A closed flag proves polygon topology only; it does not prove
that a field-survey traverse met a closure ratio. Survey/traverse closure is a
separate claim evaluated under section 3.2.

### 3.2 Bearing-and-distance traverse input

Let:

- `P` = sum of traverse-leg lengths;
- `e` = linear misclosure, the length of the vector sum of all traverse legs;
- closure ratio = `P / e` (infinite when `e = 0`).

Closure is evaluated against an explicit, evidence-linked **closure profile**
that names the measurement method/instrument class and its thresholds. Until
Mannu supplies the pilot's actual survey methods, exactly one profile exists:

- profile ID: `total-station-1:10000`;
- method: total station;
- minimum closure ratio: **1:10,000**;
- absolute misclosure cap: **0.020 m**.

No closure profile or no evidence that the source used that profile's method is
a blocker. A profile failure blocks automatic polygon creation. Adjustment by
Bowditch, transit rule or any other method is outside the kernel until a survey
professional approves the adjusted observations. The 1:10,000 baseline follows
Survey of India guidance for total-station traverse adjustment; the 20 mm cap is
a conservative kernel guard. Tape/chain and other profiles are
**PENDING-MANNU** and must not be guessed.

## 4. Area reconciliation

The kernel computes plan area from the outer ring using the shoelace formula and
subtracts valid inner-ring areas.

Against a stated deed/survey area `A`, let `q` be the source's stated
quantisation/precision step converted to square metres (for example, a deed
rounded to a whole gaj has `q = 0.83612736 m²`):

- pass when absolute difference is at most
  `max(0.25 m², 0.001 × A, 0.5 × q)` — the larger of 0.25 m²,
  **0.10%**, or half the source's stated precision step;
- otherwise block **Ready for Professional Review** and report both values and
  the exact difference.

The boundary is never scaled to match the stated area. A professional may later
resolve the discrepancy by correcting the source or recording an explicit,
signed override. Unknown source precision blocks automatic area reconciliation;
it is not replaced with a guessed rounding band. The override route is
**PENDING-MANNU**.

## 5. Polygon validity

Every outer and inner ring must satisfy all of the following:

1. At least three distinct vertices, and the ring as a whole encloses positive
   area. Individual collinear vertices are valid and preserved.
2. Every coordinate is finite.
3. No consecutive duplicate vertices and no edge of length `≤ EPS`.
4. Positive non-zero enclosed area.
5. Closed within the rule in section 3.
6. No self-crossing, self-touching, cut line, spike or overlapping segment.
7. Adjacent edges meet only at their common endpoint.
8. Non-adjacent edges do not intersect or touch.

For inner rings:

9. Each inner ring lies strictly inside the outer ring.
10. An inner ring does not touch or cross the outer ring.
11. Inner rings do not touch, cross, contain or overlap one another.

Concave polygons are valid. A collinear intermediate survey monument is valid
and must be preserved; an entirely collinear ring is invalid. A narrow but
otherwise valid polygon is not silently rejected as a “sliver,” because narrow
plots can be real. It receives a manual-review warning when either:

- bounding-box aspect ratio exceeds **100:1**; or
- the minimum distance between non-adjacent edges is under **0.10 m**.

It remains blocked from **Ready for Professional Review** until acknowledged.

These topology rules follow the OGC Simple Features model: a polygon has one
simple, closed exterior ring and zero or more valid interior rings.

## 6. Orientation and road-edge truth

1. North may come from a declared coordinate reference system or from an
   explicit rotation.
2. A local-coordinate drawing requires `northRotationDegrees` and a declared
   reference (`true`, `grid` or `magnetic`).
3. Magnetic north also requires observation date/declination metadata.
4. No north information means the north arrow is omitted and
   **Ready for Professional Review** is blocked.
5. Every road frontage references one or more explicit boundary-edge IDs.
6. Every road frontage includes its measured or authoritative width and source.
7. Multiple road edges are allowed. “Front,” “side” and “rear” are derived only
   after road edges and the applicable rule profile are known.
8. A road cannot be placed on an assumed top/bottom/left/right edge.

## 7. Source and verification gate

Every geometry-bearing input must retain:

- source type;
- source document or dataset identifier;
- source date;
- original unit and stated precision;
- verification state;
- responsible surveyor/professional when available;
- file hash or immutable attachment reference for uploaded evidence.

Missing evidence does not prevent a Research Draft, but it blocks
**Ready for Professional Review**. Which documents and signatures satisfy the
gate is **PENDING-MANNU**.

## 8. Setback-containment invariant

The kernel receives edge-specific setback distances as inputs; it does not
choose jurisdiction values.

1. The developable envelope is the inward offset of the valid outer boundary by
   each edge's stated setback and is represented as a canonical polygon or
   multipolygon with explicit outer and hole rings.
2. Explicit holes, easements and no-build zones are subtracted from that
   envelope using their stated clearances.
3. A building footprint passes only when its entire closed geometry lies inside
   or exactly on the developable-envelope boundary within `EPS`.
4. Any building point or segment more than `EPS` outside the envelope fails.
5. Testing vertices alone is insufficient; every building segment must also be
   tested for crossing an envelope or exclusion boundary.
6. Building footprints must also be valid rings and may not overlap one another.
7. If the offset collapses, fragments unexpectedly or produces no usable
   envelope, layout generation is blocked. The setback is never reduced to make
   a building fit.
8. Proposed balconies, ramps, canopies and other projections must be separate
   geometry classes so a future rule profile can decide whether each is allowed.

## 9. Dimension-equals-geometry invariant

1. A dimension annotation references geometry IDs and witness points; its
   numeric text is generated, never independently typed.
2. The raw dimension value must equal the Euclidean or aligned distance from its
   referenced coordinates within `EPS`.
3. A displayed value must equal the raw value rounded under an explicit drawing
   precision profile. Default draft precision is **0.001 m**; pilot conventions
   are **PENDING-MANNU**.
4. Chained dimensions must reconcile with the referenced overall geometry
   within `EPS × (segmentCount + 1)`.
5. Boundary side labels, area labels, road widths and setback labels must all
   derive from the same canonical geometry used by the exporter.
6. DXF and PDF must receive the same canonical geometry and dimension values.

## 10. Determinism and output parity

For identical canonical input and rule parameters:

1. Canonical geometry and validation results are byte-stable after excluding
   explicitly non-deterministic metadata such as generation time.
2. No coordinate contains `NaN`, infinity or an out-of-range value.
3. DXF and PDF plot boundary, exclusions, setbacks, road edges, buildings and
   dimensions at the same coordinates and units.
4. Re-parsing DXF recovers each critical coordinate within `EPS`.
5. Measuring rendered PDF geometry at its declared scale agrees within the
   physical output tolerance of **0.25 mm on paper**.
6. If a sheet cannot contain the drawing at the declared scale, export fails
   clearly; it does not silently rescale.
7. DWG must eventually be produced by a verified conversion of the accepted DXF
   and pass the same round-trip coordinate comparison. Route selection is in
   `collab/dwg-conversion-research.md`.
8. A sides-plus-diagonal boundary must remain visibly labelled as reconstructed
   in the shared drawing model, DXF, PDF and parity manifest; an app-only warning
   is insufficient because exported files travel independently.

## 11. Required acceptance-test catalogue

### Valid fixtures

1. Axis-aligned rectangle.
2. Rotated rectangle with explicit north.
3. Irregular convex quadrilateral.
4. Concave polygon with more than four vertices.
5. Polygon containing a preserved collinear survey monument.
6. Valid polygon with one explicit inner exclusion.
7. Multiple declared road edges.
8. Bearing-distance traverse exactly at its declared closure-profile threshold.
9. Area difference exactly at the reconciliation threshold.
10. Building exactly on the permitted setback line within `EPS`.
11. Unit-equivalent versions in metres, feet and gaj/square yards.

### Blocking fixtures

12. Missing, open or over-tolerance boundary closure.
13. Traverse at worse than 1:10,000 or above the 20 mm cap.
14. Fewer than three distinct vertices.
15. All-collinear vertices.
16. Duplicate consecutive point or zero-length edge.
17. Bow-tie self-intersection.
18. Self-touching ring, spike or overlapping segment.
19. Hole outside, touching or crossing the exterior ring.
20. Two holes touching or overlapping.
21. Area mismatch just above tolerance.
22. Missing north basis.
23. Road frontage without a referenced boundary edge or source width.
24. Building vertex outside the setback envelope.
25. Building segment crossing a concave setback envelope while its vertices
    appear inside.
26. Two overlapping building footprints.
27. Setback offset that leaves no valid developable envelope.
28. Kernel-internal dimension record whose generated value differs from its
    referenced geometry. This is an internal invariant test, not a brief-input
    fixture.
29. DXF/PDF coordinate, unit, orientation or declared-scale mismatch. This is
    an exporter-level parity test over one validated plan, not a brief-input
    fixture.
30. Any unverified mandatory geometry source requesting a status above
    Research Draft.
33. Magnetic-north input missing observation date or declination context.
34. Legacy four-side-plus-diagonal reconstruction with unresolved assembly or
    mirror orientation.

### Review-only fixtures

31. Narrow but topologically valid sliver polygon.
32. Deed-area conflict resolved only by an explicit professional override.

### Additional mandatory fixtures discovered during contract review

35. Four-point polygon with an explicit closed-polyline flag and no repeated
    first coordinate passes topological closure.
36. Setback/encumbrance subtraction producing multiple buildable components
    and an inner void preserves component and hole roles; a footprint inside
    the void fails containment.
37. Any non-finite coordinate or measurement blocks before geometry operations.
38. An angle entry containing both decimal and DMS forms, neither form, or a
    non-finite value blocks resolution.
39. A source length labelled only as an ambiguous/non-Gunter chain or link
    blocks conversion until an evidence-linked factor is supplied.
40. Review elevation blocks unless the owner explicitly requests it and the
    identity, drawing profile, access frontage, area, ranges, evidence,
    identifiers and kernel parameters are complete and safe.
41. Every supplied optional feature, restriction, footprint, projection,
    encumbrance or dimension request either validates fully or blocks; no
    malformed or unsupported item may disappear or become a zero value.

## 12. Exit criteria for the kernel phase

The kernel specification is accepted only when:

1. Fable reviews every threshold and records agreement or a concrete objection
   in `collab/LEDGER.md`.
2. The `SitePlanBrief` contract can represent every valid and invalid fixture
   without invented values.
3. Each test has one deterministic expected result and stable error code.
4. PENDING-MANNU fields are isolated so later answers change configuration or
   evidence profiles, not the canonical geometry model.
5. Only after both documents pass review may implementation begin.

## 13. Primary references

- Survey of India, Departmental Chapter IV: total-station traverse adjustment
  should not be less accurate than 1:10,000:
  https://surveyofindia.gov.in/documents/soichapter-iv.pdf
- OGC GeoPackage / Simple Features geometry model: polygons use simple, closed
  rings and may contain interior rings:
  https://docs.ogc.org/is/12-128r19/12-128r19.html
- OGC Simple Features Common Architecture: no cut lines, spikes or crossing
  polygon rings:
  https://docs.ogc.org/is/06-103r3/06-103r3.pdf
- DDA Unified Building Bye-Laws compendium: site plans use metric dimensions,
  standard sheets, declared scales and North Point:
  https://www.dda.gov.in/sites/default/files/public-notice/COMPENDIUM_OF_UBBL_201605082020.pdf
