import { AudioBus } from './audio';
import type { GameContext, Scene, SceneId } from './context';
import { Input } from './input';
import { relicCount } from './logic/evolution';
import type { ChallengeId } from './logic/types';
import { profileFor, resolveTier } from './quality';
import { Stage } from './render/stage';
import { SaveStore } from './store';
import { TEXT } from './text';
import { bindSettings, settingsCard, Ui, charsPerSecond } from './ui';

export class Game {
  private readonly stage: Stage;
  private readonly input: Input;
  private readonly audio = new AudioBus();
  private readonly ui = new Ui();
  private readonly save: SaveStore;
  private readonly flags = { demo: false, shot: null as string | null };
  private ctx: GameContext;
  private scene: Scene | null = null;
  private paused = false;
  private pauseLocked = false;
  private token = 0;
  private fps = 60;
  private slowFrames = 0;
  private tier = resolveTier('auto');
  private software = false;
  private fpsFrames = 0;
  private fpsAcc = 0;
  private portrait = window.matchMedia('(orientation: portrait)');

  constructor(canvas: HTMLCanvasElement) {
    this.save = new SaveStore(localStorage);
    if (!localStorage.getItem('capydindon.save.v1') && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.save.patchSettings({ reducedMotion: true });
    }
    this.stage = new Stage(canvas);
    this.software = softwareGl(this.stage.renderer.getContext());
    this.input = new Input(canvas, must('#touch'));
    this.ctx = this.makeContext();
    this.applyTune();
    this.installApi();
    window.addEventListener('resize', () => this.stage.resize());
    window.addEventListener('pointerdown', () => void this.audio.unlock(), { once: false });
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) void this.audio.unlock();
    });
    const coarse = window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;
    document.documentElement.dataset.pointer = coarse ? 'coarse' : 'fine';
    this.stage.resize();
    void this.goto('title');
    requestAnimationFrame((t) => this.frame(t));
  }

  private makeContext(): GameContext {
    return {
      stage: this.stage,
      input: this.input,
      audio: this.audio,
      ui: this.ui,
      save: this.save,
      flags: this.flags,
      reduced: () => this.save.data.settings.reducedMotion,
      cps: () => charsPerSecond(this.save.data.settings.textSpeed),
      subtitles: () => this.save.data.settings.subtitles,
      goto: (id) => void this.goto(id),
      grant: (id, score = 0) => this.save.grant(id, score),
      setPauseLocked: (locked) => {
        this.pauseLocked = locked;
      },
      requestPause: () => this.togglePause(),
      buzz: (pattern) => {
        if (this.save.data.settings.reducedMotion) return;
        navigator.vibrate?.(pattern);
      },
      newGame: () => {
        this.paused = false;
        this.pauseLocked = false;
        this.ui.setModal(null);
        this.save.resetProgress();
        this.applyTune();
        void this.goto('intro');
      },
      continueGame: () => {
        this.paused = false;
        void this.goto(this.save.data.introSeen ? 'hub' : 'intro');
      },
      markIntro: () => this.save.markIntro(),
      reachStage: () => this.save.reachStage(),
      openSettings: (restore) => this.openSettings(restore),
      closeModal: () => this.ui.setModal(null),
    };
  }

  private applyTune(): void {
    const settings = this.save.data.settings;
    this.audio.music = settings.music;
    this.audio.sfx = settings.sfx;
    this.audio.muted = settings.muted;
    this.audio.applyGains();
    document.documentElement.dataset.motion = settings.reducedMotion ? 'reduce' : 'full';
    this.tier = settings.quality === 'auto' && this.software ? 'low' : resolveTier(settings.quality);
    this.stage.applyProfile(profileFor(this.tier, window.devicePixelRatio || 1));
  }

  private async goto(id: SceneId): Promise<void> {
    const token = ++this.token;
    this.paused = false;
    this.ui.fade(true);
    await wait(this.save.data.settings.reducedMotion ? 40 : 200);
    if (token !== this.token) return;
    this.scene?.unmount();
    this.stage.clear();
    this.ui.clearHud();
    this.ui.setModal(null);
    this.pauseLocked = false;
    this.scene = await this.create(id);
    if (token !== this.token) return;
    this.scene.mount();
    const playing = id === 'hub' || id === 'glands' || id === 'pantry' || id === 'parade';
    document.documentElement.dataset.playing = playing ? 'yes' : 'no';
    this.ui.fade(false);
    if (window.__CAPY__) window.__CAPY__.ready = true;
  }

  private async create(id: SceneId): Promise<Scene> {
    if (id === 'title') return new (await import('./scenes/title')).TitleScene(this.ctx);
    if (id === 'intro') return new (await import('./scenes/intro')).IntroScene(this.ctx);
    if (id === 'hub') return new (await import('./scenes/hub')).HubScene(this.ctx);
    if (id === 'glands') return new (await import('./scenes/acorn')).AcornScene(this.ctx);
    if (id === 'pantry') return new (await import('./scenes/pantry')).PantryScene(this.ctx);
    if (id === 'parade') return new (await import('./scenes/parade')).ParadeScene(this.ctx);
    return new (await import('./scenes/evolve')).EvolveScene(this.ctx);
  }

  private togglePause(): void {
    if (this.pauseLocked || !this.scene) return;
    if (this.scene.id === 'title' || this.scene.id === 'intro') {
      if (this.scene.id === 'title') this.openSettings();
      return;
    }
    if (this.paused) this.resume();
    else this.showPause();
  }

  private showPause(): void {
    this.paused = true;
    this.ui.setModal(`
      <div class="modal-back" data-testid="pause-menu"><div class="modal-card panel" role="dialog" aria-labelledby="pause-title">
        <h2 id="pause-title">${TEXT.pause}</h2>
        <div class="modal-actions">
          <button type="button" class="btn primary" data-action="resume">${TEXT.resume}</button>
          <button type="button" class="btn" data-action="options">${TEXT.options}</button>
          <button type="button" class="btn" data-action="hub">${TEXT.hubReturn}</button>
          <button type="button" class="btn" data-action="title">${TEXT.titleScreen}</button>
        </div>
      </div></div>`);
    const root = this.ui.modal;
    root.querySelector('[data-action="resume"]')?.addEventListener('click', () => this.resume());
    root.querySelector('[data-action="options"]')?.addEventListener('click', () => this.openSettings(() => this.showPause()));
    root.querySelector('[data-action="hub"]')?.addEventListener('click', () => {
      this.paused = false;
      void this.goto('hub');
    });
    root.querySelector('[data-action="title"]')?.addEventListener('click', () => {
      this.paused = false;
      this.flags.demo = false;
      void this.goto('title');
    });
  }

  private resume(): void {
    this.paused = false;
    this.ui.setModal(null);
  }

  private openSettings(restore?: () => void): void {
    const draw = () => {
      this.ui.setModal(settingsCard(this.save.data.settings, this.fps));
      bindSettings(this.ui.modal, (patch) => {
        this.save.patchSettings(patch);
        this.applyTune();
      });
      this.ui.modal.querySelector('[data-action="close-settings"]')?.addEventListener('click', () => {
        this.audio.click();
        if (restore) restore();
        else this.ui.setModal(null);
      });
    };
    draw();
  }

  private frame = (now: number): void => {
    requestAnimationFrame(this.frame);
    const dt = Math.min(this.flags.demo ? 0.1 : 0.033, (now - (this.last ?? now)) / 1000) || 0;
    this.last = now;
    this.fpsFrames += 1;
    this.fpsAcc += dt;
    if (this.fpsAcc >= 0.5) {
      this.fps = Math.round(this.fpsFrames / this.fpsAcc);
      this.fpsFrames = 0;
      this.fpsAcc = 0;
    }
    this.input.begin();
    if (this.input.frame.pausePressed) this.togglePause();
    const frozen = this.paused || this.pauseLocked || this.portrait.matches;
    const step = this.stage.scaleTime(dt);
    if (!frozen) this.scene?.update(step);
    this.audio.update();
    const started = performance.now();
    this.stage.render(dt, this.save.data.settings.reducedMotion);
    const cost = performance.now() - started;
    if (this.save.data.settings.quality === 'auto' && cost > 28) {
      this.slowFrames += 1;
      if (this.slowFrames >= 6 && this.tier !== 'low') {
        this.tier = this.tier === 'high' ? 'medium' : 'low';
        this.slowFrames = 0;
        this.stage.applyProfile(profileFor(this.tier, this.tier === 'low' ? 1 : window.devicePixelRatio || 1));
      }
    } else if (cost < 18) this.slowFrames = 0;
  };

  private last = 0;

  private installApi(): void {
    window.__CAPY__ = {
      ready: false,
      getState: () => ({
        scene: this.scene?.id ?? 'boot',
        paused: this.paused,
        relics: relicCount(this.save.data),
        stage: this.save.data.stage,
        fps: this.fps,
        dpr: this.stage.dpr,
        quality: resolveTier(this.save.data.settings.quality),
        challenge: this.scene?.getProgress
          ? { id: this.scene.challengeId ?? this.scene.id, ...this.scene.getProgress() }
          : null,
      }),
      startNewGame: () => this.ctx.newGame(),
      skipIntro: () => {
        this.save.markIntro();
        void this.goto('hub');
      },
      goToHub: () => void this.goto('hub'),
      startChallenge: (id: ChallengeId) => void this.goto(id),
      completeCurrentChallenge: () => {
        const scene = this.scene;
        if (!scene?.challengeId || !scene.showVictory) return;
        const progress = scene.getProgress?.().progress ?? 0;
        this.save.grant(scene.challengeId, progress);
        scene.showVictory();
      },
      showcase: (shot: string) => {
        this.flags.demo = false;
        this.flags.shot = shot;
        if (shot === 'evolve') {
          this.save.grant('glands');
          this.save.grant('pantry');
          this.save.grant('parade', 8);
        }
        const id = (['title', 'intro', 'hub', 'glands', 'pantry', 'parade', 'evolve'].includes(shot) ? shot : 'title') as SceneId;
        void this.goto(id);
      },
      startDemo: () => {
        this.flags.demo = true;
        this.flags.shot = null;
        this.paused = false;
        this.save.resetProgress();
        this.applyTune();
        void this.goto('title');
      },
    };
  }
}

function softwareGl(gl: WebGLRenderingContext | WebGL2RenderingContext): boolean {
  const info = gl.getExtension('WEBGL_debug_renderer_info');
  if (!info) return false;
  return /swiftshader|llvmpipe|software/i.test(String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)));
}

function must(sel: string): HTMLElement {
  const node = document.querySelector(sel);
  if (!(node instanceof HTMLElement)) throw new Error(sel);
  return node;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}
