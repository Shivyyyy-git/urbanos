# R2 · R4 · R5 · R6 — the sprint's four secondary recommendations (decision draft)

**Owner:** Fable (draft) — **proposals, not changes.** No existing document was edited.
**Status:** DRAFT v1 — 2026-08-16. From `collab/ResearchSprint-Stage1.md`. Companions: **R1** (`R1-Stage1Scope-draft.md`), **R3/D5** (`RuleSchema-Restraint-draft.md`).
**Shape:** four independent sections. Rule them separately — none depends on another, and none blocks build.

| | Item | Kind | Blocked on |
|---|---|---|---|
| **R2** | The self-certifying architect as buyer | Go-to-market hypothesis | Mannu (O1) |
| **R4** | HSVP layer guidelines as the M-S4 starting point | Engineering input | D1 (which authority) |
| **R5** | Two — now three — standing licence rules | Standing policy | Nothing |
| **R6** | Lead with generation, never checking | Positioning rule | Nothing |

---

## R2 — Point the pitch at the architect who self-certifies

### What the evidence supports, and what it doesn't

Reported: **Low Risk Category** buildings — height <15 m, residential/industrial/commercial with plot area <1000 sqm — are sanctioned under **self-certification**, with responsibility resting on **the Architect and the Citizen**. [third-party; **O1, unverified against a gov page** — Mannu confirms.] Our plot-size slab and that slab coincide almost exactly.

What this establishes: the risk-carrier on a builder-floor file is a **named individual with repeat frequency**. That is the profile that makes intermediary economics work, and it is the profile `BusinessThesis` OQ1 was groping for ("the builder directly, or the architect/liaison who runs many files a year?").

**What it does not establish: that they will pay.** Three counters worth holding:
1. Architects have carried this risk for a while and may already price it into their fee — the exposure is not new to them.
2. The architect is paid by the builder. If the tool's cost is passed through, the builder is still the payer and R2 changes the *channel*, not the economics.
3. Their willingness to pay is capped by the fee per file. `MoneyV1`'s liaison-fee anchor is the number that decides this, and it is still Mannu's to supply.

So **R2 sharpens the hypothesis and tells us what to instrument — it does not answer OQ1.** That answer comes from pilots.

### The sharp point: the two buyers want differently-shaped products

- **Builder:** *"should I buy this plot / what is it worth"* — per-project, **pre-purchase**, low frequency per person, high stakes per instance.
- **Architect:** *"do not let me sign something wrong"* — per-file, **post-design**, high frequency, lower stakes per instance but career-ending in the tail.

**And that creates a direct tension with R6:** the architect's pain is *checking*-shaped, which is exactly what R6 says never to lead with and what the State's Quick DCR already does free.

**Resolution — sell the architect generation, on a different pain.** Not "we check your drawing before you self-certify" (competing with a free government service) but *"design inside a cited envelope, and the self-certification is safe because the drawing was legal before you drew it."* Same engine, same output, same product as the builder's. Only the pain in the pitch changes: the builder buys **land certainty**, the architect buys **signature safety**.

That resolution is the whole of R2. It costs nothing to adopt because it changes no product surface.

### Proposal

1. Fold into `BusinessThesis` OQ1 as a **named hypothesis to test**, not a decided answer: *the risk-carrying self-certifying architect is the probable repeat payer; the builder is the probable per-project payer; pilots decide which one carries the subscription.*
2. Strengthen `MoneyV1`'s pilot-mix requirement from **≥1 via-liaison project to ≥2**, and instrument specifically for: *does the architect absorb the cost or pass it through?* That single observation decides whether the structure flips to intermediary-subscription.
3. **Timing flag:** DTCP's 2026-07-21 memo gives "self-certification modalities under finalisation" as part of its reason. The self-certification regime may be **changing right now** — which is both the risk (thresholds move) and the opening (a new process is when people shop for tools). Another Mannu question.

