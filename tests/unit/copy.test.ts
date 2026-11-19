import { describe, expect, it } from 'vitest';
import { EVOLVE, HELP, INTRO, LOSE, PLACES, TEXT, VICTORY } from '../../src/game/text';

describe('french copy', () => {
  it('stays original and non-empty', () => {
    const blob = JSON.stringify({ EVOLVE, HELP, INTRO, LOSE, PLACES, TEXT, VICTORY });
    expect(blob.length).toBeGreaterThan(200);
    const lower = blob.toLowerCase();
    for (const banned of ['mario', 'luigi', 'rabbid', 'nintendo', 'ubisoft', 'lapin crétin']) {
      expect(lower).not.toContain(banned);
    }
  });
});
