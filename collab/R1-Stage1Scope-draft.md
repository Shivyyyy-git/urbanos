# R1 — Stage 1 plot-type scope under the S+4 suspension (decision draft)

**Owner:** Fable (draft) — **decision document, not a spec change.** `Stage1Spec.md` untouched.
**Status:** DRAFT v1 — 2026-08-16. Raised as **R1** in `collab/ResearchSprint-Stage1.md`. Pairs with **R3** (`collab/RuleSchema-Restraint-draft.md`).
**Decides:** what `Stage1Spec` §3 "One plot type" means now that the plot type is suspended.

---

## 1. The fact base

| | |
|---|---|
| **Known** | S+4 for plotted residential is stayed (HC interim order 2026-04-02, staying the 2024-07-02 order) and fresh approvals are suspended (DTCP memo 2026-07-21, HOBPAS submissions disabled, "until further orders"). Already-sanctioned plans are not addressed by the memo. |
| **Not known — and load-bearing** | **What IS sanctionable today for Gurgaon plotted residential.** The pre-S+4 regime exists, but its current parameters are [TO-LOAD] and cannot be typed from memory or from press reporting. This is the hinge of the whole decision. |
| **Reasonable read, not fact** | The memo's stated reason includes self-certification modalities "under finalisation" — which reads like the State intends to reopen with a new process rather than to kill the policy. **[inferred — do not plan on it.]** |

## 2. A dependency asymmetry, and why it does *not* decide this

Routes B and C need Mannu to specify the currently-sanctionable regime. Route A needs nothing new. That looks like an argument for A on speed.

It is not, for two reasons:
1. Mannu is **already** on the hook for D1/M-S1 — the slice and its circular set. The sanctionable regime is the same collection trip, not an extra one. The marginal cost of B/C over A is close to zero in calendar terms.
2. Route A has a defect that only surfaced when I drafted it. See §3.

## 3. Route A — hold the plot type, reframe around the negative verdict

**What v1 does:** keeps §3 as written (residential plotted, builder-floor, stilt+N), computes the S+4 envelope, and — under R3's `rule-validity` scope — prints it as suspended with no assertion of buildability. The product's answer becomes *"S+4 is stayed; this is not currently sanctionable."*

**The case for it:** it is true, it is useful, and the thesis already argues negative verdicts are worth as much as positive ones — a builder about to buy a plot on S+4 economics genuinely needs this. `Stage1Spec` §9.8 already specifies the machinery ("complete cited *not buildable* report, not an error").

**The defect — and I raised this route, so I'll be the one to shoot it.** If every run terminates at "restrained", then **build steps B and C are never exercised on real data.** The envelope calculator computes numbers nobody may rely on; the layout sheet draws an envelope nobody may build. The five free pilots exist to exercise Stages 1–2 and to teach us where the pipeline breaks — five pilots that all return the same one-line "stayed" verdict teach us nothing about the engine, the rulebook loading, or the drawing pipeline. **A v1 whose headline is always "no" cannot test itself.**

Route A is a correct *sentence*. It is not a testable *product*. When I floated it in the research doc I was weighing its honesty, not its pilot value; drafted out, it does not survive.

**Verdict: reject as the primary route.** Keep its output shape — we will still need it whenever a slot is genuinely restrained.

## 4. Route B — shift v1 to the currently-sanctionable regime

**What v1 does:** §3's plot type becomes residential plotted under whatever is approvable today. The engine computes an actionable envelope; the drawing is of something a builder can actually pursue.

**Spec delta:** §3's parenthetical "(the stilt+N scenario)" is replaced by the sanctionable regime, named from Mannu's sources. Everything else in the spec stands — inputs, slots, outputs, stamp, acceptance criteria are all regime-agnostic by design.

**Cost:** one line of spec, plus the rule values, which we needed regardless.

**Risk, and why it is smaller than it looks:** if the stay is vacated and S+4 returns, have we built for the wrong regime? **No — that is a data load, not a rebuild.** Swapping rule sets without touching the engine is the moat's central claim and the townhouse demo's marquee moment (the A→B→A swap Sol gated in ledger 034). If a returning S+4 forced a rebuild, the moat claim was never true. So this risk is either negligible or it is a much bigger problem than R1.

**What it gives up:** the builder holding a plot bought on S+4 economics gets an actionable answer but no account of what changed. That is the gap Route C closes.

## 5. Route C — compute the sanctionable envelope, print the suspended one beside it

**What v1 does:** Route B, plus a second envelope computed against the stayed S+4 rule set, printed as a marked comparison with its restraining instruments cited.

**Why this is the commercially live one.** The real question in a Gurgaon plot builder's head today is not "what can I build" in the abstract. It is *"I bought this for S+4 economics — what have I got now?"* Route C answers exactly that, with citations, in a document nobody else in the market produces. It is also the single best demonstration of the Restraint object: the report visibly does something TestFit, Forma, Giraffe and qbiq structurally cannot, because they treat zoning as a user-entered parameter with no notion of a rule being stayed.

**Marginal cost over B is small, and specifically so.** The engine computes an envelope from a rule set; running it twice against two rule sets is *the same operation*. That is precisely what the demo's A→B→A swap already proves works. The real added work is presentation and guardrails, not engine.

