// ---------------------------------------------------------------------------
// UrbanOS MVP — jurisdiction bylaw data.
// Simplified, DEMO-GRADE encodings of city building regulations. Values are
// directionally realistic for 2026 but flattened: real bylaws vary by plot
// size, zone, road width and scheme. Each city cites its source framework.
// ---------------------------------------------------------------------------
import type { BylawRules, Jurisdiction } from '../types'

export const JURISDICTIONS: BylawRules[] = [
  {
    id: 'gurugram',
    name: 'Gurugram',
    state: 'Haryana',
    authority: 'DTCP Haryana / GMDA',
    // Haryana Building Code 2017 (base + purchasable FAR, simplified).
    maxFar: {
      house: 2.0, // HBC 2017: plotted residential base 1.32–1.98 incl. purchasable
      'group-housing': 2.75, // HBC 2017: base 1.75 + purchasable up to ~2.75
      'mixed-use': 3.0, // TOD-influence corridors permit higher composite FAR
      commercial: 3.0,
      township: 1.5, // net FAR across a plotted township is low
    },
    maxGroundCoveragePct: {
      house: 60, // HBC 2017: up to ~66% on small plots; demo cap 60
      'group-housing': 35,
      'mixed-use': 40,
      commercial: 45,
      township: 35,
    },
    maxHeightM: null, // Haryana removed blanket height caps; subject to AAI/fire NOC
    minGreenPct: 15, // organized open space norm for group housing schemes
    setbacks: { minFrontM: 6, minSideM: 3, minRearM: 3 },
    parkingEcsPer100Sqm: 1.5, // HBC 2017 parking schedule (demo-grade average)
    minRoadWidthForHighRiseM: 12, // HBC 2017: high-rise needs >= 12 m abutting road
    ewsPctRequired: 15, // Haryana AHP: 15% EWS in group housing
    notes: [
      'TOD zone within 800 m of metro corridors allows bonus FAR up to 3.5 (purchasable).',
      'AAI height NOC mandatory in the IGI Airport funnel zone (sectors along NH-48).',
      'Aravalli Natural Conservation Zone: construction largely barred; check plot overlay.',
      'EDC/IDC charges in Gurugram are among the highest in NCR — budget approvals early.',
    ],
  },
  {
    // Gurugram Sectors 99-113 flanking the 150 m Dwarka Expressway (NPR) ROW.
    // Same statutory regime as Gurugram (HBC 2017 / DTCP licensing) but the
    // corridor's own sector plan, road hierarchy and pricing differ enough to
    // warrant its own entry.
    id: 'dwarka-expressway',
    name: 'Dwarka Expressway',
    state: 'Haryana',
    authority: 'DTCP Haryana / GMDA (HBC 2017, Gurugram-Manesar Plan 2031)',
    maxFar: {
      house: 2.0, // HBC 2017 plotted residential incl. purchasable
      'group-housing': 2.75, // base 1.75 + purchasable, the corridor norm
      'mixed-use': 3.0, // sector commercial / TOD-influence pockets
      commercial: 3.0,
      township: 1.5,
    },
    maxGroundCoveragePct: {
      house: 60,
      'group-housing': 35,
      'mixed-use': 40,
      commercial: 45,
      township: 35,
    },
    maxHeightM: null, // no blanket cap in Haryana; AAI funnel + fire NOC govern
    minGreenPct: 15, // organized open space in licensed group-housing colonies
    setbacks: { minFrontM: 6, minSideM: 3, minRearM: 3 },
    parkingEcsPer100Sqm: 1.5, // HBC 2017 parking schedule (demo-grade average)
    minRoadWidthForHighRiseM: 12, // HBC 2017 high-rise threshold
    ewsPctRequired: 15, // Haryana AHP: 15% EWS in licensed group housing
    notes: [
      'Sectors 99-113 are licensed colony land under DTCP — a valid licence, not just ownership, gates development.',
      'The 150 m expressway ROW itself is a controlled zone; direct plot access is via sector roads, not the main carriageway.',
      'Sectors nearest the Delhi border fall in the IGI approach funnel — AAI height NOC governs before any FAR cap bites.',
      'EDC/IDC on this corridor is among the steepest in Haryana — load approval cost into the budget early.',
    ],
  },
  {
    // DDA-planned sub-city in south-west Delhi. Distinct from Dwarka
    // Expressway: different state, authority, master plan and height regime.
    id: 'dwarka',
    name: 'Dwarka Sub-City',
    state: 'NCT of Delhi',
    authority: 'DDA (MPD-2021, UBBL 2016 — Dwarka Sub-City zonal plan)',
    maxFar: {
      house: 3.0, // MPD-2021 residential plot FAR (smaller plots go higher)
      'group-housing': 2.0, // MPD-2021 group housing FAR 200 — the CGHS norm here
      'mixed-use': 2.5, // notified mixed-use streets only
      commercial: 2.4, // Sector 10 district centre / local commercial
      township: 1.5, // notional — Dwarka is already a planned sub-city
    },
    maxGroundCoveragePct: {
      house: 65,
      'group-housing': 33, // MPD-2021: 33.3%
      'mixed-use': 40,
      commercial: 40,
      township: 35,
    },
    // Dwarka sits inside the IGI approach funnel — AAI, not the bylaw, is the
    // binding height constraint. ~30 m ≈ the G+9 CGHS pattern across sectors.
    maxHeightM: 30,
    minGreenPct: 15,
    setbacks: { minFrontM: 6, minSideM: 3, minRearM: 3 },
    parkingEcsPer100Sqm: 2.0, // MPD-2021: 2 ECS per 100 sqm built-up
    minRoadWidthForHighRiseM: 18, // UBBL 2016 fire-access norms (demo-grade)
    ewsPctRequired: 15, // MPD-2021: 15% of FAR reserved for EWS
    notes: [
      'AAI height NOC is the real constraint — Dwarka lies under the IGI approach funnel, so permissible height is often well below the FAR-implied envelope.',
      'Sector land use is fixed by the DDA zonal plan; deviation needs a formal change of land use, not a local sanction.',
      'Most residential stock is CGHS (co-operative group housing) on DDA-allotted plots — allotment terms bind alongside the bye-laws.',
      'MPD-2041 (draft) revises FAR and mixed-use norms; this ruleset encodes MPD-2021, which is what is currently enforced.',
    ],
  },
  {
    id: 'delhi',
    name: 'Delhi',
    state: 'NCT of Delhi',
    authority: 'DDA / MCD (UBBL 2016, MPD-2021)',
    maxFar: {
      house: 3.0, // MPD-2021: small residential plots get FAR up to 3.5; demo 3.0
      'group-housing': 2.0, // MPD-2021 group housing FAR 200
      'mixed-use': 2.5, // mixed-use streets per MPD-2021 mixed-use regulations
      commercial: 2.4, // commercial centres FAR 150–250 (demo mid-high)
      township: 1.5, // greenfield township proxy (rare within NCT)
    },
    maxGroundCoveragePct: {
      house: 65, // UBBL 2016: small plots up to 75–90%; demo cap 65
      'group-housing': 33, // MPD-2021: 33.3% for group housing
      'mixed-use': 40,
      commercial: 40,
      township: 35,
    },
    maxHeightM: 37.5, // demo-grade cap: MPD/AAI funnel keeps most of Delhi below ~37.5 m
    minGreenPct: 15,
    setbacks: { minFrontM: 6, minSideM: 3, minRearM: 3 },
    parkingEcsPer100Sqm: 2.0, // MPD-2021: 2 ECS per 100 sqm built-up
    minRoadWidthForHighRiseM: 18, // UBBL 2016 fire access norms (demo-grade)
    ewsPctRequired: 15, // MPD-2021: 15% of FAR reserved for EWS in group housing
    notes: [
      'Lutyens Bungalow Zone and heritage precincts carry severe height and FAR restrictions.',
      'AAI NOC required near IGI Airport; effective heights well below 37.5 m in the funnel.',
      'TOD nodes under MPD allow higher FAR via amalgamation — not modelled in this demo.',
      'Ridge and Yamuna floodplain (O-Zone) are no-construction zones per NGT orders.',
    ],
  },
  {
    id: 'noida',
    name: 'Noida',
    state: 'Uttar Pradesh',
    authority: 'Noida Authority (Building Regulations 2010, as amended)',
    maxFar: {
      house: 1.8, // Noida BR: plotted residential FAR ~1.75–2.0
      'group-housing': 2.75, // base 2.75; purchasable up to 3.5 near corridors
      'mixed-use': 3.0,
      commercial: 3.2, // commercial sectors permit high FAR (demo-grade)
      township: 1.6,
    },
    maxGroundCoveragePct: {
      house: 60,
      'group-housing': 35,
      'mixed-use': 40,
      commercial: 40,
      township: 35,
    },
    maxHeightM: null, // no blanket cap; subject to AAI (Jewar/IGI) and fire NOC
    minGreenPct: 12,
    setbacks: { minFrontM: 6, minSideM: 3, minRearM: 3 },
    parkingEcsPer100Sqm: 1.5, // Noida BR parking schedule (demo-grade average)
    minRoadWidthForHighRiseM: 18, // wide sector roads are the norm; demo threshold
    ewsPctRequired: 10, // UP group-housing EWS/LIG obligation (demo-grade)
    notes: [
      'Purchasable FAR (+0.5) available along metro/TOD corridors on payment of charges.',
      'Height NOC from AAI needed under the Jewar (Noida International Airport) funnel.',
      'NGT/CAQM dust-control orders halt construction during severe AQI episodes (winter).',
      'Structural audit and fire NOC mandatory for towers above 15 floors post-2022 rules.',
    ],
  },
  {
    id: 'bengaluru',
    name: 'Bengaluru',
    state: 'Karnataka',
    authority: 'BBMP / BDA (Zoning Regulations RMP-2015)',
    maxFar: {
      house: 1.75, // RMP-2015: FAR tied to plot size & road width; demo mid value
      'group-housing': 2.5, // up to 3.25 on 24 m+ roads; demo mid value
      'mixed-use': 3.0,
      commercial: 3.25, // RMP-2015 max on widest roads
      township: 1.6,
    },
    maxGroundCoveragePct: {
      house: 65,
      'group-housing': 40,
      'mixed-use': 45,
      commercial: 45,
      township: 35,
    },
    maxHeightM: null, // no blanket cap; HAL/KIA airspace and fire NOCs govern
    minGreenPct: 10, // BBMP bylaws park/open-space norm (demo-grade)
    setbacks: { minFrontM: 5, minSideM: 3, minRearM: 3 },
    parkingEcsPer100Sqm: 1.75, // BBMP bylaws parking schedule (demo-grade average)
    minRoadWidthForHighRiseM: 24, // RMP-2015 ties tall buildings/high FAR to 24 m roads
    ewsPctRequired: 10, // Karnataka affordable housing obligation (demo-grade)
    notes: [
      'FAR is road-width linked under RMP-2015 — a 24 m+ abutting road unlocks the top slab.',
      'AAI height NOC needed in HAL and Kempegowda airport funnels (east/north Bengaluru).',
      'NGT lake buffer: no construction within 75 m of lakes and 50 m of primary rajakaluves.',
      'TDR from road-widening cessions can add FAR — not modelled in this demo.',
    ],
  },
]

/** Look a ruleset up by id rather than array position, so inserting a new
 * jurisdiction mid-array can never silently re-point an existing one. */
function byId(id: Jurisdiction): BylawRules {
  const r = JURISDICTIONS.find((x) => x.id === id)
  if (!r) throw new Error(`No bylaw rules defined for jurisdiction "${id}"`)
  return r
}

// Record<Jurisdiction, …> makes a forgotten jurisdiction a compile error.
const BY_ID: Record<Jurisdiction, BylawRules> = {
  gurugram: byId('gurugram'),
  'dwarka-expressway': byId('dwarka-expressway'),
  dwarka: byId('dwarka'),
  delhi: byId('delhi'),
  noida: byId('noida'),
  bengaluru: byId('bengaluru'),
}

export function getRules(j: Jurisdiction): BylawRules {
  return BY_ID[j]
}
