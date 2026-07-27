# UrbanOS — Data Sourcing Requirements Register

*Prepared 22 July 2026 · Companion to the MVP prototype and `UrbanOS-PRD-v2-Recommendations.md`.*

**Purpose.** This is the documented register of every information source — government, regulatory, market, and technical — required to take UrbanOS's engines from demo-grade to production-grade accuracy. Each entry maps to the specific engine/module (and, where relevant, the exact field in the current codebase) that consumes it, with the issuing body, update cadence, and recommended acquisition method.

**A note on "100%".** Two engines can genuinely approach 100% *computational* accuracy — feasibility arithmetic and quantity take-offs are deterministic once their inputs are right. But research literature and the AutoDCR experience show only ~50–60% of building-code requirements are machine-checkable at all (the rest need drawings, site inspection, or officer discretion), and market prices are estimates by nature. The honest production target is therefore: **100% accuracy on machine-checkable rules against the current versioned rule pack, ±5–10% bands on costs/prices with disclosed provenance, and explicit "requires professional verification" flags on everything else.** This register is what it takes to get there.

---

## 1 · Regulatory & Compliance Engine (Pre-scrutiny)

The moat. Everything here must be **versioned, clause-cited, and amendment-tracked**. Sourced per jurisdiction; Gurugram/Haryana listed first as the launch geography, with equivalents for Delhi, Noida/UP, and Bengaluru/Karnataka.

### 1.1 Building codes & bylaws (primary rule source)

| Document | Issuing body | Feeds (codebase today) | Update cadence | Acquisition |
|---|---|---|---|---|
| Haryana Building Code 2017 + all amendment notifications | Dept. of Town & Country Planning (DTCP) Haryana | `BylawRules.maxFar`, `maxGroundCoveragePct`, `setbacks`, `parkingEcsPer100Sqm`, height rules | Amended several times a year via gazette/circulars | Gazette + DTCP website monitoring; codify clause-by-clause with citations |
| National Building Code (NBC) 2016, Parts 3 & 4 (+ amendments) | Bureau of Indian Standards (BIS) | Fire/life-safety checks, high-rise threshold, refuge area, parking geometry, `FLOOR_TO_FLOOR_M` | Periodic amendments | **Paid BIS licence** — NBC and IS codes are copyrighted; budget for licensing |
| Unified Building Bye-Laws (UBBL) 2016, Delhi | DDA / MCD | Delhi rule pack | Amendments + MPD interplay | Gazette monitoring |
| Noida Building Regulations & Directions (2010, as amended) | Noida Authority | Noida rule pack | Board-resolution amendments | Authority website + board minutes |
| BBMP Building Bye-laws / Zoning Regulations of RMP-2015 (and RMP revision when notified) | BBMP / BDA | Bengaluru rule pack | Irregular; large shift when new RMP notifies | Authority engagement + gazette |
| Model Building Bye-Laws 2016 | MoHUA (TCPO) | Fallback/reference template for new cities | Rare | Public download |

### 1.2 Master plans, zoning & land-use

| Document | Issuing body | Feeds | Cadence | Acquisition |
|---|---|---|---|---|
| Gurgaon-Manesar Urban Complex Development Plan 2031 (+ sector plans) | DTCP Haryana / GMDA | Zoning of a parcel → which FAR/use table applies; the "what can this plot legally become" answer | Revisions + CLU notifications | Plan PDFs + **AMRUT GIS-based master plan layers** where published |
| Master Plan for Delhi (MPD-2021 / MPD-2041 as in force) | DDA | Delhi land-use verdicts, TOD zones | Draft→notify cycles | DDA portal |
| Noida Master Plan 2031 | Noida Authority | Noida land-use | Periodic | Authority |
| Revised Master Plan (RMP) Bengaluru | BDA | Bengaluru land-use, zoning maps | Long cycles | BDA |
| Zoning/land-use GIS layers | AMRUT sub-scheme (GIS master plans), state urban depts, Bhuvan (NRSC) | Machine-readable zoning for the site-ingestion module | As published | Download + digitize gaps in-house |

### 1.3 Envelope-modifying policies (the uniquely Indian arithmetic)

