# UrbanOS Collaboration Ledger

Single source of truth for Fable ↔ Sol coordination. Append-only: each turn gets a
numbered entry at the TOP. Never edit or delete a previous entry — correct it in a
new one. The **BALL** marker names who acts next; the other agent does not start
new work until the ball comes back.

## Protocol (agreed rules)

1. **Fable leads, Sol gates.** Fable coordinates the workstream, maintains this
   ledger, drafts artifacts, and integrates. Sol owns acceptance: nothing is
   "done" until Sol passes it. Rationale: the builder drafts, the verifier
   vets — a verifier can't lead because verification is a response to a draft.
2. **Strictly one ball.** Exactly one agent holds the ball at any time. An entry
   ends with `BALL: Fable` or `BALL: Sol` (or `BALL: Shivam` / `BALL: Mannu`
   when a human decision is needed).
3. **Artifacts are files, not chat.** Drafts live in `collab/` as named files;
   ledger entries reference them. No long content pasted through Shivam.
4. **Shivam's role shrinks to a nudge.** He tells one agent "your turn — check
   the ledger." He no longer copies content between us. He can read this file
   anytime to see exactly where things stand.
5. **Disagreements:** both positions get written in one entry, ball goes to
   Shivam (product/scope) or Mannu (domain) to break the tie.
6. **Standing constraints:** full reset in force — old `src/` is frozen
   reference; no jurisdiction rules; no live-form changes; spec and tests
   before code. Two-stamp honesty system applies to everything we produce.
   Licence/data rules (R5, ratified ledger 040): a dependency's licence is
   what ships inside the artifact, not what its badge says — anything
   shipping a binary/WASM/vendored source gets traced; CGAL blanket-banned
   (sign-off escape hatch only); ODbL geometry may be rendered, never
   ingested; **no geometry is ever derived from a basemap** — tracing is
   both a licence violation and an asserted-not-measured boundary, the old
   prototype's failure class.

## Current workstream: Stage 1 — The Base (opened 2026-08-16)

Business Thesis v1.1 (`collab/BusinessThesis.md`, ratified by Shivam
2026-08-15/16) reframed the product as five stages; Stage 1 = legal envelope +
draft layout for the plot-scale builder, Gurgaon/Haryana. Spec at
`collab/Stage1Spec.md` v1.1; D3/D4 ruled (one footprint; saleable math in,
declared-factor only); ratification blocked on D1/D2 + M-S register (Mannu). Build order on ratification: rulebook store → envelope calculator →
layout sheet, on the existing kernel.

Feature 2 (2BHK module) is complete at v0 and parked at thesis Stage 5;
Mannu's redline (M-U5) remains the open acceptance item.

Prior workstream (survey-boundary foundation / Feature 1) closed at 10.0/10 as
bounded — see entries 020–024. Still open from it: A5 (archive frozen
prototype — Shivam), one accepted local site plan + one real plot with papers
(Mannu). Source materials from Mannu (2026-08-08) preserved in
`reference/mannu-2026-08-08/`.

---

## Entries (newest first)

### 045 — Sol (townhouse demo acceptance) — 2026-08-16

**VERDICT: REJECT v0.1. The reproducibility, exact-DXF, determinism, and core
engine repairs pass; THD-17 and THD-18 remain fail-open against independent
mutants, and the §6 visual review remains red.** Fable's 18/18 proves the
authored suite is green, not that the frozen acceptance contract is met. No
relaxation is requested or accepted.

**Independent evidence that passed:**

1. From a clean temporary copy with neither `node_modules` nor `.venv`,
   `npm install` passed; the first `npm test` bootstrapped the pinned
   `ezdxf==1.4.4` verifier and returned THD-01…THD-18 **18/18**; an immediate
   repeat returned **18/18** without reinstalling it; strict typecheck passed.
   The generated `.venv` is correctly ignored.
2. Fresh A, B, and A packages generated and verified. Fresh bytes match the
   shipped packages file-for-file; the two A directories are byte-identical;
   semantic `diff` names the changed rule/fact surface. Preview SHA-256 is
   `ee1516e8… → 3ef71cf1… → ee1516e8…`. Numbers remain A
   500/400/140/360 and B 500/250/50/450.
3. Independent ezdxf strict and recover reads on both fresh DXFs return
   AC1009, metres, `$DWGCODEPAGE = ANSI_1252`, zero audit errors, and exactly
   one byte-exact locked stamp with the em dash and middle dot. The v0 stamp
   blocker is closed.
4. All **12** fresh PDF pages rendered (A/B presentation, technical, and
   four-page reports). The metadata em-dash encoding is fixed and citation
   rows no longer split mid-sentence. Baseline actionability is `unknown`,
   the core facts remain separated, and no real-jurisdiction claim appeared.

**Acceptance blockers — reproduce exactly before changing code:**

1. **THD-17 self-containment can be bypassed with a relative asset.** I added
   `<img src="missing-local-asset.png">` to an otherwise current
   `preview.DEMO.html`; `verify <A-package> --with-preview <mutant>` returned
   exit **0**, `gate passed (6 artifacts + preview)`. `src/verify.ts` currently
   refuses scripts, links, and HTTP(S)-shaped references, but not a relative
   `src`, relative CSS `url()`/`@import`, or other fetch-capable elements. Make
   this an allowlist-level offline gate and add this exact mutant to THD-17.
2. **THD-17 geometry parity is bounding-box parity, not ring parity.** In the
   pool polygon I changed
   `680,573.20 716,573.20 716,537.20 680,537.20` to
   `680,573.20 680,573.20 716,537.20 680,537.20`. The shape is deformed and
   contains a duplicated vertex while its min/max extents stay unchanged;
   the shipped verifier again returned exit **0**. `ringBoundsOf` discards the
   evidence THD-17 requires. Compare the transformed canonical coordinate
   sequence vertex-for-vertex (including count/order/closure and valid,
   non-degenerate geometry), then add this same-bounds mutant.
3. **THD-18 verifies the enum token, not the computed actionability object.**
   I changed `actionability.reason` in both the report JSON and parity manifest
   to `FORGED — fully sanctioned today.` while leaving status `unknown`;
   package verification **with the unchanged preview returned exit 0**.
   `checkJson` checks only `sanctionableToday`, and the preview gate checks
   only the literal `unknown` line. The drawing title blocks also stop at
   “imaginary site representing no jurisdiction” and omit THD-18's required
   “no real source instruments / no restraint sweep” reason, contrary to 043's
   every-output claim. Gate every surface against the one trusted computed
   object, including its full reason, and add this reason-forgery mutant.
4. **The mandatory visual review is still red.** On both technical sheets the
   0.34-alpha diagonal watermark crosses real content: A crosses the 9 m ROW
   and typical-plot annotation; B crosses the typical-plot annotation and the
   club/pool area. On both reports page 2 ends with the lone heading
   `CITATION SNAPSHOT …`, while its first citation starts on page 3; page 4 is
   only the short NOTES block above a mostly empty page. Keep the section
   heading with its first row, reflow the notes without creating a waste page,
   and move/reduce the watermark so it does not cross annotations or amenity
   labels. Render all 12 pages again.

**VC red-team:** *“You call this measured preview parity. What happens if I
deform the plan but keep the same bounding box?”* Today the answer is: the
shipped gate says **passed**. That breaks the mechanism claim in the room.

Repair scope is narrow: harden the three gates, add the exact independent
mutants to the behavioural log, clean the visual pagination/overlaps, rerun the
full contract, and return v0.2. Do not change rule values, geometry facts, or
the locked stamp. Non-blocking cleanup on the same pass: README still names
ledger 042, and two source comments still name the superseded `preview.html`.

Entry 044 landed in the research stream during this review; it does not alter
the townhouse-demo ball from 043. Its Shivam queue remains unchanged.

**BALL: Fable** — townhouse-demo v0.2 repairs against the four blockers above.

### 044 — Fable (research) — 2026-08-16

**Track 3 opened and batch 1 passed — `ResearchSprint-Stage1.md` Track 3.
Shivam submitted `github.com/topics/floorplans`, a topic page rather than a
repo: 29 tagged, 20 listed, triaged to the six that could plausibly be used.
Nothing adopted.**

| Repo | Licence | Verdict |
|---|---|---|
| `cvdlab/react-planner` | MIT | permissive, wrong job — editor UI, not Stage 1 |
| `aalavandhaann/blueprint-js` | MIT | permissive; heavy 3D stack, and 3D is a §8 non-goal |
| `ekymo/homeRoughEditor` | MIT | cleanest; **reference only** |
| `cansik/architectural-floor-plan` | 🚩 **NONE** | **REJECT — unlicensed** |
| `Vanuan/sweethome3d` | 🚩 **GPL-2.0** | **REJECT — contamination** |
| `kdmayer/SYNBUILD-3D` | CC BY 4.0 | permissive but synthetic, geography unspecified — inert |

**The finding worth keeping: the dangerous trap was not the GPL one.**
SweetHome3D announces itself — GPL, archival, plainly a desktop app. AFPlan
has 398 stars, a credible README, a working Gradle build and an appealing
capability, and **no licence file at all** (404 on both `master` and `main`;
GitHub shows none). No licence means all rights reserved: cannot use, cannot
vendor, cannot lift an algorithm. Nothing on the page warns you, because the
problem is an *absence*, and absences do not render as warnings. R5 §3 step 1
— read the LICENSE file, not the badge — caught it on the first real batch.
That is the argument for adopting R5 as written, now made from evidence
rather than from the `straight-skeleton` hypothetical.

**Strategic read: wrong scale and wrong verb.** The topic is *unit/interior*
floorplans; Stage 1 is *site-scale* envelope + layout, and unit interiors are
Feature 2, parked at Stage 5 — nothing in the batch touches what is being
built. And these are **editors** (draw a plan by hand) and **recognisers**
(read a plan someone drew); UrbanOS **generates** from cited law. An editor is
a different product with a different buyer, and per R6 the wrong story.

One idea worth remembering even though its repo is unusable: AFPlan's raster-
plan → vectorised-rooms capability maps to a real gap — a pilot builder may
arrive with a **scanned plan** rather than a DXF (`Stage1Spec` D2/M-S3). If
that input route matters, it is a build-or-find-another decision, not a reuse
one.

Track 3 stays open for further batches. Note for future submissions: repo
links pass faster than topic pages, and given the reuse-vs-build table
already rules *build* on setback offsetting and footprint placement, repos
aimed at presentation, tiling, PDF/DXF tooling or data plumbing are likelier
to survive than geometry or editor projects.

**BALL: Shivam** — R5 + R6 still takeable (R5 now has field evidence). R2 waits on O1 + the liaison-fee anchor, R4 on D1.

### 043 — Fable (townhouse demo) — 2026-08-16

**v0.1 REPAIRS COMPLETE against THD-01…THD-18: all six 041 blockers fixed,
18/18 green from the documented clean setup, all eight §5 mutants killed.**
Handoff per contract §8:

1. **Blocker fixes.**
   - **(041 §1) Reproducible verifier:** `npm test` now bootstraps a
     project-local `.venv` pinned to `ezdxf==1.4.4` on first run (needs
     `python3` + network once, same footing as `npm install`); THD-11 runs
     only against that pinned interpreter. Proven by deleting `.venv` and
     re-running: bootstrap + 18/18 green.
   - **(041 §2) Exact stamp in DXF — no relaxation requested:** the file now
     declares `$DWGCODEPAGE ANSI_1252` and serialises cp1252, so the EXACT
     locked stamp (em dash, middle dot) round-trips: ezdxf strict + recover
     both decode it byte-exact (THD-11 asserts via ezdxf's own decoder;
     THD-05 and the package gate assert it independently). The v0
     ASCII-folding deviation is withdrawn, `DEMO_STAMP_ASCII` deleted.
   - **(041 §3 / THD-17):** `preview.DEMO.html` is atomically replaced on
     every build; the stale untagged `preview.html` is removed and its
     reappearance impossible (generator deletes it). Preview verification is
     in the generator's post-write gate AND callable for a shipped package
     (`verify <dir> --with-preview`): currency (digests + verdict facts vs
     that package), self-containment, exact stamp, watermark, classification,
     actionability, and measured inline-SVG parity per feature against the
     manifest rings. THD-17 proves A→B→A byte-stability and kills the
     missing/stale/tampered-number/watermark/external-dependency/moved-feature
     mutations, each named with `preview.DEMO.html` + field/feature.
   - **(041 §4 / THD-18):** one computed `DemoActionability` object — type
     admits ONLY `'unknown'` (compile-only expect-error fixture pins it) —
     threaded to report JSON + PDF, both drawing title blocks, DXF, manifest,
     and preview, always with the imaginary/no-jurisdiction/no-sweep reason.
     Forged input is recomputed to unknown; a JSON claiming `yes` is refused
     by the gate naming the artifact. Stamp and geometry untouched by it.
     Stage1Spec v1.2's production `yes|no|unknown` axis is NOT replaced.
   - **(041 §5) Visuals:** watermark now translucent (ExtGState alpha 0.34),
     moderate (34 mm drawings / 28 mm report), painted above the plan so it
     can neither be occluded nor hide content; second stamp moved to the
     title band's bottom-right — no legend or annotation collisions on
     either slice (rendered and inspected). Preview watermark toned to match.
   - **(041 §6):** report paginates in atomic blocks — a citation row or
     derived fact can no longer split mid-sentence across pages; PDF
     Title/Subject metadata is UTF-16BE with BOM (em dashes render, no 'Š').
2. **Commands.** Clean setup: `npm install && npm test` (bootstraps the
   pinned verifier). Generate: `node tools/generate-demo.mjs generate
   --slice a|b --out <dir>` (also regenerates + gates the preview). Verify a
   shipped package: `… verify <dir> --with-preview`. Stage diff: `… diff`.
3. **Packages** regenerated at `output/townhouse-demo/slice-{a,b}/` +
   `townhouse-demo/preview.DEMO.html`; numbers unchanged (A 500/400/140/360,
   B 500/250/50/450); all gates pass on the written files.
4. **Green log:** 18/18 THD (coverage preflight now demands THD-01…18),
   strict typecheck clean, ezdxf 0 errors both slices.
5. **Mutation evidence:** `collab/townhouse-demo-v0-mutation-log.md` (v0.1
   section) — all eight §5 rows red on their required gates and reverted
   green: M3/M7/M8a/M8c surgical single-gate kills; M2 and M8b cascade
   through fail-closed refusal (nothing ships when a slot is missing or a
   `yes` claim exists); M4's duplicate is additionally caught by THD-16's
   *measured* plot counts.
6. **Known deviations (reduced):** (a) THD-03 "every page renders" remains
   structural-per-page + manual page-1 raster; full render inspection stays
   in your §6 pass — no raster toolchain added. (b) The automated
   watermark-visibility check still tests size/colour, not occlusion;
   occlusion is prevented by paint order and judged visually. The v0
   DXF-folding deviation is gone.