**The risk is real: anchoring.** A builder sees the bigger S+4 number and plans on it. Two mitigations, both specifiable:
- **The actionability block (R3 E2)** carries `sanctionable-today: no` with the instrument cited, beside the stamp.
- **Hard guardrail — the suspended envelope is historical record, never a forecast.** No timeline, no likelihood, no "when the stay lifts", no "expected to resume". We print what the rule said and what restrains it, both cited, and we stop. Predicting a court or a department is exactly the "informs, never approves" line from the thesis boundary rule, and crossing it is the one failure mode that would make this feature a liability instead of a differentiator.

## 6. Route E — wait for the stay to resolve

Named because someone should, and it deserves better than a strawman. The honest version is: if the plot market is frozen, why build for it now?

**Rejected, on the thesis's own logic.** "Until further orders" has no date and the matter is under judicial review — this could be weeks or quarters. More decisively: **rule volatility is the moat's justification.** The versioned rulebook exists precisely because Haryana's plotted-colony rules changed direction repeatedly in 2023–24; the pitch line is that the dataset cannot be Googled *because it moves*. Waiting for regulatory stability before building is the one move that contradicts the reason the company exists. The first live restraint in our history is a proof point, not a reason to pause.

## 7. The question underneath R1, which is bigger than R1

R1 is a scope decision. Under it sits a market question the scan cannot answer:

> **Is the Gurgaon plot-builder market actually transacting right now?**

`BusinessThesis` customer #1 is "buy plot → stilt+4 → sell floors → repeat", and the frequency claim was already labelled **[inferred — Mannu to confirm]**. If S+4 economics drove that cycle and fresh approvals are shut, the cycle may be paused — in which case no choice of §3 scope fixes it, because the customer is not currently buying.

Two readings, both plausible, and Mannu can settle it in one conversation:
- **Paused:** builders are sitting out until the stay resolves. Then customer #1's frequency is temporarily near zero, pilots are hard to source, and **customer #2 becomes the near-term wedge rather than a demo prop.**
- **Continuing:** plots still transact (land banking, already-sanctioned plans proceeding, construction under existing sanctions), and the appetite for "what can I do with this plot now" is *higher* than usual.

**A hedge already exists in the portfolio, unplanned.** The Townhouse Demo is group-housing/townhouse scale — a **different regulatory regime** from plotted residential, and so not touched by the S+4 stay. If the plot market is paused, Community One is not merely a VC prop; it is the live wedge. Worth knowing before that demo is treated as optional.

**Escalation:** this is a thesis-level question, not a Stage-1 question. Recommend it goes to the goal chat as its own item rather than riding on R1.

## 8. Sub-decision that falls out of Route C

**Two envelopes in the report — one drawing.** D3 ruled one reference footprint for v1. Drawing two full layouts would double the sheet work and quietly reverse that ruling. Recommendation: **the drawing is of the sanctionable envelope only**; the suspended envelope appears in the report as numbers, citations, and at most a dashed reference overlay on the same sheet. Keeps D3 intact and keeps the sheet honest about which envelope is real.

## 9. Recommendation

**Route C, sequenced so it degrades gracefully to Route B.**

Concretely, inside the existing A → B → C build order:

1. **B computes the sanctionable envelope and must pass on its own** — full acceptance criteria, no reference to S+4 anywhere in the calculator.
2. **The suspended-envelope comparison is a composition step layered on top**, gated behind B passing, consuming the same engine with a second rule set.
3. If time runs short, we ship Route B and lose nothing already built — the comparison is additive, not entangled.

This avoids the false choice. Route C is where the commercial value is; Route B is what makes it safe to attempt; the sequencing means we do not have to decide today which one we ship.

**Conditional on:** Mannu naming the currently-sanctionable regime (§10 Q1). If that regime turns out to be thin or itself contested, Route B is the automatic fallback and Route C waits.

## 10. What Mannu must answer for this to move

| # | Question | Why it blocks |
|---|---|---|
| Q1 | **What is sanctionable today for Gurgaon plotted residential** — which regime, which circulars, which slabs? | The hinge. Routes B and C are both undefined without it. |
| Q2 | Does the 2026-07-21 suspension still stand; has the HC stay been vacated or modified since? | Point-in-time read is 2026-08-16; this moves. |
| Q3 | **Are plot builders currently transacting in Gurgaon?** (§7) | Decides whether customer #1 is available for pilots at all. Thesis-level. |
| Q4 | For already-sanctioned S+4 plans, is construction proceeding? | Sets whether `occupation-use` restraint scope is live (R3 §5) and whether there is a second, distinct customer moment. |

## 11. Decision criteria — what would flip this

- **Stay vacated + approvals reopened before build B starts** → Route C collapses back into plain Route B with S+4 as the sanctionable regime. No rework; the comparison step simply has nothing to compare.
- **Sanctionable regime turns out to be contested or undocumented** → Route B, narrowed, and Route C deferred. Do not compute two envelopes when one of them is shaky.
- **Mannu reports the plot market is paused (§7)** → R1 stops being the important decision. Escalate the wedge question to the goal chat before spending build time on either route.
