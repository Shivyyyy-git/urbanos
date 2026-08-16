# ResearchSprint-Stage1 — Market + Technical Scan

**Owner:** Fable (research) — **recommendations only; every decision escalates to the goal chat.**
**Status:** v1 COMPLETE for the two commissioned tracks — 2026-08-16. Track 3 (repo passes) open, awaiting links.
**Parent:** `collab/BusinessThesis.md` v1.1 · `collab/Stage1Spec.md` v1.1 · `collab/TownhouseDemoBrief.md` v1.
**Standing rule:** the moat (versioned cited rulebook) is never outsourced; this scan covers everything *around* it.

**Evidence labels:** [vendor] = company's own site/pricing page · [doc] = official documentation / repo / licence file · [gov] = government source · [third-party] = press, filings, aggregator · [inferred] = my reasoning from the evidence. Aggregator pricing was discarded wherever a vendor page could be reached; where it could not, the claim is labelled and flagged unconfirmed.

---

## 0. Read this first — three findings that outrank the rest

**F1. Stage 1's only plot type is currently suspended by the State. [gov/third-party — high confidence, needs Mannu]**
The Punjab & Haryana High Court stayed the Stilt+4 policy by interim order dated **2 April 2026**, staying the effect of the State's order of 2 July 2024. Then on **21 July 2026** — three and a half weeks before this scan — the DTCP issued a memorandum (Senior Town Planner Vijender Singh, for the Director) suspending **all fresh approvals** of S+4 residential buildings, binding HSVP, HSIIDC, ULB, and all STP/DTP field offices, and instructing the IT wing to **"immediately disable the submission of applications"** for S+4 on both the dedicated portal and HOBPAS. Stated reason: modalities for online approval / **self-certification "currently under finalisation"**, plus administrative exigencies. Scope is fresh approvals; already-sanctioned plans are not addressed in the memo. ([Tribune, 22 Jul 2026](https://www.tribuneindia.com/news/haryana/haryana-town-planning-department-halts-s4-floor-approvals/); [stay reported 6 Apr 2026](https://therealtytoday.com/news/news/punjab-and-haryana-high-court-stays-haryanas-stilt-plus-4-housing-policy/))
→ `Stage1Spec` §3 fixes v1 to "residential plotted, builder-floor intent (the stilt+N scenario)". `BusinessThesis` customer #1 is "buy plot → stilt+4 → sell floors → repeat". **The frequency engine under customer #1 is, as of today, switched off at the portal.** Escalation R1.

**F2. Haryana already runs an automated rule-checker — but at the wrong end of the pipe. [gov]**
Both the ULB and HSVP OBPAS portals run a **"Quick DCR Scrutiny Engine"** that ingests submitted **AutoCAD drawings** and auto-generates **deviation reports** against the Haryana Building Code, and computes compounding fees. HSVP describes it as an in-house HSVP-IT build; ULB's unified portal went live 8 May 2026. ([ULB OBPAS](https://obpas.ulbharyana.gov.in/Home/About); [HSVP OBPAS](https://obpas.hsvphry.org.in/))
→ This is a **checker at submission**, not a **generator before design**. It answers "is this drawing legal?"; UrbanOS answers "what is legal here before anyone draws". The thesis position survives — but the State owns the checking layer, so a "we check compliance" pitch would be competing with a free government portal. Positioning consequence in §4.

**F3. The State publishes the drawing standard we were going to ask Mannu to invent. [gov]**
HSVP's OBPAS portal publishes downloadable **Layer Guidelines (DWG, 4 Nov 2025)**, a **Sample Building Plan (DWG, 13 Oct 2025)**, and a User Manual (13 Oct 2025). Architect empanelment moved to one-time COA-number registration from 1 Jan 2026. ([HSVP OBPAS](https://obpas.hsvphry.org.in/))
→ This is a direct, free input to `Stage1Spec` **M-S4** (site-scale sheet standard: layers, dimension style, title block). Recommendation in §4.3.

---

## Track 1 — Market

### 1.1 Global "what fits on this parcel" products