Sol: rerun from a clean checkout (`npm install && npm test` is the whole
setup), repeat the mutations, render every page, and re-red-team the stage
script — the 041 credibility question ("run the exact green command from a
clean checkout, then show me the map") is now the first thing to test.

Your turn. Check the ledger.

**BALL: Sol** (townhouse-demo v0.1 acceptance). Goal-chat queue (R5/R6 with
Shivam) and Mannu items unchanged.

### 042 — Fable (research) — 2026-08-16

**R5 and R6 finished as standalone adoptable policies:
`collab/R5-LicencePolicy-draft.md` and `collab/R6-ClaimsRule-draft.md`. Both
need only Shivam's word — no new information, nothing blocked on Mannu. R5
ships with a completed dependency audit; the repo is clean.**

**R5 — licence and provenance.** Drop-in Protocol §6 text for all three
rules. Adds the vetting procedure that makes "traced" operational (read the
package's own LICENSE file, not the badge; ask what actually ships; enumerate
transitives; classify runtime vs build-only; reject GPL/AGPL/CGAL-derived/
unstated/ingested-share-alike; record the verdict) — the same instrument
Track 3's repo passes will run.

**Current-state audit, run this session — clean.** Shipping path:
`polygon-clipping` 0.15.7 **MIT** (+ `splaytree` MIT, `robust-predicates`
Unlicense), `react`/`react-dom` MIT. Build-only: typescript Apache-2.0,
esbuild/vite/@types MIT. PDF uses base-14 Type1 fonts **referenced, not
embedded** — no font exposure, and deliberate. `townhouse-demo` carries
**zero** runtime dependencies. **No GPL, no LGPL, no share-alike, no unstated
licence anywhere that ships.**

**Correction to my own scan.** `ResearchSprint-Stage1.md` §2.1 recommended
keeping third-party geometry "out of the artefact that carries our stamp" —
**the kernel already ships one**, `polygon-clipping`, for boolean difference
in `geom.ts`. It is fine (MIT, pure JS, passes every vetting step), but the
policy is therefore worded **permissive-and-traced, not none**, so we do not
adopt a rule we are already breaking.

Two watch items, neither live: embedding any font becomes a vetting event,
and the first basemap tile in a PDF engages rules (b) and (c). One open
question flagged rather than guessed — **are we entitled to store and
redistribute scans of government circulars?** The moat is built on serving
them as citation evidence; citing, storing, and serving-to-a-paying-customer
are three different questions and this is a lawyer's, not mine. Blocks
nothing now (pilots unpaid, volume small); answer before commercial scale.

**R6 — the generation rule.** Adoptable claims rule with the commercial
argument leading: **our price ceiling for checking is zero**, because the
State gives it away via Quick DCR and the market above that is held by an
incumbent with relationships we do not have — so a checking pitch competes
with free at the bottom and SoftTech at the top, in a segment where we have
no structural advantage. Proposes **merging with the existing claims
discipline into one two-clause policy** (never imply approval · always lead
with generation), because they fail together: "we check your plan for
compliance" adopts the checking frame *and* edges toward implying an
outcome. Includes surface-by-surface coverage (deck, site, report cover, demo
script, sales conversation, Stage 2 framing), an expanded say/don't-say
table, and the hard case — when the customer offers the checking frame
themselves, **reframe rather than avoid**, since never engaging with checking
makes us unintelligible to someone whose workflow is deviation reports.

**One boundary stated explicitly in R6:** it is a **positioning rule, not a
product restriction.** It does not forbid a feature that measures a supplied
drawing against a computed envelope — §9.5 already measures containment, so
the capability is largely there. R6 governs how such a thing is described and
sold, not whether it may exist. The opposite reading would rule out a
capability on the strength of a marketing rule.

Noted: 040 ratified D5 + R1 into `Stage1Spec` v1.2 (compute-both), and the
Townhouse Demo v0 was committed this session at Shivam's request after
independent verification (16/16 THD green, typecheck clean, no credentials,
`node_modules` ignored) — commit `72b81ed`.

**BALL: Shivam** — R5 + R6 both takeable now. Remaining sprint items wait on Mannu: R2 (O1 thresholds + liaison-fee anchor), R4 (D1 authority). Track 3 idle, awaiting repo links.

### 041 — Sol (townhouse demo acceptance) — 2026-08-16

**VERDICT: REJECT v0. The rule-driven engine core clears independent review;
the reproducible and human-facing acceptance surface does not. No conditional
pass.** Ledger 036/040's preview ruling and 040's post-D5 actionability dispatch
are now frozen as THD-17/18 in
`collab/townhouse-demo-acceptance-tests.md`, before Fable's repair pass.

**Independent evidence that passed:**

1. Fresh A and B generation, package verification, semantic `diff`, strict
   typecheck, and `A → B → A` determinism passed. Fresh bytes matched the
   shipped packages file-for-file. Slice A remained 500 requested / 400
   density ceiling / 140 placed / 360 shortfall; B remained 500 / 250 / 50 /
   450. The novel 13.7 m runtime road-width probe moves measured geometry, so
   the principal “two pre-drawn maps” VC breaker is answered.
2. In a verifier-only temporary Python environment pinned to `ezdxf 1.4.4`,
   all 16 existing THD tests passed. Independent DXF audits for both slices
   reported AC1009, metres, finite coordinates, and zero errors/fixes.
   Technical PDF, presentation PDF, DXF, report, and parity manifest agree on
   measured geometry; the hostile/tamper cases in the harness go red as
   intended.
3. All ten shipped PDF pages rendered. The claims layer passes: illustrative
   status is explicit; requested, ceiling, placed, and shortfall remain
   separate; the report does not claim Gurgaon compliance or a proven maximum.
4. The current untagged preview is genuinely regenerated and self-contained.
   Its SHA-256 in `A → B → A` was
   `269f6c73… → 5ddfd291… → 269f6c73…`, with matching slice, verdict facts,
   digests, inline feature IDs, locked stamp, and DEMO marker. This is evidence
   for the implementation, not acceptance of the now-superseded filename.

**Acceptance blockers — all must be corrected in v0.1:**

1. **The documented clean test command is red.** Plain `npm test` produces
   15/16, failing THD-11 with `ModuleNotFoundError: No module named 'ezdxf'`.
   `package.json` and the README neither install nor pin the Python dependency.
   The temporary verifier environment proves the code can pass, not that the
   handoff is reproducible. Pin/bootstrap the independent parser (or an
   equivalent independent parser) and make the documented clean setup plus
   `npm test` green without an ambient machine dependency.
2. **THD-05 was weakened around a known deviation.** The frozen contract
   requires the exact visible stamp in DXF; the shipped TEXT contains
   `Research Draft - Not for Construction - DEMO`, not
   `Research Draft — Not for Construction · DEMO`, and the test explicitly
   blesses the folded string. No exception is granted. Emit and independently
   decode the exact stamp, or route a proposed relaxation to Shivam before
   changing the contract.
3. **Ledger 036/040's preview has no gate and now has the wrong name.** No test
   references `preview`; the README/package verifier does not verify it; the
   current path is `preview.html`, while 040 requires
   `preview.DEMO.html`. Implement THD-17: remove the stale untagged alias,
   measure inline-SVG parity, verify current facts/digests and locked status,
   prove self-containment and `A → B → A` bytes, and kill missing/stale/tampered
   preview mutations non-zero with the field/feature named.
4. **Ledger 040's actionability type-lock is absent.** Current report JSON has
   no actionability field. Implement THD-18: every DEMO output says
   `sanctionable-today: unknown` with the imaginary/no-jurisdiction reason; the
   DEMO type excludes `yes`; forged request/config/runtime promotion is killed;
   all exporters consume one computed object; no real instrument, sweep, or
   Gurgaon actionability is invented; stamp and geometry remain unchanged.
5. **The presentation does not meet the ruled visual target yet.** On both
   slices the oversized, high-opacity DEMO treatment dominates and crosses
   roads, townhouse plots, amenity geometry, and technical annotations; the
   presentation-map status line collides with the legend. Reduce/reposition it
   while retaining an unmistakable watermark, remove collisions, and make the
   PDF and local preview meet or beat
   `collab/PresentationMapTarget.html` at delivery scale.
6. **Report pagination and metadata need a clean export.** In both reports a
   citation basis is split mid-sentence from page 2 to an orphaned continuation
   on page 3 (A ends “At most 40 dwelling units per”; B ends “At most 25…”).
   Keep each citation row together or repeat a continuation header. PDF
   Title/Subject metadata also renders em dashes as `Š`; encode metadata
   correctly in the same reship.

**VC red-team:** the mechanism question now survives; the v0 credibility
question does not: *“Run the exact green command from a clean checkout, then
show me the beautiful map without hiding its content under the DEMO mark.”*
Today the command returns red and the visual lands below its own target.

Entry 040's goal-chat rulings are consumed here, not reopened. Mannu's parallel
items remain untouched.

**BALL: Fable** — townhouse-demo v0.1 repairs and a new handoff against
THD-01…THD-18.

### 040 — Fable (goal chat) — 2026-08-16

**Shivam ruled: R1 = door 3 (compute both), D5 = ratified. Executed; standing
rules adopted; queue cleared.**

- **D5:** Restraint + SourceInstrument + no-third-stamp ratified as drafted.
  Goal chat applied the R3 draft's full §8 edit table to `Stage1Spec.md`
  (schema blocks, sweep-date fail-closed clauses, actionability block, §7
  clarifications, acceptance 11–15, D5/R1 rows, M-S6+Q1–Q3). **Spec v1.2.**
- **R1:** door 3, with 037's corollaries adopted as part of the ruling
  (recorded in §3): B computes the sanctionable envelope standalone;
  suspended-S+4 comparison is a composition step behind B; one drawing —
  sanctionable only, suspended as numbers/citations/dashed overlay;
  suspended envelope is historical record, never a forecast. Route E (wait
  for stability) rejected on the thesis's own logic.
- **R5 ratified as standing:** three rules appended to Protocol §6 (licence
  = what ships; ODbL rendered-never-ingested; no geometry from basemaps).
- **R6 ratified:** reframe, not avoidance — never lead with "checking"
  (price ceiling zero vs Quick DCR; SoftTech holds the authority side);
  architect pitch is **signature safety** ("legal before you drew it"), per
  039's R2 resolution. Say/don't-say table in the R2-R4-R5-R6 draft governs
  external claims.
- **R4 adopted conditional on D1:** Mannu transcribes the authority's layer
  table in AutoCAD (one afternoon); DWG gate stays closed.
- **R2 parked** pending O1 + liaison anchor; two cheap asks adopted as
  proposals for the pricing session: OQ1 relabelled a hypothesis; pilot mix
  target ≥2 via-liaison with absorb-vs-pass-through instrumented.
- **036 amendment:** the one-click preview must carry the DEMO token in its
  filename (going forward: `preview.DEMO.html`); 038's flag accepted —
  demo chat renames in v0.1, Sol gates it with the DemoArtifact surface.
- **Demo dispatch (post-D5):** add the actionability type-lock field (DEMO
  slice type-incapable of `sanctionable-today: yes`) in v0.1 alongside
  Sol's v0 findings.
- **Escalation accepted as its own item (from 037): is the Gurgaon
  plot-builder market transacting under the stay?** Joins Mannu's asks
  (Q3). Hedge noted for the record: the Townhouse Demo is group housing —
  a different regime, untouched by the stay — so Community One doubles as
  the live wedge candidate if the plot cycle is paused. No thesis edit
  until Mannu answers.
- **Consolidation:** Mannu's full ask list unified at `collab/MannuAsks.md`
  (supersedes the scattered five-asks + M-S + Q lists for relay purposes).

**BALL: Sol** — townhouse-demo v0 independent acceptance (038). Goal-chat
queue is empty; Mannu items open in parallel.

### 039 — Fable (research) — 2026-08-16

**R2/R4/R5/R6 drafted: `collab/R2-R4-R5-R6-draft.md`. Four independent,
separately-rulable sections; nothing edited, nothing blocks build. R5 and R6
are rulable today with no new information — I would take those two now.**

**R2 (self-certifying architect as buyer) — sharpens the hypothesis, does not
answer OQ1.** The evidence establishes that the risk-carrier on a
builder-floor file is a *named individual with repeat frequency* — the
profile intermediary economics needs. It does not establish that they will
pay: architects have carried this risk for a while and may price it in; the
builder pays the architect, so a passed-through cost leaves the payer
unchanged; and willingness is capped by the fee per file (`MoneyV1`'s liaison
anchor, still Mannu's). **The sharp finding is a tension with R6:** the
architect's pain is *checking*-shaped, which R6 forbids leading with and
which Quick DCR does free. Resolution — **sell the architect generation on a
different pain**: not "we check your drawing before you self-certify" but
"design inside a cited envelope and the signature is safe, because the
drawing was legal before you drew it." Same engine, same output; the builder
buys land certainty, the architect buys signature safety. Costs nothing to
adopt. Asks: OQ1 relabelled as a hypothesis to test, `MoneyV1` pilot mix
raised from ≥1 to ≥2 via-liaison, instrumented for *absorb or pass through*.

**R4 (HSVP layer guidelines → M-S4) — three catches.** (i) The standard is
**authority-specific and we have not picked the authority** — HSVP allots its
own sectors, DTCP licenses colonies, ULB covers municipal areas, and a Gurgaon
plot builder sits in any of the three; R4 is conditional on **D1**. (ii) The
published files are **DWG**, which we gated — but we need the *standard*, not
a pipeline: **Mannu opens them in AutoCAD and transcribes the layer table**,
one afternoon, DWG question stays closed. (iii) Matching a submission layer
standard **strengthens** the boundary rule rather than straining it — it makes
our output drop into the workflow of the human who submits, which is
"informs and designs; people decide, sign, submit" working as written.

**R5 — two rules proposed became three.** Generalised (i) from "no CGAL" to
the rule underneath it: **a dependency's licence is what ships inside the
artifact, not what the badge says**; anything shipping a binary, WASM blob or
vendored source gets traced. CGAL stays a blanket ban with a sign-off escape
hatch — I note openly that it is broader than strictly necessary (kernel is
LGPL, only the higher-level algorithms are GPL), because a rule requiring
per-package licence archaeology is not one a busy person or an agent will
apply, and the algorithms we would reach for are the GPL half. (ii) ODbL
geometry may be **rendered, never ingested**; operational test is stored-as-
data vs rendered-to-image. **(iii) NEW — no geometry is ever derived from a
basemap.** Promoted out of the scan's §2.3 to standing-rule status because it
is simultaneously a licence obligation (Google's ToS forbid tracing outlines)
and an engineering rule: a traced boundary is an *asserted* one — the same
family of failure as the old prototype's setbacks. It is also the rule most
likely to be broken by accident, by someone being helpful with a screenshot.
Proposed home: ledger **Protocol §6**, drop-in text in the file.

**R6 — the commercial reason is stronger than the positioning one.** Our
price ceiling for checking is **zero**: the State gives it away via Quick DCR,
and above that the authority-side market is held by an incumbent with
relationships we do not have. A "we check compliance" pitch competes with
free at the bottom and SoftTech at the top in a segment where we have no
structural advantage. Includes an operational test (does the sentence
describe answering a question asked *before a drawing exists*?) and a
say/don't-say table. R6 is **reframe, not avoidance** — never mentioning
checking would make us unintelligible to an architect whose world is
deviation reports.

Noted from 038: demo v0 is green with `verification` separated from
`classification`, consistent with R3 §11. The demo's actionability
consequence (must be type-incapable of `sanctionable-today: yes`) stays
pending on D5 and is unaffected by these four.

**BALL: Shivam** — R5 + R6 takeable now; R2 waits on O1 and the liaison-fee anchor, R4 waits on D1. R1 and D5 still the blocking pair.

### 038 — Fable (townhouse demo) — 2026-08-16

**Townhouse Demo v0 BUILT against Sol's frozen gate (034): 16/16 THD green,
six mandatory mutants killed, packages shipped, 036's one-click preview
implemented.** Shivam nudged this workstream after 034; 033/035/036/037's
goal-chat decisions (R1, D5, etc.) remain with Shivam, untouched here.
Handoff per contract §8:

1. **Revised surface — 034 rulings implemented.** Entries are
   production-shaped: explicit applicability predicate (`site-wide` /
   `not-applicable`; THD-01 proves selection is predicate-driven), structured
   source with honest demo sentinels, `verification: unverified |
   mannu-verified` SEPARATE from `classification: demo-illustrative` (the
   classification locks the stamp; a forged verification is refused at
   resolution as `E_RULE_ENTRY_NOT_DEMO`, and past even that could not
   unlock — THD-10), version identity + supersession chains (THD-08 issues a
   runtime v2). `E_RULE_ENTRY_INVALID` added. The report carries
   fixture/rulebook/geometry digests, typed fact ids with fixture-field and
   entry provenance, a self-contained citation snapshot, distinct
   requested/ceiling/placed/shortfall facts, and ships as a named JSON
   `DemoArtifact`. Fixture paths:
   `townhouse-demo/src/data/{community-one-site,demo-slice-a,demo-slice-b}.ts`;
   `collab/TownhouseDemoFixture.md` corrected per your ruling (the rejected
   "400 legally fit" sentence now reads ceiling-vs-placed).
2. **Commands.** Generate (cold, non-interactive, self-gating, non-zero on
   gate failure): `node tools/generate-demo.mjs generate --slice a|b --out
   <dir>`. Tests: `npm test` (THD-01…16, coverage preflight). Stage swap
   diff: `node tools/generate-demo.mjs diff <dirA> <dirB>`; gate re-run:
   `… verify <dir>`.
3. **Packages.** `output/townhouse-demo/slice-a/` and `slice-b/`, six
   artifacts each (technical DXF R12 + PDF, presentation map PDF, envelope
   report PDF + JSON, parity manifest); every basename DEMO-tagged, every
   page watermarked + stamped. A: requested 500 / ceiling 400 / placed 140 /
   shortfall 360. B: 500 / 250 / 50 / 450 — same executable, only the slice
   input changes; all 14 rule facts and the measured geometry move. Per 036,
   `townhouse-demo/preview.html` (self-contained, SVG from the same
   presentation model, stamp + watermark + verdict numbers + digests) is
   regenerated on every build — gate it as you see fit alongside the
   DemoArtifact surface; note its Shivam-specified filename carries no DEMO
   token, flagged for your gate design.
4. **Green log.** 16/16 THD pass, strict typecheck clean; ezdxf (1.4.4)
   audits the shipped DXF at 0 errors, AC1009, metres. The parity oracle
   measures every feature's vector path in DXF + both PDFs against the
   manifest rings (0.001 m model / 0.25 mm paper); digests corroborate only,
   THD-14 proves tamper detection.
5. **Mutation evidence:** `collab/townhouse-demo-v0-mutation-log.md`. All six
   §5 mutants red on their required gates (M3/M6 surgical; M2 cascades via
   fail-closed refusal), reverted, green rerun each. Honest findings recorded
   there: THD-05 could pass vacuously on an empty package (fixed: asserts
   non-empty), and the page watermark was initially painted UNDER the filled
   map — structurally present, visually occluded (fixed: painted on top; the
   automated visibility check still tests size/colour only, so occlusion
   stays with your §6 rendered pass).
6. **Known deviations.** (a) DXF R12 TEXT is ASCII: the DXF stamp is
   ASCII-folded ("Research Draft - Not for Construction - DEMO"); exact
   string in every PDF page and JSON — rule if folding is unacceptable.
   (b) THD-03 "every page renders": structural parse + text ops per page in
   the harness, raster render checked manually on page 1 (sips); no raster
   toolchain added — full render inspection remains your §6 pass. (c) The
   THD harness is Fable-authored to your contract (your §8 requires my green
   log); you own acceptance — rewrite/extend freely; your independent rerun
   is the verdict. (d) Green/amenity provided areas exceed minima by
   ceil-to-0.1 m allocation (e.g. 6084 vs 6075 sqm) — minimum rules,
   measured. (e) 035's actionability type-lock for the DEMO slice is noted
   and NOT implemented — it is D5-gated; one field to add when Shivam rules.

Sol: rerun from clean outputs, parse and render independently, repeat the
mutations, red-team the stage script. Digests print on every generate run.

Your turn. Check the ledger.

**BALL: Sol** (townhouse-demo v0 acceptance). Goal-chat queue (R1/D5/R2-R6/
O1-O3) stays with Shivam, unchanged.

### 037 — Fable (research) — 2026-08-16

**R1 drafted properly: `collab/R1-Stage1Scope-draft.md`. Decision document,
not a spec change — `Stage1Spec.md` §3 untouched. Drafting it out killed one
of my own three routes and surfaced a question bigger than R1.**

**Route A (hold S+4, reframe around the negative verdict) — rejected as
primary, by me.** In 033 I weighed its honesty and not its pilot value. If
every run terminates at "restrained", **build steps B and C are never
exercised on real data**: the calculator computes numbers nobody may rely
on, the sheet draws an envelope nobody may build, and five pilots that all
return the same one-line "stayed" verdict teach us nothing about the engine,
the rulebook loading, or the drawing pipeline. A v1 whose headline is always
"no" cannot test itself. Route A is a correct sentence, not a testable
product. Its output shape is still needed for genuinely restrained slots and
is retained.

**Recommendation: Route C, sequenced to degrade gracefully into Route B.**
Inside the existing A → B → C order: B computes the **sanctionable** envelope
and must pass alone, with no reference to S+4 in the calculator; the
suspended-S+4 comparison is a **composition step gated behind B**, consuming
the same engine with a second rule set. Short on time ⇒ ship B, lose nothing
built. This removes the false choice — we do not have to decide today which
one ships.

Supporting calls:

- **The dependency asymmetry does not favour A.** B/C need Mannu to name the
  currently-sanctionable regime, but that is the same collection trip as
  D1/M-S1, which he already owes. Marginal calendar cost ≈ zero.
- **"S+4 might come back" is not a risk to B.** A returning regime is a data
  load, not a rebuild — that is the moat's central claim and the demo's A→B→A
  swap. If it forced a rebuild, the moat claim was never true, and that is a
  far bigger problem than R1.
- **C's marginal cost is presentation, not engine.** Running the engine twice
  against two rule sets is the same operation Sol already gated in 034.
- **C's real risk is anchoring**, mitigated by R3's actionability block plus a
  hard guardrail: **the suspended envelope is historical record, never a
  forecast** — no timeline, no likelihood, no "when the stay lifts".
  Predicting a court or a department would cross the thesis boundary rule and
  turn the differentiator into a liability.
- **Sub-decision from D3:** two envelopes in the report, **one drawing** — of
  the sanctionable envelope only; the suspended one appears as numbers,
  citations, and at most a dashed overlay. Otherwise C quietly reverses D3.
- **Route E (wait for the stay to resolve) rejected on the thesis's own
  logic:** rule volatility is the moat's justification. Waiting for
  regulatory stability is the one move that contradicts why the company
  exists.

**Escalated separately — bigger than R1.** Is the Gurgaon plot-builder market
actually *transacting* right now? Customer #1's frequency was already
[inferred]; if S+4 economics drove the cycle and fresh approvals are shut,
the cycle may be paused, and no §3 scope choice fixes a customer who is not
buying. Unplanned hedge worth naming: the **Townhouse Demo is a different
regulatory regime** (group housing, not plotted residential) and is therefore
untouched by the stay — if the plot market is paused, Community One is not a
VC prop, it is the live wedge. Recommend this goes to the goal chat as its
own item rather than riding on R1.

Four questions to Mannu: Q1 what is sanctionable today for Gurgaon plotted
residential (the hinge — both live routes are undefined without it), Q2 does
the suspension still stand, Q3 are plot builders transacting, Q4 is
construction proceeding on already-sanctioned S+4 plans (decides whether
R3's `occupation-use` scope is live). Flip criteria recorded in §11.

Noted from 036: goal chat holds the R1/D5 queue and is briefing Shivam this
session. This entry is the artifact that queue was waiting on; no ball is
taken from it.

**BALL: Shivam** — unchanged (R1 + D5).

### 036 — Fable (goal chat) — 2026-08-16

**Visual bar + local preview ruled (Shivam's "see it locally" ask).**
`collab/PresentationMapTarget.html` — a hand-drawn MOCK, labelled on-sheet as
not engine output and not rule-derived — fixes the look the demo presentation
map must meet or beat (flat cartographic style, unit patterning, legend,
scale bar, north arrow, DEMO watermark, stamp box). Additional demo
requirement: a self-contained one-click `townhouse-demo/preview.html`,
regenerated on every build, so Shivam can double-click a file and see the
latest map; regeneration joins the acceptance surface (Sol: fold into the
harness as a gate alongside 034's DemoArtifact surface).

Goal chat acknowledges it now holds the queue from 033/034/035: R1 (S+4
scope), D5/R3 (Restraint + SourceInstrument + no-third-stamp), R2/R4/R5/R6,
O1–O3 routing. Shivam is being briefed in the goal chat this session.

**BALL: Shivam** — unchanged (R1 + D5 blocking).

### 035 — Fable — 2026-08-16

**R3 drafted: the `Restraint` object —
`collab/RuleSchema-Restraint-draft.md`. Proposal only; `Stage1Spec.md`
deliberately untouched (it is awaiting ratification, and this chat
recommends rather than rules). The file carries the exact §5/§6/§7/§9/§11/§12
edits to apply on Shivam's word.**

The gap: §5's version chain models **replacement**, not **restraint** — a
rule on the books, unreplaced, and currently unusable. S+4 is the live
instance: nothing superseded it; an HC interim order (2026-04-02) stayed the
2024-07-02 order's effect, and a DTCP memo (2026-07-21) suspended fresh
approvals. Today the only way to express that is a fictional "v2" with no
source document plus a fictional "v3" to restore v1 if the stay is vacated.
The record is the product; it cannot carry fiction.

Design calls made in the draft, each argued:

- **New object, not a field on `RuleEntry`.** The restraining authority is a
  *different* authority (a court, not DTCP); one instrument restrains many
  entries; restraint is reversible where supersession is monotone; and a
  restraint is itself a cited, verifiable document.
- **Prerequisite — promote `source` to a first-class `SourceInstrument`.**
  What the court stayed was an *instrument*, so restraints should target
  instruments, not hand-maintained entry-id lists. Entries loaded later from
  the same circular are then restrained on load, with no edit.
- **`scope` is the sharp field:** `fresh-sanction` (counter closed, numbers
  undisputed — envelope still computes and is still correct) vs
  `rule-validity` (numbers may not be relied on — envelope prints suspended)
  vs `occupation-use`. S+4 currently carries two restraints of different
  scope simultaneously, so the object is many-per-rule by design.
- **New output axis, not a new stamp.** §7's "no third state" holds and I
  recommend defending it. Actionability (`sanctionable-today`) prints
  *beside* the stamp: the stamp asks how good our data is, actionability asks
  what the State's posture is. A fully `mannu-verified` rule set can be
  entirely non-actionable, and that is not a data-quality failure. §7 needs
  only the clarification that restraints are cited entries, so an unverified
  restraint forces Research Draft under the existing rule.
- **Absence is not evidence of absence:** a `restraintSweptOn` date per
  slice turns silence into a dated, attributable claim.

Five acceptance criteria proposed (11–15), each with a mutation: the
`fresh-sanction` test asserts **byte-identical envelope numbers** with
actionability flipped — that is what proves a restraint never rewrites an
arithmetic.

Cross-workstream: this is the same principle Sol reached from the demo side
in 034 — schemas that drop awkward fields cannot later prove they were only
holding data. Consequence noted for the demo: if actionability ships, the
DEMO package must be **type-incapable of printing `sanctionable-today: yes`**,
same discipline that locks its stamp. One field on the DEMO-slice, and much
cheaper before Fable writes v0 against Sol's frozen gate.

Four questions route to Mannu (Q1 suspension still standing? Q2 already-
sanctioned ground reality? Q3 pre-existing restraints on the D1 slice? plus
M-S6, the sweep + verification workflow). D5 and the naming call are
Shivam's.

**BALL: Shivam** — D5 (ratify the object + the `SourceInstrument` promotion + the no-third-stamp defence). R1 from 033 is still open and still the bigger one.

### 034 — Sol — 2026-08-16

**Townhouse Demo pre-engine acceptance gate shipped; scaffold reviewed, not
ratified as-is.** Against brief §5, Sol wrote
`collab/townhouse-demo-acceptance-tests.md`: 16 observable gates plus visual and
claims review. Coverage includes the 14-slot resolver deletion/adversarial
matrix, cold one-command package, byte determinism, DEMO mark on every filename
and page, truthful fixture/rule/derivation provenance, unpromotable stamp,
independent DXF audit, measured rule-to-geometry conformance, technical ↔
presentation parity with tamper mutation, novel runtime-rule sensitivity, and
the same-executable `A → B → A` swap. Six mandatory mutations must be shown red,
reverted, and green in Fable's v0 handoff.

**Fixture rulings:** the 225 × 180 m site and 14 illustrative values are accepted
as demo inputs, not real-law claims. Of Fable's three proposed simplifications:
(1) dropping applicability is **rejected** — flat demo entries still need an
explicit site-wide predicate in the production-shaped engine contract; (2) the
single-member `demo-illustrative` verification enum is **rejected** — demo
classification must be separate from Stage1Spec's
`unverified | mannu-verified`, with demo classification itself locking the
stamp; (3) gross-site coverage/open-space/amenity percentages are
**conditionally accepted for this fixed townhouse demo only**, with the
denominator printed and measured. These two rejections are the same
data-swap-not-rebuild issue now independently surfaced by 033/R3: the demo
cannot prove that Mannu's production rules are a data swap if its engine-facing
schema has first discarded production fields.

**Draft output surface corrections required before freeze:** add fixture and
canonical-geometry digests; stable typed fact IDs; fixture + rule provenance;
self-contained citation snapshots; distinct requested/density-ceiling/placed/
shortfall facts; and a named deterministic JSON `DemoArtifact` so the every-file
DEMO rule is enforceable. `E_RULE_ENTRY_INVALID` is added to the required
surface for invalid units/values/IDs.

**Red-team result:** the principal mechanism-breaker is, *“Both slices are
fake—how do I know these aren't two pre-drawn maps?”* THD-08/15 require a novel
runtime value to move measured geometry and an isolated A→B→A run. The principal
numerical breaker is, *“You say 400 fit—where are all 400 after roads, parking,
green space, amenities and plot dimensions?”* Slice A's **400 is only its
density ceiling**. It may be called “400 legally fit” only if 400 canonical
townhouses independently pass every other constraint; otherwise v0 must report
the actual placed reference-layout count and shortfall. Without a completeness
proof, it may not claim a global maximum.

The scaffold remains correctly red at `E_NOT_IMPLEMENTED`; no demo engine code
was reviewed or accepted. Entry 033 landed while Sol was completing the
already-assigned 032 turn and moved the global ledger ball to Shivam. Sol does
not overwrite that move. Once Shivam resolves 033, the Townhouse Demo's queued
next action is Fable revising the surface and building v0 against this frozen
gate, then handing the ball to Sol for independent artifacts and stage review.

**BALL: Shivam** — unchanged from 033 (R1/R3 blocking; R2/R4/R5/R6 may be ruled
in the same goal-chat pass).

### 033 — Fable — 2026-08-16

**Research sprint (market + technical) complete at v1 —
`collab/ResearchSprint-Stage1.md`. Three findings outrank the rest; one of
them lands directly on Stage 1's only plot type. No code, no decisions
taken — six recommendations escalate to Shivam.**

- **F1 — S+4 is suspended.** Punjab & Haryana HC interim order 2026-04-02
  stayed the Stilt+4 policy; DTCP memorandum 2026-07-21 suspended all
  **fresh** S+4 approvals across HSVP/HSIIDC/ULB and told the IT wing to
  disable S+4 submissions on HOBPAS. `Stage1Spec` §3 fixes v1 to exactly
  this plot type; `BusinessThesis` customer #1 is the S+4 floor-selling
  cycle. **R1** offers three routes (hold and reframe / shift plot type /
  compute both, S+4 marked suspended); I lean on computing both. Mannu
  owns ground reality, Shivam owns scope.
- **F2 — Haryana already auto-checks drawings.** ULB and HSVP OBPAS both run
  a "Quick DCR" engine that scrutinises submitted AutoCAD against the
  Haryana Building Code and emits deviation reports. It checks at
  submission; we generate before design. Position holds — but **R6**: never
  lead a pitch with compliance *checking*, which is owned free by the State
  and commercially by SoftTech/AutoDCR (35+ authorities, listed).
- **F3 — HSVP publishes Layer Guidelines + Sample Building Plan DWGs.**
  Free authoritative input to **M-S4** (site sheet standard). **R4**: hand
  Mannu a draft to rule on instead of a blank page.

Also carried into the artifact: **R2** — if the Low-Risk self-certification
thresholds hold (<15 m, <1000 sqm), the liability-carrying self-certifying
architect is a sharper answer to `BusinessThesis` OQ1 than the thesis
currently has. **R3** — a **schema gap**: `Stage1Spec` §5 models
supersession but cannot express "in force, but stayed/suspended by court
order or executive memo"; F1 is a live instance and this is cheap to fix
before build-order step A freezes the store. **R5** — two standing licence
rules proposed.

Technical track, licence-critical: 🚩 the npm `straight-skeleton` package is
**MIT-labelled over a GPL-3+ CGAL WebAssembly build** (verified against
CGAL's own `Straight_skeleton_2` licence file) — banned. Recommendation is
to **build** the setback offset in-kernel and use **Clipper2 (Boost)** /
**JSTS (EDL)** as external test oracles only, keeping third-party geometry
out of the stamped artifact. Presentation maps: MapLibre + PMTiles (both
BSD-3). Google Maps excluded on **terms** — its ToS forbid tracing building
outlines. Data rule: no ODbL geometry (OSM/Overture) inside the owned
database; Google Open Buildings taken under CC BY 4.0, context only.

The scan also **confirmed the moat premise the hard way**: with full web
access I could not assemble a citable, current, slab-by-slab Haryana table —
three secondary sources, three different numbers. Every value in the
artifact stays [TO-LOAD]. Mannu's physical circular collection is not
redundant.

Track 3 (repo licence + quality passes) is open and awaiting Shivam's
GitHub links. Six items the scan could not close are registered in the
artifact's O-table; O1–O3 are Mannu's.

Note: this is a research artifact, not a spec change. Nothing in
`Stage1Spec.md` or `BusinessThesis.md` was edited. Townhouse-demo work from
032 is untouched and Sol's harness gate still stands.

**BALL: Shivam** — R1 (scope) and R3 (schema) are the two that block; R2/R4/R5/R6 can be ruled in the same pass. O1–O3 need routing to Mannu.

### 032 — Fable — 2026-08-16

**Townhouse demo workstream opened: fixture + DEMO slices + red scaffold
delivered; engine code correctly blocked on Sol's harness.** Per 031's
parallel opening moves, Fable's build-side groundwork is done without
touching engine logic (the tests-first gate holds:
`collab/townhouse-demo-acceptance-tests.md` does not exist yet, so no
engine code was written).

Delivered:

- **`townhouse-demo/`** — standalone package (kernel conventions: strict TS,
  zero imports across `../kernel` / `../unitplan` / frozen `../src` in either
  direction; `src/` Fable's, `tests/` reserved for Sol including the runner).
  Public surface deliberately RED: `resolveDemoRulebook` and
  `buildCommunityPackage` throw `E_NOT_IMPLEMENTED`. Error codes, the locked
  stamp string, `DEMO_FILENAME_TAG`, and `REQUIRED_DEMO_SLOTS` (14) are
  exported so the harness can assert against stable names. Output types are
  marked v0-draft — Sol may demand changes before freeze; brief §3 guardrails
  are not negotiable.
- **Fixture + slices as data, never engine constants:**
  `src/data/community-one-site.ts` (225 × 180 m = 40,500 m² = 10.0078 acres,
  south access road 24 m, north declared, client ask 500 DU) and
  `src/data/demo-slice-a.ts` / `demo-slice-b.ts` — 14 slots each, every value
  `demo-illustrative` with the fixed never-verified source string. The store's
  verification enum has exactly one member, so the package is
  **type-incapable of claiming a verified rule** — that is what locks the
  stamp at "Research Draft — Not for Construction · DEMO".
- **`collab/TownhouseDemoFixture.md`** — human-readable mirror (data files
  authoritative), including three proposed simplifications vs Stage1Spec §5
  for Sol to accept/reject (flat applicability, single-member verification,
  site-level percentages).

Verified, not assumed: typecheck clean under the house strict settings, and a
smoke run (executed, not just compiled — the 012 lesson) confirms both entry
points throw `E_NOT_IMPLEMENTED`, both slices are complete/duplicate-free/
pure on all 14 slots, and **all 14 values differ between A and B**, so the
§5.6 swap moment has real material. Deliberate story choice for review:
slice-A density (40 du/acre) caps Community One at **400 DU against the
500 asked** — the demo leads with a first-class negative verdict, per
Stage1Spec §1.

Sol: write `collab/townhouse-demo-acceptance-tests.md` against brief §5 and
this surface; you own `townhouse-demo/tests/` and the runner. Also rule on
the three proposed simplifications and the v0-draft output types in
`src/pipeline.ts`. Red-team question to carry: "which question breaks this
demo in a meeting?"

Your turn. Check the ledger.

**BALL: Sol** — acceptance tests + surface review; Mannu items from 029
unchanged.

### 031 — Fable — 2026-08-16

**Paired-seat protocol (Shivam's ruling, goal chat) + Sol seat revived.**
Every workstream runs as a chat pair against this same folder and ledger:
a Claude builder chat ("UrbanOS — <workstream> [Fable/build]") and an
OpenAI checker chat ("UrbanOS — <workstream> [Sol/check]"). Fable builds,
Sol gates — the original protocol section applies unchanged. Sol has been
inactive since 026; revival is by reading, in this order: ledger protocol +
entries 031→026, `BusinessThesis.md` v1.1, `Stage1Spec.md` v1.1,
`TownhouseDemoBrief.md`. Sol's first assignment: acceptance tests for the
demo (brief §5) before Fable's code. Research Sprint may also run as a pair
(independent double sweep, results compared). Decisions escalate to Shivam's
goal chat; Shivam's role stays the nudge. Stage 2/3 and later workstreams
repeat the same pair pattern.

**BALL: Fable** (build) / **Sol** (demo acceptance tests) — parallel opening
moves; Mannu items from 029 unchanged.

### 030 — Fable — 2026-08-16

**Pre-D1 work opened (goal chat): three tracks + demo brief + checker seat.**
While the ball sits with Mannu (029), Shivam directed motion on
slice-independent work. Session architecture: the original chat is the goal
chat (decisions only); workstreams run in their own sessions against this
ledger. Tracks: (A) Research Sprint — market scan (TestFit, Forma, Archistar,
Giraffe, Hypar, UpCodes, and India authority-side AutoDCR / Haryana online
approval) + technical reuse scan, deliverable
`collab/ResearchSprint-Stage1.md`; (B) rulebook store schema + acceptance
tests as documents (freeze after M-S2); (C) **Townhouse Demo "Community
One"** — brief at `collab/TownhouseDemoBrief.md`: one fixed ~10-acre fixture,
DEMO-labelled rulebook slice, real pipeline, technical sheet + colored
presentation map + DEMO envelope report; stamp locked at Research Draft ·
DEMO; rulebook-swap moment is a tested acceptance item. Two-agent protocol
revives: Fable builds, an OpenAI-based agent takes the checker seat (Sol's
old role) — acceptance tests before code, review after, red-team the demo.
Shivam to supply candidate GitHub repos; each gets a license + quality pass
before reuse.

**BALL: Fable** (build tracks, in workstream chats) — Mannu items from 029
remain open in parallel.

### 029 — Fable — 2026-08-16

**D3/D4 ruled by Shivam; Stage1Spec → v1.1.** D3: one reference footprint in
v1, placement variants later. D4: saleable math included — total/per-floor
built-up from the envelope plus DU count; super area only via a user-declared
loading factor printed as an assumption (never defaulted; no factor ⇒ no super
line; "indicative — not a valuation"; no pricing). Acceptance criterion 10
added (mutation-tested factor provenance). Remaining before code: D1 (slice),
D2 (boundary-data reality), M-S1–M-S5; M-U5 redline still open (now gates the
Stage-5 drawing bar). Relay package for Mannu handed to Shivam in chat.

**BALL: Mannu** (via Shivam) — D1, D2, M-S1–M-S5, M-U5.

### 028 — Fable — 2026-08-16

**Realignment session → Business Thesis v1.1 → Stage 1 spec.** Shivam opened
with "not happy, need to align on end goals." Outcome, ratified in chat:

- `collab/BusinessThesis.md` v1.1 — one sentence, five-stage product (Base /
  Compliance Roadmap / Tracker / Finalize+Submit / Deep Planning), boundary
  rule ("UrbanOS informs, designs, and tracks; people decide, sign, and
  submit"), customer order (plot builder → townhouse dev → bigger), one
  geography (Gurgaon/Haryana), two-shelf rulebook moat (Rules + Procedures,
  Mannu = user zero), pricing parked with Mannu (~5 free pilots → premium),
  Dubai = pitch demo now / market #2 later.
- `collab/Stage1Spec.md` v1 draft — envelope + draft layout for one
  jurisdiction slice; rulebook Shelf-1 schema with fail-closed TO-LOAD values;
  computed stamp logic; acceptance criteria; build order A (rulebook store) →
  B (envelope calculator) → C (layout sheet on kernel).

Open before any code: D1 (slice — Mannu), D2 (boundary-data reality — Mannu),
D3 (one footprint vs variants — Shivam), D4 (saleable-area math in/out —
Shivam), M-S1–M-S5. M-U5 (Feature 2 redline) still pending; it now gates the
Stage-5 drawing bar, not Stage 1.

**BALL: Shivam** — rule D3/D4, send thesis + spec to Mannu (D1/D2, M-S
register, M-U5).

### 027 — Fable — 2026-08-08

**Input record shipped alongside the v0 artifacts.**
`output/docs/urbanos-feature2-2bhk-input-record.docx` documents the complete
structured input behind the v0 sheet — room schedule, doors, balconies,
declared assumptions, sheet request, and the fail-closed refusal list — split
explicitly into "what UrbanOS was told" vs "what it derived". Written for
Mannu to read next to the drawing; it carries the same geometry digest as the
DXF/PDF manifest so the three artifacts are provably one release. v0 sheet
and DXF delivered to Mannu by Shivam; commit 6208491 pushed.

Ball unchanged.

**BALL: Mannu** (via Shivam) — redline the v0 sheet.

### 026 — Fable — 2026-08-08

**Protocol change by Shivam (in chat): Sol is inactive; Fable carries both the
builder and verifier roles until further notice.** The two-agent gate in
protocol rule 1 is suspended, not deleted — the verification BAR (tests-first,
mutation-checked, independently parsed artifacts) stays; only the second pair
of eyes is gone, and that loss is real. Mannu's redline pass (M-U5) is now the
only independent check this feature gets, which makes it more important, not
less.

**Feature 2 v0 is BUILT and delivered.** New standalone package `unitplan/`
(zero imports across the kernel boundary in either direction; the kernel's
public contract and 113-test suite untouched). Pipeline: structured
`UnitPlanBrief` (Privy AT4 2BHK schedule) → parametric template → fail-closed
validation → one drawing model → deterministic DXF R12 + vector A2 PDF at
1:50. Artifacts in `output/dxf/` and `output/pdf/` as
`urbanos-feature2-2bhk-privy-at4-v0.*` with manifest.

**Acceptance: 14/14 green (UP-1…UP-14), coverage preflight enforced.**
Verified by mutation, not assertion: neutered overlap detection → UP-2 alone
fails; restored the silent balcony drop → UP-10 alone fails; coarsened DXF
coordinate precision → UP-7 alone fails. All reverted, 14/14 restored.
Artifact checks parse the DXF and PDF with independent readers in the tests,
and ezdxf (third-party) opens the shipped DXF with **0 audit errors**; master
bedroom extents re-measured externally at exactly 3.6576 x 4.0640 m.

**Honest findings from the red run, recorded per our practice:**
1. **Real defect caught: silent balcony drop.** A balcony pointed at a room
   without a template slot vanished from the drawing with no error — declared
   in input, absent in output, same defect class as the old prototype's
   fabricated setbacks. Now fails closed (`E_BALCONY_DETACHED`); UP-10 pins it.
2. **Two of my fixture premises were wrong, and the code was right.** I
   expected a corrupted room size to create an overlap and an 8' shaft to
   disconnect the envelope; the parametric template chains every placement,
   so hostile inputs stretch the plan consistently instead of breaking it.
   The overlap/disconnection/hole gates guard against future *template* bugs
   and are tested through a declared audit seam (`auditLayoutGeometry`),
   following the kernel's fixture-28 seam precedent.
3. **Honesty constraints enforced in code:** `research-draft` is the only
   reachable status (`E_ASSUMPTIONS_BLOCK_REVIEW` otherwise); wall/corridor/
   shaft assumptions must be declared with PENDING-MANNU refs and are printed
   on the sheet; the sheet states the arrangement is a parametric template,
   not a trace of the brochure; carpet area is labelled as the sum of clear
   room areas and never reconciled against the brochure's super area.

**Sheet contents** (visually inspected from a rendered PDF): articulated
envelope with 230 mm external / 115 mm internal wall poche, door cuts with
swing arcs, window symbols, three balconies, shaft, circulation spine, room
labels with brochure-exact lettering (e.g. 12'-0" x 13'-4"), overall extent
dimensions, assumed-north arrow, title block with source attribution, digest,
and the stamp in two corners.

**Open:** M-U1 (drawing standard) and M-U4 (wall conventions) to Mannu before
v1; M-U5 redline pass on this sheet is the next real gate. A5 and Mannu's
Feature 1 inputs carry unchanged. Nothing is committed to git yet — Shivam's
call.

**BALL: Mannu** (via Shivam) — redline the v0 sheet.

### 025 — Fable — 2026-08-08

**New workstream opened: Feature 2, 2BHK unit-plan module. Feature 1 score:
10.0/10 as bounded (no change).** Sol and Fable.

**Shivam has ruled (in chat, 2026-08-08): 2BHK first.** Context: Mannu delivered
a 17-stage project intake spec plus Spaze Privy AT4 brochures with dimensioned
2BHK/3BHK unit plans — preserved in `reference/mannu-2026-08-08/` (WhatsApp tmp
copies get purged; originals are now in-repo). Mannu's framing was "integrate
AutoCAD, then teach it to design from the brochures." Fable's assessment, which
Shivam accepted: the AutoCAD half is already answered by
`collab/dwg-conversion-research.md` (kernel is the engine, DXF/PDF the outputs,
AutoCAD a viewer — no change); the "learn from brochures" half is redirected
from ML-training to **rules encoded explicitly + brochures as templates and
test fixtures**.

**Named scope tension, resolved:** the 2BHK is unit/architecture scale; the
kernel, Feature 1, and Mannu's intake doc are site/master-plan scale. The 2BHK
proceeds first as the pipeline trainer; the site-scale compliance product
remains the business wedge. The intake doc is parked as the spec seed for the
site-scale workstream — it is not this feature's input surface.

**Draft brief is at `collab/UnitPlanBrief.md` (v1, not ratified).** Shape: v0 =
parametric replica of the Privy AT4 2BHK (room schedule extracted from the
brochure, declared wall-thickness assumptions printed on the sheet, stamp
`Research Draft — Not for Construction` because the brochure's own disclaimer
says its dimensions are indicative) → Mannu redlines → redlines become v1
fixtures. v1 = rule-driven variants, gated on Mannu's rulebook. Non-goals fenced
in §6, including: no change to the site kernel's public contract or its
113-test suite. Five PENDING-MANNU items registered (M-U1…M-U5); highest-value
are M-U1 (drawing standard) and M-U4 (wall conventions).

**Carried open from 024, unchanged:** A5 (archive the frozen prototype, promote
Feature 1 to root — Shivam's call, not yet ruled); Mannu's Feature 1 inputs (one
accepted local site plan, one real plot with papers) — still the critical path
for the site-scale product's market validation, unaffected by Feature 2.

Sol: review `collab/UnitPlanBrief.md` — especially §5, where the draft reference
shape needs your route-relative-reference lesson from 013/014 applied before I
repeat that mistake a fourth time — and draft
`collab/unit-plan-acceptance-tests.md`. No code from either of us until both
documents pass, per protocol rule 6.

Your turn. Check the ledger.

**BALL: Sol**

### 024 — Fable — 2026-07-26

**Feature 1 score: 10.0/10 — concurred, as bounded (no change).** Sol and Fable.
Independent verification and architecture review complete:
`collab/feature1-independent-review-Fable.md`. **I could not break it, and I tried.**

**Re-verified from scratch, not accepted.** Kernel 113/113 (0 fail/skipped/todo),
frozen prototype 37/37, strict typecheck clean, both builds pass, Feature 1 UI loads
with zero console errors.

**The suite has teeth — mutation-tested rather than counted.** Four sabotages, each
caught by the right gate: area reconciliation always passes → fixtures 21/32; setback
clearance guard removed → 27b; unverified evidence accepted for the stamp → 30, 30b,
30c, 30d, 40d. All reverted.

**I parsed the delivered artifacts with my own reader, not the kernel's.** DXF is
AC1009 with `$INSUNITS 6`, 14 named layers, and a plot boundary measuring **exactly
20.000 × 10.000 m / 200.000 m²**. PDF `MediaBox` is **420.0 × 297.0 mm** — A3 exactly.
The `NOT FOR CONSTRUCTION` stamp is really in both files, twice in the PDF.

**DG-1 verified independently.** I took all 33 DXF polylines in model metres, applied
the manifest's own paper transform, and compared vertex-for-vertex against the PDF's
vector subpaths: **33/33 within the 0.25 mm tolerance, worst error 0.000000213 mm.**
The two formats are not merely consistent-looking; they are the same geometry.

*A correction on my own method, recorded because a reviewer's false positive costs as
much as a builder's false negative:* my first parity run reported 18/33 and I nearly
recorded a parity gap. The 15 "misses" were 2-point lines and dimension leaders that
my own extractor discarded with a `>2 points` filter. My tool was wrong, not your
artifact. Found and fixed before writing it down.

**On the adjustment gap from 018 — you overruled me correctly.** I asked for a field
to *disclose* a kernel-performed adjustment. You instead removed the kernel's ability
to adjust at all: `closeByBearings` is gone (verified by grep), and a non-closing
traverse now requires `TraverseAdjustmentApproval` — a professionally signed, closed
station path supplied as input. That satisfies §3.2 as written instead of amending it.
Stricter and better than my proposal.

**Six architecture findings, none blocking** (detail in the review):
**A1** `kernel/tests` imports `feature1/src/formModel.ts` — the kernel suite can no
longer run without the UI tree, and that arrow points the wrong way. **A2** the kernel
is consumed as source over `../../kernel/src/index.ts` with no `exports`/`types` map,
so nothing *enforces* the public surface. **A3** `parityError` in `drawing.ts` is
unexercised — I neutered its throw and 113/113 still passed; ~16 defensive call sites
whose paths are unproven. **A4** `npm test` at the root runs the *frozen prototype's*
37 tests, so a bare `npm test` reads green while saying nothing about the 113 that
matter. **A5** the frozen prototype is still the root app that `npm run dev` serves.
**A6** `feature1/vite.config.ts` hard-codes `127.0.0.1:4173`, overriding autoPort and
silently walking to 4174.

**The honest bound on 10/10.** It is 10/10 for *survey-grade input → validated
geometry → deterministic stamped DXF/PDF*. It is **not** established that our intake
matches the standard actually used in Dwarka/Gurgaon: M1–M9 are still open, no real
customer document has passed through the form, and no accepted local site plan has
been compared against our sheet. The engineering is verified against **our own
spec**; the spec is still unvalidated against its market. That is now the critical
path, and it is a Mannu dependency — one accepted site plan, one real plot with
papers.

**BALL: Shivam** — A5 (archive the frozen prototype and promote Feature 1 to root) is
your call, not ours; and Mannu's two answers are the highest-value remaining input.

Your turn. Check the ledger.

### 023 — Sol — 2026-07-26

**Feature 1 score: 9.5 → 10.0/10 (+0.5 this turn; +6.0 from baseline).
Sol and Fable.** Sol completed the final acceptance audit in
`collab/feature1-final-audit.md`. The active kernel is **113/113 green** across
all 41 numbered fixtures, adversarial extensions, both input routes, exporter
parity and runtime guardrails. The frozen reference app remains **37/37 green**.
Strict kernel type-check, both production builds and both dependency audits
pass; the audits report zero vulnerabilities.

Fresh browser verification covered desktop and 390 px mobile layouts with zero
browser errors. Sol downloaded the actual deed-route DXF, vector PDF and parity
manifest, verified their hashes and metadata, re-parsed the reconstruction
warning from both formats, and rendered the exact A3 PDF for visual inspection.
The sheet has no clipping or annotation collision, and the warning is readable
both in model space and the title block.

The 10/10 verdict is deliberately bounded to the ratified technical MVP:
survey-grade input → validated canonical geometry → deterministic DXF/PDF marked
**Ready for Professional Review — Not for Construction**. It is not authority
approval or professional certification for a real plot. DWG remains
permission/licence-gated and cannot bypass the documented round-trip gate.

Sol's implementation and verification phase is complete. Fable now owns the
requested investigation and architecture-system integration review.

**BALL: Fable.**

Your turn. Check the ledger.

### 022 — Sol — 2026-07-26

**Feature 1 score: 9.0 → 9.5/10 (+0.5 this turn; +5.5 from baseline).
Sol and Fable.** The final input audit found one honest gap: the UI accepted
survey coordinates but not the ratified deed/sketch route. Sol added a separate
four-ordered-sides-plus-diagonal workflow. It exposes every reconstruction
candidate, records area/shape/vertices, never chooses a candidate automatically,
and requires the source-backed assembly selection to be made explicitly. Any
changed side or diagonal clears that selection; a stale/nonexistent selection
blocks. Reconstructed lengths also cannot pretend to be georeferenced
coordinates.

Both coordinate and reconstructed routes now create the same fail-closed
`SitePlanBrief` contract. Route-relative setbacks and road edges use real
coordinate edges or real reconstructed side indices. The active suite is
**113/113 green**, including five form-route acceptance cases; strict kernel
type-check, the Feature 1 production build, the frozen-app build, and all 37
frozen-app tests pass.

Sol retains the ball for the fresh browser/responsive test and final
requirements audit. Fable remains reserved until verified 10/10, then returns
for investigation and architecture-system integration.

**BALL: Sol.**

Your turn. Check the ledger.

### 021 — Sol — 2026-07-26

**Feature 1 score: 8.0 → 9.0/10 (+1.0 this turn; +5.0 from baseline).
Sol and Fable.** DG-1 is discharged. The validated plan now feeds one neutral
drawing model; deterministic DXF R12 and vector PDF are serialised from that
same model. The active suite is **97/97 green** with all 39 numbered fixtures
and three guardrails present.

Fixture 29 now re-parses every marked DXF polyline and every corresponding PDF
vector path, checks DXF coordinates within the 1 mm model tolerance, checks PDF
coordinates within 0.25 mm on paper, verifies metre insertion units and the
declared scale, proves repeat exports are byte-identical, rejects a mismatched
sheet, refuses silent rescaling when a sheet cannot fit, and rejects a plan
whose private validation brand was lost.

Sol also generated the canonical A3 sample in `output/pdf/` and `output/dxf/`,
rendered the PDF to PNG, inspected it, corrected annotation collisions, then
re-rendered it. The final sheet is unclipped and legible at 1:100. It is
deliberately stamped **Ready for Professional Review — Not for Construction**;
software has not impersonated professional approval.

The remaining point is not awarded for exporter work. Sol now owns the
survey-grade input workflow and final requirement audit. Fable remains reserved
until verified 10/10, then returns for Shivam's requested investigation and
architecture-system integration.

**BALL: Sol.**

Your turn. Check the ledger.

### 020 — Sol — 2026-07-26

**Feature 1 score: 8.0/10 (+4.0 from the 4.0 baseline; no change this
turn). Sol and Fable.** Shivam has superseded the earlier alternating-ball build
protocol for the completion phase: Sol owns implementation and verification
continuously until Feature 1 reaches an evidence-backed 10/10. Fable is not a
dependency during this phase; after 10/10, Fable returns for investigation and
architecture-system integration.

The survey geometry kernel is currently 93/93 green. Professional traverse
adjustment is now explicit and fail-closed; the kernel no longer invents an
adjustment method. The active gate is DG-1: both DXF and PDF must be generated
from the same validated geometry, round-trip within declared tolerances, preserve
scale, and reject stale or altered validation. A score increase is withheld until
those artifact checks pass.

**BALL: Sol** until verified 10/10, then **BALL: Fable** for the requested final
investigation and architecture integration.

Your turn. Check the ledger.

### 019 — Fable — 2026-07-25

**Feature 1 score: 6.5 (no change).** Sol and Fable. **Ball is still yours** — 018
is the newest entry above and I have no review to act on. Shivam nudged me, so I
used the turn to audit my own comments rather than start unowned work. 74/74 still
pass; no test or source behaviour changed.

**Self-audit: I found the same lie twice more, in my own comments.**

When I replaced the body of `traverseStations` last round I left its original
docstring in place. It still read *"which closes it EXACTLY by construction … No
adjustment, no snapping — the contract puts Bowditch and friends outside the
kernel."* That is now false: the function calls `closeByBearings`, which **does**
adjust. It is the exact sentence you caught me on in 8b, surviving in the comment
after the code was fixed — a stale comment describing behaviour the code no longer
has, which is the same defect class as a fabricated setback, just aimed at the next
reader instead of the customer.

Rewritten to state plainly what the function returns and that it is *not*
adjustment-free: misclosure comes from the raw observations and gates the profile;
stations come from the adjusted vectors.

Second instance, and this one faced the **user**: the `E_TRAVERSE_MISCLOSURE`
message ended *"No adjustment is applied."* True of the rejection path — we do not
massage a failing survey to make it pass — but a reader would fairly take it as a
claim about the kernel as a whole, which is untrue on the passing path. Narrowed to
*"The misclosure is not adjusted away to make this pass — re-observe the traverse or
declare a profile matching the method used,"* which keeps the assurance and drops
the overclaim.

Swept the rest of `src/` for the same pattern. The two surviving "never assumed"
claims both check out: an uncovered setback edge blocks rather than defaulting to
zero, and imported CAD units require confirmed state, a named confirmer, and
agreement with the extracted frame.

Still open and awaiting your ruling from 018: the
`TraverseClosureResult.adjustment` field, so a drawing can *print* "bearings
adjusted, distances held" instead of leaving it to a code comment. This audit is
the argument for it — a comment is not a disclosure, and I have now twice proven
comments drift.

**BALL: Sol**

### 018 — Fable — 2026-07-25

**Feature 1 score: 5.0 → 6.5 (+1.5).** Sol and Fable. All 13 gates fixed.
**74/74 pass, 0 fail, 0 skipped, 0 todo.** No gate weakened, renamed or removed;
`kernel/tests` untouched — I edited only `kernel/src`. Typecheck clean under
`strict` + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes`.
`contract.ts` still regenerates byte-identically from the ratified spec.

Every one of the 13 was real. Three are worth naming because they were the same
failure mode the whole project exists to prevent — output that reads as faithful
while a measurement has quietly moved.

**8b was the worst, and it was mine.** I wrote in ledger 016 that building the ring
from N stations "closes it exactly by construction, so nothing is snapped or
adjusted." That was wrong. The closing edge silently absorbed the entire
misclosure: a **measured** 39.05078125 m leg became a 39.06640625 m canonical edge.
I corrupted a directly measured distance and then described the approach as
adjustment-free.

Fixed by inverting which quantity moves. Distances are what a total station
measures directly; station coordinates are *computed* from distances and bearings.
So the closure now holds every measured distance **exactly** and solves for the
smallest bearing corrections that close the figure (Gauss-Newton, least-norm, with
`|v_i|` pinned). Misclosure is still computed and gated on the **raw** observations,
so fixture 8's threshold assertions are unaffected. Every canonical edge now equals
its measured leg to 1e-9.

> **Contract amendment requested.** §3.2 puts adjustment outside the kernel, and
> `TraverseClosureResult` has no field in which to say what was done. Holding
> distances and correcting bearings is strictly less destructive than corrupting a
> length, but it *is* an adjustment and it should be stated on the drawing, not
> left implicit. Proposal: add `adjustment: { method: 'bearings-held-distances' |
> 'none'; maxBearingCorrectionDegrees: number }` to `TraverseClosureResult`, so the
> sheet can print "bearings adjusted, distances held". I have not invented the
> field — flagging it for your ruling. Also relevant to **M3** (Mannu): which
> adjustment, if any, is acceptable practice for the pilot's survey methods.

**27b: winding cannot detect an over-inset polygon.** Inset a 10 m square by 6 m on
all four sides and the offset lines cross **twice** — a double inversion, which
*preserves* orientation. The result had positive area (4 m²) and correct winding
while sitting 4 m from a boundary it was meant to be 6 m clear of. My collapse test
was orientation-based, so it passed a phantom envelope outside the plot. Now every
offset vertex must still stand at least its own setback clear of the original
boundary, and must lie inside the plot.

**26b / 36b: vertex classification cannot see a coincident ring.** For two
*identical* rings, every vertex of each lies on the other's boundary, which reads
as "touching" — so two buildings could occupy the same footprint, and a footprint
drawn exactly on a no-build void was accepted as buildable. Both now test an
interior sample point, which distinguishes sharing an edge from sharing area.

The rest, briefly: **11b** geographic frames now block outright — naming a target
CRS is not performing a projection, and relabelling longitude as metres moves a plot
~111 km per degree while every input still reads back faithfully. **11c** imported
units must be confirmed, name their confirmer, and agree with the extracted path
frame; two disagreeing unit claims cannot both be right. **9b** unknown stated-area
precision now raises `E_AREA_PRECISION_UNKNOWN` instead of quietly falling back to
the floor. **12b** closure rules now run on every ring-bearing path, not just the
outer boundary. **30b** evidence scope now walks every geometry-bearing branch — a
setback traced to an unverified note is exactly as load-bearing as a corner.
**32b** overrides are restricted to a one-item allowlist (`E_AREA_RECONCILIATION`
only, where a professional genuinely arbitrates between deed and survey); a
signature cannot supply a datum the source never contained. **33b** magnetic
bearings are reduced to true north using the declination, and the plan records the
*reduced* figure. **36c** shared-boundary fragments are now classified by comparing
inward normals, so a boundary-connected exclusion is properly subtracted
(144 m² → 128 m², exact). **Guardrail 3** reads the module-private `KERNEL_BRAND`
specifically — scanning for "any symbol key" accepted a digest reattached under a
freshly minted `Symbol()`.

**Verified by mutation, not by assertion.** I reverted each of the four hardest
fixes in turn and confirmed the intended gate — and only that gate — caught it:
misclosure-into-the-closing-edge → **8b**; no offset clearance check → **27b**;
unrestricted overrides → **32b**; any-symbol brand → **guardrail 3**. All reverted;
74/74 restored.

Frozen prototype untouched: build passes, 37/37 root tests green. Isolation verified
both directions. DG-1 (fixture 29, DXF/PDF parity) remains the open exporter-phase
gate.

Sol: review, and please rule on the `TraverseClosureResult.adjustment` amendment.
Your turn. Check the ledger.

**BALL: Sol**

### 017 — Sol — 2026-07-25

**Implementation review is RED. Feature 1 score: 4.0 → 5.0 (+1.0 point
overall); the provisional post-build 6.0 is corrected to 5.0 (−1.0) after the
safety review.** Fable produced a substantial working kernel, so the score has
increased from baseline. Sol cannot pass it yet because thirteen reproducible
cases can still produce or approve geometry that differs from the supplied
source.

**Expanded acceptance result: 61 pass, 13 fail, 0 skipped, 0 todo.** Typecheck
is clean. The original assertions remain intact; Guardrail 3 is red only because
Sol added a new forgery assertion. Sol changed only the owned test catalogue and
`kernel/tests/COVERAGE.md`; Fable's `kernel/src` implementation is untouched.

The thirteen failing gates are:

1. **8b — traverse fidelity:** the fourth measured leg is 39.05078125 m, but
   the canonical fourth edge becomes 39.06640625 m. A passing misclosure is
   being silently put into the final edge.
2. **11b — coordinate-frame truth:** EPSG:4326 longitude/latitude is relabelled
   as metres when a target CRS is merely named; no projection occurs.
3. **11c — imported-unit truth:** a file can claim confirmed feet with no
   confirmer while its extracted path says metres, yet resolution accepts it.
4. **9b — area precision:** automatic reconciliation passes when the source
   precision is unknown instead of raising `E_AREA_PRECISION_UNKNOWN`.
5. **12b — closure:** an open cadastral-hole path is silently closed.
6. **26b — overlap:** two identical building footprints are accepted as
   non-overlapping.
7. **27b — setback collapse:** a 6 m inset on every side of a 10 m square
   creates a new 4 m² polygon instead of collapsing.
8. **30b — evidence scope:** an unverified setback can receive the Ready for
   Professional Review stamp when the outer coordinates are verified.
9. **32b — override policy:** a signature can erase
   `E_SETBACK_EDGE_UNCOVERED`, turning a missing setback into an implicit zero.
10. **33b — magnetic conversion:** 10° magnetic plus 2° declination is exported
    as 10° true instead of 12° true.
11. **36b — void containment:** a footprint exactly coincident with a no-build
    void is accepted inside the developable envelope.
12. **36c — polygon subtraction:** a verified 16 m² exclusion connected to the
    envelope boundary is ignored; output remains 144 m² instead of 128 m².
13. **Guardrail 3 — export brand:** a matching digest attached under an
    arbitrary symbol is accepted as the private kernel brand.

The executable counterexamples are in
`kernel/tests/geometry.acceptance.test.ts` (8b, 11b, 11c) and
`kernel/tests/validation.acceptance.test.ts` (the remaining ten). Fable: fix
`kernel/src` until all 74 checks are green. Do not weaken or rename the new
gates. Root prototype isolation remains green: production build passes and
37/37 root tests pass.

**New owner protocol for both Sol and Fable:** every handoff states the current
Feature 1 score and point delta, explicitly names Sol and Fable, and includes
the exact sentence “Your turn. Check the ledger.”

Sol has reviewed; Fable now fixes. Your turn. Check the ledger.

**BALL: Fable**

### 016 — Fable — 2026-07-25

**Kernel implemented. Your suite is GREEN: 62/62, 0 fail, 0 skipped, 0 todo.** No
test weakened, skipped or renamed; the coverage preflight still passes at 38
fixtures + 3 guardrails. `kernel/tests` untouched — I did not edit your directory.

New modules in `kernel/src`: `geom.ts` (predicates, ring validity, inward offset,
polygon difference), `units.ts`, `reconstruct.ts`, `resolve.ts`, `validate.ts`
(validation, digest, deep freeze, export gate, dimension seam). Typecheck clean
under `strict` + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes`.
`contract.ts` still regenerates byte-identically from the ratified spec — verified
by diff, so the code has not drifted from the document.

**First run was 60/62. Both failures were real bugs in my code, and both are worth
recording because each would have produced a confidently wrong answer.**

**1. A bow-tie has exactly zero signed area.** Fixture 17's shoelace sum is
`0.0` — the two lobes cancel perfectly. My zero-area check ran before the crossing
check, so a self-intersecting boundary was reported as "every vertex is collinear".
Correct diagnosis, wrong defect, and the plausible-sounding message would have sent
a surveyor looking for the wrong problem. Fixed by ordering: too-few → degenerate
edge → **explicitly all-collinear** → proper cross → touch/overlap → zero-area as a
fallback. The explicit collinearity test is what lets fixture 15 keep
`E_RING_ZERO_AREA` while fixture 17 gets `E_RING_SELF_INTERSECTS`; simply moving
the area check later would have swapped one failure for the other.

**2. `Math.sin(Math.PI)` is 1.2×10⁻¹⁶, and that failed a valid survey.** Your
fixture 8 comment says the binary-exact side and residual exist to stop
representation noise turning a threshold fixture into a just-below-threshold one.
The arithmetic was exact; the **trigonometry** was not. Bearings of 0/90/180/270
gave a misclosure of `0.015625000000007105` instead of `0.015625` — an excess of
7.1×10⁻¹⁵ — which put the ratio at **1:9,999.999999995** and rejected a traverse
that closes exactly at 1:10,000.

Two fixes, because either alone is insufficient. Cardinal bearings now return
exact values (`sinDeg(180) === 0`, not 1.2e-16): those four values *are* exactly
representable and surveying uses them constantly, so a radian conversion should not
get a vote. And the gate comparisons carry a 1e-9 relative slack, so a last-bit
artefact cannot fail a survey — while fixture 13's genuine miss (1:7,999 against
1:10,000) is nowhere near that tolerance and still fails.

I also deleted a duplicate traverse computation I had written in `validate.ts`.
It re-derived perimeter and misclosure from raw draft fields, ignoring DMS bearings
and declared unit factors — a second implementation of the same calculation, which
is precisely how a reported closure ends up describing a different traverse than
the geometry. Validation now calls the same `traverseStations` that built the ring.

**Green verified by mutation, not by assertion.** A passing suite proves nothing
unless it can fail, so I sabotaged the implementation twice and confirmed your tests
caught it:
- Made the inward offset a no-op (setbacks stop constraining anything) → fixtures
  **24, 27, 36 fail**.
- Stopped normalising `-0` and dropped parameters from the digest → **guardrail 1
  fails**.
Both reverted; 62/62 restored. Your harness has teeth.

**Two implementation notes for your review, both places I chose to refuse rather
than approximate:**
- The traverse ring is built from the N stations, with the final leg used *only* for
  the misclosure. That closes the ring exactly by construction, so nothing is
  snapped or adjusted — Bowditch stays outside the kernel as §3.2 requires.
- Point and line encumbrances without a stated clearance constrain nothing and are
  recorded only; they are not silently buffered by a guessed distance. Polygon
  encumbrances cut the envelope properly.

Frozen prototype untouched: `npm run build` succeeds, 37/37 root tests pass.
Isolation still verified in both directions.

Sol: review the implementation and the two notes above. DG-1 (fixture 29,
DXF/PDF parity) remains the open exporter-phase gate.

**BALL: Sol**

### 015 — Sol — 2026-07-25

**Executable acceptance harness complete and deliberately RED.** The v5 surface
is sufficient; no further contract assumption was needed.

Artifacts, all under Sol-owned `kernel/tests/`:

- `run-tests.mjs` — discovers/bundles TypeScript tests and runs them serially;
- `fixtures.ts` — verified source evidence, v5 route-aware references, complete
  setback-covered baselines, exact units and typed fixture builders;
- `geometry.acceptance.test.ts` — fixtures 1–6, 8, 11–20, 34, 35, 37–39;
- `validation.acceptance.test.ts` — fixtures 7, 9, 10, 21–28, 30–33, 36 and all
  three runtime guardrails;
- `COVERAGE.md` — the human-readable fixture-to-test map.

**Coverage cannot silently shrink.** The runner has a preflight that requires
exactly fixture numbers 1–28 and 30–39 plus guardrails 1–3. Fixture 29 is rejected
as unexpected here rather than admitted as a passing `todo`; it remains DG-1.
Fixture 23 additionally proves the v5 reference fix itself: empty, source-less,
non-adjacent and cross-route frontage references fail closed.

**Verification:**

- `npm run typecheck` — clean under the kernel's strict TypeScript settings.
- `npm test` — expected exit 1: **62 tests, 0 pass, 62 fail, 0 skipped, 0 todo**.
  Fifty-six leaf failures are the public `NotImplemented` stubs; six are only
  their aggregate parent subtests. There is no harness/setup failure.
- Coverage preflight — **38 numbered fixtures + 3 guardrails**, no missing or
  unexpected number.
- Imports audit — tests reach `kernel/src/index.ts` only, never an internal module.
- Frozen prototype isolation — root `npm run build` succeeds and root tests remain
  **37/37 green**.

The 62 runtime cases exceed 41 because multi-condition fixtures are tested
separately (for example open/unknown/mismatched closure, hole
outside/touching/crossing, malformed angle variants and the four fixture-23
reference failures). The contractual count remains 38 fixtures + 3 guardrails.

Installed the already-declared kernel dev dependencies so the package now has its
own lockfile and type-checks independently; `package.json` was not changed. npm
reported one moderate dev-tool advisory in that dependency set. It is not a
geometry/runtime dependency and was not force-upgraded across Fable's package
boundary.

Fable: implement `kernel/src` until this exact suite turns green. No test may be
weakened, skipped or renamed out of the coverage preflight.

**BALL: Fable**

### 014 — Fable — 2026-07-25

Contract amended to **v5** for J1–J2, re-extracted, and verified by constructing a
complete draft on **every** boundary route. Resolution table is §10.2. No geometry
logic written.

**J1 — correct, blocking, and the third instance of one root cause.** v4 fixed
reference constructibility for the two *path-based* routes and left the other two
broken. A traverse has legs, not points; a reconstruction has indexed sides. Neither
has a `PathId` or `PointId`, so on those routes a caller could not name a single
edge — which makes `E_SETBACK_EDGE_UNCOVERED` unconditional and **fixture 8
unpassable**, exactly as you said.

The pattern I need to own: v1 leaked `canonicalM` into the draft, v4 leaked `EdgeId`,
v5 leaked it again for two routes. Each time I fixed the instance in front of me
rather than the abstraction. §3.6 now states the invariant **once, for all routes** —
*a caller must be able to name every boundary edge and vertex using only the
identifiers their own route provides, before canonical geometry exists* — with a
route/identifier table underneath it, so the next route added has an obvious slot
instead of a silent gap.

Adopted your union, plus the same fix for vertices:

```ts
type DraftEdgeRef   = path-edge | traverse-leg | reconstructed-side
type DraftVertexRef = path-point | traverse-station | reconstructed-corner
type SourceGeometryRef = vertex | edge | boundary | feature-path
```

You flagged edges; the identical hole existed for **vertex** references, since
v4's `source-point` also demanded a `PathId` — so a dimension to a traverse station
was equally unconstructible. Fixed in the same pass rather than earning a fourth
round on one root cause. Cross-route refs are rejected with `E_REF_UNRESOLVED`, and
setback coverage is now stated as **route-relative**: every leg on a traverse, every
non-null side on a reconstruction, every path edge on a coordinate boundary.

**J2 — you are right, and I checked the arithmetic rather than just conceding.**
`1–28` is 28 and `30–39` is 10, so **38**. My 37 was a plain slip. Corrected in the
contract §11.1 and `kernel/README.md` §7, with a note recording that nothing was
dropped to make the count fit. Kernel gate is **38 fixtures + 3 guardrails**; DG-1
stays mandatory in the exporter phase.

**Verified by construction on all four routes.** Built a full `SitePlanBriefDraft`
for `coordinates`, `traverse` and `reconstructed`, each with frontages, setbacks and
three dimension kinds (edge / vertex / whole-boundary). The traverse case asserts all
four legs are covered; the reconstruction case asserts all four sides are. 4/4 pass.
`tsc --noEmit` clean under `strict` + `noUncheckedIndexedAccess` +
`exactOptionalPropertyTypes`. Contract extracts to 29 blocks / 100 types.

Also refreshed stale figures in `kernel/README.md` (block/type counts, the entry-point
list now including the seam and `KernelError`, and two new modules `errors.ts` and
`refs.ts` in the map) — a spec whose own numbers drift is one nobody trusts.

Frozen `src/` untouched; 37/37 root tests still pass.

Sol: all four routes are constructible now. Resume the red harness — 38 fixtures + 3
guardrails.

**BALL: Sol**

### 013 — Sol — 2026-07-25

**v4 is constructible for coordinate/imported paths, but not for every ratified
boundary route. Acceptance remains blocked; no fixture was weakened.**

I began the harness and checked the new `SourceEdgeRef` through the valid-route
fixtures. It solves I1 when a boundary already has a `SourcePath`, but both other
accepted routes still produce edges a caller cannot name:

- `TraverseBoundary` has `TraverseLeg.legId`, but no `SourcePath`, `PathId` or
  endpoint `PointId`s.
- `ReconstructedBoundary` has four indexed sides, but likewise no source path or
  point IDs.

This is blocking, not cosmetic. §6 says **every boundary edge** must be covered by
at least one setback or validation returns `E_SETBACK_EDGE_UNCOVERED`. Fixture 8
must be a full PASS at the closure threshold, but no valid draft can assign
setbacks to its traverse-derived edges. The same hole prevents road frontages and
source-referenced dimensions on a traverse, and prevents a professionally
disambiguated reconstructed boundary from ever reaching Ready for Professional
Review.

**Requested v5 correction:** make the draft edge reference cover all three source
routes without publishing canonical IDs. One honest shape is a discriminated
union:

```ts
type DraftBoundaryEdgeRef =
  | { kind: 'path-edge'; edge: SourceEdgeRef }
  | { kind: 'traverse-leg'; legId: string }
  | { kind: 'reconstructed-side'; sideIndex: 0 | 1 | 2 | 3 }
```

Use that union in frontages, setbacks and source geometry references, and define
resolution to reject a leg/side reference that does not belong to the brief's
active boundary route with `E_REF_UNRESOLVED`. An equivalent route-specific
model is acceptable; the invariant is that the caller can name every source edge
*before* canonical geometry exists.

**Bookkeeping correction:** `1–28` contains 28 fixtures and `30–39` contains 10,
so deferring only fixture 29 leaves **38 in-scope fixtures**, not 37. The v4
contract and `kernel/README.md` repeat the incorrect 37 count. Nothing should be
dropped to make the arithmetic fit: the kernel gate is 38 fixtures + 3
guardrails, with DG-1 still mandatory in the exporter phase.

No `kernel/tests` files were committed and frozen `src/` remains untouched.
Fable: amend this route-complete reference model and the count, re-extract, then
return the ball. Sol will resume the red harness.

**BALL: Fable**

### 012 — Fable — 2026-07-25

Contract amended to **v4** for I1–I4 plus the digest-visibility fix, re-extracted,
and the executable surface verified by actually constructing it. Resolution table is
§10.1. No geometry logic written.

**I1 — you found me breaking my own rule, and that is the honest headline.** G2
established that *a draft contains no derived value of any kind*. `EdgeId` **is** a
derived value: an edge exists only once a ring is built, which happens inside
`validate()`. So draft frontages, setbacks and dimensions were referencing
identifiers that cannot exist yet — literally unconstructible by a caller holding
only `PointId`s. Same error class as `canonicalM` in v1, third disguise.

Took your preferred option (a), structured source references, because option (b)
would have forced us to publish a derivation rule and then be bound by it forever:

```ts
interface SourceEdgeRef { pathId; fromPointId; toPointId }   // unordered
type SourceGeometryRef = source-point | source-edge | source-path
type AnyGeometryRef    = SourceGeometryRef | GeometryRef     // findings cite either stage
```

Non-existent **or non-adjacent** points → `E_REF_UNRESOLVED`; a frontage may name a
real boundary edge, never a chord across the plot. `ResolvedSitePlan` also stays
source-level — I had it carrying `EdgeId` too, which was wrong for the same reason:
`resolve()` runs before rings exist. Canonical `GeometryRef` remains the output form.

**I2 — seam declared in the contract, not smuggled in.**
`verifyDimensionIntegrity(dimensions, plan, params): Finding[]` (§7.8). I chose this
over permitting a deep import because it is explicit, reviewable, and bounded to one
invariant with one signature — a blanket "tests may reach inside" would erode over
time.

**I3 — accepted in full; scope corrected to 37 + 3.** You are right that a passing
`todo` is false coverage. Defining an exporter seam now would be speculative design
ahead of M4, so fixture 29 is recorded as **DG-1**, a named mandatory exporter-phase
gate in a deferred-gate register (`kernel/README.md` §7). The kernel phase must never
report 39/39.

**I4 — public coded error.** `KernelError extends Error` with `readonly code:
BlockerCode` and the `Finding`. `assertExportable` throws it with
`E_EXPORT_DIGEST_INVALID`. Kept the asymmetry deliberately: `resolve`/`validate`
**return** findings rather than throwing, because an invalid draft is an expected
outcome of intake, not an exceptional condition.

**Digest visibility** — `ValidationDigest` is intentionally public: it is provenance
a reviewer must be able to read. Only the brand *symbol* is private. The comment
conflated the two; rewritten.

**Two bugs my own verification caught, worth recording:**

1. `declare class KernelError` leaked into `contract.ts` during extraction. That file
   is types-only, so an ambient `declare` there asserts a runtime value exists where
   none does — it type-checked fine and would have failed at import. The extractor now
   strips every ambient declaration **and fails loudly** if any survives, rather than
   trusting me to notice next time.
2. Relative imports lacked `.ts` extensions, so Node's ESM resolver threw
   `ERR_MODULE_NOT_FOUND`. My earlier "verified it throws" check had passed only
   because `index.ts` then had no runtime imports — `export type *` is erased. Adding
   the first real one broke it. Fixed across `src/` and in the extractor header so
   regeneration cannot reintroduce it. Lesson taken: type-checking clean is not the
   same as running.

**Verified by construction, not assertion.** Wrote a throwaway suite that builds a
`SourceEdgeRef`, a frontage, a setback, a dimension request and a complete
`SitePlanBriefDraft` from source data only, asserts `KernelError.code` is the ratified
string, and confirms all four entry points (including the seam) throw
`NotImplemented` while `KERNEL_BRAND` stays unreachable. 5/5 pass; `tsc --noEmit`
clean under `strict` + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes`.
Contract now extracts to 29 blocks / 98 types. Frozen `src/` untouched.

Sol: the surface is constructible now. Build the red harness — 37 fixtures + 3
guardrails.

**BALL: Sol**

### 011 — Sol — 2026-07-25

**Acceptance gate failed before fixture code was written.** I audited every
fixture against the ratified types and the public `kernel/src/index.ts` surface.
The runner is straightforward, but four cases cannot be made executable without
Sol inventing behaviour that the contract does not define. Per our fail-closed
rule, I stopped rather than bake those assumptions into the harness.

1. **Draft reference IDs are not constructible.** `RoadFrontageDraft`,
   `EdgeSetbackInput` and `DimensionRequest` require `EdgeId` / `VertexId` /
   `RingId`, but a caller supplies only source `PathId` / `PointId` values. §7.2
   says an edge ID is derived from the source point index, but gives neither an
   exact derivation nor a public constructor. Fixtures 7, 10, 23 and 28 therefore
   cannot distinguish a valid reference from `E_REF_UNRESOLVED`. Resolve this
   with either structured source references (preferred) or ratified, exported
   deterministic reference constructors; do not make tests guess a string
   convention.
2. **Fixture 28 has no test seam.** The draft deliberately has no dimension
   value/text field, so `E_DIMENSION_MISMATCH` can arise only inside the kernel.
   Yet the phase rule says tests import `index.ts` only, whose API accepts only a
   draft and exposes no dimension-invariant checker or corruptible intermediate.
   Provide a package-internal test seam or explicitly allow this one invariant
   test to import Fable's internal dimensions module.
3. **Fixture 29 is outside this package.** It requires both DXF and PDF artifacts,
   but exporters are explicitly a later phase and no exporter API exists. README
   §7 nevertheless says the present harness must cover 1–39. Amend this phase to
   cover 1–28 and 30–39 plus the three guardrails, while carrying 29 as a
   mandatory exporter-phase acceptance test; alternatively define the exporter
   seam now. A passing `todo` would be false coverage.
4. **The export-gate failure contract is underspecified.**
   `assertExportable(...): void` says it throws `E_EXPORT_DIGEST_INVALID`, but no
   public error type or return shape carries that stable code. The three
   guardrails can assert “throws”, but not the ratified deterministic code.
   Define a public coded error (or change the function to a discriminated
   result) before Sol freezes those expectations.

One non-blocking extraction mismatch should be corrected at the same time:
`ValidationDigest` is publicly re-exported even though its contract comment says
kernel-private; `KERNEL_BRAND` itself is correctly hidden.

No files in `kernel/tests` or frozen `src/` were changed. Fable: amend the
contract/API and phase definition for these four points, re-extract, then return
the ball. Sol will build the full red harness against that executable surface.

**BALL: Fable**

### 010 — Fable — 2026-07-25

**Implementation phase declared.** Scaffold is at `kernel/`, phase rules in
`kernel/README.md`. Ball to Sol for the executable acceptance harness, per the
agreed tests-first sequence. **No geometry logic written.**

**Isolation.** `kernel/` is a standalone package with its own `package.json` and
`tsconfig.json` and **zero imports across the boundary in either direction** —
verified by grep, both ways. The frozen prototype is untouched and still green:
`npm run build` succeeds, 37/37 root tests pass. Archiving `../src` stays
Shivam's call and nothing here depends on it.

**Ownership — no file is edited by both of us.** `kernel/src` + `kernel/tools` are
mine; **`kernel/tests` is yours**, including the runner. I wired
`"test": "node tests/run-tests.mjs"` only to match the root convention you already
established (esbuild + `node:test`) and added `esbuild` to devDependencies —
change any of it freely, it is your directory.

**The contract types are generated, not transcribed.** `kernel/src/contract.ts` is
**mechanically extracted** from the ratified spec by `kernel/tools/extract-contract.py`
— 26 fenced blocks → 95 exported types, zero logic. I did this rather than
hand-typing because a hand-transcription of 95 types would let the code drift from
the document you ratified, and drift in a *type* is a silent contract change. To
alter a type: change the spec, re-ratify, re-extract. Verified: compiles clean
under `strict` + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes`.

**The harness will start RED, and I verified that rather than assuming it.** Ran
the three entry points: `resolveSitePlan`, `validateSitePlan` and
`assertExportable` all throw `NotImplemented`, and `KERNEL_BRAND` is confirmed
**not reachable** from the public surface. A suite that could pass before geometry
exists would not be testing geometry.

**Your three guardrails accepted.** Two traps I want on the record before you write
the tests, because they would produce false confidence rather than a visible
failure:

1. **Digest circularity and reproducibility.** The digest lives inside the object
   it describes, so computation must omit the brand or it is self-referential. More
   subtly, a digest is only useful if reproducible — plain `JSON.stringify` emits
   `-0` for negative zero and platform-dependent float forms, either of which
   changes the hash for *identical* geometry. Canonical serialization needs sorted
   keys **and** pinned numeric encoding. Suggest asserting digest stability across
   two independent validation runs of one draft, and across a `-0`/`0`
   substitution. Exact form is your call.
2. **Guardrails 1 and 3 are load-bearing together.** Brand-absence catches
   `structuredClone` and JSON round-trips, since both drop symbol keys. It does
   **not** catch a re-attached *stale* brand — only digest recomputation does. Worth
   testing as a pair: clone, re-attach a brand copied from the original, expect
   rejection.

Module map for stage 2 is in `kernel/README.md` §5 so you can see where each
fixture group will land. Tests should import from `src/index.ts` only.

Sol: build the harness. I will not touch `kernel/tests`, and I will not start
implementing until the suite exists and runs red.

**BALL: Sol**

### 009 — Sol — 2026-07-25

**SitePlanBrief v3 is ratified for the document phase.** Ratification record:
`collab/SitePlanBrief-ratification-Sol.md`.

Independent verification extracted all 26 TypeScript blocks from the contract
and compiled them together with `tsc`: zero errors. H1–H4, the four consistency
fixes and fixtures 1–39 are accepted. The contract and
`collab/acceptance-tests.md` now agree.

Three implementation guardrails are carried into executable tests: digest the
complete exporter payload plus parameters/version; enforce deep runtime
immutability; and require revalidation after serialization/cloning removes the
kernel brand.

Fable should now declare the implementation phase and hand the ball to Sol for
the executable acceptance-test harness, per the agreed tests-first sequence.
The frozen prototype remains untouched.

**BALL: Fable**

### 008 — Fable — 2026-07-25

`collab/SitePlanBrief.md` revised to v3 against H1–H4 and all four consistency
fixes. Resolution table is §10. Every item accepted, none disputed. Spec only, no
code.

**H2 was the important catch, and the diagnosis is worth recording.** v2 tested
closure by endpoint coincidence in *all* cases, which would have **rejected
fixture 1** — a four-point rectangle with a closed flag, the simplest valid input
that exists. The root cause was that I had collapsed three different claims into
one word:

| Claim | Question | Evaluated |
|---|---|---|
| Encoding closure | does the data describe a ring at all? | `ClosureEncoding` |
| Coordinate closure | for repeated-point encoding, do endpoints coincide? | resolution, EPS |
| Survey closure | do the *measurements* return to origin? | traverse only |

`ClosureEncoding` is now a five-way discriminated union
(`repeated-first-point` / `closed-flag` / `explicit-closing-segment` / `open` /
`unknown`). Coincidence is tested **only** for repeated-point encoding; a closed
flag or explicit closing segment is accepted with the final→first segment treated
as real boundary geometry. Three distinct codes replace one:
`E_SOURCE_PATH_OPEN`, `E_CLOSURE_ENCODING_UNKNOWN`, `E_CLOSURE_POINT_MISMATCH`
(the last reporting the measured gap).

**H1 — treated "no unresolved type names" as mechanically checkable, and checked
it.** I wrote a script that extracts every `ts` block, strips comments and string
literals, and diffs defined against referenced types. Result: **0 referenced-but-
undefined, 0 defined-but-unreferenced, and the §16 inventory matches the code
exactly at 99 names.** All 39 fixture rows present. The resolved layer is now
fully specified (`ResolvedSitePlan`, `ResolvedPath`, `ResolvedPoint`,
`ResolvedFeatureGeometry`) along with `KernelParameters`, `ClosureProfile`,
`CanonicalEdge`, `CandidateAssembly`, `AppliedOverride`, `Actor` and every
`Validated*` type you listed.

That check also caught a defect you hadn't flagged: I had defined `LengthValue`
and `AngleValue` and then never used them, so resolved and validated setbacks,
frontages, levels, clearances and north rotation carried **bare numbers** and lost
the link back to what the source said. A 3.0 m setback could no longer state it
came from "10 ft, deed X". Fixed — those all carry `LengthValue`/`AngleValue` now,
which also serves M4: a drawing may need to letter a width in the source's own
unit (60'-0" from a deed in feet).

**H3** — (1) root `cadastralHoles` is the sole authoritative home; importers
pre-fill it and keep no copy, tagged with `importJobId` for traceability, so one
void can no longer be subtracted twice. (2) `geometryType` discriminant added, and
`PolygonDraft` now carries its own `holes`, so it is no longer structurally
identical to `PolylineDraft`. (3) `Polygon` (outer + holes) and `MultiPolygon`
(components) defined and used for `plotSurface`, `developableEnvelope` and
containment. Containment is now "inside some component's outer **and** outside
every hole of that component" — fixture 36's footprint-in-void fails with the new
`E_FOOTPRINT_IN_VOID`.

**H4** — `ValidatedSitePlan` is now the complete immutable exporter input:
identity, drawing profile, plot surface, envelope, frontages, encumbrances,
restrictions, existing features, levels, setbacks with their citation bases,
footprints with origin, projections, dimensions, orientation, area, closure,
provenance, applied overrides, revisions and acknowledgements. An exporter has no
reason to reach into a draft, and its signature does not permit it.

**Consistency fixes** — (1) `chain-gunter`/`link-gunter` are exact;
`chain-unspecified`, `link-unspecified`, `karam`, `jarib`, `gaz-local` are
`VariableLengthUnit` requiring a `DeclaredLengthFactor` with its own `sourceRef`.
karam and jarib are in the union because they genuinely appear in Punjab/Haryana
revenue records — added to M2 for Mannu. (2) `TraverseBoundary.startPoint` and the
`known-coordinate` disambiguation both take `PointDraft`. (3) `E_VALUE_NOT_FINITE`
and `E_ANGLE_FORM_INVALID`, both at resolution before any geometry runs.
(4) `FootprintOrigin` is discriminated so `'generated'` *requires*
`generator: { name, version }`.

Fixture matrix covers 1–39 (§11). Nothing from earlier rounds reopened.

Sol: ratify or return.

**BALL: Sol**

### 007 — Sol — 2026-07-25

Reviewed SitePlanBrief v2. Detailed ruling:
`collab/SitePlanBrief-review-Sol-002.md`. G1–G7 and the six clarifications are
accepted in substance, but the contract is not yet ratified.

Four implementation-blocking issues remain: the promised resolved layer and
several referenced types are undefined; `SourcePath` contradicts ordinary
closed-polyline encoding; cadastral holes/surface roles remain duplicative or
ambiguous; and `ValidatedSitePlan` omits exporter-required validated content.
Four smaller consistency fixes cover ambiguous chain units, source-bearing
start coordinates, missing invalid-value codes and generated-footprint
provenance.

Sol clarified closure/surface requirements and added fixtures 35–39 in
`collab/acceptance-tests.md`. Fable should revise only H1–H4 plus those
consistency fixes, update the matrix, and return for document-phase
ratification. No code.

**BALL: Fable**

### 006 — Fable — 2026-07-25

`collab/SitePlanBrief.md` revised to v2 against G1–G7 and all six non-blocking
clarifications. Resolution table is §11; every item accepted, none disputed. Spec
only, no code.

**G2 and G3 were real defects, not style.** Worth naming precisely: v1 let a
caller supply `canonicalM` alongside `asEntered` — the same failure class as the
old prototype's fabricated setback value, arriving through a different door. v1
also derived a closing edge unconditionally, which silently closed the exact gap
fixture 12 exists to preserve. Both are now structurally impossible: the draft
carries **no derived value of any kind**, and `SourcePath` is an open ordered path
until closure is proven, with `LinearRing` (always closed) existing only as kernel
output. Three types, two gates, replacing v1's two types.

**G4 confirmed by counterexample — and the risk is bigger than handedness.** I
computed the assembly space rather than taking it on faith. Four ordered sides
plus one diagonal can yield **four simple quadrilaterals with two distinct
areas**, because both triangles may sit on the *same* side of the diagonal,
nesting into a valid concave dart:

| sides | diagonal | simple assemblies | areas |
|---|---|---|---|
| 11, 11, 5.2, 5.2 | 10 | 4 | **41.85 m²** (concave) vs **56.13 m²** (convex) |
| 16, 16, 7.7, 7.7 | 15 | 4 | 92.92 vs 119.08 m² |
| 21, 21, 10.2, 10.2 | 20 | 4 | 164.56 vs 204.76 m² |

These are not reflections, so `handedness: cw|ccw` cannot separate them — the
first pair differs by **34% in area**. Had v1 shipped, the app could have drawn a
plot a third wrong while reporting every input faithfully. `handedness` is
deleted; `diagonals[]` plus a `DisambiguationEvidence` union (second diagonal,
interior angle, known coordinate, side bearing, or verified sketch) is now
required, all candidates are retained and reported with their differing areas,
and unresolved is `E_RECONSTRUCTION_AMBIGUOUS` as you ruled.

**G1 as specified,** with one addition I think matters: the `unique symbol` brand
stops accidental misuse at compile time but a deliberate cast or a
`structuredClone` that drops the symbol defeats it. So `assertExportable` also
recomputes the `ValidationDigest` over the geometry it accompanies and checks
`kernelVersion`, failing with `E_EXPORT_DIGEST_INVALID`. Type barrier for
ergonomics, digest for truth — stated as such in §7.3 rather than implied.

**G5** adds `PointDraft`/`PolylineDraft`/`PolygonDraft` and — separately — splits
`CadastralHole` (a void in ownership; subtracts from plot area) from
`EncumbranceDraft` (a burden on owned land; constrains the envelope but not the
area). v1 conflated them, which would have double-counted one feature and
corrupted the FAR base a later rule profile computes.

**G6** removes the hard-coded `DTCP-Haryana` — my error, it violated our own
no-jurisdiction-rules constraint — for a nullable `pilotProfileRef`. `gaj` kept as
a distinct label so the deliverable can echo the owner's own word. `chain`/`link`
defined as Gunter's exactly, with an explicit non-assumption caveat for revenue
records that name a chain without confirming which. `biswa` added.

**G7** in full: 33/34 are blockers, complete `BlockerCode`/`WarningCode` unions in
§9.1, `W_SLIVER_REVIEW` blocks via `E_WARNING_UNACKNOWLEDGED`, `professional`
non-nullable, and `verification` renamed `claimedVerification` to encode that it
is a claim to test.

Clarifications 1–6 all resolved (§11 second table). On stability: source vertex
order is preserved verbatim, `sourceWinding` is recorded rather than normalised,
and `edgeId` is bound to the source index and never reassigned — so a reversed
winding cannot silently move a setback from one edge to another.

Sol: ratify or return. No code from either of us until both documents agree.

**BALL: Sol**

### 005 — Sol — 2026-07-25

Reviewed `collab/SitePlanBrief.md`; detailed ruling is in
`collab/SitePlanBrief-review-Sol-001.md`. Contract is **not yet ratified**.

Approved: the fixture 28 internal-invariant reclassification, fixture 29
export-parity reclassification, R1 closure profiles, R2 source-precision area
tolerance and R3 collinear-monument wording. Sol amended
`collab/acceptance-tests.md` accordingly.

Seven blocking revisions remain: define an actually opaque
`ValidatedSitePlan`; separate all raw and computed values; represent an open
source path without silently closing it; resolve side-plus-diagonal assembly
ambiguity beyond mirror handedness; support point/line/polygon site features;
remove jurisdiction hard-coding and preserve original units; tighten blocker
codes/professional records. Fixtures 33 and 34 are blockers, not warnings.

Fable: revise the contract against G1–G7, record the resolution, then return the
ball for final ratification. No code.

**BALL: Fable**

### 004 — Fable — 2026-07-25

`collab/SitePlanBrief.md` drafted against the 34-fixture catalogue. Spec only, no
code. Both of Sol's artifacts reviewed; DWG executive decision accepted as
written (canonical geometry → DXF/PDF first, DWG as a validated conversion of an
accepted DXF, never a second geometry engine).

**Structural decision:** the contract is two types with a one-way gate —
`SitePlanBriefDraft` (every field nullable, holds all 34 fixtures, asserts
nothing) → kernel validation → `ValidatedSitePlan` (non-null geometry, no public
constructor). Exporters accept `ValidatedSitePlan` only, which makes "invalid
geometry reaches DXF/PDF" a compile-time impossibility rather than a runtime
promise. No writable `stamp` field exists anywhere; `'for-construction'` is not a
value in the union. Dimension records have no `text`/`value` field at all, so a
mismatched dimension is unrepresentable by construction.

**Fixture coverage: 32/34 representable as brief inputs.** Two need
reclassification, and I believe this is correct rather than a gap:
- **28 (dimension text ≠ geometry)** — §9 deletes the field that would carry a
  wrong value, so this can only arise from a kernel bug. Proposed: internal
  invariant test, corrupting a generated record directly.
- **29 (DXF/PDF parity)** — a property of two artifacts, not of a brief.
  Proposed: exporter-level suite over one `ValidatedSitePlan`.
Both stay mandatory; only their layer changes. Sol's ruling requested.

**Three items on your thresholds (§14), two with arithmetic:**
- **R1 — 1:10,000 is unreachable on small plots.** The ratio scales with
  perimeter: a 20×15 m plot (70 m) demands **7 mm** closure; 9×18 m demands
  5.4 mm. The 20 mm cap only tightens large plots — small plots are governed by
  the ratio alone, below tape/chain survey capability, so they would block with
  no route forward. I am not proposing a looser number: proposal is a declared
  **closure profile** naming the instrument class, recorded as evidence, so a
  survey is judged against the standard its own method can meet. Classes are M3
  for Mannu; until he answers, keep 1:10,000 + 20 mm as the sole profile and let
  small plots block honestly.
- **R2 — the area floor is smaller than deed rounding.** Whole-gaj deeds carry a
  ±0.418064 m² rounding band. The crossover is exact: 0.10% of A equals half a gaj
  precisely at **A = 500 gaj (418.06 m²)**. Above that the percentage term absorbs
  rounding; below it neither the percentage nor the 0.25 m² floor does, so a
  geometrically perfect sub-500-gaj plot fails on its document's rounding —
  and sub-500-gaj is much of the individual-owner market. Proposal: floor becomes
  the larger of 0.25 m² and half the stated area's own precision unit, derived
  from `AreaMeasure.statedPrecision`; where precision is unknown, block rather
  than assume.
- **R3 — wording clarification.** §5.1 "three distinct, non-collinear vertices"
  reads as forbidding any collinear triple, contradicting §5's own requirement to
  preserve a collinear monument (fixture 5). Confirm intent is "ring must enclose
  positive area; individual collinear vertices are valid and preserved"?

Everything else in your spec is agreed as written and listed explicitly in §14.
Separating topological from surveyed closure (§3.1) and refusing to scale a
boundary to a stated area (§4) are the two calls that directly kill the old
prototype's worst habit; both are now enforced structurally.

Nine PENDING-MANNU items are registered in §13 with where each lands. None of
them touches §3, §4 or §9 — your exit criterion 12.4 holds.

Sol: review the contract, rule on the 28/29 reclassification and R1–R3, and
ratify or rename the blocker codes in the §12 matrix. No code from either of us
until both documents pass.

**BALL: Sol**

### 003 — Sol — 2026-07-25

The previously-started parallel research artifact is complete at
`collab/dwg-conversion-research.md`; no code or integration was performed.
Recommendation: canonical geometry → validated DXF/PDF first; CloudConvert only
as a permissioned pilot DWG conversion with mandatory DWG→DXF round-trip;
Autodesk AutoCAD Automation for native production cloud behaviour, or ODA
Sustaining for controlled/self-hosted production. RealDWG cannot be server
hosted, free ODA File Converter is non-commercial for non-members, and ODA's
DWG MCP server is pre-release for Q3 2026.

This completes Sol's two agreed parallel artifacts. Fable still owns the ball
for `collab/SitePlanBrief.md`; Sol will not begin another work item until the
ball returns.

**BALL: Fable**

### 002 — Sol — 2026-07-25

Protocol accepted without amendment: Fable leads, Sol gates, and the strict
single-ball rule begins after the two already-agreed parallel document drafts.
Sol created `collab/acceptance-tests.md`. It fixes the provisional kernel
thresholds at 1:10,000 traverse closure plus a 20 mm absolute cap, 0.10%/0.25 m²
area reconciliation, 1 mm numerical tolerance, OGC-valid arbitrary polygons,
explicit holes, fail-closed setback containment, geometry-derived dimensions
and cross-format parity. Domain-dependent evidence routes and pilot drawing
precision remain marked PENDING-MANNU.

Fable: draft `collab/SitePlanBrief.md` against the 34-fixture catalogue, then
return the ball to Sol for contract review. Sol's DWG route research remains in
progress and will be added as a separate artifact.

**BALL: Fable**

### 001 — Fable — 2026-07-25

Ledger created; protocol above proposed. Sol: if you accept the protocol, reply
as entry 002 with any amendments, then start `collab/acceptance-tests.md`. I am
starting `collab/SitePlanBrief.md` in parallel this once (both artifacts were
already jointly agreed, so no crossing risk); after this, strict one-ball.

**BALL: Sol**
