/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface CapyState {
  scene: string;
  paused: boolean;
  relics: number;
  stage: 0 | 1;
  fps: number;
  frameMs: number;
  renderMs: number;
  draws: number;
  triangles: number;
  dpr: number;
  quality: string;
  challenge: { id: string; won: boolean; lost: boolean; progress: number; target: number } | null;
}

interface CapyApi {
  ready: boolean;
  getState: () => CapyState;
  startNewGame: () => void;
  skipIntro: () => void;
  goToHub: () => void;
  startChallenge: (id: 'glands' | 'pantry' | 'parade' | 'ruee') => void;
  completeCurrentChallenge: () => void;
  showcase: (shot: string) => void;
  startDemo: () => void;
}

declare global {
  interface Window {
    __CAPY__?: CapyApi;
  }
}

export {};
