import type { DemoSiteFixture } from '../fixture.ts'

// Community One: 460 m x 440 m = 202,400 m² ≈ 50.01 acres. Resized per
// Shivam's ruling (ledger 049): the site is imaginary, so it is sized for the
// story — all 500 requested townhouses place fully, with room for the
// boulevard, central park, and perimeter greens. Declared exactly here so
// "~50 acres" is never a floating approximation inside the engine.
export const communityOneSite: DemoSiteFixture = {
  name: 'Community One',
  label: 'DEMO — imaginary site',
  widthM: 460,
  depthM: 440,
  northBearingDeg: 0,
  accessRoad: { edge: 'south', widthM: 30 },
  requestedDwellingUnits: 500,
}
