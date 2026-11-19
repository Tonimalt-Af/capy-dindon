import * as THREE from 'three';
import { createParade, paradeBotAction, PARADE, stepParade, type ParadeState } from '../logic/parade';
import { Capybara } from '../render/capybara';
import { Particles } from '../render/particles';
import { PaintedBackdrop } from '../render/painted';
import { pumpkinModel, turkeyModel } from '../render/scenery';
import { HELP, LOSE, PLACES, TEXT, VICTORY } from '../text';
import { hudChrome, wireHud } from '../ui';
import type { GameContext, Scene } from '../context';

const HOLES = [-3.3, -1.1, 1.1, 3.3];

export class ParadeScene implements Scene {
  readonly id = 'parade' as const;
  readonly challengeId = 'parade' as const;
  private stop = new AbortController();
  private state: ParadeState = createParade(1);
  private capy = new Capybara();
  private actors: { turkey: THREE.Object3D; bomb: THREE.Object3D }[] = [];
  private sparks: Particles | null = null;
  private backdrop: PaintedBackdrop | null = null;
  private party = 0;
  private finished = false;
  private capyX = -3.5;
  private whackX = -3.5;
  private scoreEl: HTMLElement | null = null;
  private timeEl: HTMLElement | null = null;

  constructor(private readonly ctx: GameContext) {}

  mount(): void {
    this.stop = new AbortController();
    const seed = 3 + Math.floor(Math.random() * 1000);
    this.state = createParade(this.ctx.flags.shot === 'parade' ? 4 : seed);
    if (this.ctx.flags.shot === 'parade') {
      this.state.holes[1] = { kind: 'turkey', life: 0.8, phase: 'up' };
      this.state.holes[2] = { kind: 'bomb', life: 0.8, phase: 'up' };
      this.state.score = 3;
    }
    const { stage, audio, save } = this.ctx;
    stage.clear();
    stage.mood('party');
    stage.paintMode();
    stage.hold(0.15, 0.65, 15.2);
    audio.playSong('parade');
    const root = stage.root;
    this.backdrop = new PaintedBackdrop('parade', { span: 18, groundY: 0.02 });
    root.add(this.backdrop.group);
    HOLES.forEach((x) => {
      const turkey = turkeyModel();
      const bomb = pumpkinModel();
      turkey.position.set(x, -0.4, 0.2);
      bomb.position.set(x, -0.4, 0.2);
      turkey.scale.setScalar(1.15);
      bomb.scale.setScalar(1.15);
      root.add(turkey, bomb);
      this.actors.push({ turkey, bomb });
    });
    this.capy.stage = save.data.stage;
    this.capy.featherGrow = save.data.stage;
    this.capy.root.position.set(-3.5, 0, 0.6);
    root.add(this.capy.root);
    this.sparks = new Particles(root, this.ctx.reduced());
    this.ctx.ui.setHud(`
      ${hudChrome({
        place: PLACES.parade,
        testid: 'challenge-parade',
        extra: `<span data-role="score">0/${PARADE.target}</span> · <span data-role="time">${PARADE.duration}</span>s`,
        help: HELP.parade,
        muted: save.data.settings.muted,
      })}
    `);
    this.scoreEl = this.ctx.ui.hud.querySelector('[data-role="score"]');
    this.timeEl = this.ctx.ui.hud.querySelector('[data-role="time"]');
    wireHud(this.ctx.ui.hud, this.stop.signal, {
      pause: () => this.ctx.requestPause(),
      mute: () => this.toggleMute(),
      details: () => this.details(),
    });
    window.addEventListener('keydown', (event) => {
      const n = Number(event.key);
      if (n >= 1 && n <= 4) this.whack(n - 1);
    }, { signal: this.stop.signal });
  }

  private toggleMute(): string {
    this.ctx.save.patchSettings({ muted: !this.ctx.save.data.settings.muted });
    this.ctx.audio.muted = this.ctx.save.data.settings.muted;
    this.ctx.audio.applyGains();
    return this.ctx.audio.muted ? '🔇' : '🔊';
  }

  private details(): void {
    this.ctx.setPauseLocked(true);
    this.ctx.ui.setModal(`<div class="modal-back"><div class="modal-card panel" role="dialog"><h2>${PLACES.parade}</h2><p>${HELP.paradeMore}</p><button type="button" class="btn primary" data-action="ok">${TEXT.close}</button></div></div>`);
    this.ctx.ui.modal.querySelector('[data-action="ok"]')?.addEventListener('click', () => {
      this.ctx.closeModal();
      this.ctx.setPauseLocked(false);
    }, { signal: this.stop.signal });
  }

  showVictory(): void {
    this.finish(true);
  }