| Policy | Issuing body | Feeds | Notes |
|---|---|---|---|
| Haryana TOD Policy (2016/2017 + amendments) | DTCP Haryana | FAR bonus along TOD corridors (`notes[]` today → must become computable rules) | Corridor maps required |
| Purchasable FAR / premium FSI schedules | DTCP Haryana; equivalents in UP, Karnataka | The premium-FSI optimizer (PRD-v2 addition); ₹ rates per additional FAR | Rate schedules change with circle rates |
| TDR (Transferable Development Rights) rules & registries | State TCP depts / municipal bodies | TDR option in yield optimization | Registry access varies by state |
| Affordable housing policies: Haryana AHP 2013, DDJAY; state EWS mandates | State housing depts | `ewsPctRequired`, mandatory unit-mix rules | Scheme-specific FAR/density overrides |
| Stilt + 4 floors policy (Haryana), basement policies | DTCP Haryana | House/plotted floor caps | Politically volatile — track closely |
| Green building FAR incentives (ECBC/GRIHA/IGBC-linked) | State notifications | Green Core scenario bonuses | Fold into rules corpus |
| Township / licensing policy (Haryana licence regime: NILP, DDJAY, IT parks etc.) | DTCP Haryana | Township module: minimum land, licence conditions, internal norms | Licence fees feed feasibility too |

### 1.4 NOC & clearance regimes (process gates)

| Clearance | Authority | Feeds | Notes |
|---|---|---|---|
| Environmental Clearance — EIA Notification 2006, Schedule 8(a)/8(b) + amendments | MoEFCC / SEIAA / SEAC (state) | `EC_BUILTUP_THRESHOLD_SQM` (20,000 sq m today), process timelines | Thresholds and exemptions amended repeatedly — version-track |
| Height NOC — colour-coded zoning maps (CCZM), NOCAS portal | Airports Authority of India (AAI) | Real height caps near airports (today a note; must become a computed cap from CCZM grid) | CCZM data is published per airport |
| Fire NOC / fire-scheme approval | State Fire Services (Haryana Fire & Emergency Services etc.) | Fire-access, refuge, pumping requirements | State fire acts + NBC Part 4 |
| Groundwater NOC | Central Ground Water Authority (CGWA) / state GW authority | RWH mandates, extraction permissions | CGWA 2020 notification + state rules |
| Consent to Establish/Operate (CTE/CTO) | State Pollution Control Board (HSPCB etc.) | Process-gate checklist, timelines | |
| Tree felling / green permissions | State forest depts / tree authorities | Site-prep gating | e.g. Punjab Land Preservation Act areas in Gurugram (Aravalli) |
| Heritage & ASI restrictions | ASI / state heritage bodies | 100m/300m prohibited-regulated zones near monuments | Mapped layer needed |
| Defence, railway, metro, HT-line, NH/SH setbacks | MoD, Railways, metro rail corporations, DISCOMs (IE Rules clearances), NHAI/state PWD (ribbon-development rules) | Buffer/setback checks from linear infrastructure | Each has fixed statutory distances — highly codifiable |

### 1.5 Land, title & transaction framework

| Dataset | Source | Feeds | Notes |
|---|---|---|---|
| Cadastral records: khasra/khatauni, jamabandi, mutation | Haryana: Jamabandi.nic.in / HALRIS / HARSAC maps; UP Bhulekh; Karnataka Bhoomi; Delhi Bhulekh | Site-ingestion (khasra lookup), ownership sanity | Digitization uneven (DILRMP status varies); never promise cadastral *truth* |
| Bhu-Naksha / village map geometry | State revenue depts | Parcel boundary suggestion | Accuracy varies; user-confirmed boundary stays primary |
| Circle rates / collector rates / ready-reckoner | District collectors (revenue dept), registered via IGRS portals | Land-value floors, stamp-duty math, `landPricePerAcreCr` calibration floor | Revised annually or biannually |
| Stamp duty & registration fee schedules | State revenue depts / IGRS | Transaction-cost lines in feasibility | Gender/urban-rural differentials exist |
| CLU (change of land use) policy & fee schedule | DTCP Haryana | Feasibility cost line + process gate for non-conforming use | Fee tables published |
| RERA project registry & rules (HRERA Gurugram/Panchkula; UP RERA; RERA Karnataka) | State RERA authorities | Compliance gates, and a **free goldmine**: declared project costs, saleable areas, timelines, quarterly progress | Public, scrapeable, per-project |

