import { CHALLENGES, type SaveData } from './types';

export function relicCount(save: SaveData): number {
  return CHALLENGES.filter((id) => save.challenges[id]).length;
}

export function canEvolve(save: SaveData): boolean {
  return save.stage === 0 && relicCount(save) >= CHALLENGES.length;
}

export function stageLabel(stage: SaveData['stage']): string {
  return stage === 0 ? 'Jeune Capy' : 'Capyplume';
}

export function nextLegend(stage: SaveData['stage']): string {
  return stage === 0 ? 'Capyplume' : 'Dindo-Capy';
}