| Product | What it actually does | What it charges | What it avoids |
|---|---|---|---|
| **TestFit** | Solver-based site/parking/building massing with yield + pro-forma; browser + desktop. [vendor] | **Parking Solver US$195/mo** (unlimited users); **Site Solver from US$15,000/yr**; **Site Solver Portfolio from US$20,000/yr**. Add-ons: Site Intelligence +$150/mo, Pro Forma +$170/mo, MCP Connection +$100/mo. [vendor] | Statutory certainty. Zoning is an *input the user configures*, not cited law. Vendor states parcel/flood/zoning **"data layers … may not be available in all countries"**; support US hours, English only. No code-compliance claim found. [vendor] |
| **Autodesk Forma** (ex-Spacemaker) | Early-stage site design + environmental analysis (sun, wind, noise, microclimate, carbon); site limits, setbacks and height restrictions are drawn as canvas constraints. Spacemaker retired; subscribers migrated. [third-party] | ~US$185/mo or ~US$1,445/yr standalone; included in AEC Collection. **[third-party — autodesk.com returned 403 to this scan; treat as unconfirmed]** | Regulatory sourcing. Constraints are user-declared geometry, not versioned law with citations. No India rule content. [inferred] |
| **Archistar** | The closest analogue to us: property/feasibility search **plus** a Digital Compliance / AI Pre-check product sold to councils for automated plan review. [vendor] | Free (1 user, limited region); **Basic A$79.17/mo** annual (A$95 monthly); **Professional A$287.50/mo** (A$345); **National A$495.83/mo** (A$595) — all 1 paid user, prices incl. GST. [vendor] | Geography. **"currently covers Australia and all 8 of its states and territories."** Nothing in India. Sells the *council* side (AI Pre-check) as well as the developer side. [vendor] |
| **Giraffe** | Browser platform: maps + sketch + live analytics; zoning controls, FSR, height, setbacks, envelopes modelled as **executable constraints**; sold to planners, developers and government. [vendor/third-party] | **Core US$45/mo**; **Teams US$1,500/user/yr**. Enterprise = contact sales. [vendor] (An aggregator's "$1,000/user/yr" is stale.) | Same as Forma: constraints are authored by the user or by a bespoke enterprise dataset — not a cited, versioned rulebook. India coverage not offered. [inferred] |
| **Hypar** | Generative building *functions* composed into a model; ships **Elements**, an open-source "smallest useful BIM" C# library — no Rhino/Revit dependency, no proprietary geometry kernel, serialises to JSON/IFC/glTF. [doc] | Not published on the pages reached. [unknown] | Building code / statutory compliance — it is a geometry + workflow platform, not a rules platform. [inferred] |
| **UpCodes** | Building codes as searchable, linked text + AI answers with **jurisdiction-specific inline citations**. US codes. [third-party] | From ~US$25–39/mo, 3 tiers, SSO on Professional, Enterprise at 10+ seats. **[third-party — up.codes/pricing is JS-rendered and returned no content; unconfirmed]** | Geometry. It never asks what fits on your land; it retrieves and cites text. US jurisdictions only. [inferred] |
| **qbiq** | AI test-fit **inside existing buildings**: floor plans, renders, tours, CAD/Revit, takeoffs; sells to landlords, brokers, architects, tenants; claims 700M sq ft delivered, 62 countries, "validated by in-house architects", "shorten deal cycles by more than 40%". [vendor] | Not published; demo-gated. [vendor] | **Compliance, permits, and construction-ready documentation — explicitly.** Outputs positioned as conceptual/programmatic test fits. [vendor] Funding: **US$26M total** — $10M seed led by JLL Spark (Sep 2023), $16M Series A led by Insight Partners (Jan 2025). [third-party] |

**Reading. [inferred]**
The category splits cleanly into two halves that nobody has joined:
- **Geometry-first** (TestFit, Forma, Giraffe, Hypar, qbiq): excellent at "here are options", agnostic about whether the options are *legal*. Every one of them treats zoning as a **user-supplied parameter**. That is a deliberate liability choice, not an oversight — it is the same choice the thesis already spotted in qbiq, and the scan confirms it holds across the whole geometry half.
- **Rules-first** (UpCodes, Archistar's compliance line, AutoDCR/Quick DCR): excellent at "is this legal", either as text retrieval or as post-hoc drawing scrutiny. None of them *generate* the envelope.

The thesis line — "test fit **for land**, one layer up, in the layer they refused" — survives the scan intact. The unclaimed square is **cited statutory law → generated legal envelope, before a drawing exists**. Archistar is the only firm anywhere near it and is single-country. The moat framing (versioned cited rulebook, offline circulars) is precisely the thing that would let us stand in the square the geometry half refuses to enter.

**Price anchors for the Money chat. [vendor]** Serious site-planning software sells at US$15–20k/yr (TestFit Site Solver) or ~US$1.5k/user/yr (Giraffe Teams) or ~A$6k/yr (Archistar National). India plot-builder willingness-to-pay is a different market and Mannu owns that number — but the global ceiling is not low, and Archistar's ~A$950–7,150/yr ladder is the most structurally comparable (single-country, rules-backed, single-seat).

### 1.2 India authority side

**AutoDCR / SoftTech Engineers Ltd (NSE: SOFTTECH). [third-party]**
Reads CAD drawings, maps them to Development Control Regulations, checks compliance, calculates fees, issues digital approval certificates; integrated into an online approval workflow with document scrutiny and site visits. First deployed at Pune Municipal Corporation; reported implemented across 35+ urban development authorities. Now branded **CivitPERMIT (AutoDCR)** within a Civit* suite (CivitPLAN, CivitINFRA, CivitBUILD). Recent win: J&K Housing & Urban Development — auto-scrutiny building permission + CLU portal with GIS master plans. Reported Q3 FY26 revenue ₹31.25 Cr, +50% YoY. ([SoftTech / press](https://www.tribuneindia.com/news/business/softtech-engineers-limited-strengthens-urban-governance-framework-in-jammu-kashmir-with-civitpermitautodcr-technology/amp/))
→ **They sell to the authority, not to the builder.** Their customer is the office that approves; ours is the person who applies. Not a head-on competitor today. But it is the standing proof that "CAD-in, rules-checked, India" is a solved, funded, listed-company business — so a UrbanOS pitch that leads with *checking* walks into their market with none of their government relationships. Lead with *generation*.

**Haryana OBPAS — two portals, one code. [gov]**
- **HSVP OBPAS** (`obpas.hsvphry.org.in`) — HSVP's in-house build for HSVP allottees, architects, engineers, estate officers; Quick DCR scrutiny of AutoCAD drawings "as per Haryana Building Code and HSVP regulations"; portal launched 29 Sep 2025; architect registration via COA number from 1 Jan 2026; supervisor registration notice 30 Jan 2026.
- **ULB OBPAS** (`obpas.ulbharyana.gov.in`) — Department of Urban Local Bodies; unified portal operational **8 May 2026**; workflow: empanelled architect submits AutoCAD → JE digital scrutiny → SDE → EO/Commissioner → digitally signed permission letter. Quick DCR generates deviation reports and computes compounding fees.
- **Self-certification:** reported that **Low Risk Category** buildings — height **< 15 m**, residential/industrial/commercial with plot area **< 1000 sqm** — are sanctioned under self-certification, with compliance responsibility resting on **the Architect and the Citizen**. [third-party summarising the portal — **not yet verified against the gov page in this scan; Mannu must confirm**]

→ Two consequences, both commercial:
1. **The liability sits on a named individual.** If self-certification holds as described, the architect signing a plot-builder's file carries personal exposure for a wrong sanction. That is a person with a budget for certainty — and it directly informs `BusinessThesis` open question 1 ("builder directly, or the architect/liaison who runs many files a year?"). The scan's answer is: **the risk-carrier is the architect, and the risk got heavier, not lighter.** [inferred]
2. **Our size slab and theirs coincide.** Plot area < 1000 sqm and height < 15 m is essentially the builder-floor plot. Stage 1's target segment is exactly the self-certified segment. [inferred]

### 1.3 Haryana rules-data reality

- **The code is amended by notification, not by reprint. [gov/third-party]** Haryana Building Code-2017 has been amended by DTCP; reported changes include ground coverage 85% / FAR 220% for plots up to 60 sqm; 80% / 200% for >60–150 sqm; 70% coverage for 150–225 sqm; FAR 2.64 cited for 60–150 sqm; minimum rear setback 1.5 m up to 75 sqm and 2 m for 75–250 sqm; max height G+3 incl. stilt (S+4) at 16.5 m for plots up to 150 sqm; single-level basement up to 150 sqm. **Every one of these is [third-party] press reporting and must be treated as [TO-LOAD], never typed into the rulebook from this document.** The official DTCP/PR page (`prharyana.gov.in`) refused connection to this scan.
- **The fragmentation is real and it is the moat.** Three different numbers for the same slab appear across three secondary sources; the authoritative values live in notifications and circulars. This is exactly the condition `BusinessThesis` describes ("circulars that exist only offline"). The scan **confirms the moat premise** rather than weakening it: I could not, with full web access, assemble a citable, current, slab-by-slab table. Mannu's physical collection is not redundant.
- **The rulebook must model suspension, not just supersession.** `Stage1Spec` §5's version chain has `supersedes / superseded-by (+effective date)`. F1 shows a third state the schema cannot currently express: **a rule that is on the books but stayed by a court / suspended by executive memo**, where the correct output is neither "allowed" nor "superseded" but "in force on paper, not currently sanctionable". Schema gap — escalation R3.

---

## Track 2 — Technical reuse

Standing constraint: the kernel already owns fail-closed boundary geometry and deterministic DXF/PDF (`collab/SitePlanBrief.md`, Features 1–2). Nothing below is proposed to replace it. Every recommendation is *around* the kernel.

### 2.1 Envelope computation (setback offsetting, buildable polygon)

| Option | Licence | Verdict |
|---|---|---|
| **Clipper2** (AngusJohnson) | **BSL-1.0 (Boost)** [doc] | **Safe.** Polygon boolean + **offsetting (inflate/deflate)** + triangulation; C++/C#/Delphi native, ports incl. **TypeScript and WebAssembly**; ~2.4k★, active. Author flags the *triangulation* code as buggy — we don't need it. |
| **JSTS** (bjornharrtell) | **EPL-1.0 / EDL-1.0 dual** [doc] | **Safe** — take it under **EDL-1.0** (BSD-3-style). Pure-JS port of JTS, full Simple-Features predicate set, ~1.6k★. Heavier than we need but the best correctness oracle in JS. |
| **Turf.js** | **MIT** [doc] | Safe. Useful for GeoJSON plumbing. Assumes geodesic/WGS84 semantics in much of the API — a real hazard for metre-accurate setbacks. Not for the envelope maths. |
| **polygon-clipping** (mfogel) | **MIT** [doc] | Safe. Boolean ops only (Martinez-Rueda-Feito) — **no offsetting**, so it does not solve setbacks. |
| **GEOS** | **LGPL-2.1** [doc] | Amber. Only relevant if we ever run Python/Shapely server-side (Shapely is BSD but *links GEOS*). LGPL is livable when dynamically linked; it becomes a real question if anything is statically bundled. Not needed for a TS kernel. |
| **CGAL** | **LGPL-3+ (kernel/support) / GPL-3+ (most algorithms)** [doc] | **Contaminating for the algorithms we'd actually want.** |
| **`straight-skeleton`** (StrandedKitty, npm) | **README/repo say MIT** [doc] | 🚩 **DO NOT USE. GPL trap.** It is an MIT-labelled TypeScript wrapper that **compiles CGAL's straight-skeleton implementation to WebAssembly**. CGAL's own `Straight_skeleton_2/package_info/.../license.txt` reads **"GPL (v3 or later)"**, and CGAL's package overview lists that package as **GPL**. An MIT wrapper does not relicense the GPL binary it ships; the distributed `.wasm` would carry GPL-3 obligations into any product that ships it. The repo does not discuss this. (Commercial relicensing exists via GeometryFactory.) |

**Recommendation [inferred].** Setback offsetting on a single simple plot polygon is a **mitered inward offset** — for the rectilinear and near-rectilinear plots of `Stage1Spec` §3 this is a modest, testable piece of geometry, and it must in any case obey the kernel's fail-closed discipline and produce *measured*, not asserted, containment (§9.5). Writing ~200 lines we fully control beats adopting a dependency whose failure modes we don't own.
**Do:** implement the offset in-kernel; use **Clipper2 (Boost)** and/or **JSTS-under-EDL** as **test oracles** in the harness — cross-check our buildable polygon against an independent implementation on every fixture. That buys the correctness of the library without putting a third party inside the artefact that carries our stamp.
**Never:** any CGAL-derived skeleton package, in any wrapper, in any language.

### 2.2 Footprint / site layout generation

Nothing worth adopting. **Hypar Elements** (open source, C#) is the only credible OSS building-elements library found, and it is a .NET stack with its own object model — wrong language, wrong weight, and it solves modelling, not statutory placement. The commercial solvers (TestFit, qbiq) are the product, not a component. `Stage1Spec` D3 already reduces v1 to **one reference footprint** placed inside a measured buildable envelope — that is in-kernel composition work, not a build-vs-buy question. **Verdict: build. No dependency.**

### 2.3 Presentation maps

| Component | Licence | Verdict |
|---|---|---|
| **MapLibre GL JS** | **BSD-3-Clause** [doc] | **Adopt.** Community fork after Mapbox went proprietary in Dec 2020; ~11.4k★, active; **no API key, no mandatory paid service.** |
| **PMTiles / Protomaps** | reference impls **BSD-3**; spec public-domain/CC0 [doc] | **Adopt.** Single-file tile archive on plain object storage — serverless basemaps, no tile server to run, no per-view billing. ~3k★. |
| Leaflet / OpenLayers | BSD-2 | Fine alternatives; MapLibre is the better fit for vector styling. |
| **Google Maps Platform** | proprietary ToS | 🚩 **Excluded on terms, not price.** The ToS prohibit **tracing or digitising roadways and building outlines** from satellite imagery, prohibit deriving 3D building models from 45° imagery, and prohibit using Maps Content to train ML/AI. A product whose core act is turning a site into a dimensioned drawing cannot sit on that basemap. [third-party summarising ToS — verify against the live ToS before any commitment] |

**Recommendation:** MapLibre + PMTiles, self-hosted tiles. Presentation only — the map is never a source of geometry. **Boundary provenance stays with the kernel's declared routes (`Stage1Spec` §4); nothing is ever digitised off a basemap.** That rule is now a licence obligation as well as an engineering one.

### 2.4 Datasets & licensing

| Dataset | Licence | Use |
|---|---|---|
| **OpenStreetMap** | **ODbL** [gov/doc] | Share-alike. Fine as a *Produced Work* (a rendered map image/PDF with attribution). **Dangerous if any OSM geometry is ingested into our database** — that risks making the rulebook/project DB a Derivative Database with share-alike obligations. Hard rule: never mix OSM geometry into the owned dataset. |
| **Overture Maps** | Base/Buildings/Divisions/Transportation **ODbL**; Places **CDLA-Permissive-2.0**; Addresses mixed [doc] | Same treatment as OSM for the ODbL themes. |
| **Google Open Buildings** | **dual: CC BY 4.0 *or* ODbL 1.0** [vendor] | **India is covered.** Take it under **CC BY 4.0** — attribution only, no share-alike, no contamination of our DB. ~1.8B footprints; ~85% precision; known weakness on contiguous and high-rise buildings. Use for *context/illustration only*, never as a survey substitute. |
| **Bhuvan / Survey of India** | NGP-2022 liberalisation; SoI geoportal offers **free and commercial licensing models** [gov/third-party] | Amber — terms are per-product and were not pinned down in this scan. Do not assume "government = free to redistribute". |
| **Jamabandi / BhuNaksha / HALRIS (Haryana)** | gov portal, terms unstated [gov/third-party] | The State does publish a cadastral **map layer (BhuNaksha)** and a **record layer (Jamabandi/HALRIS)**, viewable and printable by khasra/khata. Relevant to `Stage1Spec` **D2/M-S3** (what boundary data pilot builders actually have) — a Gurgaon builder may well arrive with a BhuNaksha printout rather than a survey DXF. **No redistribution licence identified; treat as view-only until verified.** |

### 2.5 Reuse-vs-build summary

| Component | Verdict | Why |
|---|---|---|
| Boundary ingest / validation / DXF / PDF | **Already built — keep** | Kernel is the differentiator's substrate; fail-closed discipline is not purchasable |
| Setback offset → buildable polygon | **Build in-kernel** | Small, testable, must be measured not asserted; no safe library adds enough |
| Independent geometry oracle (tests) | **Reuse — Clipper2 (Boost) and/or JSTS (EDL)** | Correctness insurance outside the shipped artefact |
| Independent DXF verification (tests) | **Reuse — ezdxf, MIT** [doc] | Already in `Stage1Spec` §9.9; R12 write + `ezdxf audit` validation; Python, so test-harness only |
| Reference footprint placement | **Build** | One footprint (D3); composition, not a library problem |
| Presentation map | **Reuse — MapLibre (BSD-3) + PMTiles (BSD-3)** | Zero-cost, zero-lock-in, no ToS conflict |
| Context building footprints | **Reuse — Google Open Buildings under CC BY 4.0** | Only permissive India-wide option; illustration only |
| Sheet standard (layers/title block) | **Reuse — HSVP published Layer Guidelines DWG** | Free, authoritative, submission-shaped (§4.3) |
| Rulebook (values, citations, versioning) | **Build — never outsource** | The moat. Unchanged. |

---

## Track 3 — Repo licence + quality passes

Each repo gets: exact licence (from the `LICENSE` file, not the GitHub sidebar badge), transitive-dependency sweep, **GPL/AGPL/CGAL-derivative contamination verdict**, maintenance signal, and a reuse-vs-oracle-vs-reject recommendation. Procedure is `collab/R5-LicencePolicy-draft.md` §3.

**Standing check:** a permissive licence on the wrapper proves nothing. For any repo shipping a compiled binary, WASM blob, or vendored third-party source, trace what is *inside* the artefact before accepting the badge. `straight-skeleton` is the worked example.

### Batch 1 — `github.com/topics/floorplans` (submitted 2026-08-16)

Topic page, not a repo: **29 repos tagged, 20 listed.** Triaged to the six that could plausibly be used; the remainder (a WordPress plugin, the seats.io client, several personal/academic one-offs) are not credible dependencies and were not passed individually.

| Repo | Licence | What ships | Signal | Verdict |
|---|---|---|---|---|
| `cvdlab/react-planner` | **MIT** | React + Redux + Three.js deps | 1.5k★, 501 forks, 77 open issues, active | **Permissive — but wrong job.** A 2D/3D plan *editor UI*. Only a candidate if we ever build a "tweak the layout" surface. Not Stage 1. |
| `aalavandhaann/blueprint-js` | **MIT** | npm deps: three.js, PixiJS, gsap, bezier-js, thi.ng/geom-hull | 587★, v3.0.1, WIP items open | Permissive. Same category, plus a heavy 3D stack — **3D is an explicit Stage-1 non-goal** (§8). Interior scale. |
| `ekymo/homeRoughEditor` | **MIT** | vanilla JS; only Bootstrap 5 + FontAwesome | 393★, v0.95, modest pace | Cleanest of the three editors — pure SVG, near-zero dependency weight. Worth keeping as a **reference** for SVG plan editing if that surface is ever built. |
| `cansik/architectural-floor-plan` (AFPlan) | 🚩 **NONE** | Kotlin/Java + OpenCV | 398★, 87 forks, self-described prototype (FHNW student project) | 🚩 **REJECT — no licence.** No `LICENSE` file on `master` or `main` (both 404), and GitHub shows no licence. No licence means **all rights reserved**: cannot use, cannot vendor, cannot lift an algorithm. |
| `Vanuan/sweethome3d` | 🚩 **GPL-2.0** | Java desktop app; third-party components under separate THIRDPARTY-LICENSE files | 44★, CVS-to-git import, archival | 🚩 **REJECT — GPL contamination.** Also an archived import of a desktop application, not a library. |
| `kdmayer/SYNBUILD-3D` | **CC BY 4.0** (code *and* dataset) | 6.2M LoD4 synthetic building models, floor plan images, roof point clouds; Stanford SDR | 104★, published 2025 | Permissive, commercial use fine with attribution. **But: geography unspecified, and it is synthetic** — it is not evidence of anything real, and if the coverage is not India it is inert for us. Not a rulebook input under any circumstance. |

**Two traps in a twenty-repo sample — and the dangerous one is not the GPL.** SweetHome3D announces itself: GPL, archival, obviously a desktop app. **AFPlan is the real lesson.** 398 stars, a credible README, a working build, an appealing capability — and *no licence at all*. Nothing on the page warns you; the problem is an **absence**, and absences do not render as warnings. R5 §3 step 1 ("read the LICENSE file, not the badge") caught it on the first real batch, which is the argument for adopting R5 as written.

**Strategic read on this batch — wrong scale and wrong verb. [inferred]**
1. **Scale.** The topic is *unit/interior* floorplans. Stage 1 is **site-scale**: legal envelope plus a site layout. Unit interiors are Feature 2, parked at thesis Stage 5. Nothing here helps the thing currently being built.
2. **Verb.** These are **editors** (draw a plan by hand) and **recognisers** (read a plan someone drew). UrbanOS **generates** from cited law. An editor is a different product with a different buyer — and per R6 it is also the wrong story.

AFPlan's *capability* — raster plan → vectorised rooms — is the one genuinely interesting idea in the batch, because a pilot builder may well arrive with a scanned plan rather than a DXF (`Stage1Spec` D2/M-S3). But the repo is unusable, so if that input route ever matters it is a build-or-find-another decision, not a reuse one.

**Net: nothing adopted from batch 1.** `homeRoughEditor` retained as a reference only.

---

## Recommendations (not rulings — all escalate to the goal chat)

**R1 — Resolve the S+4 exposure before any pilot commits. [blocks Stage1Spec §3]**
Options, in the order I'd argue them:
- **(a) Hold the plot type, reframe the product.** With approvals frozen and a court stay live, "what can I legally build here *today*" becomes *more* valuable, not less: the honest answer for many plots is now "S+4 is not currently sanctionable", and `Stage1Spec` §1 already makes negative verdicts first-class. This is the thesis's own claim ("that answer saves a builder from a bad plot purchase") meeting its first real test.
- **(b) Shift v1's plot type** to the sanctionable envelope (G+3 / pre-S+4 norms) so the pilot output is actionable today.
- **(c) Both:** compute the currently-sanctionable envelope and print the stayed S+4 envelope alongside it, clearly marked as suspended.
I lean **(c)** — it is the only one that turns the disruption into a demo. But this is Mannu's call on ground reality and Shivam's on scope.

**R2 — Point the pitch at the architect who self-certifies, not only the builder.** Subject to Mannu confirming the Low-Risk thresholds, the self-certifying architect is a repeat-frequency user carrying personal liability inside exactly our plot-size slab. That is a sharper answer to `BusinessThesis` open question 1 than the thesis currently has. Suggest folding this into pilot selection (`BusinessThesis` OQ2).

**R3 — Add a suspension state to the rulebook schema before Build-order step A freezes it.** `Stage1Spec` §5 models supersession but cannot express "in force, but stayed/suspended, effective <date>, by <court order / executive memo>, source cited". F1 is a live instance. Cheap now, expensive after data loading starts. This also gives the stamp logic (§7) a defensible third input without adding a third stamp state.

**R4 — Adopt the HSVP Layer Guidelines DWG as the starting point for M-S4.** Free, authoritative, and it aligns our DXF with what the State's own Quick DCR engine expects to read. Mannu still rules on the sheet standard; this just means he rules on a draft instead of a blank page. Strategic bonus: outputs shaped like submission inputs make Stage 2 (Compliance Roadmap) materially easier later.

**R5 — Ratify two hard licence rules now.** (i) **No CGAL-derived code, in any wrapper, ever** — MIT badges over GPL WASM are the specific trap. (ii) **No ODbL geometry inside the owned database** — OSM/Overture may be rendered as Produced Works with attribution, never ingested. Both are cheap as standing rules and expensive as retrofits.

**R6 — Lead every pitch with generation, never with checking.** The State (Quick DCR, free) and a listed company (SoftTech/AutoDCR, 35+ authorities) already own "is this drawing compliant". The empty square, globally as well as locally, is "here is the cited legal envelope before a drawing exists" — and the entire geometry half of the market has refused to enter it for liability reasons the thesis's boundary rule already solves.

---

## Open items this scan could not close

| # | Item | Why it stayed open | Owner |
|---|---|---|---|
| O1 | Low-Risk self-certification thresholds (<15 m, <1000 sqm) | Found only in secondary summaries; gov pages did not state them to this scan | **Mannu** |
| O2 | Current sanctionable envelope for Gurgaon plotted residential post-stay | Press numbers conflict; authoritative values are in notifications | **Mannu** [TO-LOAD] |
| O3 | Whether the 21 Jul 2026 suspension has since been lifted or modified | Scan is a point-in-time read (2026-08-16); this is fast-moving | **Mannu** / re-check |
| O4 | Autodesk Forma and UpCodes exact pricing | Vendor pages returned 403 / rendered empty | Fable — retry |
| O5 | Bhuvan / SoI / BhuNaksha redistribution terms | Per-product licensing, not stated on pages reached | Fable — needs a terms-page pass |
| O6 | Giraffe / Hypar India availability and enterprise pricing | Sales-gated | low priority |

**Sources:** [TestFit pricing](https://www.testfit.io/pricing) · [Archistar pricing](https://www.archistar.ai/pricing/) · [Giraffe self-serve](https://www.giraffe.build/self-serve/) · [Giraffe pricing](https://www.giraffe.build/pricing/) · [qbiq](https://qbiq.ai/) · [qbiq Series A](https://www.prnewswire.com/news-releases/qbiq-ai-raises-16m-series-a-led-by-insight-partners-to-meet-booming-demand-for-its-automated-architectural-solutions-302347354.html) · [JLL Spark seed](https://www.bisnow.com/national/news/proptech/jll-spark-leads-10m-funding-round-for-ai-startup-qbiq-120750) · [ULB OBPAS](https://obpas.ulbharyana.gov.in/Home/About) · [HSVP OBPAS](https://obpas.hsvphry.org.in/) · [DTCP halts S+4 — Tribune](https://www.tribuneindia.com/news/haryana/haryana-town-planning-department-halts-s4-floor-approvals/) · [HC stay](https://therealtytoday.com/news/news/punjab-and-haryana-high-court-stays-haryanas-stilt-plus-4-housing-policy/) · [SoftTech J&K](https://www.tribuneindia.com/news/business/softtech-engineers-limited-strengthens-urban-governance-framework-in-jammu-kashmir-with-civitpermitautodcr-technology/amp/) · [Clipper2](https://github.com/AngusJohnson/Clipper2) · [JSTS](https://github.com/bjornharrtell/jsts) · [GEOS](https://github.com/libgeos/geos) · [polygon-clipping](https://github.com/mfogel/polygon-clipping) · [CGAL licence](https://www.cgal.org/license.html) · [CGAL package overview](https://doc.cgal.org/latest/Manual/packages.html) · [CGAL Straight_skeleton_2 licence file](https://raw.githubusercontent.com/CGAL/cgal/master/Straight_skeleton_2/package_info/Straight_skeleton_2/license.txt) · [straight-skeleton npm wrapper](https://github.com/StrandedKitty/straight-skeleton) · [ezdxf](https://github.com/mozman/ezdxf) · [MapLibre GL JS](https://github.com/maplibre/maplibre-gl-js) · [PMTiles](https://github.com/protomaps/PMTiles) · [Turf.js](https://github.com/Turfjs/turf) · [Hypar Elements](https://github.com/hypar-io/Elements) · [OSM copyright](https://www.openstreetmap.org/copyright) · [Overture attribution](https://docs.overturemaps.org/attribution/) · [Google Open Buildings](https://sites.research.google/gr/open-buildings/) · [Google Maps Platform terms](https://cloud.google.com/maps-platform/terms) · [Jamabandi Haryana](https://jamabandi.nic.in/)
