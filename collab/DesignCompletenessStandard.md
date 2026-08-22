# Design Completeness Standard — when a drawing may call itself "designed"

> **Ratified for gating 2026-08-22 (ledger 083).** Sol gates (ruling the five-status↔two-stamp question with B-04 in the same pass); then Mannu redline — explicitly add the DDJAY policy instrument slot.

**Status:** v1.0-DRAFT — not ratified. Sol gates adoption; Mannu redlines domain content; Shivam ratifies.
**Owner:** Fable (draft) · **Gatekeeper:** Sol · **Domain authority:** Mannu (all drawing-practice, statutory and survey questions route to him)
**Parent:** `collab/BusinessThesis.md` v2 · Mannu's Alignment Review (`reference/mannu-2026-08-21/UrbanOS_Alignment_Review_for_Shivam.pdf`, §4 and §5) · `collab/LEDGER.md` 072–082
**Supersedes:** nothing yet. The THD 18-gate harness stays frozen with the accepted townhouse demo (ledger 049). This document is the gate set for the **rebuilt design engine** and every drawing it emits.

**Why this document exists.** Mannu scored the 2BHK at 2.5/10 *as an UrbanOS output* (ledger 081): correct-looking geometry with no structure, no services, no clearances, and active assumptions printed as if resolved. His §4 verdict on the community map was the same failure at site scale: a "parametric yield schematic," not a plan. Both failures share one root — the engine treated *rendered* as *designed*. This standard defines "designed" as a testable property, so the claim can never again outrun the content.

**Evidence labels used throughout:** `[verified-primary: URL]` = official government source read directly · `[web-sourced, unverified]` = found on the web, recorded with URL and date, never operative · `[inferred]` = reasoning, needs confirmation · `[Mannu §n]` = Mannu's Alignment Review section · `[ledger nnn]` = LEDGER.md entry.

---

## 0. Rules of the standard

1. **A drawing may print the word "designed" — or carry any status above PRELIMINARY FEASIBILITY — only when every applicable gate below returns PASS and the final gate F-00 returns PASS.** A unit drawing must pass all B-gates + U-gates + F-00. A site drawing must pass all B-gates + S-gates + F-00. A submission containing both scales passes everything.
2. **Gate verdicts use the compliance vocabulary:** PASS / FAIL / UNKNOWN / NOT APPLICABLE. UNKNOWN is a first-class verdict: it means a required input or statutory value is missing, and it converts automatically into a **blocking question** (gate F-00). NOT APPLICABLE requires a recorded reason ("no basement in this design"), never silence.
3. **No statutory value lives in this document.** Every rule-number this standard depends on is a named **TO-LOAD slot** (Part D). A slot is filled only from the rule-pack — five layers: Source / Applicability / Rule / Time-status / Provenance (`BusinessThesis.md` moat section) — never from memory, never from a web number, never from this file. A gate whose slot is unfilled returns UNKNOWN, not a guessed PASS.
4. **Stayed and suspended rules print as stayed.** The rule-pack's time/status layer (in force / superseded / amended / **stayed** / withdrawn / contested) flows onto the sheet. "In force on paper, not currently sanctionable" is a legal state this corridor actually exhibits (the S+4 stay — `ResearchSprint-Stage1.md` F1) and the drawing must be able to say it.
5. **Withdrawn sources stay withdrawn.** Nothing in any gate may be satisfied by citing, reconstructing, or benchmarking against the withdrawn brochure references (ledger 079). Marketing material of any origin is never measured geometry (gate U-01).
6. **No traced geometry, ever.** No boundary, road, plot or building outline may be digitised from a basemap or satellite image (standing licence rule; `ResearchSprint-Stage1.md` §2.3–2.4). Basemaps are rendering context only; ODbL data is never ingested. Visual references are style benchmarks only.
7. **Metric only.** One unit system per drawing set, declared once (gate B-01). DTCP Haryana, HSVP and the ULBs are distinct authorities; the governing authority for the parcel is an output of Stage-0 regime resolution, never an assumption.
8. **This standard is upstream of the State's checker.** Haryana operates its own Quick DCR scrutiny at submission (`ResearchSprint-Stage1.md` F2). These gates are not a re-implementation of that checker; they define what a *design* must contain before any checking — ours or the State's — is even meaningful. We never pitch "checking."

**How Sol runs the gates.** Sol's verification is adversarial and mechanical wherever possible: recompute, don't re-read; enumerate, don't sample; regenerate and compare where determinism-of-record applies (ledger 078). For every gate below, "Sol verifies" names the concrete procedure. Where a gate needs Mannu's professional eye (drawing practice, buildability), the gate says so explicitly — Sol checks presence and consistency; Mannu judges adequacy.

---

## Part A — BOTH scales (foundation gates)