---

## 2 · Planning / Massing Engine

| Dataset / standard | Source | Feeds | Notes |
|---|---|---|---|
| URDPFI Guidelines 2015 | MoHUA / TCPO | Land-use allocation norms, amenity space standards, road hierarchy, density norms (today: hard-coded scenario percentages) | The backbone for township-scale allocation |
| Road & street design: IRC:86, IRC:99, IRC:103, IRC SP:87 | Indian Roads Congress | Road widths, junction spacing, footpath standards in generated layouts | Paid IRC publications |
| NBC 2016 Part 3 (general building requirements) | BIS | Habitable-room standards, light & ventilation, floor heights, basement rules | BIS licence |
| Parking layout geometry (NBC Part 4 / IS norms) | BIS | ECS area per car (`SQM_PER_ECS` = 32 today), aisle widths, ramp gradients | |
| Amenity norms: schools, health, community (URDPFI + state norms e.g. DDA/ DTCP internal development norms) | TCPO / state depts | Amenity parcel sizing in townships | Population-based triggers |
| Water demand & sewerage: CPHEEO manuals; IS 1172 | MoHUA CPHEEO / BIS | Utility sizing in layouts, infra cost realism | |
| Power load norms & substation land requirements | State DISCOMs (DHBVN for Gurugram) | Utility parcels, infra costs | DISCOM supply codes |
| Solid waste norms: SWM Rules 2016 + CPHEEO manual | MoEFCC / MoHUA | Utility allocation | |
| Topography & contours | Survey of India (Open Series Maps), drone survey (DGCA-compliant), LiDAR vendors | Slope-aware layout (currently flat-plot assumption) | Drone survey per project is standard practice |
| Geotechnical baseline: seismic zone (IS 1893), soil type | BIS, state geology depts, site soil investigation (IS 1892) | Foundation choice (`floors≥15 → piling` heuristic today), structure cost factors | Per-site soil reports remain mandatory |
| Climate data: sun path, wind, rainfall | IMD; ECBC climate-zone maps | Orientation/daylight logic for Green scenarios | |

---

## 3 · Feasibility Engine

### 3.1 Cost side

| Dataset | Source | Feeds (codebase today) | Cadence | Acquisition |
|---|---|---|---|---|
| CPWD Delhi Schedule of Rates (DSR) + Cost Index for cities | CPWD | Item-rate grounding for `constructionCostPerSqft` | Annual DSR + periodic cost indices | Public; codify with city cost-index multipliers |
| CPWD Plinth Area Rates (PAR) | CPWD | Direct ₹/sqm benchmarks by building class — the closest official analogue to the engine's rates | Every few years + indices | Public |
| State PWD Schedule of Rates (Haryana PWD SoR, UP, Karnataka) | State PWDs | State-accurate item rates | Annual-ish | Public |
| Construction cost indices | CIDC-ICRA construction cost index; RBI/WPI inputs | Escalation and sensitivity ranges | Monthly/quarterly | Subscription/public |
| Material prices: cement, TMT steel, RMC, aggregates | WPI (Office of the Economic Adviser), Joint Plant Committee (steel), regional dealer surveys, CREDAI member polls | Material-linked cost sensitivity; construction module take-off pricing | Monthly | Mix of public indices + panel of supplier quotes |
| Labour wages | State minimum-wage notifications (Labour dept), CPWD labour rates, market wage surveys for skilled trades | Labour share of construction cost; construction module manpower costing | Biannual notifications; market surveys quarterly | Public + survey panel |
| BOCW cess (1% of construction cost) & labour-law compliance costs | State BOCW boards | Statutory cost line (absent today) | Static rate, verify | Public |
| EDC / IDC schedules | DTCP Haryana (per development plan zone) | `approvalCostPctOfConstruction` must become explicit ₹/acre EDC-IDC lines for Haryana | Notified schedules; periodic revision | Public notifications |
| Licence fees, scrutiny fees, conversion charges, betterment/impact fees | DTCP / authorities / municipal bodies | Approvals cost line, per jurisdiction | Notified | Public |
| GST framework for real estate (1%/5% residential regimes, ITC rules, works-contract 18%) | CBIC / GST Council | Tax treatment of costs & sales (absent today) | Council decisions | Public; CA review |
| Construction finance terms | RBI rates; NBFC/HFC market spreads (market intelligence) | `FINANCE_RATE_PA` (9% today), `DEBT_SHARE_OF_HARD_COSTS` | Quarterly | Lender panel / market reports |

