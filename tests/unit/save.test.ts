import { describe, expect, it } from 'vitest';
import { canEvolve, nextLegend, relicCount, stageLabel } from '../../src/game/logic/evolution';
import { completeChallenge, defaultSave, hasProgress, loadSave, sanitizeSave, writeSave, type Kv } from '../../src/game/logic/save';

function memory(): Kv {
  const map = new Map<string, string>();
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => map.set(key, value),
    removeItem: (key) => map.delete(key),
  };
}

describe('save and evolution', () => {
  it('round-trips a save and rejects corrupt data', () => {
    const kv = memory();
    expect(loadSave(kv).fresh).toBe(true);
    const data = defaultSave();
    data.introSeen = true;
    data.settings.music = 0.2;
    writeSave(kv, data);
    const loaded = loadSave(kv);
    expect(loaded.fresh).toBe(false);
    expect(loaded.data.introSeen).toBe(true);
    expect(loaded.data.settings.music).toBe(0.2);
    kv.setItem('capydindon.save.v1', '{not json');
    expect(loadSave(kv).fresh).toBe(true);
    expect(sanitizeSave({ version: 2 })).toBeNull();
    expect(sanitizeSave({ version: 1, settings: { music: 4, quality: 'ultra' } })?.settings.music).toBe(1);
    expect(sanitizeSave({ version: 1, settings: { quality: 'ultra' } })?.settings.quality).toBe('auto');
  });

  it('tracks relics and the first evolution', () => {
    let data = defaultSave();
    expect(hasProgress(data)).toBe(false);
    expect(canEvolve(data)).toBe(false);
    data = completeChallenge(data, 'glands');
    data = completeChallenge(data, 'pantry');
    expect(relicCount(data)).toBe(2);
    expect(canEvolve(data)).toBe(false);
    data = completeChallenge(data, 'parade', 9);
    expect(data.paradeBest).toBe(9);
    expect(relicCount(data)).toBe(3);
    expect(canEvolve(data)).toBe(true);
    expect(stageLabel(0)).toBe('Jeune Capy');
    expect(nextLegend(1)).toBe('Dindo-Capy');
    data = { ...data, stage: 1 };
    expect(canEvolve(data)).toBe(false);
    expect(hasProgress(data)).toBe(true);
  });
});
