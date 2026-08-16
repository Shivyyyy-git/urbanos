# Rulebook schema — the Restraint object (R3 draft)

**Owner:** Fable (draft) — **proposal, not a spec change.** `Stage1Spec.md` is untouched; this file holds the exact edits to apply on Shivam's ruling.
**Status:** DRAFT v1 — 2026-08-16. Raised as **R3** in `collab/ResearchSprint-Stage1.md`; independently corroborated from the demo side by Sol in ledger 034.
**Blocks:** build-order step **A** (rulebook store). Retrofitting a first-class object with its own versioning *after* Mannu's circulars start loading is the expensive version of this conversation.

---

## 1. The gap, stated precisely

`Stage1Spec` §5 gives every rule a version chain: `supersedes / superseded-by (+effective date)`. That models **replacement**. It cannot model **restraint** — a rule that is on the books, unreplaced, and currently unusable.

The live instance (research sprint F1):

| Fact | Value |
|---|---|
| The rule | Haryana S+4 for plotted residential, per DTCP order dated **2024-07-02** |
| Superseded? | **No.** Nothing replaced it. |
| Judicial event | Punjab & Haryana HC **interim order 2026-04-02** restrained the State from proceeding; stayed the effect and operation of the 2024-07-02 order |
| Executive event | DTCP memorandum **2026-07-21** suspended **fresh approvals** across HSVP/HSIIDC/ULB; IT wing to disable S+4 submissions on HOBPAS; "until further orders" |
| Already-sanctioned plans | **Not addressed** by the memo |

Under today's schema the only way to express this is to invent a superseding "v2" that has no source document, then invent a "v3" to restore v1 if the stay is vacated. **That is a lie about the record**, and the record is the entire product.

## 2. Why this is a new object, not a field on `RuleEntry`

Four arguments, in descending order of force:

1. **The authority is a different authority.** `RuleEntry.authority` is DTCP. The stay issued from the High Court. A schema that forces a court order into a DTCP entry's fields misattributes the source — and source attribution is the moat's load-bearing wall.
2. **One instrument restrains many entries.** The S+4 stay touches height cap, storey cap, DU count, parking, stilt conditions — every slot the policy fed. As a field, one court order becomes N edits that can drift out of sync. As an object, it is one cited row.
3. **Restraint is reversible; supersession is monotone.** A stay can be vacated and the rule springs back **unchanged**. Version chains do not run backwards without fiction.
4. **It has its own lifecycle and its own verification.** A restraint is itself a cited document with an issue date, a collection date, a collector, and a verified/unverified state. It is a rulebook entry in its own right — it just isn't a *rule*.

## 3. Prerequisite: `source` must become a referenceable instrument

Today `RuleEntry.source` is "document ref + scan/photo, page" — effectively free text. But **what the court stayed was an instrument**, not our three rule rows. The truest targeting is: *the HC stayed order X → every rule entry derived from order X is restrained*, including entries loaded from that order next month.

