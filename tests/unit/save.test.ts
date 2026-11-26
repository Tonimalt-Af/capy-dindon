import { describe, expect, it } from 'vitest';
import { canEvolve, nextLegend, relicCount, stageLabel } from '../../src/game/logic/evolution';
import { completeChallenge, cupFor, defaultSave, hasProgress, loadSave, recordLevel, sanitizeSave, writeSave, type Kv } from '../../src/game/logic/save';

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
    expect(sanitizeSave({ version: 99 })).toBeNull();
    const migrated = sanitizeSave({
      version: 1,
      introSeen: true,
      stage: 1,
      challenges: { glands: true, pantry: true, parade: true },
      paradeBest: 4,
      settings: { music: 0.3 },
    });
    expect(migrated?.version).toBe(2);
    expect(migrated?.stage).toBe(1);
    expect(migrated?.challenges.glands).toBe(true);
    expect(migrated?.challenges.parade).toBe(true);
    expect(migrated?.paradeBest).toBe(4);
    expect(migrated?.settings.music).toBe(0.3);
    expect(migrated?.worlds.archipel.glands.done).toBe(true);
    expect(migrated?.worlds.archipel.pantry.done).toBe(true);
    expect(migrated?.worlds.archipel.ruee.done).toBe(false);
    expect(relicCount(migrated!)).toBe(3);
    expect(canEvolve(migrated!)).toBe(false);
    expect(canEvolve({ ...migrated!, stage: 0 })).toBe(true);
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

  it('keeps cups on the chase without minting a fourth relic', () => {
    let data = defaultSave();
    data = recordLevel(data, 'ruee', { acorns: ['a1', 'a2'], totalAcorns: 4, babies: ['b1'] });
    expect(data.worlds.archipel.ruee.cup).toBe('bronze');
    expect(relicCount(data)).toBe(0);
    expect(canEvolve(data)).toBe(false);
    data = recordLevel(data, 'ruee', { acorns: ['a3', 'a4'], totalAcorns: 4, done: true, time: 40 });
    expect(data.worlds.archipel.ruee.cup).toBe('gold');
    expect(data.worlds.archipel.ruee.bestTime).toBe(40);
    expect(cupFor(18, 24)).toBe('silver');
    expect(relicCount(data)).toBe(0);
  });
});
