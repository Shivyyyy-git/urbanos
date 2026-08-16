import type { DemoSiteFixture } from '../fixture.ts'

// Community One: 225 m x 180 m = 40,500 m² ≈ 10.008 acres. Declared exactly
// here so "~10 acres" is never a floating approximation inside the engine.
export const communityOneSite: DemoSiteFixture = {
  name: 'Community One',
  label: 'DEMO — imaginary site',
  widthM: 225,
  depthM: 180,
  northBearingDeg: 0,
  accessRoad: { edge: 'south', widthM: 24 },
  requestedDwellingUnits: 500,
}
