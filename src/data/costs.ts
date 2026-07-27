// ---------------------------------------------------------------------------
// UrbanOS MVP — market cost & price data (2026, demo-grade).
// Construction costs are ₹/sqft of BUILT-UP area; sale prices are ₹/sqft of
// SALEABLE area. Benchmarks loosely track CPWD plinth-area rates + published
// 2025-26 broker/consultant averages (ANAROCK/Knight Frank style), rounded
// and flattened for the demo. Micro-market variation is deliberately ignored
// (city averages; real zone-to-zone spreads run ±50%).
// ---------------------------------------------------------------------------
import type { Jurisdiction, MarketData } from '../types'

export const MARKETS: MarketData[] = [
  {
    jurisdiction: 'gurugram',
    constructionCostPerSqft: {
      house: 2200,
      'group-housing': 2800, // high-rise RCC + club/amenity load, NCR 2026
      'mixed-use': 3200,
      commercial: 3600, // Grade-A office/retail core & shell + services
      township: 2300,
    },
    salePricePerSqft: {
      house: 10500, // plotted/floors in newer sectors (demo average)
      'group-housing': 13500, // Golf Course Ext./Dwarka Expressway 2026 average
      'mixed-use': 15000,
      commercial: 20000, // ~1.5x residential (retail high street pulls this up)
      township: 8500, // plotted township realization, outer sectors
    },
    landDevCostPerAcreCr: 3.0, // internal roads, services & site dev per acre
    landPricePerAcreCr: 55, // Dwarka Expressway corridor licensed land, 2026 demo benchmark
    approvalCostPctOfConstruction: 0.1, // EDC/IDC + licence fees are steep in Haryana
    priceGrowthPct: 7.5, // Dwarka Expressway corridor momentum
  },
  {
    // Gurugram Sectors 99-113. Construction cost tracks Gurugram; pricing is
    // corridor-specific (new launches priced above the Gurugram average since
    // the expressway opened, with heavy supply keeping plotted rates in check).
    jurisdiction: 'dwarka-expressway',
    constructionCostPerSqft: {
      house: 2200,
      'group-housing': 2900, // premium high-rise spec is the corridor default
      'mixed-use': 3250,
      commercial: 3600,
      township: 2300,
    },
    salePricePerSqft: {
      house: 11000,
      'group-housing': 14500, // 2026 corridor average across sectors 99-113
      'mixed-use': 16000,
      commercial: 21000,
      township: 8500,
    },
    landDevCostPerAcreCr: 3.0,
    landPricePerAcreCr: 55, // licensed land on the corridor, 2026 demo benchmark
    approvalCostPctOfConstruction: 0.1, // EDC/IDC + DTCP licence fees
    priceGrowthPct: 8, // expressway completion is the live catalyst
  },
  {
    // DDA sub-city, south-west Delhi. Delhi-level pricing but below the
    // city average — Dwarka is comparatively well-supplied CGHS stock.
    jurisdiction: 'dwarka',
    constructionCostPerSqft: {
      house: 2400,
      'group-housing': 2950,
      'mixed-use': 3350,
      commercial: 3850,
      township: 2500,
    },
    salePricePerSqft: {
      house: 14000,
      'group-housing': 15500, // Dwarka sector average, below Delhi's 19,500
      'mixed-use': 18000,
      commercial: 24000, // Sector 10 district centre pulls this up
      township: 12000,
    },
    landDevCostPerAcreCr: 3.6,
    landPricePerAcreCr: 75, // DDA allotment/resale demo benchmark, below core Delhi
    approvalCostPctOfConstruction: 0.12, // DDA + fire + the AAI NOC path
    priceGrowthPct: 6, // metro + expressway connectivity, mature supply
  },
  {
    jurisdiction: 'delhi',
    constructionCostPerSqft: {
      house: 2400,
      'group-housing': 3000,
      'mixed-use': 3400,
      commercial: 3900,
      township: 2500,
    },
    salePricePerSqft: {
      house: 17000, // builder-floor dominated market, demo average
      'group-housing': 19500, // scarce new supply keeps Delhi at NCR's top
      'mixed-use': 22000,
      commercial: 28000, // ~1.4x residential (Delhi retail/office premium)
      township: 13000, // land-pooling zone plotted proxy
    },
    landDevCostPerAcreCr: 4.0, // costliest land servicing in the set
    landPricePerAcreCr: 90, // scarce Delhi land; city-average demo benchmark
    approvalCostPctOfConstruction: 0.12, // multi-agency approvals (DDA/MCD/fire/AAI)
    priceGrowthPct: 5, // mature market, slower appreciation
  },
  {
    jurisdiction: 'noida',
    constructionCostPerSqft: {
      house: 2000,
      'group-housing': 2600,
      'mixed-use': 3000,
      commercial: 3300,
      township: 2100,
    },
    salePricePerSqft: {
      house: 8000,
      'group-housing': 10500, // expressway sector 2026 average
      'mixed-use': 12000,
      commercial: 16000, // ~1.5x residential
      township: 6500, // Greater Noida-side plotted proxy
    },
    landDevCostPerAcreCr: 2.2,
    landPricePerAcreCr: 30, // expressway-sector allotment/auction demo benchmark
    approvalCostPctOfConstruction: 0.08, // single-window Noida Authority regime
    priceGrowthPct: 6.5, // Jewar airport catalyst
  },
  {
    jurisdiction: 'bengaluru',
    constructionCostPerSqft: {
      house: 2100,
      'group-housing': 2700,
      'mixed-use': 3100,
      commercial: 3500,
      township: 2200,
    },
    salePricePerSqft: {
      house: 9500,
      'group-housing': 11500, // ORR/North Bengaluru 2026 average
      'mixed-use': 13500,
      commercial: 17500, // ~1.5x residential (office-led demand)
      township: 7500,
    },
    landDevCostPerAcreCr: 2.5,
    landPricePerAcreCr: 40, // ORR/North Bengaluru corridor demo benchmark
    approvalCostPctOfConstruction: 0.09, // BBMP/BDA plan sanction + betterment charges
    priceGrowthPct: 7, // tech-employment-driven demand
  },
]

/** Look market data up by id rather than array position, so inserting a new
 * market mid-array can never silently re-point an existing one. */
function byId(id: Jurisdiction): MarketData {
  const m = MARKETS.find((x) => x.jurisdiction === id)
  if (!m) throw new Error(`No market data defined for jurisdiction "${id}"`)
  return m
}

// Record<Jurisdiction, …> makes a forgotten jurisdiction a compile error.
const BY_ID: Record<Jurisdiction, MarketData> = {
  gurugram: byId('gurugram'),
  'dwarka-expressway': byId('dwarka-expressway'),
  dwarka: byId('dwarka'),
  delhi: byId('delhi'),
  noida: byId('noida'),
  bengaluru: byId('bengaluru'),
}

export function getMarket(j: Jurisdiction): MarketData {
  return BY_ID[j]
}
