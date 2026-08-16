# R5 — Licence and provenance policy (adoption draft)

**Owner:** Fable (draft) — **ready to adopt.** Needs Shivam's word, no new information.
**Status:** DRAFT v1 — 2026-08-16. From `collab/ResearchSprint-Stage1.md` R5, expanded in `collab/R2-R4-R5-R6-draft.md`, finished here as adoptable text plus a current-state audit.
**Home on adoption:** ledger **Protocol §6 (standing constraints)** — project-wide, outlives Stage 1.

---

## 1. The policy (drop-in text for Protocol §6)

> **7. Licence and provenance rules (standing).**
>
> **(a) A dependency's licence is whatever ships inside its artifact, not what its badge says.** Any dependency that ships a compiled binary, a WASM blob, or vendored third-party source has its contents traced before adoption. **No CGAL-derived geometry code, in any wrapper, in any language.** A named exception requires that package's own licence file quoted, a statement of what actually ships, and Shivam's sign-off, recorded in the ledger.
>
> **(b) Share-alike data may be rendered, never ingested.** ODbL sources (OpenStreetMap, Overture's base/buildings/divisions/transportation) may be *rendered into an output* with attribution — a Produced Work. They may **not** be stored and re-served as data, which risks making our database a Derivative Database and inheriting share-alike. Dual-licensed sources are taken under their permissive option (Google Open Buildings under CC BY 4.0).
>
> **(c) No geometry is ever derived from a basemap** — not traced, not digitised, not measured off imagery. Boundary provenance stays with the declared kernel routes. This is simultaneously a licence obligation and an engineering rule: a traced boundary is an *asserted* boundary.

## 2. Why (a) is stated as a blanket ban, and what that costs

The ban is broader than strictly necessary. CGAL's kernel and support packages are LGPL; only the higher-level algorithms are GPL. A precise rule would say "check the per-package licence file."

I am proposing the blunt version anyway, for one reason: **a rule that requires per-package licence archaeology is not a rule a busy person or an agent will actually apply.** And the packages we would reach for — straight skeletons, polygon offsetting, boolean set operations — are the GPL half. The worked example is `straight-skeleton` on npm: it advertises MIT, it is 85 stars and looks harmless, and it ships a **GPL-3+ CGAL build compiled to WebAssembly**. Its README does not mention this. Nothing on the npm page would stop a reasonable engineer from installing it.

Cost of the over-breadth: if we ever genuinely need CGAL's LGPL kernel, we file an exception. That is a five-minute process, once.

## 3. The vetting procedure (what "traced" means operationally)

Before adding any dependency:

1. **Read the `LICENSE` file in the published package** — not the GitHub sidebar badge, not the npm page. Those are metadata; the file is the licence.
2. **Ask what ships.** Pure source? Or a compiled binary / WASM blob / vendored third-party tree? If the latter, identify what is inside it before accepting. This is the step that catches the `straight-skeleton` class of trap.
3. **Enumerate transitive dependencies and their licences.** A permissive top level over a copyleft transitive is the same trap one level down.
4. **Classify runtime vs build-only.** Build-only tooling never reaches the customer's artifact and carries a looser bar; anything that ships in the DXF/PDF pipeline carries the strict bar.
5. **Reject on:** GPL/AGPL family · CGAL-derived · unstated or missing licence · share-alike *data* being ingested rather than rendered.
6. **Record the verdict** where the next person will find it.

**Track 3 of the research sprint runs exactly this procedure** on every repo Shivam sends. The policy and the repo passes are the same instrument.

## 4. Current-state audit (2026-08-16)

Run against every `package.json` in the repo and the installed trees.

### Ships in the artifact (strict bar)

| Package | Licence | Where | Verdict |
|---|---|---|---|
| `polygon-clipping` 0.15.7 | **MIT** | `kernel/src/geom.ts`, `unitplan/src/geom.ts` | ✅ clean |
| ├ `splaytree` | MIT | transitive | ✅ |
| └ `robust-predicates` | Unlicense (public domain) | transitive | ✅ |
| `react`, `react-dom` | MIT | root app shell only | ✅ |
| PDF fonts | **none required** | `kernel/src/pdf.ts` uses base-14 Type1 (`Helvetica`, `Helvetica-Bold`) **referenced, not embedded** | ✅ and deliberate |

### Build-only (looser bar, never ships)

`typescript` (Apache-2.0) · `esbuild` (MIT) · `vite` (MIT) · `@vitejs/plugin-react` (MIT) · `@types/*` (MIT) · `undici-types` (MIT)

### Verdict

**Clean. No GPL, no LGPL, no share-alike, no unstated licence anywhere in the shipping path.** `townhouse-demo` carries **zero runtime dependencies** at all.

### One correction to my own scan

`ResearchSprint-Stage1.md` §2.1 recommended keeping third-party geometry "out of the artefact that carries our stamp." **The kernel already ships one:** `polygon-clipping`, used for boolean difference in `geom.ts`. That is fine — it is MIT, pure JavaScript, and passes every step of §3 trivially — but the policy must be stated as *permissive and traced*, not *none*, or we adopt a rule we are already breaking. Rule (a) above is worded accordingly.

### Two things to watch, neither a problem today

- **Fonts.** The base-14 choice is licence-clean because those fonts are referenced by name and never embedded. The first "make the sheet prettier" instinct will reach for a downloaded typeface and embed it — at which point font redistribution terms become live. Embedding any font is a vetting event.
- **The presentation map.** The moment a basemap tile lands in a PDF, rules (b) and (c) both engage.

## 5. Scope — what this policy does *not* cover

- **Model and API terms.** Governed by the thesis guardrail already locked: models are rented, the dataset is owned, no rule lives only in model weights. Different problem, different document.
- **The rulebook's own source documents.** Government circulars are *cited*, not relicensed — but see §6.

## 6. One open question I am not competent to close

**Are we entitled to store and redistribute scans of government circulars?**

The moat is built on photographing documents from government offices and serving them as citation evidence. Indian copyright law has exceptions covering legislative and judicial matter, and reproducing a notification for citation is ordinary professional practice — but "ordinary practice" is not the same as "checked," and the answer differs between *citing* a document, *storing a scan*, and *serving that scan to a paying customer*.

This is a lawyer question, not a Fable question. It does not block anything now — the pilots are unpaid and the volume is small — but it should be answered before scans are served at commercial scale. **Flagging it rather than guessing.**

## 7. What adoption costs

One paragraph in Protocol §6. The audit above is already done and clean, so nothing in the repo needs to change on adoption. The expense is entirely in *not* having it: the failure mode is a single `npm install` that puts GPL code inside a product we intend to sell, discovered later, by someone else.