  private finish(won: boolean): void {
    if (this.finished) return;
    this.finished = true;
    this.ctx.setPauseLocked(true);
    if (won) {
      this.ctx.grant('parade', this.state.score);
      this.ctx.audio.win();
      this.ctx.buzz([12, 30, 12, 30, 20]);
    } else this.ctx.audio.lose();
    const actions = won
      ? `<button type="button" class="btn primary" data-action="hub">${TEXT.hubReturn}</button>`
      : `<button type="button" class="btn primary" data-action="retry">${TEXT.retry}</button><button type="button" class="btn" data-action="hub">${TEXT.hubReturn}</button>`;
    this.ctx.ui.setModal(`
      <div class="modal-back" data-testid="${won ? 'challenge-complete' : 'challenge-failed'}"><div class="modal-card panel" role="dialog">
        <h2>${won ? TEXT.bravo : TEXT.youLose}</h2>
        <p>${won ? `<strong>${TEXT.starGot}.</strong> ${VICTORY.parade}` : LOSE.parade}</p>
        <div class="modal-actions">${actions}</div>
      </div></div>`);
    this.ctx.ui.say(won ? VICTORY.parade : LOSE.parade);
    this.ctx.ui.modal.querySelector('[data-action="hub"]')?.addEventListener('click', () => {
      this.ctx.setPauseLocked(false);
      this.ctx.goto('hub');
    }, { signal: this.stop.signal });
    this.ctx.ui.modal.querySelector('[data-action="retry"]')?.addEventListener('click', () => {
      this.ctx.setPauseLocked(false);
      this.ctx.closeModal();
      this.unmount();
      this.mount();
    }, { signal: this.stop.signal });
    if (this.ctx.flags.demo && won) window.setTimeout(() => this.ctx.goto('hub'), 1200);
  }

  getProgress() {
    return { won: this.state.status === 'win', lost: this.state.status === 'lose', progress: this.state.score, target: PARADE.target };
  }

  update(dt: number): void {
    if (!this.finished && this.ctx.flags.shot !== 'parade') {
      const frame = this.ctx.input.frame;
      let whack: number | null = null;
      let delta = 0;
      if (this.ctx.flags.demo) whack = paradeBotAction(this.state).whack;
      else {
        if (frame.leftPressed) delta -= 1;
        if (frame.rightPressed) delta += 1;
        if (frame.actionPressed) whack = this.state.selector;
        if (frame.clicked) whack = this.holeAt(frame.pointerX, frame.pointerY);
      }
      const event = stepParade(this.state, { selectorDelta: delta, whack }, dt);
      if (event === 'turkey') {
        this.ctx.audio.turkey();
        this.ctx.buzz(12);
        this.whackX = HOLES[whack ?? this.state.selector] ?? this.whackX;
        this.ctx.stage.impact(0.04, 0.07, this.ctx.reduced());
        this.sparks?.burst(this.whackX, 1.1, 0.2, 10, '#ffe08a');
        this.sparks?.confetti(this.whackX, 1.4, 0);
        this.capy.setMood('happy');
      } else if (event === 'bomb') {
        this.ctx.audio.bomb();
        this.ctx.stage.impact(0.08, 0.18, this.ctx.reduced());
        this.ctx.buzz(30);
        this.capy.setMood('wow');
      }
      if (this.state.status === 'win') this.finish(true);
      if (this.state.status === 'lose') this.finish(false);
    }
    this.actors.forEach((actor, index) => {
      const hole = this.state.holes[index];
      const up = hole?.phase === 'up';
      const rise = up ? Math.min(1, (PARADE.visible - (hole?.life ?? 0)) * 6) : 0;
      const y = up ? -0.02 + rise * 0.1 : -0.85;
      const showTurkey = up && hole?.kind === 'turkey';
      actor.turkey.visible = showTurkey;
      actor.bomb.visible = up && hole?.kind === 'bomb';
      actor.turkey.position.y = y;
      actor.bomb.position.y = y;
      const squash = up ? 1 : 0.2;
      actor.turkey.scale.set(1 / squash, squash, 1);
    });
    this.capyX += (this.whackX - this.capyX) * Math.min(1, dt * 6);
    this.capy.root.position.set(Math.min(-2.2, this.capyX), 0, 0.6);
    this.capy.turn(1);
    this.capy.calm = this.ctx.reduced();
    this.capy.update(dt, { speed: Math.abs(this.whackX - this.capyX), vy: 0, grounded: true, landed: false });
    this.backdrop?.sync(this.ctx.stage.camera);
    this.party += dt;
    if (!this.ctx.reduced() && this.party > 0.55) {
      this.party = 0;
      this.sparks?.confetti((Math.random() - 0.5) * 6, 2.6, -0.3);
    }
    if (this.scoreEl) this.scoreEl.textContent = `${this.state.score}/${PARADE.target}`;
    if (this.timeEl) this.timeEl.textContent = String(Math.ceil(this.state.timeLeft));
    this.sparks?.update(dt, 0);
  }

  private holeAt(x: number, y: number): number | null {
    let best = -1;
    let dist = 78;
    HOLES.forEach((hx, index) => {
      const p = this.ctx.stage.project(hx, 1.05, 0.15);
      const d = Math.hypot(p.x - x, p.y - y);
      if (d < dist) {
        dist = d;
        best = index;
      }
    });
    return best >= 0 ? best : null;
  }

  private whack(index: number): void {
    if (this.finished) return;
    const event = stepParade(this.state, { selectorDelta: 0, whack: index }, 0);
    if (event === 'turkey') this.ctx.audio.turkey();
    if (event === 'bomb') this.ctx.audio.bomb();
  }

  unmount(): void {
    this.stop.abort();
    this.ctx.ui.clearHud();
    this.ctx.setPauseLocked(false);
    this.actors = [];
  }
}

