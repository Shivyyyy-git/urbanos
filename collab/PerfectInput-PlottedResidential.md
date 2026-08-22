# PerfectInput — Plotted Residential (Dwarka Expressway pilot)

> **Ratified for gating 2026-08-22 (ledger 083).** Sol's gate next — must demonstrate the 077 three-strategies backwards-design test; after the colony is ground-verified, bind parcel fields to Merano Greens' actual document list.

**Owner:** Fable · **Acceptance:** Sol (gate pending) · **Domain authority:** Mannu
**Version:** v1-draft — 2026-08-22
**Written against:** `collab/BusinessThesis.md` v2 (MVP contract, non-assumption protocol) · Mannu's Alignment Review §3, `reference/mannu-2026-08-21/UrbanOS_Alignment_Review_for_Shivam.pdf` · `collab/SitePlanBrief.md` v5 (boundary contract, reused not restated) · `collab/ResearchSprint-Stage1.md` · ledger 072 / 077 / 079 / 082
**Scope:** the complete input UrbanOS must hold before it may design anything on **one plotted-residential parcel inside a DTCP-licensed colony on the Dwarka Expressway corridor (Sectors 99–113), for a plot-builder client**. This document defines every field, its form, and its failure behaviour. It contains **no operative statutory values**: every Haryana-specific number is a [TO-LOAD] slot or a labelled, non-operative web observation.

---

## 0. How to read this document

### 0.1 Field classification — the non-assumption protocol [locked, BusinessThesis v2]

Quoted from Mannu's review, §3, "Non-assumption protocol":

> - Hard blocker: missing parcel boundary, authority/regime, land use, road width, operative rule status or essential brief. Stop and ask.
> - User decision: budget, programme, priorities and preferences. Ask, record and version.
> - Safe reversible default: only presentation or early option variables. Label clearly and require confirmation before professional issue.
> - Regulatory conflict: return UNKNOWN/REVIEW REQUIRED. Never choose the convenient rule silently.

Every field below carries exactly one tag:

| Tag | Meaning | Failure behaviour |
|---|---|---|
| **[BLOCKER]** | Design may not begin (or the affected deliverable may not be produced) without it | Named blocker code; system stops and asks. Never silently defaulted. |
| **[ASK]** | A user decision. Asked, recorded verbatim, versioned. Never inferred. | Absence blocks only the deliverable that consumes it (stated per field); the gap appears in the register. |
| **[DEFAULT]** | Safe reversible presentation/early-option default | Applied with a visible label; must be confirmed before any professional issue. The complete allowed list is §7 — nothing outside §7 may ever be defaulted. |
| **[STAGE-0 OUTPUT]** | Not an input at all — a fact the system resolves from inputs (BusinessThesis v2 §MVP stage 0) | If unresolvable → blocker; if conflicting → UNKNOWN / REVIEW REQUIRED. |

### 0.2 Evidence labels

`[verified-primary: URL]` official government source read directly · `[web-sourced, unverified]` found on the web, recorded with URL and retrieval date, **never operative** · `[inferred]` reasoning, needs confirmation · `[TO-LOAD]` a slot for a value that may only be filled from an authoritative primary via the five-layer rule schema (Source / Applicability / Rule / Time-status / Provenance).

### 0.3 Standing rules binding this document

1. The withdrawn Privy AT4 / Spaze references (ledger 079) are not cited, reconstructed, or used in any form.
2. No statutory value is stated as operative. "No authoritative source, no operative rule" [locked].
3. No geometry is ever traced from a basemap or satellite image (licence rule, ledger 040/R5). The GPS pin locates; it never bounds.
4. No ODbL data (OSM/Overture) is marked for ingestion anywhere below.
5. Metric only. DTCP Haryana, HSVP and ULB are distinct authorities; Haryana Building Code 2017 (as amended) is the code family; NBC 2016 is national reference.
6. Every intake field feeds the **data-gap / assumption / source / professional-review register** (MVP output 5); issue gates block unresolved material inputs.

---

## 1. The skeleton — Mannu's §3 required-inputs table (quoted faithfully)

From the Alignment Review, §3 "MVP build contract — Required inputs":

| Input family | Minimum requirement (verbatim) |
|---|---|
| **Client brief** | "Project type and programme, budget, delivery priorities, unit mix or use mix, quality level, target buyer/tenant and non-negotiable preferences." |
| **Verified parcel** | "GPS pin plus surveyed boundary polygon, area, all side dimensions, frontage, abutting road width/ROW, levels/topography and existing constraints. A pin alone is not enough." |
| **Documents** | "Sale deed/ownership record, demarcation or survey, approved colony layout/zoning plan, licence/allotment documents and any previous sanctioned plan or NOC available." |
| **System-resolved facts** | "Jurisdiction, land use, applicable development/sector/colony plan, FAR, coverage, height, setbacks, density, parking, fire and NOC triggers. User-entered FAR is a claim to verify, not the governing truth." |
| **Market and cost** | "Comparable supply, selling/rental rates, absorption evidence, construction and soft-cost assumptions, finance assumptions and all dates/sources." |