### B-01 · Single unit system
- **Requires:** every dimension, area, level and schedule value in the drawing set is metric; the unit and precision convention (e.g. millimetres for building dimensions, metres for site dimensions, square metres for areas) is declared once in the title block and never mixed.
- **Pass condition:** zero non-metric values; zero undeclared-unit values; one declared convention per drawing set.
- **Sol verifies:** machine-scan every dimension string, schedule cell and annotation in the emitted DXF/PDF for unit tokens; any imperial residue, any bare number whose unit cannot be resolved from the declared convention, or any intra-set convention switch = FAIL.

### B-02 · Full technical title block
- **Requires [Mannu §4]:** project/parcel identity · issuing authority for the parcel (as resolved by Stage 0, not asserted) · coordinate system and datum of the survey · drawing status · issue/revision number and date · pointer to the source register · **rule-pack version identifier** · pointer to the full calculation schedule · sheet number/total · scale(s) and north point (site sheets) / orientation reference (unit sheets).
- **Pass condition:** all fields present and each field's value cross-checks against the project record (the parcel identity matches the survey document; the rule-pack version matches the pack actually loaded at generation time; the revision matches the register).
- **Sol verifies:** field-by-field checklist, then cross-reference each value to its record. A title block that is present but self-inconsistent (e.g. rule-pack version on the sheet ≠ pack digest in the run record) = FAIL.

### B-03 · Every printed number traces
- **Requires:** every statutory or derived number printed anywhere on the sheet (a setback, a FAR, a stall count, a fixture count, an area) resolves either to (a) a rule-pack entry with all five layers populated, or (b) a computation in the calculation schedule whose inputs themselves trace.
- **Pass condition:** zero orphan numbers. Every rule citation carries source, applicability, effective date, and current status — including **stayed/suspended** where that is the truth.
- **Sol verifies:** enumerate all numeric annotations, walk each to its rule-pack entry or calculation-schedule line. One untraceable number = FAIL. Spot-check that time/status on the sheet matches the pack (a stayed rule printed as operative = FAIL, frozen-forgery class).

### B-04 · Status label is earned, not decorative
- **Requires:** the drawing carries exactly one lifecycle status from Mannu's five (PRELIMINARY FEASIBILITY → COMPLIANCE-CHECKED DESIGN → SUBMISSION-READY → APPROVED → ISSUED FOR CONSTRUCTION) **[proposed — the five-status ↔ two-stamp reconciliation is a pending Sol gate, `BusinessThesis.md` open question 6]**, and the status matches its gateway condition. APPROVED never appears without the competent authority's approval identifier and date attached [Mannu §6].
- **Pass condition:** status present, singular, and its gateway condition demonstrably met; any drawing failing a gate in this standard carries at most PRELIMINARY FEASIBILITY.
- **Sol verifies:** read the status, check the gateway: COMPLIANCE-CHECKED DESIGN requires rule pack + assumptions register + unresolved-items register attached; SUBMISSION-READY requires the authorised professional's review record; APPROVED requires the authority identifier/date. Absence of the gateway evidence = FAIL.

### B-05 · Area vocabulary kept apart
- **Requires:** carpet, built-up and super built-up areas (unit scale) and gross vs net areas (site scale) are never conflated; every area figure states its **measurement boundary** (what is included/excluded: wall centrelines, finished faces, shafts, balconies, common areas) and the convention it follows (convention itself a TO-LOAD slot, TL-22).
- **Pass condition:** each printed area names its type and boundary; no figure is presented as "the area"; carpet area is not called *defensible* until measurement boundary, wall/shaft treatment and source geometry are verified [Mannu §5, additional corrections].
- **Sol verifies:** recompute every area figure from the emitted geometry under its declared boundary; mismatch beyond declared tolerance = FAIL; any area whose type/boundary is undeclared = FAIL.

### B-06 · Geometry provenance
- **Requires:** every geometric input names its source in the source register: surveyed boundary (surveyor, date, document), approved layout plan (instrument, date), declared client input, or engine-generated design geometry. Basemap/satellite layers appear only as context, visually marked as context, and contribute zero vertices.
- **Pass condition:** 100% of geometry carries provenance; zero vertices derive from basemaps, satellite imagery, ODbL data, or withdrawn sources (ledger 079).
- **Sol verifies:** audit the run record's input manifest; diff design geometry against any loaded context layers for suspicious coincidence (vertex-level overlap between design geometry and a rendering-only layer = investigate as tracing = FAIL until cleared).

