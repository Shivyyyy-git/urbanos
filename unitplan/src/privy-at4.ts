// ---------------------------------------------------------------------------
// The canonical v0 brief: Spaze Privy AT4 (Sector 84, Gurgaon) 2BHK room
// schedule, transcribed from the brochure preserved at
// reference/mannu-2026-08-08/Spaze-Privy-AT4-brochure.pdf (page 2).
//
// The brochure's own disclaimer marks all dimensions as indicative; the
// brochure super area is 1465.0 sq ft, which includes an undisclosed
// common-area loading and therefore cannot validate this geometry.
// ---------------------------------------------------------------------------
import type { UnitPlanBrief } from './brief.ts'
import { fi } from './units.ts'

export function privyAt42BhkBrief(issueDate: string): UnitPlanBrief {
  return {
    projectName: 'UrbanOS Feature 2 - Unit Plan v0',
    unitLabel: '2BHK + STUDY (SCHEDULE: SPAZE PRIVY AT4)',
    source: {
      document: 'Spaze Privy AT4 brochure, 2BHK unit and cluster plan (super area 1465.0 sq ft)',
      note: 'brochure marks all dimensions indicative; schedule transcribed 2026-08-08',
    },
    rooms: [
      {
        id: 'master-bedroom',
        label: 'MASTER BEDROOM',
        use: 'habitable',
        clearWidth: fi(12, 0),
        clearDepth: fi(13, 4),
        rotated: false,
      },
      {
        id: 'toilet-master',
        label: 'TOILET',
        use: 'toilet',
        clearWidth: fi(6, 6),
        clearDepth: fi(7, 8),
        rotated: false,
      },
      {
        id: 'toilet-common',
        label: 'TOILET',
        use: 'toilet',
        clearWidth: fi(7, 6),
        clearDepth: fi(6, 0),
        rotated: true,
      },
      {
        id: 'bedroom-2',
        label: 'BEDROOM 2',
        use: 'habitable',
        clearWidth: fi(10, 9),
        clearDepth: fi(11, 6),
        rotated: false,
      },
      {
        id: 'study',
        label: 'STUDY',
        use: 'habitable',
        clearWidth: fi(7, 0),
        clearDepth: fi(10, 9),
        rotated: false,
      },
      {
        id: 'dwg-dining',
        label: 'DRAWING / DINING',
        use: 'habitable',
        clearWidth: fi(19, 0),
        clearDepth: fi(13, 4),
        rotated: false,
      },
      {
        id: 'lobby',
        label: 'ENT. LOBBY',
        use: 'circulation',
        clearWidth: fi(7, 3),
        clearDepth: fi(5, 2),
        rotated: false,
      },
      {
        id: 'kitchen',
        label: 'KITCHEN',
        use: 'kitchen',
        clearWidth: fi(11, 0),
        clearDepth: fi(7, 5),
        rotated: false,
      },
    ],
    doors: [
      { id: 'entry', fromRoomId: 'EXTERIOR', toRoomId: 'lobby', width: fi(3, 6) },
      { id: 'lobby-dwg', fromRoomId: 'lobby', toRoomId: 'dwg-dining', width: fi(3, 0) },
      { id: 'lobby-corridor', fromRoomId: 'lobby', toRoomId: 'corridor', width: fi(3, 0) },
      { id: 'dwg-study', fromRoomId: 'dwg-dining', toRoomId: 'study', width: fi(2, 6) },
      { id: 'dwg-kitchen', fromRoomId: 'dwg-dining', toRoomId: 'kitchen', width: fi(3, 0) },
      { id: 'dwg-corridor', fromRoomId: 'dwg-dining', toRoomId: 'corridor', width: fi(3, 6) },
      { id: 'corridor-toilet-common', fromRoomId: 'corridor', toRoomId: 'toilet-common', width: fi(2, 6) },
      { id: 'corridor-master', fromRoomId: 'corridor', toRoomId: 'master-bedroom', width: fi(3, 0) },
      { id: 'master-toilet', fromRoomId: 'master-bedroom', toRoomId: 'toilet-master', width: fi(2, 6) },
      { id: 'corridor-br2', fromRoomId: 'corridor', toRoomId: 'bedroom-2', width: fi(3, 0) },
      { id: 'dwg-balcony', fromRoomId: 'dwg-dining', toRoomId: 'balcony-living', width: fi(6, 0) },
      { id: 'master-balcony', fromRoomId: 'master-bedroom', toRoomId: 'balcony-master', width: fi(6, 0) },
      { id: 'br2-balcony', fromRoomId: 'bedroom-2', toRoomId: 'balcony-br2', width: fi(6, 0) },
    ],
    balconies: [
      {
        id: 'balcony-living',
        label: "6'-0\" WIDE BALCONY",
        attachedToRoomId: 'dwg-dining',
        projection: fi(6, 0),
      },
      {
        id: 'balcony-master',
        label: "6'-0\" WIDE BALCONY",
        attachedToRoomId: 'master-bedroom',
        projection: fi(6, 0),
      },
      {
        id: 'balcony-br2',
        label: "6'-0\" WIDE BALCONY",
        attachedToRoomId: 'bedroom-2',
        projection: fi(6, 0),
      },
    ],
    walls: {
      externalMm: 230,
      internalMm: 115,
      provenance: {
        kind: 'assumption',
        pendingRef: 'M-U4',
        note: 'Standard brick-wall convention assumed until Mannu confirms Gurgaon group-housing practice.',
      },
    },
    template: {
      corridorWidth: fi(3, 6),
      shaftWidth: fi(1, 0),
      provenance: {
        kind: 'assumption',
        pendingRef: 'M-U2',
        note: 'Circulation and shaft sizes are not in the brochure schedule; assumed pending the rulebook.',
      },
    },
    requestedStatus: 'research-draft',
    sheet: { ref: 'A2 landscape', widthMm: 594, heightMm: 420, scaleDenominator: 50 },
    issueDate,
  }
}