Sections 2–6 expand these five families field-by-field. Nothing below removes anything from this table; it only makes each row demandable, checkable and fail-closed.

---

## 2. Family A — Client brief (plot builder)

The pilot client archetype is the **repeat plot builder**: buys a plot in a licensed colony, builds, sells or holds. The brief is his words, structured — never our guesses.

| ID | Field | Form | Tag | Notes |
|---|---|---|---|---|
| CB-1 | Client identity & entity | Name; entity type {individual, partnership, LLP, company}; contact; decision-maker named | **[BLOCKER]** | No project record can open anonymously. Feeds engagement scope (Mannu journey stage 0). |
| CB-2 | Declared relation to title | Enum {sole owner, co-owner, GPA holder, collaboration-agreement builder, buyer under agreement-to-sell, other(text)} + supporting document ref (Family C) | **[BLOCKER]** | The *declaration* is intake; *verification* happens against DOC-1..3. Mismatch → UNKNOWN / REVIEW REQUIRED, never silently accepted. |
| CB-3 | Project type | Enum {new build on vacant plot, demolish-and-rebuild, revision/extension of previously sanctioned building} | **[BLOCKER]** | "Essential brief" per protocol. `revision` additionally requires DOC-6 (previous sanction details — mirrors the OBPAS "Case Type: Fresh/Revised" + mandatory previous-sanction fields, §4.3). |
| CB-4 | Product intent (programme) | Enum {single-family dwelling, independent floors for sale, floors for rent/hold, mixed sell/hold} + intended number of dwelling units in total and per floor | **[BLOCKER]** | Essential brief. For floor-wise sale intent the system must resolve the operative status of stilt+4 / floor-wise registration rules as a Stage-0 fact (SR-6) — intent is recorded as stated, **never silently converted** to a "possible" scheme. |
| CB-5 | Floors above ground intent | Integer + "or maximum permissible" flag | **[BLOCKER]** | "Maximum permissible" is a legitimate answer; it binds the design to SR-4's [TO-LOAD] height/FAR slots and blocks issue until they are loaded. |
| CB-6 | Stilt parking intent | {yes, no, undecided → ask again before option lock} | **[BLOCKER]** | Envelope-shaping. Sanctionability is SR-6's problem, not intake's; intake records the wish. |
| CB-7 | Basement intent | {none, single, other(text)} + intended use {parking, services, other(text — habitability flagged for rule check)} | **[BLOCKER]** | Envelope-shaping. Note: the HSVP OBPAS application asks basement-specific questions incl. distance of basement from adjoining plots (left/right) and conditions plot-size/width conditions for basements in S+4 context — recorded at §4.3 as [web-sourced, unverified] portal observations, not operative limits. |
| CB-8 | Row / common-wall context intent | {detached, common wall with left, with right, both, unknown} + whether adjoining owners' consent exists or is obtainable | [ASK] | Directly mirrors OBPAS "mutual consent" questions for common-wall and S+4 construction (§4.3). Unknown is acceptable at intake, blocks only the affected option, and lands in the register. |
| CB-9 | Budget band | Land cost (sunk, ₹, date); construction budget band ₹min–₹max; contingency %; funding source {own, debt, presales, mixed} | [ASK] | Ask, record, version. Absence blocks **the feasibility/ROI deliverable** (MVP output 4), not the envelope or the compliance report. Never estimated on the client's behalf. |
| CB-10 | Quality level | Tier enum {economy, standard, premium, luxury} + optional reference project (named, not traced) + spec notes | [ASK] | Feeds cost assumption selection (MC-4) — the tier chooses which *declared* cost figure applies; it never invents one. |
| CB-11 | Target buyer/tenant | Profile: {end-user family, investor, NRI, rental tenant}; target ticket size per floor/unit ₹ (client's claim, dated) | [ASK] | Client's market belief is recorded as a claim and reconciled against MC-1..3 evidence; divergence is reported, not smoothed. |
| CB-12 | Delivery priorities | Forced ranking of {speed to approval, maximum saleable area, cost ceiling, quality/finish, rentability, resale value} | [ASK] | Mannu's brief row names "delivery priorities" explicitly. Drives option differentiation (≥2 designed options must differ in strategy, not cosmetics). |
| CB-13 | Non-negotiables | Free list; each item restated by the system as a testable constraint and confirmed back to the client | [ASK] | An untestable non-negotiable ("should feel grand") is recorded but flagged `untestable` in the register. A non-negotiable conflicting with a statutory rule → UNKNOWN / REVIEW REQUIRED, surfaced in the contradiction notice — never silently dropped or silently obeyed. |
| CB-14 | Vaastu preferences | See §2.1 | [ASK] (optional layer) | Never statutory. See §2.1. |
| CB-15 | Review & feedback authority | Who approves options; number of review cycles in engagement (pilot default: fixed scope, two cycles per BusinessThesis v2 Money section) | [ASK] | Journey stage-0 engagement scope. |
| CB-16 | Timeline expectation | Target start-on-site date / approval-by date | [ASK] | Feeds feasibility timeline; never a reason to skip a gate. |

**Minimum essential brief** (the protocol's "essential brief" made concrete): CB-1..CB-7 present and internally consistent. Any absence → proposed blocker `E_BRIEF_ESSENTIAL_MISSING` (§8).

### 2.1 Vaastu — an optional optimisation layer, never a rule layer

Mannu's ruling, quoted (Alignment Review §5): "Vaastu may be a user preference and an optimisation layer, but it never replaces statutory, structural, functional or environmental requirements."

**Form.** An optional preference object, entirely client-declared:

- entrance/gate direction preference; room-zone preferences (e.g. kitchen zone, master bedroom zone, pooja space, staircase sense, water storage placement) — each as `{item, preference, weight: hard-wish | soft-wish}`;
- source of the preferences (client's own consultant? name recorded) — UrbanOS asserts no Vaastu doctrine of its own;
- explicit client acknowledgement, captured at intake: *statutory, structural, functional and environmental requirements always win*.

**Engine treatment [inferred, Sol to gate].** Vaastu wishes enter the option generator only as ranked optimisation objectives strictly below (1) statutory rules, (2) structural/functional integrity, (3) light-ventilation-services adequacy, (4) budget constraints. Every option reports which wishes were met and which were not, and why. A Vaastu wish can never flip a compliance verdict, relax a setback, or suppress a finding. Conflict between a hard-wish and any higher layer → reported in the contradiction notice; the wish yields; the client may re-weight, never override.

---

## 3. Family B — Verified parcel

The geometry contract is **`collab/SitePlanBrief.md` v5, reused wholesale** — types, blocker codes, and the fail-closed discipline are not restated here, only bound in.

### 3.1 Boundary input-priority ladder [locked by SitePlanBrief v5]

Exactly four routes, in descending preference, all fail-closed; the system asks for the highest route the client can support and records why lower routes were used:

1. **Survey file** (`imported-file`): DXF/DWG-derived boundary with `UnitDetection` — units never assumed from the file; unconfirmed units → `E_UNIT_AMBIGUOUS`.
2. **Corner coordinates** (`coordinates`): declared frame mandatory; geographic frames require declared projection (`E_FRAME_UNPROJECTED` otherwise).
3. **Bearings + distances** (`traverse`): closure tested against a declared `ClosureProfile`; misclosure beyond profile → `E_TRAVERSE_MISCLOSURE`; adjustment only via professional approval record.
4. **Sides + diagonal** (`reconstructed`): quadrilateral only; ambiguity without disambiguation evidence → `E_RECONSTRUCTION_AMBIGUOUS` (candidate assemblies retained and shown); result always carries `W_RECONSTRUCTED_GEOMETRY`.

No fifth route exists. **A basemap trace is not a route.** A boundary that cannot be established by one of these four is a refusal, not an approximation.

### 3.2 Parcel fields

| ID | Field | Form | Tag | Notes |
|---|---|---|---|---|
| VP-1 | GPS pin | WGS84 lat/long + capture method + date | **[BLOCKER]** | Required for Stage-0 regime resolution (SR-1). **Locator only.** "A pin alone is not enough" (Mannu §3, verbatim) — and a pin is never boundary evidence (standing rule 0.3.3). |
| VP-2 | Boundary polygon | One of the four §3.1 routes, per SitePlanBrief types | **[BLOCKER]** | All SitePlanBrief blocker codes apply (closure, topology, self-intersection, degenerate edges, etc.). |
| VP-3 | Stated plot area + unit | `AreaEntry` (unit label incl. gaj/marla/kanal etc.; variable units require `DeclaredLengthFactor`/`DeclaredAreaFactor` with source — `E_UNIT_FACTOR_UNDECLARED` otherwise) + source document ref | **[BLOCKER]** | Mannu's table requires "area". Reconciled against computed area (`AreaReconciliationResult`); mismatch beyond tolerance → `E_AREA_RECONCILIATION`. |
| VP-4 | All side dimensions as recorded in documents | `LengthEntry[]` keyed to `DraftEdgeRef`s, each with source | **[BLOCKER]** | Mannu's table requires "all side dimensions". Where route 1/2 already yields dimensions, document-stated dimensions are still captured and reconciled; divergence is reported with the measured gap. |
| VP-5 | Frontage designation | `RoadFrontageDraft`: ≥1 real boundary edge per frontage (`DraftEdgeRef[]`; empty blocks) | **[BLOCKER]** | `E_FRONTAGE_INCOMPLETE` per SitePlanBrief. No cardinal/"front side" shorthand exists in the contract. |
| VP-6 | Abutting road width / ROW | Carriageway width + ROW width, each a `LengthEntry` with `sourceRef` (approved layout/zoning plan preferred; site measurement recorded as measurement, not as the statutory ROW) | **[BLOCKER]** | Protocol names road width as a hard blocker explicitly. Road width is also an *applicability key* in the rule schema (plot rules can switch on abutting road width [TO-LOAD]), so an unsourced width poisons rule resolution. |
| VP-7 | Orientation / north basis | `OrientationInput`: georeferenced CRS or explicit rotation; magnetic bearings need dated declination context | **[BLOCKER]** | `E_NORTH_ABSENT` / `E_MAGNETIC_CONTEXT_INCOMPLETE`. Also a Vaastu prerequisite: no orientation, no direction-based preference can even be evaluated. |
| VP-8 | Levels / topography | `LevelReadingDraft[]`: spot levels + datum {MSL, local-benchmark, assumed}; plot-corner and road-edge levels minimum [inferred — Mannu to confirm the minimum set] | [ASK] | Required to ask (Mannu's table lists it). `assumed` datum → `W_ASSUMED_DATUM`; unacknowledged warnings block elevation to `ready-for-professional-review` (`E_WARNING_UNACKNOWLEDGED`). |
| VP-9 | Existing constraints & encumbrances | `EncumbranceDraft[]` / `RestrictionDraft[]` (easements, rights-of-way, service corridors, HT-line proximity, drains, water-body buffers) + **explicit "none declared" affirmation if empty** | **[BLOCKER]** (the declaration, not the presence) | Unanswered ≠ none. An unanswered constraints question → proposed `E_CONSTRAINT_DECLARATION_MISSING` (§8). Declared items constrain the envelope per SitePlanBrief. |
| VP-10 | Existing structures on plot | `ExistingFeatureDraft[]` + retain/demolish per feature | [ASK] | Required for `demolish-and-rebuild` (CB-3) and for OC history checks. |
| VP-11 | Cadastral exclusions | `CadastralHoleDraft[]` (land inside the outline not owned) | [ASK] | Sole authoritative home per SitePlanBrief §4.1. |
| VP-12 | Demarcation status at site | {demarcated by authority + date + evidence ref, not demarcated, unknown} | [ASK] | Feeds DOC-3 and the professional-review register; HSVP practice ties demarcation to its own application flow (§4.3 note). |
| VP-13 | Adjoining-plot context | Per shared boundary: {built, vacant, under construction, unknown}; existing common wall {yes, no, unknown} | [ASK] | Needed before CB-8/S+4 consent questions are meaningful; mirrors portal fields (§4.3). Unknown is legal at intake; it blocks only the affected options. |

---

## 4. Family C — Documents

Two tiers: **design-gating** (UrbanOS may not claim verified status without them) and **submission-stage** (not needed to design; tracked from day one in the register so the eventual approval-ready package is never surprised).

Ownership-document vocabulary below follows what the authorities themselves list. The ULB Haryana approval page lists ownership proof as "Sajra, intakal, jamabandji, mutation, lease deed etc" [verified-primary: https://ulbharyana.gov.in/Home/ApprovalRevisionOfBuildingPlan — retrieved 2026-08-22].

### 4.1 Design-gating documents

| ID | Document | Form | Tag | Notes |
|---|---|---|---|---|
| DOC-1 | Sale deed / conveyance deed / allotment letter | `EvidenceRecord` (file, hash, date, claimed verification state) | **[BLOCKER]** for verified status | Absence does not prevent a `research-draft`; it prevents elevation (`E_EVIDENCE_UNVERIFIED`). Ownership claims are claims to validate (SitePlanBrief `claimedVerification`). |
| DOC-2 | Revenue record set where applicable | Jamabandi, mutation (intkal), sajra/aks-sajra extract | [ASK] | Vocabulary per ULB checklist above. For a licensed-colony allotted plot, DOC-1 + DOC-4/5 may suffice — **which combinations satisfy the verification gate is PENDING-MANNU (M1, SitePlanBrief §12)**. |
| DOC-3 | Demarcation plan / survey report | Licensed surveyor's demarcation or authority demarcation record; ideally the source behind VP-2 route 1 or 2 | **[BLOCKER]** if no §3.1 route can otherwise be satisfied | "Demarcation or survey" is Mannu's minimum. |
| DOC-4 | Approved colony layout plan + zoning plan sheet for the plot | Copy of the DTCP-approved layout/zoning plan applicable to this plot, with approval memo/date if available | **[BLOCKER]** | This is where land use, plot lines and colony-level conditions live; SR-2/SR-3 cannot resolve without it. BusinessThesis open question 2 says it gates everything real. |
| DOC-5 | Colony licence documents + conditions | Licence number, date, licensee, conditions attached to the licence | **[BLOCKER]** for regime resolution | Licensed-colony conditions are one of the overlapping regime layers (Stage 0). |
| DOC-6 | Previous sanctioned plan + occupation certificate, if any | Sanction number, date, sanctioning authority, approved drawing set | **[BLOCKER] when CB-3 = revision**, else [ASK] | Mirrors OBPAS: a revised/superseded case must enter "the sanction details of the previously approved plan" [verified-primary: HSVP OBPAS User Manual, step 4 — https://obpas.hsvphry.org.in/docs/UserManual_AA.pdf, retrieved 2026-08-22]. |
| DOC-7 | Possession certificate (where the estate regime issues one) | Document + stated area | [ASK] | The HSVP portal form carries "plot area as per possession certificate" as a mandatory field [verified-primary: same manual, step 4]. Whether the pilot parcel's regime issues one → Stage-0/PENDING-MANNU. |
| DOC-8 | Property/house tax receipt | Latest receipt | [ASK] | Listed by ULB Haryana [verified-primary: ULB page above]. Submission-relevant; recorded when held. |
| DOC-9 | CLU permission | Only if applicable | [ASK] | Listed by ULB Haryana ("CLU permission if applicable"). Expected inapplicable inside a licensed residential colony [inferred — Mannu to confirm]; the *question* is still asked, because unanswered ≠ inapplicable. |

### 4.2 Submission-stage documents (tracked, not design-gating)

Recorded in the register at intake with status {held, obtainable, not-applicable-claimed, unknown}; none blocks design; unresolved ones block only the SUBMISSION-READY lifecycle status (status language per BusinessThesis v2, Sol gate pending).

From the HSVP OBPAS User Manual (architect's mandatory uploads, step 7) [verified-primary: https://obpas.hsvphry.org.in/docs/UserManual_AA.pdf, retrieved 2026-08-22]:

> "Form BR-I, BR-II, Site/Deviation/Compounding Report, Aadhar Card, Form V(A1/A2), Form V with Structural Drawing, and Registration Certificate (Dust Portal)"
> Optional: "Fire NOC, Approved Building Plan, Solar Power Plant, Solar Water Heater, and Previous Payment Receipts"

From the ULB Haryana approval/revision page [verified-primary: https://ulbharyana.gov.in/Home/ApprovalRevisionOfBuildingPlan, retrieved 2026-08-22]: Forms "BR-I and II (refer Haryana Building Code 2017)"; site plan and site report; and NOCs as applicable: access (B&R/NHAI), Pollution Control Board, Fire Department, Airport Authority, National Monument Authority, water & sewerage authorities, environment clearance.

Conditional set observed for stilt+4 proposals on the HSVP form (recorded, **not operative** — S+4 approvals are separately affected by SR-6): abutting-road question ("whether plot is facing 10 meters or greater road/sector road"), mutual consent agreement for construction of stilt+4 floors, basement conditions ("only in case of plots of at least 250 sq.mtrs and 10 mtrs width"), and common-wall consent of left/right adjoining owners [web-sourced from the manual's form screenshots — https://obpas.hsvphry.org.in/docs/UserManual_AA.pdf, retrieved 2026-08-22; the numeric thresholds are portal-form text, not loaded rules — [TO-LOAD] against HBC-2017 amendments and the operative S+4 instruments].

**Consequence for intake [inferred]:** UrbanOS asks the professional-signed-forms question (BR forms, structural certificate) at intake only as *awareness* items — they are produced by authorised professionals at stage 5, never by UrbanOS (boundary rule: the software never signs, never files, never claims approval).

### 4.3 What the portals actually demand — routing note

- **HSVP OBPAS** (`obpas.hsvphry.org.in`): allottee logs in with PPM credentials; portal auto-pulls plot metadata (plot ID, urban estate, category, sub-category, plot number, plot area, dimensions, estate office, zone); allottee assigns an **empanelled architect**, who is the operative applicant; architect completes General Information (incl. proposal type, case type fresh/revised, possession-certificate area, additional purchasable FAR, total FAR area, built-up area, basement area and basement distances from adjoining plots, construction type A/B/C — meaning of A/B/C [TO-LOAD]), Public Health Checks (water supply, sewerage, rainwater-harvesting parameters against required values), uploads the §4.2 documents, then uploads the **AutoCAD DWG which must pass mandatory-layer validation** (layers visible in the manual include `_Floor`, `_MainRoad`, `_FloorInSection`, `_PropWork`, `_Plot`, `_RealFAR`) before the Quick DCR scrutiny and fee challan (heads observed: labour cess, malba scrutiny fee, plan scrutiny fee, purchasable FAR fee, compounding fee). [verified-primary: manual above; portal description also at https://obpas.hsvphry.org.in/Home/About]
- **ULB OBPAS** (`obpas.ulbharyana.gov.in`): unified DULB portal; empanelled architect submits AutoCAD → JE scrutiny via Quick DCR → SDE → EO/Commissioner → digitally signed permission [verified-primary: https://obpas.ulbharyana.gov.in/Home/About]. Low-risk self-certification category (reported thresholds height <15 m, plot <1000 sqm) remains **[web-sourced, unverified — ResearchSprint O1, Mannu to confirm]**.
- **DTCP** (licensed colonies — our launch regime): building-plan approval in licensed colonies is reported to run through DTCP under HBC-2017 with a Building Plan Approval Committee under the CTP after comments of HSVP, the fire officer and the STP [web-sourced, unverified — `tcpharyana.gov.in/AR_UrbanArea.html` refused connection on 2026-08-22 (ECONNREFUSED); content known only via search excerpt]. **Which portal and authority govern the pilot parcel is a Stage-0 output (SR-1) and must not be presumed from this note.**

**Why intake mirrors portal fields [inferred]:** every datum the portal will eventually demand that UrbanOS can hold from day one (case type, possession-certificate area, basement distances, consent status, NOC applicability) is captured at intake or explicitly registered as a gap — so stage 5's approval-ready package is an export of held, sourced data rather than a second interrogation of the client.

---

## 5. Family D — System-resolved facts [STAGE-0 OUTPUT]

These are **outputs with input dependencies**, listed so intake knows what it exists to feed. "The 'jurisdiction slice' is an output, not an input" [BusinessThesis v2, locked].

| ID | Resolved fact | Resolved from | Failure behaviour |
|---|---|---|---|
| SR-1 | Governing authority/regime stack for the parcel (DTCP licensed-colony conditions, HSVP estate, municipal/ULB limits, controlled area — these **overlap**; the engine resolves layers per parcel) + the applicable submission portal | VP-1 pin, VP-2 polygon, DOC-4, DOC-5 | Unresolvable → proposed `E_AUTHORITY_UNRESOLVED`. Conflicting layers → traceable decision rule + human escalation; **no static hierarchy** [locked]. |
| SR-2 | Land use of the parcel | DOC-4 zoning/layout plan | Missing/illegible → proposed `E_LANDUSE_UNRESOLVED` (protocol hard blocker). |
| SR-3 | Applicable plan instruments (development plan, sector plan, colony layout, licence conditions) with time/status | Rulebook corpus + DOC-4/5 | Each instrument carries the five-layer schema; instruments not yet ingested → UNKNOWN with a named [TO-LOAD] slot. |
| SR-4 | Development-control schedule for this plot: FAR, ground coverage, height, setbacks, density, parking, fire requirements, NOC triggers — **all values [TO-LOAD]**, clause-cited when loaded | Rule graph keyed by applicability (plot-size band, road width VP-6, land use SR-2, project type CB-3/4) | Any consumed rule whose value is unloaded → the affected clause reports UNKNOWN; the envelope is not emitted on guessed values. **No number in this document may be transcribed into SR-4.** |
| SR-5 | Purchasable/additional FAR availability and price basis | Rulebook + DOC-7 regime | "User-entered FAR is a claim to verify, not the governing truth" (Mannu §3, verbatim) — applies to *every* client-supplied rule value. |
| SR-6 | Operative status of stilt+4 / floor-wise instruments as of run date | Rulebook time/status layer | Known state at drafting: the official TCP Haryana portal records the High Court's 2 April 2026 interim order in CWP-PIL 212/2024 and a 3 April 2026 strict-compliance direction [verified-primary per Mannu's review: https://tcpharyana.gov.in/WebAdmin/Stilt4Portal/Index]; the reported 21 July 2026 memo is **HOLD — unverified until the signed primary is obtained** (BusinessThesis OQ3). Output vocabulary: "in force on paper, not currently sanctionable" is a legal state the schema must express (ResearchSprint R3). Never "allowed", never "banned", without the instrument. |
| SR-7 | Risk category / scrutiny route (e.g. self-certification eligibility) | SR-1 + SR-4 | Thresholds currently [web-sourced, unverified] — resolves only after Mannu confirms primaries (ResearchSprint O1). |

---

## 6. Family E — Market and cost

All entries share one form: `{value, unit, as-of date, source (named, dated, URL/document ref), collected-by}` — a calculator over **declared, dated, sourced inputs; no market-oracle claims** [BusinessThesis v2, decided].

| ID | Field | Form | Tag | Notes |
|---|---|---|---|---|
| MC-1 | Comparable supply | ≥N comparable listings/transactions for plots and builder floors in the corridor: location, plot size, floor, rate ₹/sqm, date, source | [ASK] | N is an engagement-scope decision [ASK], not a statistical claim. Corridor "booming" remains directional-only until evidenced (BusinessThesis OQ7). |
| MC-2 | Selling/rental rates | Rate bands ₹/sqm (sale) and ₹/month (rent) per product type, dated, sourced | [ASK] | Client's own belief (CB-11) is reconciled against these, divergence reported. |
| MC-3 | Absorption evidence | Time-to-sell/lease observations with source | [ASK] | Absence → feasibility report states the gap; no default velocity exists. |
| MC-4 | Construction cost assumption | ₹/sqm by quality tier (CB-10), source (published index, contractor quote, client's own data), date | [ASK] | Never auto-filled from "market knowledge". |
| MC-5 | Soft costs & statutory fees | Line items: professional fees, approval fees and charges — fee heads observed on the portals (scrutiny fee, labour cess, malba fee, purchasable-FAR fee, compounding, development charges) enumerated as **checklist entries with [TO-LOAD] amounts**; the ULB page's "Scrutiny Fee @ Rs 10/- per sq m of covered area" is recorded [web-sourced from the official page, 2026-08-22] but enters the calculator only when loaded as a sourced rule | [ASK] + [TO-LOAD] | |
| MC-6 | Finance assumptions | Debt rate %, tenure, moratorium, equity split, dated + sourced (term sheet or client declaration) | [ASK] | |
| MC-7 | Scenario set | Base/upside/downside deltas on MC-1..6, each named and dated | [DEFAULT-adjacent] | The *structure* (three scenarios) may default; every *number* in them must be a declared input or a labelled delta on one. |

Absence anywhere in Family E blocks **MVP outputs 06–07** (feasibility/ROI, market snapshot) and only them; the design and compliance outputs proceed, with the register recording that the financial view is incomplete. Design and financial model update together once both exist [decided — B].

---

## 7. Reversible presentation defaults — the complete allowed list

The **only** fields that may ever be defaulted. Each renders with a visible `DEFAULT — confirm before professional issue` label; unconfirmed defaults block elevation (register gate). Nothing outside this table is defaultable; in doubt → it is an [ASK].

| ID | Default | Initial value | Reversal cost |
|---|---|---|---|
| DEF-1 | Sheet size & scale denominator | Per drawing profile (`ValidatedDrawingProfile`); pilot values PENDING-MANNU M4 | Re-render only |
| DEF-2 | Display unit & display precision | metres, 0.001 m display precision (kernel `defaultDisplayPrecisionM`) | Re-render only |
| DEF-3 | Sheet rotation (drawing placed north-up vs best-fit) | north-up | Re-render only; geometry and true north unaffected |
| DEF-4 | Layer palette, hatch styles, line weights | House style; HSVP Layer Guidelines DWG as the starting reference for layer *naming* (ResearchSprint R4) | Re-render only |
| DEF-5 | Option naming/labelling (A/B/C) and legend language (English) | A/B/C, English | Cosmetic |
| DEF-6 | Scenario structure (base/upside/downside) | Three scenarios | Recompute only |
| DEF-7 | Which two of N compliant options are presented first | Ranked by client's CB-12 priority order | Re-rank only |

Explicitly **not defaultable** (recorded because each has been tempting): number of floors; basement presence; any setback; any rule value; north; road width; plot area; unit conversion factors for variable units; Vaastu weights; budget; any date.

---

## 8. Blocker summary

Geometry/evidence blockers: **as ratified in SitePlanBrief v5 §8.1** (`E_*` union) — reused, not duplicated.

Proposed new intake blockers (naming and placement for Sol to ratify; semantics defined above):

| Code (proposed) | Raised when | Defined at |
|---|---|---|
| `E_BRIEF_ESSENTIAL_MISSING` | Any of CB-1..CB-7 absent or mutually contradictory | §2 |
| `E_AUTHORITY_UNRESOLVED` | Stage 0 cannot resolve the parcel's regime stack from VP-1/VP-2/DOC-4/DOC-5 | §5 SR-1 |
| `E_LANDUSE_UNRESOLVED` | Land use unresolvable from the approved plan set | §5 SR-2 |
| `E_ROADWIDTH_UNSOURCED` | VP-6 missing or without a source ref (distinct from geometric `E_FRONTAGE_INCOMPLETE`) | §3.2 |
| `E_CONSTRAINT_DECLARATION_MISSING` | VP-9 question unanswered (no declaration ≠ no constraints) | §3.2 |
| `E_RULE_STATUS_UNRESOLVED` | A consumed rule's time/status is unknown, stayed, or contested and unresolved → clause verdict UNKNOWN / REVIEW REQUIRED | §5 SR-4/SR-6 |

Deliverable-level gates (not blockers): missing Family E → outputs 06–07 withheld; missing DOC-1 verification → stamp stays `research-draft` (`E_EVIDENCE_UNVERIFIED` path); unacknowledged warnings → `E_WARNING_UNACKNOWLEDGED` per SitePlanBrief.

---

## 9. Evidence appendix — sources for §4 portal findings

| Source | URL | Status | Retrieved |
|---|---|---|---|
| ULB Haryana — Approval/Revision of Building Plan (checklist: BR-I/II, ownership proof "sajra, intakal, jamabandji, mutation, lease deed etc", tax receipt, site plan & report, CLU, NOC list, scrutiny fee line, low/high-risk definitions) | https://ulbharyana.gov.in/Home/ApprovalRevisionOfBuildingPlan | verified-primary (read 2026-08-22) | 2026-08-22 |
| HSVP OBPAS — User Manual for Allottee and Architect (PPM auto-pull, architect-as-applicant, application form fields, S+4 conditional questions, public-health checks, mandatory/optional upload lists, DWG mandatory-layer validation, fee heads) | https://obpas.hsvphry.org.in/docs/UserManual_AA.pdf | verified-primary (read 2026-08-22) | 2026-08-22 |
| HSVP OBPAS — About | https://obpas.hsvphry.org.in/Home/About | verified-primary | 2026-08-22 |
| ULB OBPAS — About (workflow: empanelled architect → JE → SDE → EO/Commissioner; Quick DCR) | https://obpas.ulbharyana.gov.in/Home/About | verified-primary | 2026-08-22 |
| TCP Haryana — Stilt+4 portal (HC stay CWP-PIL 212/2024; 3 Apr 2026 direction) | https://tcpharyana.gov.in/WebAdmin/Stilt4Portal/Index | verified-primary per Mannu's review 2026-08-21 | via review |
| TCP Haryana — building-plan approval in urban areas / licensed colonies | https://www.tcpharyana.gov.in/AR_UrbanArea.html | **unreachable 2026-08-22 (ECONNREFUSED)**; content [web-sourced, unverified] via search excerpt only | 2026-08-22 |
| 21 July 2026 DTCP memo (S+4 abeyance) | — | **HOLD** — unverified until signed primary obtained (ledger 081; BusinessThesis OQ3) | — |

No value from any row above is operative in SR-4/SR-6 until ingested through the five-layer schema with Mannu's validation.

---

## 10. Open items

| # | Item | Owner |
|---|---|---|
| P1 | Which document combinations satisfy the ownership-verification gate for a licensed-colony plot (extends SitePlanBrief M1) | Mannu |
| P2 | Confirm the pilot parcel's actual approval route: DTCP committee vs HSVP OBPAS vs ULB OBPAS — Stage-0's first live test | Mannu |
| P3 | Signed 21-July memo + HC order primaries (SR-6 stays HOLD until then) | Mannu |
| P4 | Minimum level/topography set for a plot this size (VP-8) | Mannu |
| P5 | Low-risk self-certification thresholds and meaning of portal "Construction Type A/B/C" | Mannu |
| P6 | Ratify §8 proposed blocker codes and the §7 closed default list | Sol |
| P7 | Reconcile §4.2 lifecycle tracking with the five-status ↔ two-stamp design item | Sol |
| P8 | Engagement-scope numbers used in CB-15/MC-1 (review cycles, comparable count) | Shivam + Mannu (founders' call) |
| P9 | Whether the pilot client's brief intake happens as one sitting or staged (affects nothing above; affects delivery) | Shivam |

---

*Completeness claim: every row of Mannu's §3 table maps to a section here (Client brief → §2, Verified parcel → §3, Documents → §4, System-resolved facts → §5, Market and cost → §6); every field carries exactly one classification tag; no statutory value appears as operative; all Haryana-specific values are [TO-LOAD] or labelled web observations with URL and date.*