### B-07 · Dimensional coherence and CAD integrity
- **Requires:** closed polygons; dimension chains that sum (part dimensions = overall dimensions); schedules that reconcile with geometry (plot schedule totals = drawn plots; door schedule count = drawn doors); the exported CAD file passes an independent structural audit (ezdxf audit per `Stage1Spec.md` §9.9); the PDF and DXF depict the same geometry.
- **Pass condition:** zero open rings, zero non-summing dimension chains, zero schedule/geometry mismatches, clean CAD audit, reproducible from the run record (design freedom, deterministic record — ledger 078).
- **Sol verifies:** automated geometry audit + independent recomputation of every dimension chain and schedule total + regenerate-from-record and byte-compare the outputs (ledger 051 procedure).

### B-08 · The register triad travels with the drawing
- **Requires:** three registers attached to (or unambiguously referenced by) every issued drawing: **source register** (every document/geometry input, with dates), **assumption/decision register** (every user decision, every labelled presentation-default), **unresolved-items register** (every open blocking question, every UNKNOWN verdict). This is MVP output 08 [Mannu §3].
- **Pass condition:** all three present, current to this revision, and consistent with the sheet (nothing on the sheet contradicts a register entry).
- **Sol verifies:** presence, revision-match, then cross-check: pick every UNKNOWN gate verdict and confirm it appears in the unresolved-items register; pick every register assumption and confirm the sheet labels it (feeds F-00).

---

## Part B — UNIT SCALE gates

*Built from Mannu §5 (three worst issues + additional corrections) and his WhatsApp scorecard (ledger 081). The 2BHK failed here; these gates are its repair manual.*

### U-01 · Verified input, never a brochure
- **Requires [Mannu §5, worst issue 1]:** the plan derives from measured or verified sources only — a surveyed plot with a verified brief, or a verified accepted drawing set. A marketing brochure is not measured geometry; statutory dimensions and area claims can never be validated from one. The next unit design must be **fresh, for a verified real plot and client brief** — not a reconstruction [Mannu §5, next test; ledger 081].
- **Pass condition:** the source register shows every geometric and programmatic input as verified-measured or client-declared-and-flagged; zero inputs of class "marketing/brochure/indicative."
- **Sol verifies:** read the input manifest; any brochure-class source, any source that is "indicative by its own disclaimer," or any withdrawn source (ledger 079) = automatic FAIL, no partial credit.

