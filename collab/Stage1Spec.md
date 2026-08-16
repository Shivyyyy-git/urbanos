# Stage1Spec — The Base (v1 draft)

**Owner:** Fable (draft) — Shivam ratifies product decisions; Mannu rules on domain items.
**Status:** DRAFT v1.2 — D3/D4 ruled 2026-08-16; **D5 + R1 ruled by Shivam 2026-08-16** (Restraint machinery folded in from `collab/RuleSchema-Restraint-draft.md`; S+4 response = compute both regimes). Ratification blocked on D1/D2 (Mannu) + the M-S register. Spec only, no code.
**Parent:** `collab/BusinessThesis.md` v1.1 — Stage 1 of the five-stage product, aimed at customer #1 (plot-scale builder, Gurgaon/Haryana).
**Labels:** [decided] = already ruled · [proposed] = my proposal, needs a yes · [inferred] = my reasoning, Mannu verifies · [TO-LOAD] = value must come from a cited, Mannu-verified source — never typed from memory.

---

## 1. Purpose

A plot-scale builder enters his plot and his intent. UrbanOS returns **the Base**:

1. **The Legal Envelope** — what this plot legally allows: coverage, floors, height, setbacks, buildable area, parking — every number cited to a versioned rulebook entry.
2. **A draft layout** — a dimensioned 2D drawing of that envelope on his plot, with a reference footprint placed inside it. Legal by construction: geometry is generated *from* the constraints, and containment is *measured*, never asserted.

This is the artifact the five free pilots see first, and the demo that opens every sales conversation. Negative verdicts are first-class: "nothing buildable under these rules" ships as a complete cited report — that answer saves a builder from a bad plot purchase and is worth as much as a yes.

## 2. User scenario (pilot walkthrough)

1. Builder (or Mannu beside him) opens a new project: *"Residential builder floors, Sector —, Gurgaon."*
2. Enters the plot boundary by the cheapest route he has (see §4): survey DXF if it exists, else corner coordinates, else deed dimensions (sides + diagonal).
3. Declares context: abutting road width(s), corner-plot yes/no, north direction.
4. Engine selects the applicable rule set from the rulebook (by jurisdiction slice + plot-size slab), computes the envelope, and generates the draft layout.
5. Builder receives the package (§6): envelope report + drawing, stamped per §7.
6. He selects/accepts the Base → Stage 2 (Compliance Roadmap) takes over. *(Stage 2 is out of scope here.)*

## 3. Scope for v1

- **One jurisdiction slice.** One authority, one colony/sector type in Gurgaon — picked by Mannu where his circular collection is deepest (decision D1). DDA/Delhi excluded entirely. [decided: one-geography rule]
- **One plot type:** residential plotted, builder-floor intent (the stilt+N scenario). No commercial, no group housing, no amalgamated plots. **[R1 ruled — Shivam, 2026-08-16]:** v1 computes the envelope under **both** the S+4 regime (as loaded; currently carrying active restraints — HC stay 2026-04-02, DTCP suspension memo 2026-07-21) **and** the currently-sanctionable configuration for the same plot (values TO-LOAD). Both print with actionability (§5/§6); neither is hidden. Corollaries adopted with the ruling (ledger 040, from the R1 draft): the sanctionable envelope computes and passes **standalone** — build step B carries no S+4 reference, the suspended comparison is a composition step gated behind it; the draft layout draws the **sanctionable envelope only**, the suspended envelope appearing as numbers, citations, and at most a dashed overlay (preserves D3); the suspended envelope is **historical record, never a forecast** — no timeline, no likelihood, no "when the stay lifts."
- **Single-plot input.** No neighbouring-context modelling beyond declared road widths.

## 4. Inputs

Boundary input reuses the ratified kernel contract (`collab/SitePlanBrief.md` §3–4) unchanged — priority: survey DXF → corner coordinates → bearings+distances → four-sides-plus-diagonal reconstruction, all fail-closed, no silent closure or rescaling. [decided, ledger-ratified]

Stage-1 additions, all explicit, no derived values:

| Field | Form | Notes |
|---|---|---|
| Jurisdiction slice | id from rulebook | selects the rule set; no free text |
| Plot use + intent | enum: `residential-plotted / builder-floor` | only value in v1 |
| Abutting roads | per-side width as declared `LengthValue` + which boundary edge | feeds setback + access rules |
| Corner plot | boolean | affects setback set [inferred — M-S2] |
| North | bearing per kernel orientation contract | reuse |
| Basement intent | boolean | activates basement rule slots; default = absent, and absence means "not evaluated", never "allowed" |

Missing required input ⇒ named refusal (kernel style), never a default.

## 5. Rulebook dependency — Shelf 1 (the only new data contract)

Every rule is an **entry**, never a constant in code (kernel already bans jurisdiction values in the engine):