---

## R4 — Adopt HSVP's published layer guidelines as the M-S4 starting point

### The finding

HSVP's OBPAS portal publishes **Layer Guidelines (DWG, 2025-11-04)**, a **Sample Building Plan (DWG, 2025-10-13)** and a User Manual. `Stage1Spec` **M-S4** asks Mannu to define the site-scale sheet standard — layers, dimension style, title block — from scratch. He should rule on a draft instead.

### Three things that make this less trivial than it looks

**1. The standard is authority-specific, and we have not picked the authority.** HSVP develops and allots its own sectors; DTCP licenses private colonies; ULB covers municipal areas. A Gurgaon plot builder can sit in any of the three. **R4 is therefore conditional on D1** — if the slice lands outside HSVP, the layer guidelines are the wrong authority's and we need that authority's equivalent. Recommend: adopt HSVP's as the *template shape* regardless, and confirm the actual layer table per D1's authority.

**2. The files are DWG, which we have gated.** `collab/dwg-conversion-research.md` closed this: no server-hosted RealDWG, ODA's free converter is non-commercial, CloudConvert only as a permissioned pilot. **But we do not need a DWG pipeline to get the standard — we need the standard.** Cheapest path by a distance: **Mannu opens the DWG in AutoCAD and transcribes the layer table, dimension style and title-block fields.** One afternoon, no format decision, no gated dependency. The DWG question stays closed.

**3. It strengthens the boundary rule rather than straining it.** Matching a submission layer standard could look like drifting toward "we submit." It is the opposite: it makes our output **drop cleanly into the workflow of the human who submits**. That is "informs and designs; people decide, sign, submit" working exactly as written — we hand a person a better input and stop. The stamp still governs the claim; the layer names govern only whether an architect can use the file without re-drawing it.

### Proposal

Route to Mannu as an addition to M-S4: *"here is the State's own published layer standard — start from it, tell us where it is wrong or where your slice's authority differs."* Adopt as `Stage1Spec` §6.2's drawing standard on his word. Shared with Feature 2's **M-U1** (unit-scale), which remains separately open.

**Action needed:** someone with AutoCAD (Mannu) downloads and opens the two DWGs. I have not downloaded them.

---

## R5 — Standing licence rules (two proposed, a third added)

These belong in the ledger's **Protocol §6 (standing constraints)**, not in a spec — they are project-wide and outlive Stage 1. Proposed text below is drop-in.

### The rules, stated to be enforceable

**(i) A dependency's licence is what ships inside the artifact, not what the badge says.**
The general rule; CGAL is the worked example. The npm `straight-skeleton` package advertises MIT and ships a **GPL-3+ CGAL build compiled to WebAssembly**. An MIT wrapper does not relicense the binary it carries. Any dependency that ships a **compiled binary, a WASM blob, or vendored third-party source** gets its contents traced before adoption.
**Standing instance: no CGAL-derived geometry code, in any wrapper, in any language.**
*I know this ban is broader than strictly necessary — CGAL's kernel/support packages are LGPL, only the higher-level algorithms are GPL. I am proposing the blanket ban anyway, because a rule that requires per-package licence archaeology is not a rule a busy person or an agent will actually apply, and the algorithms we would reach for (skeletons, offsetting, boolean sets) are the GPL half. Escape hatch: a named exception requires reading that package's `package_info/*/license.txt` and Shivam's sign-off.*

**(ii) No share-alike geometry inside the owned database.**
OSM and Overture's Base/Buildings/Divisions/Transportation themes are **ODbL**. Operational test: *does the geometry get **stored and re-served as data**, or only **rendered into an image/PDF**?* Stored ⇒ risks making our database a Derivative Database and inheriting share-alike. Rendered ⇒ a Produced Work, fine with attribution. **Rule: ODbL geometry may be rendered, never ingested.** Google Open Buildings is taken under **CC BY 4.0** (it is dual-licensed) precisely to avoid this, and stays context-only.