### U-02 · Structural grid and columns
- **Requires [scorecard]:** a declared structural strategy (framed / load-bearing / other, decided with a structural engineer — the drawing records whose decision it is); grid lines with column positions and sizes for framed structures, or load-bearing wall identification otherwise; every wall and every opening located relative to the structural system; no room geometry that ignores the columns holding it up.
- **Pass condition:** structural layer present; every column/grid intersection accounted for; zero clashes between structure and openings/shafts; structural sizes carry their source (engineer's input or declared-preliminary, flagged).
- **Sol verifies:** layer presence + clash detection (column footprint vs door/window/shaft geometry) + confirm structural sizes are sourced, not invented. Mannu judges adequacy of the structural logic; Sol fails on absence or clash.

### U-03 · Wall build-ups
- **Requires [scorecard]:** a wall-type schedule: each wall type's total thickness and build-up (structure, finishes both sides); every wall on plan tagged to a type; plan thicknesses drawn at true thickness, not single lines; external, internal, wet-area and shaft walls distinguished.
- **Pass condition:** 100% of walls tagged; drawn thickness = schedule thickness everywhere; carpet-area computation uses these thicknesses (links to B-05).
- **Sol verifies:** measure every wall polyline pair against its schedule entry; any untagged wall, any single-line wall, any thickness mismatch = FAIL.

### U-04 · Plumbing shafts and stacks
- **Requires [scorecard; Mannu §5 additional corrections]:** every wet area (WC, bath, kitchen, utility) served by a named plumbing shaft; shaft positions and internal sizes drawn; soil/waste/vent stack positions indicated; **vertical stacking demonstrated** — wet areas align floor-to-floor, or the transfer is explicitly drawn and flagged for engineering review.
- **Pass condition:** zero unserved wet areas; zero shafts serving nothing; stacking shown for every stack (single-floor designs state the typical-floor assumption as a labelled design decision, not silently).
- **Sol verifies:** map each wet fixture → shaft → stack; geometric alignment check across floors; an unstacked wet area without a flagged transfer = FAIL.

### U-05 · Service routes
- **Requires [scorecard]:** electrical (DB location, meter position, principal routes/zones), water supply (riser/downtake zones, tank locations if applicable) and drainage routes indicated to the level needed to prove the plan can be serviced; no route that has nowhere to go; gas/AC provisions where the brief demands them.
- **Pass condition:** each service has an origin, a route zone and a destination consistent with the shafts (U-04) and structure (U-02); conflicts either resolved or surfaced as blocking questions.
- **Sol verifies:** presence per service + conflict scan (service zone vs structure vs shaft) + confirm any unresolved routing appears in the unresolved-items register.

### U-06 · Furniture and working clearances
- **Requires [scorecard; Mannu §5 additional corrections]:** a fully furnished, dimensioned plan: each room demonstrates its named function with furniture at realistic sizes, plus the working clearances that make the furniture usable — circulation past beds, pull-out space at wardrobes, work zones at kitchen counters, transfer space at fixtures. Clearance dimensions drawn, not implied.
- **Pass condition:** every habitable room and wet area furnished for its labelled function; zero furniture/door-swing/circulation overlaps; clearances dimensioned and meeting the values the rule-pack or declared design standard supplies (statutory minimums are TO-LOAD; ergonomic targets are declared design inputs, labelled as such).
- **Sol verifies:** furniture layer present in every room; automated overlap test (furniture vs furniture, furniture vs swing arcs, furniture vs circulation spine); clearance dimensions present and traced per B-03. Mannu judges livability; Sol fails on absence, overlap, or untraced clearance claims.

### U-07 · Door/window schedules and swing logic
- **Requires [scorecard]:** every opening tagged on plan; a schedule with clear width, height, sill (windows), type and count; swings drawn for every door; swing logic sound — no door beats another, none blocks a fixture or required clearance in the open position, room privacy respected by swing direction; window operability consistent with what it ventilates.
- **Pass condition:** schedule count = drawn count per tag; zero swing-arc collisions; every clear-width figure traces to its statutory slot (TL-06) or declared design input.
- **Sol verifies:** enumerate openings vs schedule; run swing-arc collision geometry; walk each width to rule-pack or register. One untagged opening or one colliding swing = FAIL.

### U-08 · Fire and life safety (unit scale)
- **Requires [scorecard]:** the inputs that let fire/life-safety checks run: travel distances to exit measurable from the geometry, exit and stair widths stated, building-height and use class recorded so NOC triggers can be evaluated. The applicable values are TO-LOAD (TL-05, TL-06, TL-13); the gate demands that the *checks are runnable and run*, with PASS/FAIL/UNKNOWN per check.
- **Pass condition:** every fire-relevant dimension present; every check executed against the rule-pack; UNKNOWN where the slot is unfilled — never a silent skip.
- **Sol verifies:** confirm the check list executed, each verdict recorded, each UNKNOWN mirrored in the unresolved-items register.

### U-09 · Accessibility
- **Requires [scorecard]:** an accessibility statement: which accessibility norms apply to this building class (applicability is itself a rule-pack question — HBC Chapter 9 category, TL-09), and for applicable cases: accessible route, door clear widths, ramp/lift provision, accessible WC — drawn and dimensioned. Where genuinely not applicable, NOT APPLICABLE with the sourced reason.
- **Pass condition:** applicability resolved from the rule-pack (never assumed); applicable features drawn, dimensioned and traced; no silent omission.
- **Sol verifies:** applicability decision traces to a rule-pack entry; if applicable, feature-by-feature presence and dimension trace; unresolved applicability = UNKNOWN → blocking question.

### U-10 · Wet-area ventilation
- **Requires [scorecard; Mannu §5 additional corrections]:** every kitchen, bath and WC shows its light-and-ventilation source: window to external air or to a compliant shaft (shaft minimum sizes by building height are TO-LOAD, TL-04), or declared mechanical ventilation where the rule-pack permits it. Ventilation openings appear in the window schedule and on plan; the shaft that receives them is the same shaft drawn in U-04.
- **Pass condition:** zero unventilated wet areas; every ventilation claim geometrically real (the window exists, the shaft exists, sizes trace to TL-04); kitchen/bath adjacency and stacking conflicts resolved.
- **Sol verifies:** per-wet-area map of ventilation source; cross-check against U-04 shafts and U-07 schedule; ratio/size checks run against the slot or return UNKNOWN.

### U-11 · Privacy and daylight
- **Requires [scorecard]:** daylight — every habitable room has an opening to open air (external or compliant courtyard/shaft), with light-and-ventilation ratio checks run against TL-04; privacy — sightline test from entry and living zones into bedrooms and toilets (doors/swings positioned so private rooms are not exposed), and window positions evaluated against plot edges and facing openings where site context is known (unknown context = recorded limitation, not assumed privacy).
- **Pass condition:** zero habitable rooms without an opening; ratio checks executed (PASS/UNKNOWN per slot state); sightline test run with failures either redesigned or surfaced.
- **Sol verifies:** room-by-room opening inventory; ratio computation from geometry vs slot; run the sightline geometry test; confirm context-unknown limitations appear in the register.

### U-12 · Orientation and context are facts, not defaults
- **Requires [Mannu §5, worst issue 3]:** north from the verified survey, not assumed; plot boundary, abutting road side and entry face from verified inputs; where the unit sits inside a larger building, the party-wall/external-wall assignment is sourced. (These were exactly the "assumptions remain active" items: north, walls, circulation, shafts, openings, layout arrangement.)
- **Pass condition:** north and every context edge trace to the source register; zero context facts of class "assumed."
- **Sol verifies:** trace north point and each boundary condition to a verified source; an assumed north = FAIL (it invalidates daylight, ventilation and privacy results downstream).

**Unit-scale note — Vaastu and preference layers [Mannu §5, additional corrections]:** client preference systems (including Vaastu) may enter as a *user-preference optimisation layer*, recorded in the decision register. They never override or substitute for statutory, structural, functional or environmental requirements, and no gate may be relaxed to satisfy them.

---

## Part C — SITE SCALE gates

*Built from Mannu §4 (community map review: critical gaps + acceptance gate). The community map failed here; these gates are its repair manual.*

### S-01 · Verified site basis
- **Requires [Mannu §4, gap 1]:** georeferenced surveyed boundary with coordinates in a declared coordinate system; site levels/contours; existing drainage pattern; surrounding land use; access road(s) with statutory right-of-way established from authoritative sources. A pin alone is not enough [Mannu §3]; a rectangle invented for convenience is not a site.
- **Pass condition:** every element present and provenance-traced (B-06); the governing layout/zoning plan for the parcel identified and cited; unresolved survey items are blocking questions, not smoothed geometry.
- **Sol verifies:** input manifest audit (survey document, coordinate system, levels source, ROW source); confirm the boundary polygon in the drawing is byte-identical to the surveyed polygon in the register.

### S-02 · Road hierarchy and access logic
- **Requires [Mannu §4, gap 2]:** a classified internal road network (hierarchy levels named and dimensioned, widths traced to TL-17); the connection logic to the external access road; secondary/emergency access where required; fire-tender movement demonstrated (route plus turning geometry against TL-13 values); service-vehicle access (waste collection, utilities); a pedestrian network and cycle logic that are drawn, continuous and distinct from leftover space.
- **Pass condition:** every plot fronts a classified road; the fire-tender path reaches what it must reach with compliant geometry (or UNKNOWN against unfilled slots); no single-point-of-failure access where the rule-pack demands two; pedestrian network connects homes to open space, community facilities and entries without gaps.
- **Sol verifies:** graph test (every plot → classified road; network connectivity); swept-path/turning-radius geometry against TL-13/TL-17; walk the pedestrian graph for continuity; dead-ends checked against the applicable norm slot.

### S-03 · Dimensioned, numbered plots with frontages
- **Requires [Mannu §4, gap 3]:** every plot numbered; every plot dimensioned (all sides) with area stated; frontage stated per plot; the plot schedule reconciles — count, per-type totals, area totals — with the drawn geometry.
- **Pass condition:** zero unnumbered or undimensioned plots; schedule = geometry exactly; plot sizes consistent with the plot-size bands the rule-pack applies (bands are TO-LOAD; the gate checks consistency, not remembered values).
- **Sol verifies:** automated enumeration and per-plot recomputation of dimensions/areas from geometry; diff against the schedule; any orphan plot or figure = FAIL.

### S-04 · Building envelopes, setbacks and street sections
- **Requires [Mannu §4, gap 3]:** per-plot building envelope derived from the rule-pack's setbacks/coverage/height for that plot's band (TL-01), drawn with clause citations; **street sections for every road class** — carriageway, footpaths, service corridors, plantation, lighting zone — dimensioned and consistent with the plan widths.
- **Pass condition:** every plot has an envelope with cited derivation; every road class has a section; section widths = plan widths; envelope math is measured containment, not asserted (`ResearchSprint-Stage1.md` §2.1 discipline).
- **Sol verifies:** recompute envelopes from boundary + rule-pack values (or UNKNOWN where slots are unfilled); geometric containment test; cross-check section/plan widths; citations walk per B-03.

### S-05 · Defensible parking
- **Requires [Mannu §4, gap 3; ledger — "parking refused not faked"]:** parking demand computed from the rule-pack norm (TL-07) per use; supply drawn as countable, geometrically usable stalls (stall and aisle dimensions from TL-07); visitor/service parking addressed; demand-vs-supply arithmetic printed in the calculation schedule.
- **Pass condition:** supply ≥ demand with real geometry, or an explicit refusal/deficit statement — never decorative stalls, never a count without geometry. UNKNOWN where TL-07 is unfilled.
- **Sol verifies:** count drawn stalls; test each stall/aisle against slot dimensions; recompute demand from uses; a stall that cannot be entered/exited geometrically does not count.

### S-06 · Gross/net area statement
- **Requires [Mannu §4, gap 4]:** a land-use budget table: gross site area; net residential (saleable) area; roads; open space; community facilities; EWS/affordable obligations; commercial — each as drawn polygons, with areas and percentages. Applicability of each obligation (EWS %, community norms, commercial cap) is **calculated from the rule-pack and licence conditions, never guessed** — unfilled slots (TL-16) return UNKNOWN with a blocking question.
- **Pass condition:** category polygons partition the site (sum = gross within declared tolerance, no double counting); every percentage recomputes; every obligation either satisfied with citation or surfaced as UNKNOWN.
- **Sol verifies:** polygon partition test; recompute all areas/percentages from geometry; trace each obligation figure per B-03.

### S-07 · Services and utilities
- **Requires [Mannu §4, gap 5]:** water supply (source, storage, network logic); sewerage (network, fall direction consistent with levels, disposal/STP or connection point); stormwater (aligned with contours and the site's existing drainage pattern); solid waste (collection points, vehicle access per S-02); electrical (substation site, network corridors); fire (hydrant/network provision per TL-13); **utility corridors** reserved in street sections (S-04); **HT lines** crossing or abutting the site shown with their clearance zones (TL-14).
- **Pass condition:** every network has origin → route → disposal/connection logic that respects topography; substation/STP/community sites appear in the area statement (S-06); HT clearances drawn or UNKNOWN; nothing "to be resolved later" without a register entry.
- **Sol verifies:** per-network presence and logic check (fall vs contours for gravity networks); corridor space exists in the sections; clearance geometry vs TL-14; cross-reference service sites against S-06 polygons.

### S-08 · Environmental and tree strategy
- **Requires [Mannu §4, gap 5]:** existing trees/natural features surveyed or explicitly recorded as unsurveyed (blocking question); retention/compensation and landscape strategy; stormwater/recharge approach consistent with S-07; environmental-clearance applicability evaluated against thresholds (TL-21) — triggered, not triggered, or UNKNOWN.
- **Pass condition:** strategy present and consistent with the survey and levels; clearance applicability resolved from the rule-pack or surfaced; green/sustainability obligations (TL-15) evaluated.
- **Sol verifies:** presence + consistency checks; threshold evaluation trace; unsurveyed features must appear in the unresolved-items register.

### S-09 · Walkability, open space quality and public realm
- **Requires [Mannu §4, gap 6]:** the plan demonstrates a walkable neighbourhood structure, not "single-entry, four-quadrant, long repetitive rows and ornamental leftover greens": open spaces are usable shapes (fragments below a declared usability threshold are not counted as open space in S-06), distributed so homes relate to them (the access-distance target is a **declared design target**, recorded in the decision register — not a statutory claim unless a slot supplies one); the pedestrian network (S-02) connects homes, open space, community facilities and entries; block structure and street rhythm show deliberate variation and a legible identity.
- **Pass condition:** quantitative sub-tests pass (usability threshold applied to every counted open space; access-distance target met or the shortfall surfaced; pedestrian connectivity complete); the qualitative judgement — does this read as a neighbourhood — is **Mannu's acceptance call** [ledger 049: Sol judges beauty not bypasses; Mannu's map gate is definition of done].
- **Sol verifies:** run the quantitative sub-tests from geometry; confirm declared targets are in the register; then route the sheet to Mannu for the qualitative verdict and record it.

### S-10 · At least two compared development options
- **Requires [Mannu §4 acceptance gate; §10 item 5 — "design, do not trace"]:** ≥2 genuinely different development options for the same verified site and brief — different planning strategies, not cosmetic variants — each individually passing gates S-01…S-09, compared on one sheet: yield, land-use split, compliance posture (counts of PASS/FAIL/UNKNOWN), infrastructure implications, and feasibility deltas (feasibility inputs declared, dated, sourced — `BusinessThesis.md` MVP stage 4).
- **Pass condition:** both options complete and gate-passing; the comparison table recomputes from each option's geometry; the difference between options is structural (demonstrably different road/block/open-space strategies), not parameter noise.
- **Sol verifies:** run the full gate set on each option; recompute the comparison table; test structural difference (e.g. road-graph topology and open-space distribution differ materially, not just plot counts). Mannu judges whether the options are *meaningfully* different designs.

---

## Part D — Statutory TO-LOAD slot register

**Discipline:** every slot below names a *category* of statutory control, where the operative number lives, and nothing else. **No values appear here, and none may be typed in from memory or from the web.** A slot is filled only by a rule-pack entry built from a verified primary instrument (Mannu's collection, official portals, signed notifications), with all five schema layers. Until filled: every dependent gate check returns UNKNOWN.

Structural sources for the category list (structure only, never values):

- The Haryana Building Code 2017 chapter/heading structure — read from the Haryana-government-hosted copy of the base code at `https://investharyana.in/content/pdfs/The-Haryana-Building-Code-2017.pdf` (fetched 2026-08-22). **[web-sourced, unverified as operative — this is the un-amended base code; the operative amended consolidation lives on the official TCP portal, `https://tcpharyana.gov.in/Haryana%20Building%20Code/Haryana%20Building%20Code-2017%20with%20amendments%20upto%2025.05.2023%20(1).pdf`, which refused connection to this scan (2026-08-22) and must be obtained as a primary — TO-LOAD]**
- NBC 2016 parts structure (Parts 0–12) — BIS's National Building Code page, `https://www.bis.gov.in/standards/technical-department/national-building-code/` **[web-sourced, unverified — page identifies the code; the two-volume text itself is the reference, national/advisory unless adopted]**. NBC is the *national reference*; the Haryana Building Code 2017 (as amended) is the *code family in force* for our corridor; DTCP licence conditions and the colony's approved zoning plan sit above both for the parcel. Precedence is contextual per parcel — no universal hierarchy [`BusinessThesis.md` moat].

| Slot | Category (values TO-LOAD) | Where the number lives | Feeds gates |
|---|---|---|---|
| TL-01 | Ground coverage, FAR, height, setbacks by plot-size band | HBC Ch.6 (esp. 6.3 "proportion of the site which may be covered") **as amended by DTCP notification** — press-reported amendment values are never operative (`ResearchSprint-Stage1.md` §1.3); + colony zoning clauses (HBC Specimen: Model Zoning Clauses) + licence conditions | S-04, S-06, U-12 |
| TL-02 | Minimum areas and widths of rooms: habitable rooms, kitchen, bath, WC, store | HBC 7.4 "Minimum area, size, height and light and ventilation of different components of residential premises"; NBC 2016 Part 3 | U-06, U-11 |
| TL-03 | Minimum heights: habitable rooms, kitchen, bath/WC, basement, stilt, plinth | HBC 7.3 (plinth), 7.4, 7.16 (basement); NBC Part 3 | U-02, U-03 |
| TL-04 | Light-and-ventilation ratios; ventilation-shaft minimum sizes by building height | HBC 7.11 "Light and Ventilation of building", 7.4; NBC Part 3 and Part 8 | U-10, U-11 |
| TL-05 | Stairs: minimum width, tread, riser, headroom, winder rules | HBC 7.6 "Staircase"; NBC Part 3 / Part 4 | U-08 |
| TL-06 | Doors/exits: minimum clear widths and heights, exit counts, travel distance, passage/corridor widths | HBC 7.8 "Passages and corridors", 7.9 "Exit", 7.10 "Means of Access"; NBC Part 4 | U-07, U-08 |
| TL-07 | Parking: demand norms (per use/area), stall and aisle dimensions, visitor provision | HBC 7.1 "Parking"; colony zoning clauses; NBC Part 3 | S-05 |
| TL-08 | Sanitation: minimum fixture counts by building type/occupancy; two-pipe drainage; disposal methods | HBC Ch.11 "Public Health Installations" (esp. 11.1, 11.2); NBC Part 9 | U-04, U-05, S-07 |
| TL-09 | Accessibility: applicability classes, ramp slopes, lift requirements, door clear widths, accessible WC | HBC Ch.9 "Norms for Differently-abled Persons"; NBC Part 3 provisions; national harmonised guidelines as referenced by the instrument in force | U-09 |
| TL-10 | Courtyard, mezzanine, motor garage, minimum dwelling-unit provisions | HBC 7.2, 7.13, 7.14, 7.15 | U-06, U-11 |
| TL-11 | Boundary wall, fence, gate and porch controls | HBC 7.5 | S-04, U-12 |
| TL-12 | Projections: cantilevered roofs, chajjas, balconies | HBC 7.12 | U-11, S-04 |
| TL-13 | Fire: building-class thresholds triggering fire NOC, fire-tender access geometry, hydrant provision | HBC 7.17 "Fire"; NBC Part 4 | U-08, S-02, S-07 |
| TL-14 | High-tension line clearance zones | HBC 3.3 "Clearance zone for buildings near High Tension electrical line" | S-07 |
| TL-15 | Sustainability obligations: rainwater harvesting, rooftop solar, ECBC applicability, water re-use | HBC Ch.8 "Sustainable Measures" | S-08 |
| TL-16 | EWS/affordable obligations, community-facility norms, commercial share for licensed colonies | DTCP licence conditions + the colony policy instruments + approved layout — **not** in HBC; the exact instrument is parcel-specific (Stage-0 output) | S-06 |
| TL-17 | Internal road widths / ROW by hierarchy; minimum street widths for plotted colonies | DTCP layout-plan norms / colony licence conditions / approved layout plan; NBC Part 3 as reference | S-02, S-04 |
| TL-18 | Structural safety: loading, materials, foundations — referenced standards | HBC Ch.10 "Structural Materials"; NBC Part 6 (structural design is the structural engineer's professional act; the slot records which standards the engineer certifies against) | U-02 |
| TL-19 | Drawing/sheet norms: sheet sizes, colouring conventions, site-plan and building-plan content, architectural control sheets | HBC Ch.3 "Building Drawing Norms"; HSVP OBPAS published Layer Guidelines DWG (`https://obpas.hsvphry.org.in/` — `ResearchSprint-Stage1.md` F3) [web-sourced, unverified] | B-02, B-07 |
| TL-20 | Approval-procedure facts the title block records: risk-based classification of the application, self-certification eligibility, validity/revalidation | HBC Ch.2, Ch.4, Ch.5 | B-04 |
| TL-21 | Environmental-clearance thresholds for building/construction projects | HBC Ch.12 "Environmental Clearance"; the EIA notification in force as cited by it | S-08 |
| TL-22 | Area-measurement conventions: carpet/built-up/super definitions applicable to the deliverable | The instrument governing the deliverable's context (e.g. RERA-defined carpet area where applicable; HBC/NBC definitions) — convention must be named per drawing | B-05 |

**Completeness note.** This category list was cross-checked (2026-08-22) against the HBC 2017 table of contents (Chapters 1–13, Appendix A, Specimen zoning clauses) and the NBC 2016 twelve-part structure. Categories judged out of scope for design completeness (application procedure detail, committee constitutions, professional qualification schedules) are deliberately excluded; if the rebuilt engine's scope grows (e.g. group housing → NBC Part 4 high-rise provisions, lifts → HBC 7.7/NBC Part 8), the register grows with it — **adding a slot is a documented revision of this standard, never an inline improvisation.** Any category Mannu identifies as missing goes in through his redline. [inferred]

---

## Part E — The final gate

### F-00 · Zero printed assumptions; every material unknown is a blocking question
- **Requires:** the drawing set prints **no active assumptions on material facts**. Every material unknown — a missing survey fact, an unfilled TO-LOAD slot, an unresolved regime conflict, an unverified client claim — is surfaced as a **blocking question** in the unresolved-items register, and the drawing's status (B-04) is held down until it is answered. Showing assumptions was honest; *asking* is correct [Mannu §5, worst issue 3]. The only permitted defaults are **safe, reversible presentation or early-option variables** [Mannu §3, non-assumption protocol], clearly labelled on the sheet and in the decision register, and confirmed before any professional issue. Regulatory conflicts return UNKNOWN / REVIEW REQUIRED — the convenient rule is never chosen silently.
- **Pass condition:** (a) zero material facts of class "assumed" anywhere in the drawing set; (b) every UNKNOWN produced by any gate above appears as a blocking question with an owner and a date; (c) every labelled presentation-default is reversible and confirmed-or-open; (d) the count of blocking questions on the sheet equals the count in the register — the sheet may not look more finished than the register says it is.
- **Sol verifies:** sweep the full annotation set for assumption-class markers and for material values lacking provenance (B-03 output feeds this); reconcile gate-verdict UNKNOWNs against the register one-to-one; attempt the falsification: find one material number on the sheet that is neither verified, computed, nor questioned — **one such number fails the entire standard**, because it is precisely the failure mode this document exists to end.

---

## Adoption and revision

- **Ratification path:** Sol reviews gate-by-gate for testability and bypass-resistance → Mannu redlines domain content (gates and slots — his professional judgement is itself part of gates U-02, U-06, S-09, S-10) → Shivam ratifies → this standard becomes the acceptance harness for the rebuilt design engine; ledger entry records the ratification.
- **Verification of the standard itself [Mannu §10, item 8]:** before first use in anger, run the gate set against a real accepted drawing file (once the pilot parcel's accepted set arrives — `MannuAsks.md`). A professional-grade real drawing should pass or expose gaps in *our gates*, not the other way round. Gate failures against a genuinely accepted file are treated as defects in this standard.
- **Revision:** append-only versioning; gates are never deleted, only superseded with a recorded reason; slot additions per the completeness note above.
- **The score this replaces:** 2.5/10 was the cost of calling rendering "design." The standard's one-line test remains Mannu's: generate the buildable envelope first, ask every blocking question, then compare compliant options — *design, do not trace*.

---

*File written to `/Users/shivamsharma/Downloads/UrbanOS (Mannu)/collab/DesignCompletenessStandard.md` (uncommitted). Web sources consulted for the category-list check, all [web-sourced, unverified]: https://investharyana.in/content/pdfs/The-Haryana-Building-Code-2017.pdf · https://tcpharyana.gov.in/Haryana%20Building%20Code/Haryana%20Building%20Code-2017%20with%20amendments%20upto%2025.05.2023%20(1).pdf (connection refused 2026-08-22) · https://www.bis.gov.in/standards/technical-department/national-building-code/*