```
RuleEntry {
  id, authority, slice            — e.g. DTCP / <slice picked in D1>
  slot                            — which rule slot it fills (table below)
  applicability                   — predicate: plot-size slab, road width, corner, use
  parameter shape + units         — %, ratio, metres, count, ECS…
  value                           — TO-LOAD (from source only)
  source                          — SourceInstrument id + page/clause
  issued date · collected date · collected by
  verification: unverified | mannu-verified (+date)
  version chain: supersedes / superseded-by (+effective date)
}
```

Sources are instruments, not free text — what a court stays is an *instrument*, and restraint targeting follows it **[decided — D5, Shivam 2026-08-16]**:

```
SourceInstrument {
  id
  authority                       — who issued it (DTCP / HC / HSVP / ULB)
  kind                            — code | amendment | notification | circular | memo | court-order
  reference                       — memo no. / case no. / notification no.
  issued date
  scan                            — photo/PDF, page count
  collected date · collected by
  verification: unverified | mannu-verified (+date)
}

Restraint {
  id
  kind                            — judicial-stay | executive-suspension | administrative-hold
  instrument                      — SourceInstrument id (the order/memo that restrains)
  targets                         — instrumentIds[] (primary) · entryIds[] (surgical) · predicate (slice + slots)
  scope                           — fresh-sanction | rule-validity | occupation-use
  carveOuts[]                     — what is explicitly NOT restrained, each cited
  effective from / until          — until = null means "until further orders"
  lifecycle: active | vacated | lapsed | replaced (+date + instrument)
  verification: unverified | mannu-verified (+date)
}
```

A restraint **never changes a rule's value** — envelope math runs on values as loaded. It changes **actionability**, a separate output axis printed beside the stamp (§6, §7). Scope decides the print: `fresh-sanction` ⇒ envelope computes unchanged, "not sanctionable today" cited; `rule-validity` ⇒ envelope renders as **suspended**, no headline asserts buildability from restrained values; `occupation-use` ⇒ sanction untouched, disclosed as a downstream restriction. Every slice carries `restraintSweptOn` (date + who swept): the report prints a dated, attributable no-restraint claim, never bare silence.

**Required slots for v1** (the set is [inferred] from Indian plotted-development practice — Mannu confirms completeness, M-S2; every value is [TO-LOAD]):

ground-coverage % (by plot-size slab) · FAR (base + purchasable if the slice has it) · max height + storey cap (stilt+N) · setbacks per side (by slab and/or road width) · max dwelling units per plot · stilt conditions (when permitted, whether counted in height/FAR) · basement (extent, permitted use, FAR treatment) · parking norm (ECS) · permitted projections into setbacks (balcony/canopy) · min frontage · trigger thresholds (rainwater harvesting, solar, any slab-linked obligations)

**Fail-closed on data:** a required slot with no loaded entry for the slice ⇒ output blocked, missing slot named. A loaded but unverified entry ⇒ output allowed but stamp-limited (§7). No engine default exists for any slot. A slice with no `restraintSweptOn` date ⇒ output allowed, but the report states in words that no restraint sweep is on record. An `active` restraint of scope `rule-validity` on a required slot ⇒ envelope prints as suspended; the report may not assert buildability from restrained values.

## 6. Outputs (one package, one canonical model)

1. **Legal Envelope Report** — PDF + machine-readable JSON:
   - permitted-values table: each row = slot, value, **citation** (entry id → source doc, page, issue date, verification status)
   - derived envelope: buildable polygon (plot minus measured setbacks), max footprint = min(coverage × area, buildable polygon), per-floor plate, total FAR area, floor count = min(storey cap, FAR allowance), height cap, required parking (from DU count)
   - **saleable math (indicative) [decided — D4, Shivam 2026-08-16]:** total and per-floor built-up area from the envelope; dwelling-unit count; optionally, a **user-declared loading factor** (printed as an assumption with provenance) → indicative super area. The factor is a market convention, never a rule entry, never defaulted — no declared factor, no super-area line. Block labelled "indicative — not a valuation." No pricing.
   - every derived number lists the entry ids that fed it (citation chain)
   - **actionability block [decided — D5]:** `sanctionable-today: yes | no | unknown`; every active restraint printed with kind, scope, issuing authority, instrument reference, effective dates and carve-outs — or the dated "no restraint on record as of <date>, swept by <who>" statement
   - declared inputs and assumptions printed in full; rulebook version digest pinned (restraint entries included in the digest)
2. **Draft layout** — DXF R12 + vector PDF from one drawing model (kernel discipline): plot boundary with dimensions, setback lines, buildable envelope, reference footprint, stilt indication, north arrow, title block. Drawing standard per Mannu's M-U1 answer (shared with Feature 2). [decided — D3, Shivam 2026-08-16: **one** reference footprint in v1; placement variants later]
3. Determinism: same inputs + same rulebook version ⇒ byte-identical outputs (house bar, as Feature 2).

## 7. Stamp logic — computed, never chosen

- Any cited entry `unverified` — **rule entry or restraint entry** — or any declared-but-unconfirmed assumption ⇒ **"Research Draft — Not for Construction"**, forced.
- Actionability (§6) is a separate computed line and never alters the stamp — the stamp asks how good *our data* is; actionability asks what *the State's posture* is.
- All cited entries `mannu-verified` and boundary route complete ⇒ **"Prepared for Professional Review."**
- No third state. No operator override upward. The stamp is the boundary rule from the thesis, mechanised.

