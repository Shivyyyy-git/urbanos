# UrbanOS — Business Thesis v1.1

2026-08-15 · drafted by Fable, ratified in discovery with Shivam · next reader: Mannu.
v1.1: product section expanded to the confirmed five-stage flow; boundary rule added; Dubai entry requirement softened (tool posture).
Labels: **[decided]** = Shivam's call · **[locked]** = prior agreed rule · **[inferred]** = my reasoning, needs confirmation · **[unknown]** = open.

## One sentence

UrbanOS tells a builder what he can legally build on a piece of land — design, numbers, and every approval he'll need — then tracks the whole journey from intent to construction, backed by a versioned rulebook of local building law that cannot be Googled.

## The boundary rule **[decided — Shivam, 2026-08-15]**

**UrbanOS informs, designs, and tracks. People decide, sign, and submit.** The software never touches the government — finalization, signatures, and submission are ground work (the customer's team; Mannu's side). Every output carries one printed label — *"Prepared for Professional Review"* — meaning: from here, humans. We never say "approved." **[locked 2026-07-25; reframed as tool boundary 2026-08-15]**

## The product — five stages **[decided — Shivam, 2026-08-15]**

| # | Stage | Software does | Ground does |
|---|-------|---------------|-------------|
| 1 | **The Base** — design first | Reads the site, applies the rulebook as constraints, returns the full picture: layout, map, how many units legally fit, the numbers — beautifully presented. Client selects a design; every option is legal by construction. | Nothing yet |
| 2 | **Compliance Roadmap** | For the selected design on this site: the complete list of approvals/NOCs/licenses — what each is, why this project triggers it, which office, which documents, what order; paperwork prepped where possible. | Reads and plans |
| 3 | **Tracker** | The roadmap becomes a live project-management board: dependencies, what's next, full project state in one place. | The legwork; ticks updates ("fire NOC ✓") |
| 4 | **Finalize + Submit** | Holds the record only. **Fully human by design — "software not included."** | In-person pre-check, paperwork verification, submission |
| 5 | **Deep Planning** (post-approval) | The selected design planned deeply: detailed drawings, construction-ready package, construction debrief. Unit/interior detail (Feature 2's 2BHK module) lives here. | Prepares for construction |

Then construction begins — on-ground, Mannu's world. Construction-phase management is the destination vision, later.

**Build order [decided]:** Stage 1 + 2 first, aimed at the plot-scale builder. Then Stage 3. Stages 4–5 mature through the pilots.

## Who pays, in order **[decided — Shivam, 2026-08-15]**

1. **Plot-scale builder** — Gurgaon/Haryana builder-floor market: buy plot → stilt+4 → sell floors → repeat. Highest-frequency customer; returns every quarter. *(Frequency/volume claim is **[inferred]** — Mannu to confirm from ground knowledge.)*
2. **Townhouse / group-housing developer** — the "500 townhouses" client. Bigger package, higher price, lower frequency.
3. **Bigger fish** (large developers, government/city planning) — only after 1 and 2 work. Pitch-deck material until then.

## Where

Gurgaon/Haryana (+ Delhi region), one geography until won. DDA (Delhi) and DTCP (Haryana) are separate regulatory regimes — never merged. **[locked, 2026-07-25]**

## The moat

- **The rulebook — two shelves.** **Rules**: the numbers (setbacks, FAR, heights, coverage) — they feed the Stage-1 design engine as constraints. **Procedures**: the process (which approval, which office, which documents, what sequence, real timelines) — they feed Stages 2–3. Both built partly from circulars that exist only offline — Mannu physically collects them from government offices. That data cannot be scraped or bought. **[decided, 2026-08-15]**
- **The machine:** AI intake pipeline — photo/PDF in → rules extracted → Mannu confirms → versioned entry with source, issue date, collection date, authority. Mannu is user zero.
- **The flywheel:** every project tracked in Stage 3 quietly teaches the Procedures shelf the real timelines and office quirks. The tool gets smarter with each client.
- **The guardrail:** models are rented; the dataset is owned. No rule lives only inside model weights — every answer cites the database. That is what makes premium pricing and liability survivable. **[locked, 2026-08-15]**

## Money **[parked — Mannu owns pricing]**

~5 free pilot projects to learn and prove, then premium pricing. Each free pilot doubles as discovery: what would this have cost, how many weeks, who signs. Pricing itself is discussed in a dedicated session with Mannu's numbers, not here.

## Expansion logic

The engine is rulebook-swappable by design. **Dubai:** pitch demo now (prove the engine travels on its digitized rules); candidate market #2 after Gurgaon proof. As a tool — not a service — entry needs the Dubai rulebook loaded **plus a local expert to validate it**: data validation, not signing authority. Possibly earlier than a second Indian city because of data quality. **[inferred — decision later]**

Reference comp: qbiq.ai ($26M raised, JLL Spark) automates test fits inside approved buildings and deliberately avoids compliance. UrbanOS is a test fit **for land** — one layer up, in the layer they refused. **[inferred]**

## Open questions

1. Inside the plot ecosystem, who exactly pays — the builder directly, or the architect/liaison who runs many files a year? (qbiq sells to brokers, not tenants.) **[unknown]**
2. Who are the 5 free pilots, and what does each get? They should exercise Stages 1–2 at minimum. Suggest 3 plot builders + 2 townhouse-scale, all Gurgaon. **[unknown]**
3. Feature 2 (2BHK unit module) redline still pending with Mannu — it sets the quality bar for the Stage-5 drawing pipeline. **[pending since 2026-08-08]**
4. Current legal status of plotted-colony floor rules (stilt+4) — changed direction multiple times 2023–2024; verify before the first pilot. **[Mannu]**