**Proposed:** promote source to a first-class `SourceInstrument` with its own id; `RuleEntry.source` becomes `instrumentId + page/clause`. Small change now, and it makes restraint targeting fall out for free rather than needing a hand-maintained id list.

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
```

## 4. The `Restraint` object

```
Restraint {
  id
  kind                            — judicial-stay | executive-suspension | administrative-hold
  instrument                      — SourceInstrument id (the order/memo that restrains)
  targets {                       — at least one required; union of all three
    instrumentIds[]               — PRIMARY: restrains everything derived from these instruments
    entryIds[]                    — surgical: named rule entries
    predicate                     — slice + slot set (+ optional applicability filter)
  }
  scope                           — see §5; the sharp field
  carveOuts[]                     — what is explicitly NOT restrained, each cited
  effective from                  — when the restraint bites
  effective until                 — null = "until further orders" (open-ended, not unknown)
  lifecycle: active | vacated | lapsed | replaced   (+date +instrument id)
  verification: unverified | mannu-verified (+date)
}
```

**Naming.** `Restraint` tracks the HC's own language ("restrained from going ahead with the Stilt+4 Policy") and covers both judicial and executive forms. I avoided `Encumbrance` deliberately: in Indian property practice that word means a charge on *title*, and an Encumbrance Certificate is a document Mannu's builders already know — reusing it here would read as a claim about the plot rather than about the rule. Rename freely; the structure is the part that is expensive to change.

## 5. `scope` — the field that decides what we print

This is the distinction the S+4 evidence forces, and it is worth more than the rest of the object:

| scope | Meaning | Effect on our output |
|---|---|---|
| `fresh-sanction` | The counter is closed. The rule's numbers are not disputed; you simply cannot newly get this sanctioned. *(DTCP memo 2026-07-21)* | **Envelope still computes and is still correct.** We print it, and we print that it is not currently sanctionable. |
| `rule-validity` | The rule itself is stayed; its numbers may not be relied on as law. *(HC order 2026-04-02)* | Envelope prints **as a suspended envelope**, clearly marked. The headline verdict may not assert buildability from it. |
| `occupation-use` | Construction or occupation restrained, sanction untouched. | Envelope and sanction unaffected; disclosed as a downstream restriction. |

A single situation can carry **two restraints of different scope at once** — S+4 today carries both a `rule-validity` stay and a `fresh-sanction` suspension. The object is deliberately many-per-rule.

## 6. Engine consequences (without these, the schema is decoration)

**E1 — A restraint never changes a rule's value.** The envelope math runs on the values as loaded. A stay does not rewrite an arithmetic. Any implementation that mutates or hides values on restraint is wrong.

**E2 — A new output axis: actionability, separate from the stamp.** The report gains a computed block:

> `sanctionable-today: yes | no | unknown` — with the restraining instrument cited whenever it is not `yes`.

These are two orthogonal questions and conflating them would be a real error:
- **Stamp** = how good is *our data*? (§7, unchanged)
- **Actionability** = what is *the State's posture* today?

A fully `mannu-verified` rule set can be entirely non-actionable. That is not a data-quality failure and must not be reported as one.

**E3 — Absence of a restraint is not evidence of absence.** The engine cannot know about a court order nobody loaded. So the slice carries a **sweep date**:

```
slice.restraintSweptOn   — date + who swept
```

The report then prints a dated, attributable claim — *"no restraint on record for this slice as of <date>, swept by <who>"* — instead of a bare silence that a reader will mistake for "no restrictions." No sweep date on the slice ⇒ the report says so, in those words. This is the §5 fail-closed discipline applied to a second shelf.

## 7. Stamp logic — **no third stamp state**

`Stage1Spec` §7 says "No third state." **That holds, and I recommend defending it.** The stamp is the thesis boundary rule mechanised; a third state dilutes the one line that carries our liability posture.

Restraints touch §7 in exactly one way, and it needs no new rule — only a clarification that restraints *are* cited entries:

> Any cited entry `unverified` — **rule entry or restraint entry** — ⇒ "Research Draft — Not for Construction", forced.

Actionability (E2) prints **beside** the stamp, never inside it.

## 8. Exact edits to `Stage1Spec.md`, on ruling

| § | Edit |
|---|---|
| **§5** | Add `SourceInstrument` (§3 above); change `RuleEntry.source` to `instrumentId + page/clause`. Add the `Restraint` block (§4). Add to fail-closed paragraph: *"A slice with no `restraintSweptOn` date ⇒ output allowed, but the report states that no restraint sweep is on record. An `active` restraint of scope `rule-validity` on a required slot ⇒ envelope prints as suspended; the report may not assert buildability from restrained values."* |
| **§6.1** | Add to the Legal Envelope Report contents: *"**actionability block:** `sanctionable-today`, every active restraint with kind, scope, issuing authority, instrument reference, effective dates, and carve-outs; or the dated no-restraint-on-record statement."* Add restraints to the pinned rulebook version digest. |
| **§7** | Insert "rule entry or restraint entry" as in §7 above. Add: *"Actionability is a separate computed line and never alters the stamp."* |
| **§9** | Add acceptance criteria 11–15 (§9 below). |
| **§11** | Add **D5** — ratify the Restraint object (this file). |
| **§12** | Add **M-S6** — restraint sweep workflow: what Mannu must do to date a slice's sweep, and what he must see to mark a restraint `mannu-verified`. |

## 9. Proposed acceptance criteria (extending §9's ten)

11. **Restraint of scope `fresh-sanction` ⇒ every envelope number is byte-identical to the unrestrained run**, and `sanctionable-today: no` prints citing the instrument. *(Mutation: deleting the restraint must flip actionability to `yes` and must change no envelope number. This is the test that proves E1.)*
12. **Restraint of scope `rule-validity` ⇒ envelope renders suspended**; no headline asserts buildability from restrained values.
13. **Unverified restraint anywhere ⇒ stamp forced to Research Draft.** *(Mutation: flipping one restraint to unverified must flip the stamp — mirrors §9.4.)*
14. **Restraint targeting by `instrumentIds` ⇒ a rule entry loaded later from that same instrument is restrained on load**, with no edit to the restraint. *(This is the test that proves §3 was worth doing.)*
15. **Lifecycle `vacated` ⇒ the rule returns unchanged**, the vacating instrument is cited, and the pre-vacation report remains byte-reproducible against its pinned digest. *(No fictional version was created in either direction.)*

## 10. Cost, and why now

Roughly a day of spec work and a schema that is one object and one field wider. Deferring it costs: every circular Mannu loads before the freeze gets re-keyed to add `instrumentId`, and the first real restraint arrives as an emergency. **We already have a real restraint** — S+4 is not hypothetical, it is three and a half weeks old and sitting on Stage 1's only plot type.

Second-order benefit worth naming: restraint data is exactly the "rule-change watch" subscription the pricing session hypothesised (`MoneyV1.md`). The object that keeps our reports honest is the same object that would carry a recurring product. Not a reason to build it — but it means the work is not single-use.

## 11. Cross-workstream note (ledger 034)

Sol reached the same structural issue from the Townhouse Demo side and rejected two proposed simplifications — dropping applicability predicates, and collapsing verification to a single `demo-illustrative` member — on the grounds that *the demo cannot prove Mannu's production rules are a data swap if its engine-facing schema has already discarded production fields.* Same principle: **schemas that drop the awkward fields cannot later prove they were only ever holding data.**

Consequence for the demo: if actionability becomes an output axis, the demo package must be **type-incapable of printing `sanctionable-today: yes`** — the same discipline that locks its stamp. That is one more field on the demo's DEMO-slice, not a rebuild, and it is much cheaper before Fable writes v0 against Sol's frozen gate.

## 12. Open questions

| # | Question | Owner |
|---|---|---|
| Q1 | Does the 2026-07-21 suspension still stand, and has the HC stay been vacated or modified since? | **Mannu** |
| Q2 | For an already-sanctioned S+4 plan, what is the ground reality — construction proceeding, or halted? Decides whether `occupation-use` is a live scope or a placeholder. | **Mannu** |
| Q3 | Are there standing restraints on the D1 slice that predate this sprint? First real sweep. | **Mannu** |
| Q4 | Ratify `Restraint` (D5), the `SourceInstrument` promotion, and the no-third-stamp-state defence. | **Shivam** |
| Q5 | Name: `Restraint` vs `Suspension` vs something Mannu's ear prefers. Cosmetic, decide once. | Shivam / Mannu |
