import { hasProgress } from '../logic/save';
import { createGrove } from '../render/grove';
import { TEXT } from '../text';
import type { GameContext, Scene } from '../context';

export class TitleScene implements Scene {
  readonly id = 'title' as const;
  private stop = new AbortController();
  private grove: ReturnType<typeof createGrove> | null = null;
  private time = 0;
  private leaving = false;

  constructor(private readonly ctx: GameContext) {}

  mount(): void {
    this.stop = new AbortController();
    const { stage, ui, audio, save, flags } = this.ctx;
    stage.clear();
    stage.mood('day');
    stage.paintMode();
    const close = flags.shot === 'close';
    this.grove = createGrove(save.data.stage);
    stage.root.add(this.grove.group);
    if (close) stage.hold(1.7, 0.4, 8.4);
    else {
      const shot = this.grove.backdrop.place(stage.camera.aspect, -0.35);
      stage.hold(shot.x, shot.y, shot.distance);
    }
    if (close) stage.snap();
    this.grove.backdrop.sync(stage.camera);
    audio.playSong('title');
    const cont = hasProgress(save.data);
    if (close) {
      ui.setHud(`<div data-testid="title-screen"></div>`);
      ui.say('');
      return;
    }
    ui.setHud(`
      <div class="title-wrap" data-testid="title-screen">
        <div class="brand">
          <svg viewBox="0 0 86 72" aria-hidden="true">
            <path d="M18 30c8-18 16-16 12 4" fill="#f6c453"/>
            <path d="M26 28c6-14 12-8 7 6" fill="#fff3c4"/>
            <ellipse cx="36" cy="46" rx="24" ry="14" fill="#c47c3c"/>
            <ellipse cx="38" cy="50" rx="14" ry="7" fill="#f3d7b4"/>
            <ellipse cx="56" cy="34" rx="12" ry="11" fill="#d7a36a"/>
            <ellipse cx="68" cy="38" rx="10" ry="7" fill="#f0d0ae"/>
            <ellipse cx="76" cy="38" rx="2.2" ry="1.6" fill="#3a2418"/>
            <ellipse cx="50" cy="22" rx="4" ry="5.5" fill="#c47c3c"/>
            <ellipse cx="50" cy="23" rx="2" ry="3" fill="#e7a090"/>
            <circle cx="56" cy="30" r="4.4" fill="#fffaf6"/>
            <circle cx="57.4" cy="30.6" r="2.1" fill="#1a120e"/>
            <circle cx="55.6" cy="29.2" r="1" fill="#fff"/>
          </svg>
          <h1>${TEXT.title}</h1>
        </div>
        <p class="subtitle"><span>${TEXT.subtitle}</span></p>
        <div class="menu panel">
          ${cont ? `<button type="button" class="btn primary" data-testid="btn-continue" data-go="continue">${TEXT.continue}</button>` : ''}
          <button type="button" class="btn ${cont ? '' : 'primary'}" data-testid="btn-play" data-go="play">${cont ? TEXT.newGame : TEXT.play}</button>
          <button type="button" class="btn" data-testid="btn-options" data-go="options">${TEXT.options}</button>
          <button type="button" class="btn ghost" data-go="about">${TEXT.about}</button>
        </div>
        <p class="fine-hint fine-only">${TEXT.keys}</p>
      </div>
    `);
    ui.say(`${TEXT.title}. ${TEXT.subtitle}`);
    const signal = this.stop.signal;
    ui.hud.querySelectorAll<HTMLButtonElement>('[data-go]').forEach((button) => {
      button.addEventListener('click', () => this.onMenu(button.dataset.go ?? ''), { signal });
    });
    void flags;
  }

  private onMenu(action: string): void {
    this.ctx.audio.unlock().catch(() => undefined);
    this.ctx.audio.click();
    this.ctx.buzz(8);
    if (action === 'continue') this.ctx.continueGame();
    else if (action === 'play') {
      if (hasProgress(this.ctx.save.data)) this.confirmReset();
      else this.ctx.newGame();
    } else if (action === 'options') this.ctx.openSettings();
    else if (action === 'about') {
      this.ctx.ui.setModal(`
        <div class="modal-back"><div class="modal-card panel" role="dialog">
          <h2>${TEXT.about}</h2><p>${TEXT.aboutBody}</p>
          <button type="button" class="btn primary" data-action="close">${TEXT.close}</button>
        </div></div>`);
      this.ctx.ui.modal.querySelector('[data-action="close"]')?.addEventListener('click', () => this.ctx.closeModal(), { signal: this.stop.signal });
    }
  }

  private confirmReset(): void {
    this.ctx.ui.setModal(`
      <div class="modal-back"><div class="modal-card panel" role="dialog">
        <h2>${TEXT.newGame}</h2><p>${TEXT.confirmReset}</p>
        <div class="modal-actions">
          <button type="button" class="btn primary" data-action="yes">${TEXT.yes}</button>
          <button type="button" class="btn" data-action="no">${TEXT.no}</button>
        </div>
      </div></div>`);
    const signal = this.stop.signal;
    this.ctx.ui.modal.querySelector('[data-action="yes"]')?.addEventListener('click', () => this.ctx.newGame(), { signal });
    this.ctx.ui.modal.querySelector('[data-action="no"]')?.addEventListener('click', () => this.ctx.closeModal(), { signal });
  }

  update(dt: number): void {
    this.time += dt;
    const grove = this.grove;
    if (!grove) return;
    grove.capy.calm = this.ctx.reduced();
    grove.capy.update(dt, { speed: 0, vy: 0, grounded: true, landed: false });
    grove.legend.calm = this.ctx.reduced();
    grove.legend.update(dt, { speed: 0, vy: 0, grounded: true, landed: false });
    grove.feather.rotation.z = Math.sin(this.time * 1.4) * 0.15;
    const close = this.ctx.flags.shot === 'close';
    if (!close) {
      const shot = grove.backdrop.place(this.ctx.stage.camera.aspect, -0.35);
      this.ctx.stage.hold(shot.x, shot.y, shot.distance);
    }
    grove.backdrop.sync(this.ctx.stage.camera, dt, this.ctx.reduced());
    if (this.ctx.flags.demo && !this.leaving && this.time > 0.8 && this.ctx.ui.modal.childElementCount === 0) {
      this.leaving = true;
      this.ctx.newGame();
    }
  }

  unmount(): void {
    this.stop.abort();
    this.ctx.ui.clearHud();
    this.ctx.ui.setModal(null);
    this.grove = null;
  }
}
