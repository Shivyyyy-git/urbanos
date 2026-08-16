# R6 — The generation rule (adoption draft)

**Owner:** Fable (draft) — **ready to adopt.** Needs Shivam's word, no new information.
**Status:** DRAFT v1 — 2026-08-16. From `collab/ResearchSprint-Stage1.md` R6, expanded in `collab/R2-R4-R5-R6-draft.md`, finished here as an adoptable claims rule with surface-by-surface coverage.
**Home on adoption:** alongside the existing claims discipline (see §3 — they should become one policy, not two).

---

## 1. The rule

> **UrbanOS leads with generation, never with checking.** Every external-facing description positions the product as answering a question asked *before a drawing exists* — what the law permits on this land — rather than as evaluating a drawing that already exists.

**The test, for any sentence:** does it describe *producing* the legal envelope, or *judging* someone's work? If judging, rewrite it.

## 2. Why — the commercial reason, which is stronger than the positioning one

**Our price ceiling for checking is zero.** The State gives it away: ULB and HSVP OBPAS both run the Quick DCR engine, which scrutinises submitted AutoCAD against the Haryana Building Code and returns a deviation report as part of the approval process, free. Above that, the authority-side checking market is held by SoftTech's CivitPERMIT/AutoDCR — a listed company, 35+ urban authorities, government relationships we do not have and would take years to build.

A pitch that lands as "we check compliance" therefore competes with **free at the bottom and an entrenched incumbent at the top**, in a segment where we have no structural advantage.

The generation segment is empty. The research scan found that **every geometry-first product in the category — TestFit, Autodesk Forma, Giraffe, Hypar, qbiq — treats zoning as a user-supplied parameter rather than as cited law.** That is a uniform liability choice across the whole category, not an oversight. It is the square the thesis already claimed, and the boundary rule ("informs, designs, tracks; people decide, sign, submit") is what makes it safe for us to stand there.

The positioning reason is secondary but real: generation is what makes "every option is legal by construction" true, and that sentence is the product.

## 3. Merge with the existing claims discipline

There is already a locked claims rule (2026-07-25, Sol's correction): *never claim an outcome requiring accreditation, expert sign-off, insurance or a liability structure we do not have. We may promise a bank-defensible evidence package for professional review; we may not imply bank approval, statutory approval, or certification.*

R6 is the same instinct pointed one step earlier, and the two should be adopted as **one claims policy with two clauses**, because they fail together — "we check your plan for compliance" simultaneously adopts the checking frame *and* edges toward implying an approval outcome.

> **Claims policy (standing).**
> **(i) Never imply approval.** No claim of statutory approval, certification, sign-off, or any outcome requiring accreditation or a liability structure we do not hold. Outputs are prepared for professional review; the stamp is computed, never chosen.
> **(ii) Always lead with generation.** Describe the product as producing what the law permits before a drawing exists — not as checking, verifying, or clearing a drawing that already exists.

## 4. Surface-by-surface

| Surface | Applies to |
|---|---|
| Pitch deck / investor material | Category slide, product slide, competitive slide. The competitive framing is *"they treat zoning as a setting; we treat it as cited law"* — not *"we check better."* |
| Website / marketing copy | Headline, feature names, meta description |
| Report cover + stamp block | Already governed by clause (i); clause (ii) governs the surrounding prose |
| Demo script (Community One) | The story is already compliant — *"a client wants 500 townhouses; here is what fits"* is pure generation. Keep it that way when the rulebook-swap moment is narrated. |
| Sales conversation | The live risk, because the buyer will offer the checking frame themselves (§6) |
| Stage 2 framing | "The approvals this project triggers" (generation) — not "we make sure you didn't miss one" (checking) |

## 5. Say / don't say

| Don't say | Say |
|---|---|
| "checks your plan against Haryana rules" | "tells you what Haryana rules let you build here" |
| "compliance verification" | "the legal envelope" |
| "makes sure your drawing passes" | "every option is legal by construction" |
| "catches violations before submission" | "you won't need a deviation report — the envelope was legal before you drew it" |
| "validates your architect's work" | "gives your architect the envelope to design inside" |
| "compliance software" | "a test fit for land" |
| "we know the rules so you don't break them" | "we know what the rules permit, with the circular cited" |

## 6. The hard case: when the customer offers the checking frame

A builder will say *"so you check my architect's drawing?"* An architect will say *"can you tell me if this passes?"* Their mental model is deviation reports, because that is the world OBPAS put them in.

**Reframe, do not avoid.** Refusing to ever engage with checking makes us unintelligible to the person whose whole workflow is checking. The move is to accept the pain and relocate the solution:

> *"We work one step earlier. Instead of drawing it and finding out, you get the envelope the rules actually permit on this plot — cited to the circular — and the drawing is inside it from the start. The deviation report is a problem you stop having."*

That sentence acknowledges their world, sells ours, and never claims an approval outcome.

**Cross-reference R2:** this is precisely how the self-certifying architect is sold. Their pain is checking-shaped — *don't let me sign something wrong* — and we answer it with generation: signature safety through a legal-by-construction envelope, not a second opinion on a finished drawing. Same engine, same output, different pain in the pitch.

## 7. What this rule does *not* do

**It is a positioning rule, not a product restriction.** It does not forbid building a feature that measures a supplied drawing against a computed envelope — `Stage1Spec` §9.5 already measures containment geometrically, so the capability is largely there. If such a feature is ever built, R6 governs how it is *described and sold* (a property of the envelope, not a compliance verdict on someone's work), not whether it may exist.

Conflating the two would be the wrong reading, and an expensive one — it would rule out a capability on the strength of a marketing rule.

## 8. What adoption costs

A copy pass over existing material — the thesis, the demo brief's narration, and any deck. No product surface changes. Cheapest of the sprint's six recommendations, and the one that compounds, because every future sentence written about the product inherits it.
