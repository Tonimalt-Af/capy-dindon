export const CHALLENGES = ['glands', 'pantry', 'parade'] as const;
export type ChallengeId = (typeof CHALLENGES)[number];

export const LEVEL_IDS = ['glands', 'pantry', 'ruee'] as const;
export type LevelId = (typeof LEVEL_IDS)[number];
export type Cup = 'none' | 'bronze' | 'silver' | 'gold';

export interface LevelRecord {
  acorns: string[];
  babies: string[];
  cup: Cup;
  bestTime: number;
  done: boolean;
}

export interface WorldRecord {
  glands: LevelRecord;
  pantry: LevelRecord;
  ruee: LevelRecord;
}

export type QualityChoice = 'auto' | 'low' | 'medium' | 'high';
export type TextSpeed = 'slow' | 'normal' | 'fast';

export interface Settings {
  music: number;
  sfx: number;
  muted: boolean;
  quality: QualityChoice;
  reducedMotion: boolean;
  textSpeed: TextSpeed;
  subtitles: boolean;
}

export interface SaveData {
  version: 2;
  introSeen: boolean;
  stage: 0 | 1;
  challenges: Record<ChallengeId, boolean>;
  paradeBest: number;
  settings: Settings;
  worlds: { archipel: WorldRecord };
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Solid extends Rect {
  id: string;
  /** Horizontal distance this solid moved during the current step. */
  dx: number;
  /** Vertical distance this solid moved during the current step. */
  dy: number;
}

export interface MoveInput {
  left: boolean;
  right: boolean;
  jumpHeld: boolean;
  jumpPressed: boolean;
}

export interface SimEvent {
  type: 'jump' | 'land' | 'collect' | 'bonk' | 'win' | 'respawn' | 'push';
  id?: string;
  x: number;
  y: number;
}
