// THD-18 compile-only fixture: the DEMO actionability type must exclude a
// `sanctionable-today: yes` (or `no`) claim at compile time. This file is
// type-checked by `npm run typecheck` (and THD-18 runs tsc over the project);
// it contains no runtime test. If the type ever admits these literals, the
// expect-error directives below become unused and the typecheck fails,
// turning THD-18 red.

import type { DemoActionability } from '../src/index.ts'

// @ts-expect-error THD-18: a DEMO slice can never claim sanctionable-today: yes
const forgedYes: DemoActionability = { sanctionableToday: 'yes', reason: 'forged' }

// @ts-expect-error THD-18: nor can it truthfully claim a definite no
const forgedNo: DemoActionability = { sanctionableToday: 'no', reason: 'forged' }

const truthful: DemoActionability = {
  sanctionableToday: 'unknown',
  reason: 'the only constructible value',
}

export const __thd18TypeLockFixture = [forgedYes, forgedNo, truthful] as const
