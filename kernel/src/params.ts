import type { KernelParameters } from './contract.ts'

/**
 * Jurisdiction-neutral technical parameters. These are geometry tolerances,
 * not planning rules. A pilot may supply a different evidence-linked traverse
 * profile; no DDA/DTCP setback value is embedded here.
 */
export const DEFAULT_KERNEL_PARAMETERS: KernelParameters = {
  epsM: 0.001,
  closureProfiles: [{
    profileRef: 'total-station-1:10000',
    minRatioDenominator: 10_000,
    maxAbsoluteMisclosureM: 0.020,
    methodDescription:
      'Technical baseline for a professionally observed total-station traverse; replace with the pilot survey profile when supplied.',
    sourceRef: 'https://surveyofindia.gov.in/documents/soichapter-iv.pdf',
  }],
  areaTolerance: {
    floorSqm: 0.25,
    fractionOfStated: 0.001,
    useSourcePrecisionHalfStep: true,
  },
  sliver: {
    maxAspectRatio: 100,
    minEdgeSeparationM: 0.10,
  },
  defaultDisplayPrecisionM: 0.001,
  paperToleranceMm: 0.25,
  kernelVersion: 'urbanos-feature-1-kernel-1.0.0',
  specRevision: 'SitePlanBrief-v5-sol-export-1',
}
