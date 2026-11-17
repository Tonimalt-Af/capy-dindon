import type { AudioBus } from './audio';
import type { ChallengeId } from './logic/types';
import type { SaveStore } from './store';
import type { Input } from './input';
import type { Stage } from './render/stage';
import type { Ui } from './ui';

export type SceneId = 'title' | 'intro' | 'hub' | 'glands' | 'pantry' | 'parade' | 'evolve';

export interface Scene {
  readonly id: SceneId;
  readonly challengeId?: ChallengeId;
  mount(): void;
  update(dt: number): void;
  unmount(): void;
  getProgress?(): { won: boolean; lost: boolean; progress: number; target: number };
  showVictory?(): void;
}

export interface GameContext {
  stage: Stage;
  input: Input;
  audio: AudioBus;
  ui: Ui;
  save: SaveStore;
  flags: { demo: boolean; shot: string | null };
  reduced: () => boolean;
  cps: () => number;
  subtitles: () => boolean;
  goto: (id: SceneId) => void;
  grant: (id: ChallengeId, score?: number) => void;
  setPauseLocked: (locked: boolean) => void;
  requestPause: () => void;
  buzz: (pattern: number | number[]) => void;
  newGame: () => void;
  continueGame: () => void;
  markIntro: () => void;
  reachStage: () => void;
  openSettings: (restore?: () => void) => void;
  closeModal: () => void;
}
