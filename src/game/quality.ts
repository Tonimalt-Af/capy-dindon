import type { QualityChoice } from './logic/types';

export type Tier = 'low' | 'medium' | 'high';

export interface Profile {
  tier: Tier;
  dpr: number;
  shadowSize: number;
  bloom: boolean;
  bloomStrength: number;
}

export function detectTier(): Tier {
  const nav = navigator as Navigator & { deviceMemory?: number };
  const memory = nav.deviceMemory ?? 8;
  const cores = navigator.hardwareConcurrency ?? 8;
  const width = window.innerWidth;
  if (memory <= 2 || (cores <= 4 && width < 1000)) return 'low';
  if (width >= 1200 && memory >= 4) return 'high';
  return 'medium';
}

export function resolveTier(choice: QualityChoice): Tier {
  return choice === 'auto' ? detectTier() : choice;
}

export function profileFor(tier: Tier, devicePixelRatio = 1): Profile {
  const dpr = Math.max(1, devicePixelRatio);
  if (tier === 'low') {
    return { tier, dpr: Math.min(1, dpr), shadowSize: 512, bloom: false, bloomStrength: 0 };
  }
  if (tier === 'medium') {
    return { tier, dpr: Math.min(1.35, dpr), shadowSize: 1024, bloom: true, bloomStrength: 0.18 };
  }
  return { tier, dpr: Math.min(1.6, dpr), shadowSize: 1536, bloom: true, bloomStrength: 0.28 };
}
