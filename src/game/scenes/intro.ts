import { createGrove } from '../render/grove';
import { INTRO, TEXT } from '../text';
import { typewrite } from '../ui';
import type { GameContext, Scene } from '../context';

const MOODS = ['night', 'dusk', 'evolve', 'day'] as const;

export class IntroScene implements Scene {
  readonly id = 'intro' as const;
  private stop = new AbortController();
  private grove: ReturnType<typeof createGrove> | null = null;
  private beat = 0;
  private time = 0;
  private beatTime = 0;
  private leaving = false;

  constructor(private readonly ctx: GameContext) {}

  mount(): void {
    this.stop = new AbortController();
    const { stage, audio } = this.ctx;
    stage.clear();
    stage.mood('day');
    stage.paintMode();
    this.grove = createGrove(0);
    stage.root.add(this.grove.group);
    const shot = this.grove.backdrop.place(stage.camera.aspect, 0.15);
    stage.hold(shot.x, shot.y, shot.distance);
    this.grove.backdrop.sync(stage.camera);
    audio.playSong('title');
    if (this.ctx.flags.shot === 'intro') this.beat = 1;
    this.renderBeat(this.ctx.flags.shot === 'intro');
  }

  private renderBeat(instant = false): void {
    const grove = this.grove;
    if (!grove) return;
    this.ctx.stage.mood(MOODS[this.beat] ?? 'day');
    grove.capy.setMood(this.beat === 0 ? 'sleep' : this.beat === 1 ? 'wow' : this.beat === 2 ? 'happy' : 'idle');
    grove.feather.visible = this.beat > 0;
    grove.vision.visible = this.beat === 2;
    const showText = this.ctx.subtitles() || this.ctx.flags.shot === 'intro';
    this.ctx.ui.setHud(`
      <div class="story-card panel" data-testid="intro-screen">
        <p data-testid="intro-text"></p>
        <div class="story-row">
          <div class="dots">${INTRO.map((_, i) => `<i class="${i === this.beat ? 'on' : ''}"></i>`).join('')}</div>
          <div>
            <button type="button" class="btn ghost" data-testid="skip-intro">${TEXT.skip}</button>
            <button type="button" class="btn primary" data-testid="intro-next">${this.beat === INTRO.length - 1 ? TEXT.play : TEXT.next}</button>
          </div>
        </div>
      </div>
    `);
    const text = this.ctx.ui.hud.querySelector('[data-testid="intro-text"]');
    if (text instanceof HTMLElement) {
      if (showText) void typewrite(text, INTRO[this.beat] ?? '', this.ctx.cps(), this.stop.signal, instant || this.ctx.reduced());
      this.ctx.ui.say(INTRO[this.beat] ?? '');
    }
    const signal = this.stop.signal;
    this.ctx.ui.hud.querySelector('[data-testid="skip-intro"]')?.addEventListener('click', () => this.finish(), { signal });
    this.ctx.ui.hud.querySelector('[data-testid="intro-next"]')?.addEventListener('click', () => this.advance(), { signal });
    this.beatTime = 0;
  }

  private advance(): void {
    this.ctx.audio.click();
    if (this.beat >= INTRO.length - 1) this.finish();
    else {
      this.beat += 1;
      this.renderBeat(false);
    }
  }

  private finish(): void {
    if (this.leaving) return;
    this.leaving = true;
    this.ctx.audio.click();
    this.ctx.markIntro();
    this.ctx.goto('hub');
  }

  update(dt: number): void {
    this.time += dt;
    this.beatTime += dt;
    const grove = this.grove;
    if (!grove) return;
    grove.capy.calm = this.ctx.reduced();
    grove.capy.update(dt, { speed: 0, vy: 0, grounded: true, landed: false });
    grove.legend.calm = this.ctx.reduced();
    grove.legend.update(dt, { speed: 0, vy: 0, grounded: true, landed: false });
    const shot = grove.backdrop.place(this.ctx.stage.camera.aspect, 0.15);
    this.ctx.stage.hold(shot.x, shot.y, shot.distance);
    grove.backdrop.sync(this.ctx.stage.camera, dt, this.ctx.reduced());
    if (this.beat === 1) {
      const fall = Math.min(1, this.beatTime / 1.1);
      grove.feather.position.y = Math.max(0.95, 2.7 - fall * 1.75);
      grove.feather.rotation.z = Math.sin(this.time * 3) * 0.22 * (1 - fall);
    } else if (this.beat > 1) {
      grove.feather.position.y = 0.95 + Math.sin(this.time * 2) * 0.05;
      grove.feather.rotation.z = Math.sin(this.time * 1.5) * 0.1;
    }
    if (this.ctx.flags.demo && this.beatTime > 0.85) this.advance();
  }

  unmount(): void {
    this.stop.abort();
    this.ctx.ui.clearHud();
    this.grove = null;
  }
}
