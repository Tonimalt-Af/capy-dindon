import { CHALLENGES, type ChallengeId, type QualityChoice, type SaveData, type Settings, type TextSpeed } from './types';

export const SAVE_KEY = 'capydindon.save.v1';

export interface Kv {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export const DEFAULT_SETTINGS: Settings = {
  music: 0.75,
  sfx: 0.85,
  muted: false,
  quality: 'auto',
  reducedMotion: false,
  textSpeed: 'normal',
  subtitles: true,
};

export function defaultSave(): SaveData {
  return {
    version: 1,
    introSeen: false,
    stage: 0,
    challenges: { glands: false, pantry: false, parade: false },
    paradeBest: 0,
    settings: { ...DEFAULT_SETTINGS },
  };
}

export function hasProgress(save: SaveData): boolean {
  return save.introSeen || save.stage > 0 || CHALLENGES.some((id) => save.challenges[id]);
}

function clamp(value: unknown, fallback: number, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

function pick<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
}

const QUALITIES: readonly QualityChoice[] = ['auto', 'low', 'medium', 'high'];
const SPEEDS: readonly TextSpeed[] = ['slow', 'normal', 'fast'];

export function sanitizeSave(raw: unknown): SaveData | null {
  if (!raw || typeof raw !== 'object') return null;
  const data = raw as Partial<SaveData>;
  if (data.version !== 1) return null;
  const base = defaultSave();
  const challenges = data.challenges ?? base.challenges;
  const settings = (data.settings ?? {}) as Partial<Settings>;
  return {
    version: 1,
    introSeen: Boolean(data.introSeen),
    stage: data.stage === 1 ? 1 : 0,
    challenges: {
      glands: Boolean(challenges.glands),
      pantry: Boolean(challenges.pantry),
      parade: Boolean(challenges.parade),
    },
    paradeBest: Math.round(clamp(data.paradeBest, 0, 0, 999)),
    settings: {
      music: clamp(settings.music, DEFAULT_SETTINGS.music, 0, 1),
      sfx: clamp(settings.sfx, DEFAULT_SETTINGS.sfx, 0, 1),
      muted: Boolean(settings.muted),
      quality: pick(settings.quality, QUALITIES, 'auto'),
      reducedMotion: Boolean(settings.reducedMotion),
      textSpeed: pick(settings.textSpeed, SPEEDS, 'normal'),
      subtitles: settings.subtitles === undefined ? true : Boolean(settings.subtitles),
    },
  };
}

export function loadSave(kv: Kv): { data: SaveData; fresh: boolean } {
  const raw = kv.getItem(SAVE_KEY);
  if (!raw) return { data: defaultSave(), fresh: true };
  try {
    const parsed = sanitizeSave(JSON.parse(raw) as unknown);
    if (!parsed) return { data: defaultSave(), fresh: true };
    return { data: parsed, fresh: false };
  } catch {
    return { data: defaultSave(), fresh: true };
  }
}

export function writeSave(kv: Kv, data: SaveData): void {
  kv.setItem(SAVE_KEY, JSON.stringify(data));
}

export function completeChallenge(data: SaveData, id: ChallengeId, paradeScore = 0): SaveData {
  return {
    ...data,
    challenges: { ...data.challenges, [id]: true },
    paradeBest: id === 'parade' ? Math.max(data.paradeBest, paradeScore) : data.paradeBest,
  };
}
