import { completeChallenge, defaultSave, loadSave, writeSave, type Kv } from './logic/save';
import type { ChallengeId, SaveData, Settings } from './logic/types';

export class SaveStore {
  data: SaveData;

  constructor(private readonly kv: Kv) {
    this.data = loadSave(kv).data;
  }

  get fresh(): boolean {
    return !this.kv.getItem('capydindon.save.v1');
  }

  persist(): void {
    writeSave(this.kv, this.data);
  }

  patchSettings(patch: Partial<Settings>): void {
    this.data = { ...this.data, settings: { ...this.data.settings, ...patch } };
    this.persist();
  }

  grant(id: ChallengeId, score = 0): void {
    this.data = completeChallenge(this.data, id, score);
    this.persist();
  }

  markIntro(): void {
    if (this.data.introSeen) return;
    this.data = { ...this.data, introSeen: true };
    this.persist();
  }

  reachStage(): void {
    if (this.data.stage === 1) return;
    this.data = { ...this.data, stage: 1 };
    this.persist();
  }

  resetProgress(): void {
    const settings = this.data.settings;
    this.data = { ...defaultSave(), settings };
    this.persist();
  }
}
