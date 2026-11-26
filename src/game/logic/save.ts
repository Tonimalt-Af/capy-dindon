import { CHALLENGES, LEVEL_IDS, type ChallengeId, type Cup, type LevelId, type LevelRecord, type QualityChoice, type SaveData, type Settings, type TextSpeed, type WorldRecord } from './types';

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

const CUPS: readonly Cup[] = ['none', 'bronze', 'silver', 'gold'];
const CUP_RANK: Record<Cup, number> = { none: 0, bronze: 1, silver: 2, gold: 3 };

export function emptyLevel(): LevelRecord {
  return { acorns: [], babies: [], cup: 'none', bestTime: 0, done: false };
}

export function emptyWorlds(): { archipel: WorldRecord } {
  return { archipel: { glands: emptyLevel(), pantry: emptyLevel(), ruee: emptyLevel() } };
}

/** Bronze at half the glands, silver at three quarters, gold when the branch is bare. */
export function cupFor(count: number, total: number): Cup {
  if (total <= 0 || count <= 0) return 'none';
  const ratio = count / total;
  if (ratio >= 0.999) return 'gold';
  if (ratio >= 0.75) return 'silver';
  if (ratio >= 0.5) return 'bronze';
  return 'none';
}

export function defaultSave(): SaveData {
  return {
    version: 2,
    introSeen: false,
    stage: 0,
    challenges: { glands: false, pantry: false, parade: false },
    paradeBest: 0,
    settings: { ...DEFAULT_SETTINGS },
    worlds: emptyWorlds(),
  };
}

export function hasProgress(save: SaveData): boolean {
  const played = LEVEL_IDS.some((id) => {
    const level = save.worlds.archipel[id];
    return level.done || level.acorns.length > 0 || level.babies.length > 0;
  });
  return save.introSeen || save.stage > 0 || CHALLENGES.some((id) => save.challenges[id]) || played;
}

function clamp(value: unknown, fallback: number, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

function pick<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
}

function idList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const ids = value.filter((item): item is string => typeof item === 'string' && item.length > 0 && item.length < 24);
  return [...new Set(ids)].slice(0, 64);
}

function readLevel(value: unknown, done: boolean): LevelRecord {
  const raw = (value && typeof value === 'object' ? value : {}) as Partial<LevelRecord>;
  return {
    acorns: idList(raw.acorns),
    babies: idList(raw.babies),
    cup: pick(raw.cup, CUPS, 'none'),
    bestTime: clamp(raw.bestTime, 0, 0, 9999),
    done: Boolean(raw.done) || done,
  };
}

const QUALITIES: readonly QualityChoice[] = ['auto', 'low', 'medium', 'high'];
const SPEEDS: readonly TextSpeed[] = ['slow', 'normal', 'fast'];

export function sanitizeSave(raw: unknown): SaveData | null {
  if (!raw || typeof raw !== 'object') return null;
  const version = (raw as { version?: unknown }).version;
  if (version !== 1 && version !== 2) return null;
  const data = raw as Omit<Partial<SaveData>, 'version'> & { worlds?: { archipel?: Partial<WorldRecord> } };
  const base = defaultSave();
  const challenges = data.challenges ?? base.challenges;
  const settings = (data.settings ?? {}) as Partial<Settings>;
  const flags = {
    glands: Boolean(challenges.glands),
    pantry: Boolean(challenges.pantry),
    parade: Boolean(challenges.parade),
  };
  const archipel = version === 2 ? data.worlds?.archipel : undefined;
  return {
    version: 2,
    introSeen: Boolean(data.introSeen),
    stage: data.stage === 1 ? 1 : 0,
    challenges: flags,
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
    worlds: {
      archipel: {
        glands: readLevel(archipel?.glands, flags.glands),
        pantry: readLevel(archipel?.pantry, flags.pantry),
        ruee: readLevel(archipel?.ruee, false),
      },
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
  const archipel = { ...data.worlds.archipel };
  if (id === 'glands' || id === 'pantry') archipel[id] = { ...archipel[id], done: true };
  return {
    ...data,
    challenges: { ...data.challenges, [id]: true },
    paradeBest: id === 'parade' ? Math.max(data.paradeBest, paradeScore) : data.paradeBest,
    worlds: { archipel },
  };
}

export interface LevelProgress {
  acorns?: readonly string[];
  babies?: readonly string[];
  totalAcorns: number;
  time?: number;
  done?: boolean;
}

export function recordLevel(data: SaveData, id: LevelId, progress: LevelProgress): SaveData {
  const current = data.worlds.archipel[id];
  const acorns = idList([...(current.acorns ?? []), ...(progress.acorns ?? [])]);
  const babies = idList([...(current.babies ?? []), ...(progress.babies ?? [])]);
  const earned = cupFor(acorns.length, progress.totalAcorns);
  const cup = CUP_RANK[current.cup] >= CUP_RANK[earned] ? current.cup : earned;
  const done = current.done || Boolean(progress.done);
  const time = progress.time ?? 0;
  const bestTime = done && time > 0 ? (current.bestTime > 0 ? Math.min(current.bestTime, time) : time) : current.bestTime;
  return {
    ...data,
    worlds: {
      archipel: {
        ...data.worlds.archipel,
        [id]: { acorns, babies, cup, bestTime, done },
      },
    },
  };
}
