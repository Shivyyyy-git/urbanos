# Feature 1 — Independent Verification & Architecture Review

**Reviewer:** Fable/Claude · **Date:** 26 July 2026
**Reviewing:** Sol's ledger 020–023 and `collab/feature1-final-audit.md` (10/10 claim)
**Method:** re-ran every claim from scratch; parsed the delivered artifacts with my own
tools; mutation-tested the suite; read the code for claim-vs-behaviour drift.

---

## 1. Verdict

**The 10/10 holds, on evidence, for the bounded claim Sol stated.** I could not
break it, and I tried. Three things are worth separating out, because "10/10" will
be read more broadly than it should be:

| Claim | My finding |
|---|---|
| Kernel + exporter meet the ratified spec | **Confirmed.** 113/113, mutation-proven, artifacts verified byte-level |
| Output is a real, scaled, honest drawing | **Confirmed.** Independently parsed and measured, both formats |
| The intake form is *the standard used in Dwarka/Gurgaon* | **NOT established.** Still depends on Mannu (§4) |

The third is not a defect in Sol's work — it is a human dependency that no amount
of engineering closes. It is also the largest remaining risk in the product.

---

## 2. What I re-verified myself

**Suites and builds.** Kernel 113/113 (0 fail, 0 skipped, 0 todo). Frozen prototype
37/37. Kernel typecheck clean under `strict` + `noUncheckedIndexedAccess` +
`exactOptionalPropertyTypes`. Both production builds pass. Feature 1 UI loads with
**zero console errors**.

**The suite has teeth — mutation-tested, not counted.** A green suite proves nothing
unless it can fail, so I sabotaged four load-bearing behaviours and confirmed which
gates caught them:

| Sabotage | Caught by |
|---|---|
| Area reconciliation always passes | fixtures 21, 32 |
| Remove the setback-clearance guard (phantom envelope) | fixture 27b |
| Accept unverified evidence for the review stamp | fixtures 30, 30b, 30c, 30d, 40d |
| — | *(all reverted; 113/113 restored)* |

**The delivered artifacts, parsed with my own reader — not the kernel's.**

DXF (`output/dxf/…sample.dxf`, 13,672 bytes):
- `AC1009` (R12), `$INSUNITS = 6` (metres) ✓
- 14 named layers, correctly separated (plot boundary, setback, envelope, footprint,
  encumbrance, cadastral hole, road frontage, dimension, north, annotation, …)
- Plot boundary measures **exactly 20.000 × 10.000 m, area 200.000 m²**
- Stamp present in the file: `READY FOR PROFESSIONAL REVIEW - NOT FOR CONSTRUCTION`

PDF (`output/pdf/…sample.pdf`, 8,981 bytes):
- `MediaBox` = **420.0 × 297.0 mm** — A3 landscape exactly, not approximately
- Stamp present **twice** (model space and title block)

**Cross-format parity (DG-1) — the claim I most wanted to test myself.** I extracted
all 33 DXF polylines in model metres, applied the manifest's own paper transform, and
compared vertex-for-vertex against the PDF's vector subpaths:

> **33/33 matched within the 0.25 mm paper tolerance. Worst per-vertex error:
> 0.000000213 mm.**

DG-1 is genuinely discharged. The two formats are not "consistent-looking" — they are
the same geometry.

*A correction on my own method:* my first parity run reported 18/33 and I nearly
recorded a gap. The 15 "misses" were 2-point lines and dimension leaders that my own
extractor discarded with a `>2 points` filter. My tool was wrong, not the artifact. I
found it before writing it down; noting it because a reviewer's false positive costs
as much as a builder's false negative.

**The disclosure gap I raised in ledger 018 — Sol resolved it better than I
proposed.** I had asked for a field to *disclose* a kernel-performed adjustment. Sol
instead removed the kernel's ability to adjust at all: `closeByBearings` is gone, and
a non-closing traverse now requires `TraverseAdjustmentApproval` — a
professionally-signed, explicitly closed station path supplied as **input**. Verified
by grep: no self-adjustment code remains. That satisfies contract §3.2 as originally
written instead of amending it, which is the stricter answer. Sol was right to
overrule my proposal.

---

## 3. Architecture findings

None of these are correctness defects. They are integration and hygiene issues that
will bite a production SaaS.

**A1 — The kernel's test suite reaches outward into the UI.**
`kernel/tests/form.acceptance.test.ts` imports `../../feature1/src/formModel.ts`. The
kernel package is therefore no longer self-contained: its suite cannot run without the
UI tree present, and the dependency arrow points the wrong way (tests of the inner
layer depending on the outer one). *Recommend:* move the form-route cases into a
feature1-owned suite, or — if `formModel` really encodes contract logic rather than UI
logic — promote it into the kernel or a shared package.

**A2 — The kernel is consumed as source over a deep relative path.**
`feature1` imports `../../kernel/src/index.ts`, and `kernel/package.json` declares no
`exports`, `main` or `types`. It works, but it couples the build to directory layout
and means nothing enforces the public surface. *Recommend:* an `exports` map plus a
workspace alias, so reaching past `index.ts` becomes impossible rather than merely
discouraged.

**A3 — `parityError` in `drawing.ts` is unexercised.** I neutered its throw and all
113 tests still passed. Its ~16 call sites are defensive internal-consistency
assertions (missing endpoints, zero-length edges, no drawable coordinates). Not a
correctness defect — but their code paths and messages are unproven, so we cannot
claim they behave. *Recommend:* one test that forces one of them.

**A4 — `npm test` at the root does not test the product.** It runs the frozen
prototype's 37 tests. A bare `npm test` therefore reports green while saying nothing
about the 113 that matter. *Recommend:* a root script that runs kernel + frozen +
builds, so "tests pass" cannot quietly mean the wrong suite.

**A5 — The frozen prototype is still the root application.** `npm run dev` and
`npm run build` still serve and build the retired concept code, and it is what a
newcomer meets first. Shivam's reset said the old work moves to an archive folder
"when the new build officially starts" — that has now happened. *Recommend:* move
`src/` and `tests/` to `archive/prototype/` and promote Feature 1 to root. **This is
Shivam's call, not ours** — flagging, not doing.

**A6 — Feature 1's dev server pins its own host/port.** `feature1/vite.config.ts`
hard-codes `127.0.0.1:4173`, which overrides the launcher's `autoPort`; on a busy port
it silently walks to 4174 while tooling still reports the requested one. Minor, but it
cost me a failed navigation. *Recommend:* drop the hard-coded port.

---

## 4. The real remaining risk is not code

Nine `PENDING-MANNU` items (M1–M9) are still open. Sol has implemented DDA/UBBL and
Haryana OBPAS intake profiles from published sources, and the UI is honest about what
they do ("they change required facts and export conventions — not the supplied
geometry"). But:

- No real customer document has ever been run through this form.
- No accepted Dwarka/Gurgaon site plan has been compared against our output sheet.
- No real plot with verifiable papers has been used as a pilot.

So the engineering is verified against **our own specification**, and that
specification is still unvalidated against the market it is for. The two questions
that close the most risk per unit of effort remain the ones from the audit weeks ago:
**a photo of one accepted site plan**, and **one real plot with papers**.

That is a Mannu dependency, and it is now the critical path.

---

## 5. Concurrence

I concur with 10/10 **as bounded**: survey-grade input → validated canonical geometry
→ deterministic DXF/PDF stamped *Ready for Professional Review — Not for
Construction*. Not authority approval, not professional certification, not
market-validated intake.

Sol's implementation and verification phase is complete and holds up under
independent attack. A1–A6 are handoff items, not blockers.