## 8. Non-goals for v1

Stage 2 roadmap · unit interiors (Feature 2 stays parked at Stage 5) · 3D/renders · pricing and valuation (saleable *area* math is in per D4; ₹ estimates are not) · DDA/Delhi · plot amalgamation · DWG (still gated) · any ML-learned rule values.

## 9. Acceptance criteria (test harness derives from these)

1. Incomplete boundary or missing context field ⇒ named refusal; zero defaults injected (kernel refusal classes inherited).
2. Every printed number traces to entry ids; citation table complete; JSON citations machine-checkable.
3. Missing required slot ⇒ blocked output naming the slot.
4. Unverified citation anywhere ⇒ stamp forced to Research Draft (mutation test: flipping one entry to unverified must flip the stamp).
5. Setback/envelope containment measured geometrically; any breach ⇒ fail (site-kernel fixture class reused).
6. Same input + same rulebook digest ⇒ byte-identical DXF and PDF; digest printed on sheet and in JSON.
7. Rule superseded ⇒ new version entry; old report reproducible against pinned digest; new run cites new version with effective date.
8. Degenerate envelope (setbacks consume plot) ⇒ complete cited "not buildable" report, not an error.
9. DXF parses with 0 errors in an independent parser (ezdxf), as Features 1–2.
10. Saleable block: built-up figures trace to envelope citations; the super-area line renders only when a loading factor was explicitly declared, printing the factor and its assumption provenance (mutation test: removing the declaration must remove the line).
11. Restraint of scope `fresh-sanction` ⇒ every envelope number **byte-identical** to the unrestrained run, with `sanctionable-today: no` citing the instrument (mutation: deleting the restraint flips actionability to `yes` and changes no envelope number).
12. Restraint of scope `rule-validity` ⇒ envelope renders suspended; no headline asserts buildability from restrained values.
13. Unverified restraint anywhere ⇒ stamp forced to Research Draft (mutation mirrors §9.4).
14. Restraint targeting by `instrumentIds` ⇒ a rule entry loaded later from that instrument is restrained on load, with no edit to the restraint.
15. Lifecycle `vacated` ⇒ the rule returns unchanged, the vacating instrument cited; the pre-vacation report stays byte-reproducible against its pinned digest (no fictional versions in either direction).

## 10. Build order [proposed]

- **A. Rulebook store + intake** — schema, versioning, verification states, citation rendering; Mannu's capture flow (photo/PDF → extraction → his confirm) can start manual, but the store is production-shaped from day one. *Gates everything; also the moat.*
- **B. Envelope calculator + report composer** — pure functions over (validated plot × rule set); property-tested.
- **C. Layout sheet** — composition on the existing kernel drawing model; no new geometry engine.

A → B → C. Tests-first, mutation-checked, independent artifact parsing — the retained verification bar.

## 11. Decision round (blocks ratification)

| # | Question | Owner |
|---|---|---|
| D1 | Which jurisdiction slice first — the exact authority + colony/sector type where Mannu's circulars are deepest? | Mannu |
| D2 | Which boundary route will pilot builders actually have (survey DXF / coordinates / deed sides)? Sets the route we polish first. | Mannu |
| D3 | v1 draft layout: one footprint or variants? | **Ruled (Shivam, 2026-08-16): one reference footprint** |
| D4 | Saleable-area math in the envelope report? | **Ruled (Shivam, 2026-08-16): include — indicative, declared-factor only** |
| D5 | Restraint object + SourceInstrument promotion + no-third-stamp defence | **Ruled (Shivam, 2026-08-16): ratified as drafted** |
| R1 | Response to the S+4 stay/suspension | **Ruled (Shivam, 2026-08-16): compute both regimes; S+4 marked suspended via restraints, never hidden** |

## 12. PENDING-MANNU register (Stage 1)

| # | Question | Blocks |
|---|---|---|
| M-S1 | D1 + the circular set for that slice (photos/scans into the intake pipeline) | rule loading |
| M-S2 | Confirm the required-slot list in §5 is complete for the slice; confirm slab/corner/road-width applicability structure | schema freeze |
| M-S3 | D2 — the boundary-data reality of pilot builders | route priority |
| M-S4 | Site-scale sheet standard (M-U1 analog: layers, dimension style, title block) | sheet composition |
| M-S5 | Verification workflow sign-off: what he needs to see to mark an entry `mannu-verified` | stamp logic goes live |
| M-S6 | Restraint sweep workflow: what dates a slice's `restraintSweptOn`; what he must see to mark a restraint `mannu-verified`. Plus three live questions — Q1: does the 2026-07-21 suspension still stand, and the HC stay's status today; Q2: ground reality for already-sanctioned S+4 projects (decides whether `occupation-use` is a live scope); Q3: any standing restraints on the D1 slice predating this sprint | actionability goes live |