**(iii) No geometry is ever derived from a basemap. [new — promoting this out of the scan's §2.3]**
It was recorded as a map-provider note; it deserves standing-rule status because it is simultaneously:
- a **licence obligation** — Google Maps Platform terms prohibit tracing or digitising building outlines from imagery; and
- an **engineering rule** — boundary provenance stays with the kernel's declared routes (`Stage1Spec` §4), and a traced boundary is an *asserted* one. That is the same family of failure as the old prototype's setbacks: a number that looks measured and is not.

Rule (iii) is the one most likely to be violated by accident, by someone being helpful with a screenshot.

### Proposed Protocol §6 addition

> **Licence and provenance rules (standing).** (a) A dependency's licence is whatever ships inside its artifact, not what its badge says; anything shipping a binary, WASM blob or vendored source is traced before adoption. **No CGAL-derived geometry code, in any wrapper — named exceptions require the package's own licence file plus Shivam's sign-off.** (b) Share-alike (ODbL) geometry may be *rendered* into outputs with attribution, never *ingested* into the owned database. (c) No geometry is ever derived from a basemap — not traced, not digitised, not measured off imagery; boundary provenance stays with the declared kernel routes.

---

## R6 — Lead with generation, never with checking

### The commercial reason first, because it is stronger than the positioning reason

**Our price ceiling for checking is zero.** The State gives it away: ULB and HSVP OBPAS both run the Quick DCR engine that scrutinises submitted AutoCAD against the Haryana Building Code and returns a deviation report, free, as part of the approval process. Above that, the authority-side checking market is held by a listed company with 35+ deployments and government relationships we do not have (SoftTech / CivitPERMIT-AutoDCR).

Any pitch that lands as "we check compliance" is therefore competing with free at the bottom and with an incumbent at the top, in a segment where we have no structural advantage. The generation segment — *cited statutory law → legal envelope, before a drawing exists* — is empty, globally as well as locally, and the scan confirmed the entire geometry-first category (TestFit, Forma, Giraffe, Hypar, qbiq) has declined to enter it.

### The operational test

For any sentence about what UrbanOS does, ask: **does it describe answering a question asked *before a drawing exists*, or evaluating a drawing that already exists?** Lead with the former.

| Don't say | Say |
|---|---|
| "checks your plan against Haryana rules" | "tells you what Haryana rules let you build here" |
| "compliance verification" | "the legal envelope" |
| "makes sure your drawing passes" | "every option is legal by construction" *(already thesis language)* |
| "catches violations before submission" | "you won't need a deviation report — the envelope was legal before you drew it" |

That last pair matters most: it **acknowledges the buyer's mental model without adopting their frame.** R6 is reframe, not avoidance — refusing to ever mention checking would make us unintelligible to an architect whose whole world is deviation reports.

### Proposal

Adopt as a claims rule alongside the existing claims discipline (never imply approval, certification or sign-off). It governs marketing copy, the pitch deck, the demo script, report cover language and the Stage-2 roadmap framing. Cross-reference R2: the architect is sold *generation on a checking-shaped pain* — signature safety through a legal-by-construction envelope, not a second opinion on a finished drawing.

---

## What these cost, and what they need

| | Cost | Needs |
|---|---|---|
| **R2** | Zero product change — a hypothesis label plus one extra pilot slot | Mannu: O1 thresholds; the liaison-fee anchor for `MoneyV1` |
| **R4** | One afternoon of Mannu's time in AutoCAD | D1 first, to know whose standard applies |
| **R5** | One paragraph in Protocol §6 | Shivam's word |
| **R6** | A copy pass on existing material | Shivam's word |

None blocks build. R5 and R6 are rulable today with no new information; **I would take those two now** and let R2 and R4 wait on Mannu — R5 in particular is cheap as a standing rule and expensive as a retrofit, which is the same argument that carried R3.
