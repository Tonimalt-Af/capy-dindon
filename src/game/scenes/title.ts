import { hasProgress } from '../logic/save';
import { flutter } from '../render/scenery';
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
    stage.hold(0.9, 1.05, 10.6);
    this.grove = createGrove(save.data.stage);
    stage.root.add(this.grove.group);
    audio.playSong('title');
    const cont = hasProgress(save.data);
    ui.setHud(`
      <div class="title-wrap" data-testid="title-screen">
        <div class="brand">
          <svg viewBox="0 0 72 72" aria-hidden="true">
            <ellipse cx="34" cy="44" rx="22" ry="14" fill="#c6864a"/>
            <ellipse cx="52" cy="36" rx="12" ry="10" fill="#d39a62"/>
            <circle cx="60" cy="34" r="3.5" fill="#5c3d32"/>
            <circle cx="50" cy="32" r="2.4" fill="#fffaf4"/>
            <circle cx="51" cy="32.3" r="1.1" fill="#2b211c"/>
            <path d="M10 24c8-14 18-8 12 4" fill="#f2c14e"/>
          </svg>
          <h1>${TEXT.title}</h1>
        </div>
        <p class="subtitle">${TEXT.subtitle}</p>
        <div class="menu">
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
    grove.capy.update(dt, { speed: 0, vy: 0, grounded: true, landed: false });
    grove.feather.rotation.y += dt;
    grove.bugs.forEach((bug, i) => {
      bug.position.y = 1.3 + Math.sin(this.time * 2 + i) * 0.15;
      flutter(bug, this.time + i);
    });
    if (!this.ctx.reduced()) grove.group.position.y = Math.sin(this.time * 0.8) * 0.06;
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