### 3.2 Revenue side

| Dataset | Source | Feeds | Cadence | Acquisition |
|---|---|---|---|---|
| Primary-market sale prices by micro-market & typology | **Licensed data**: Liases Foras, PropEquity, Propstack, CRE Matrix; consultant reports (ANAROCK, Knight Frank, JLL, C&W) | `salePricePerSqft` (city-flat today → must become micro-market grids) | Quarterly licences | Commercial data partnership (build vs buy: buy) |
| Registered transaction data | State IGRS / sub-registrar records | Ground-truth price validation, land comps | Continuous | Scrape/aggregate where public; some states sell data |
| RERA quarterly filings | State RERA portals | Actual sold-inventory prices, absorption velocity, project timelines — **free absorption dataset** | Quarterly | Scrape + parse (public) |
| Listing-price indices | Housing.com/99acres/MagicBricks indices; NHB Residex | Trend sanity check only (asking ≠ achieved) | Monthly/quarterly | Public |
| Rental benchmarks & yields | Same commercial providers + listing data | Commercial lease-value modelling (today priced as sale) | Quarterly | Licensed |
| Absorption / sales velocity by micro-market | PropEquity / Liases Foras | `MARKET_DEPTH_PTS` and `absorptionPts` heuristics → data-driven absorption model | Quarterly | Licensed |
| Land transaction comps & auction results | HSVP/Noida Authority/YEIDA e-auctions; registered deeds; broker panels | `landPricePerAcreCr` (single city figure today → corridor-level) | Continuous | Auctions are public; deeds via IGRS; broker network for off-market |
| Price growth / forecast inputs | NHB Residex, RBI house-price index, consultant forecasts | `priceGrowthPct` | Quarterly | Public + licensed |

---

## 4 · Construction Intelligence Engine

| Dataset | Source | Feeds (codebase today) | Notes |
|---|---|---|---|
| CPWD Analysis of Rates / Delhi Analysis of Rates (DAR) | CPWD | Labour & material coefficients (`0.4 bags/sqft`, `3.5 kg/sqft`, `0.045 m³/sqft`, brick counts) | Official constants to replace thumb rules |
| IS 7272 (labour output constants), IS 456, IS 1893, IS 875 | BIS | Structural activity durations, design references in activity lists | BIS licence |
| RERA filings: declared vs actual completion timelines | State RERA portals | Duration model calibration (`TYPE_PARAMS` bands) — real Indian project durations at scale, free | The single best calibration dataset |
| Slab-cycle & productivity benchmarks | Contractor partnerships, CIDC, published case studies | Phase durations, `~0.4 mo/floor` adjustment | Panel of 3–5 contractors |
| Monsoon/working-day calendars | IMD rainfall normals per district | Schedule realism (absent today) | Public |
| Safety & welfare norms | BOCW Act 1996 + state rules; NBC 2016 Part 7 | Safety-officer ratios, welfare facility requirements | Public |
| Equipment productivity norms | CPWD/industry handbooks | Future: equipment scheduling | Phase 2 |
| Contractor rate benchmarks (item-rate & turnkey ₹/sqft) | Tender results (public works portals), contractor panel | Cross-check on construction cost | e-tender portals are public |

---

## 5 · Sustainability Engine (Phase 2, per PRD-v2 scope)

| Dataset / standard | Source | Feeds |
|---|---|---|
| ECBC 2017 & Eco Niwas Samhita (residential) | Bureau of Energy Efficiency (BEE) | Energy-efficiency compliance + FAR incentives |
| GRIHA / IGBC / LEED-India rating criteria | GRIHA Council / IGBC | Green scoring of scenarios |
| Solar & net-metering policy | MNRE + state DISCOM regulations | Rooftop solar sizing/payback |
| Water: CGWA norms, CPHEEO reuse standards, STP mandates | CGWA / MoHUA / state PCBs | Water-balance modelling |
| Flood-plain & drainage maps | State irrigation depts, NDMA, city drainage masterplans | Climate-resilience checks |
| Seismic/wind hazard: IS 1893, IS 875 | BIS | Structural risk notes |
| Urban heat / tree-cover data | NRSC/Bhuvan, municipal tree census | Green-cover scoring |
| Walkability/street standards | IRC:103, Global Street Design Guide (reference) | Walkability scoring |

