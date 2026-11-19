import { describe, expect, it } from 'vitest';
import { createParade, runParadeBot, stepParade } from '../../src/game/logic/parade';

describe('parade minigame', () => {
  it('scores a turkey, ignores a miss, and floors the bomb penalty at zero', () => {
    const state = createParade(2);
    state.holes[0] = { kind: 'turkey', life: 1, phase: 'up' };
    expect(stepParade(state, { selectorDelta: 0, whack: 0 }, 1 / 60)).toBe('turkey');
    expect(state.score).toBe(1);
    expect(stepParade(state, { selectorDelta: 0, whack: 0 }, 1 / 60)).toBe('miss');
    expect(state.score).toBe(1);
    state.holes[1] = { kind: 'bomb', life: 1, phase: 'up' };
    expect(stepParade(state, { selectorDelta: 0, whack: 1 }, 1 / 60)).toBe('bomb');
    expect(state.score).toBe(0);
    state.holes[2] = { kind: 'bomb', life: 1, phase: 'up' };
    stepParade(state, { selectorDelta: 0, whack: 2 }, 1 / 60);
    expect(state.score).toBe(0);
  });

  it('wins at the target score and loses when time runs out', () => {
    const win = createParade(1);
    win.score = 7;
    win.holes[0] = { kind: 'turkey', life: 1, phase: 'up' };
    stepParade(win, { selectorDelta: 0, whack: 0 }, 1 / 60);
    expect(win.status).toBe('win');

    const lose = createParade(1);
    lose.timeLeft = 0.01;
    stepParade(lose, { selectorDelta: 0, whack: null }, 1 / 30);
    expect(lose.status).toBe('lose');
  });

  it('wraps the selector', () => {
    const state = createParade(1);
    stepParade(state, { selectorDelta: -1, whack: null }, 1 / 60);
    expect(state.selector).toBe(3);
  });

  it('is cleared by a bot that only bonks turkeys', () => {
    const result = runParadeBot(11);
    expect(result.status).toBe('win');
    expect(result.score).toBeGreaterThanOrEqual(8);
  });
});