---

## 6 · Site Ingestion & Geospatial Stack (Module 1 upgrade)

| Dataset | Source | Notes |
|---|---|---|
| Parcel boundaries (drawn/uploaded) | User + DXF/KML/shapefile | Primary source of truth — by design |
| Cadastral overlays | State Bhu-Naksha services, HARSAC (Haryana) | Suggestion layer only, clearly labelled |
| Base imagery & maps | Bhuvan (NRSC), Survey of India OpenMaps, commercial imagery (Maxar/Planet/Airbus) under licence; OSM (ODbL — mind licence terms) | Licence review required for commercial use |
| Master-plan zoning rasters/vectors | AMRUT GIS, authority publications | Georeference in-house where only PDFs exist |
| Road network & widths | Authority sector plans, OSM + field verification | Road width drives FAR/high-rise checks — must be verified, not assumed |
| Infrastructure trunk networks (water/sewer/power) | GMDA/authority engineering wings | Usually via authority engagement/RTI |
| Geospatial regulatory compliance | Geospatial Guidelines 2021 (DST); DGCA drone rules for surveys | Governs what UrbanOS may store/serve |

---

## 7 · Legal, licensing & operational prerequisites

1. **BIS licensing** for NBC and IS codes (they are copyrighted works — the *ICC v. UpCodes* analogue exists here in stronger form). Budget and contract for redistribution of clause text vs. paraphrase.
2. **Commercial data licences**: Liases Foras / PropEquity / Propstack (prices, absorption); imagery licences; IRC publications.
3. **Professional verification bench**: empanelled CoA-registered architects and DTCP-licensed consultants who (a) validate rule packs per release, (b) power the "verified by a licensed professional" premium tier. Only licensed professionals may sign/submit plans (Architects Act 1972).
4. **Gazette & circular monitoring pipeline**: Haryana Government Gazette, DTCP circulars page, authority board resolutions, MoEFCC/SEIAA notifications — with SLAs (e.g., amendment encoded ≤ 15 days from notification) and rule-pack version stamps on every output.
5. **Provenance metadata standard**: every rule and rate in the system carries source document, clause, version/date, confidence, and reviewer — this is what makes outputs defensible.
6. **Professional indemnity insurance** and legal review before charging for compliance outputs.
7. **Validation benchmark**: a 50-parcel test set per city, scored against licensed consultants' determinations; publish agreement rates (per PRD-v2 metric #3). Zero tolerated FSI-envelope errors in production geographies.

---

## 8 · Prioritized acquisition roadmap

**Tier 1 — pilot-grade Gurugram (weeks 1–8):**
HBC 2017 + amendments; GMUC Development Plan 2031 + sector maps; TOD/purchasable-FAR/DDJAY/stilt+4 notifications; EDC-IDC & licence-fee schedules; district circle rates; CPWD DSR/PAR + Haryana PWD SoR; state minimum wages; HRERA filings (prices, timelines, absorption); AAI CCZM for IGI airport; EIA thresholds. → Replaces every demo value in `src/data/jurisdictions.ts` and `src/data/costs.ts` for Gurugram with cited, versioned entries.

**Tier 2 — production-grade Gurugram (months 2–6):**
Licensed micro-market price/absorption data; land-comp pipeline (IGRS + auctions + broker panel); contractor productivity panel; NBC/IS licensing; consultant validation bench + 50-parcel benchmark; gazette-monitoring pipeline live with SLA; GIS zoning layer georeferenced.

**Tier 3 — scale (months 6+):**
Second geography (Maharashtra UDCPR — one rulebook, hundreds of ULBs); Delhi/Noida/Bengaluru packs to production; sustainability datasets; utility-network layers via authority partnerships.

---

*Every source above should enter the system through the DCR data pipeline (digitize → cite → version → human-verify → publish with freshness SLA) described in PRD-v2 §4. Sourcing is COGS, not a one-time task: the register above is a living procurement checklist, not an appendix.*
