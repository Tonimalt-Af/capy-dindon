import type { QualityChoice, Settings, TextSpeed } from './logic/types';
import { TEXT } from './text';

export class Ui {
  readonly hud: HTMLElement;
  readonly modal: HTMLElement;
  private readonly toasts: HTMLElement;
  private readonly live: HTMLElement;
  private readonly fadeEl: HTMLElement;

  constructor() {
    this.hud = must('#hud');
    this.modal = must('#modal');
    this.toasts = must('#toasts');
    this.live = must('#live');
    this.fadeEl = must('#fade');
  }

  setHud(html: string): HTMLElement {
    this.hud.innerHTML = html;
    return this.hud;
  }

  clearHud(): void {
    this.hud.innerHTML = '';
  }

  setModal(html: string | null): HTMLElement | null {
    this.modal.innerHTML = html ?? '';
    return html ? this.modal : null;
  }

  say(text: string): void {
    this.live.textContent = text;
  }

  toast(text: string): void {
    const node = document.createElement('div');
    node.className = 'toast';
    node.textContent = text;
    this.toasts.appendChild(node);
    window.setTimeout(() => node.remove(), 900);
  }

  fade(on: boolean): void {
    this.fadeEl.classList.toggle('on', on);
  }
}

export function typewrite(el: HTMLElement, text: string, cps: number, signal: AbortSignal, instant: boolean): Promise<void> {
  el.textContent = instant ? text : '';
  if (instant) return Promise.resolve();
  return new Promise((resolve) => {
    let i = 0;
    const step = () => {
      if (signal.aborted) return resolve();
      i = Math.min(text.length, i + 1);
      el.textContent = text.slice(0, i);
      if (i >= text.length) resolve();
      else window.setTimeout(step, 1000 / cps);
    };
    step();
  });
}

export function hudChrome(opts: { place: string; extra?: string; help?: string; pips?: number; muted: boolean; testid?: string }): string {
  const pips = opts.pips === undefined
    ? ''
    : `<div class="chip pips" aria-label="${TEXT.relics}">${[0, 1, 2].map((i) => `<b class="${i < (opts.pips ?? 0) ? 'on' : ''}"></b>`).join('')}</div>`;
  const testid = opts.testid ? ` data-testid="${opts.testid}"` : '';
  const help = opts.help
    ? `<div class="help panel"><p>${opts.help}</p><button type="button" class="btn ghost" data-action="details">${TEXT.details}</button></div>`
    : '';
  return `
    <div class="hud-top">
      <div class="chip"${testid}>${opts.place}${opts.extra ? ` · ${opts.extra}` : ''}</div>
      ${pips}
      <div style="display:flex;gap:8px">
        <button type="button" class="icon-btn" data-action="mute" aria-label="${opts.muted ? TEXT.unmute : TEXT.mute}">${opts.muted ? '🔇' : '🔊'}</button>
        <button type="button" class="icon-btn" data-action="pause" aria-label="${TEXT.pause}">II</button>
      </div>
    </div>
    ${help}
  `;
}

export function settingsCard(settings: Settings, fps: number): string {
  const choice = (name: string, value: string, label: string, pressed: boolean) =>
    `<button type="button" class="btn" data-set="${name}" data-value="${value}" aria-pressed="${pressed}">${label}</button>`;
  return `
    <div class="modal-back" data-testid="settings">
      <div class="modal-card panel" role="dialog" aria-labelledby="settings-title">
        <h2 id="settings-title">${TEXT.options}</h2>
        <label class="setting">${TEXT.music}<input data-set="music" type="range" min="0" max="1" step="0.05" value="${settings.music}" /></label>
        <label class="setting">${TEXT.sfx}<input data-set="sfx" type="range" min="0" max="1" step="0.05" value="${settings.sfx}" /></label>
        <label class="setting">${TEXT.mute}<input data-set="muted" type="checkbox" ${settings.muted ? 'checked' : ''} /></label>
        <div class="setting"><span>${TEXT.quality}</span><div class="choice">
          ${choice('quality', 'auto', TEXT.qualityAuto, settings.quality === 'auto')}
          ${choice('quality', 'low', TEXT.qualityLow, settings.quality === 'low')}
          ${choice('quality', 'medium', TEXT.qualityMid, settings.quality === 'medium')}
          ${choice('quality', 'high', TEXT.qualityHigh, settings.quality === 'high')}
        </div></div>
        <label class="setting">${TEXT.motion}<input data-set="reducedMotion" type="checkbox" ${settings.reducedMotion ? 'checked' : ''} /></label>
        <div class="setting"><span>${TEXT.textSpeed}</span><div class="choice">
          ${choice('textSpeed', 'slow', TEXT.speedSlow, settings.textSpeed === 'slow')}
          ${choice('textSpeed', 'normal', TEXT.speedNormal, settings.textSpeed === 'normal')}
          ${choice('textSpeed', 'fast', TEXT.speedFast, settings.textSpeed === 'fast')}
        </div></div>
        <label class="setting">${TEXT.subtitles}<input data-set="subtitles" type="checkbox" ${settings.subtitles ? 'checked' : ''} /></label>
        <p class="fine-hint">${TEXT.fps} : ${fps}</p>
        <div class="modal-actions"><button type="button" class="btn primary" data-action="close-settings">${TEXT.close}</button></div>
      </div>
    </div>
  `;
}

export function bindSettings(root: ParentNode, apply: (patch: Partial<Settings>) => void): void {
  root.querySelectorAll<HTMLInputElement>('input[data-set]').forEach((input) => {
    input.addEventListener('input', () => {
      const key = input.dataset.set as keyof Settings;
      if (input.type === 'checkbox') apply({ [key]: input.checked } as Partial<Settings>);
      else apply({ [key]: Number(input.value) } as Partial<Settings>);
    });
  });
  root.querySelectorAll<HTMLButtonElement>('button[data-set]').forEach((button) => {
    button.addEventListener('click', () => {
      const key = button.dataset.set;
      const value = button.dataset.value;
      if (key === 'quality') apply({ quality: value as QualityChoice });
      if (key === 'textSpeed') apply({ textSpeed: value as TextSpeed });
      button.parentElement?.querySelectorAll('button').forEach((peer) => {
        peer.setAttribute('aria-pressed', String(peer === button));
      });
    });
  });
}

export function wireHud(hud: ParentNode, signal: AbortSignal, actions: { pause: () => void; mute: () => string; details?: () => void }): void {
  hud.querySelector('[data-action="pause"]')?.addEventListener('click', () => actions.pause(), { signal });
  hud.querySelector('[data-action="mute"]')?.addEventListener('click', () => {
    const button = hud.querySelector('[data-action="mute"]');
    if (button) button.textContent = actions.mute();
  }, { signal });
  if (actions.details) hud.querySelector('[data-action="details"]')?.addEventListener('click', actions.details, { signal });
}

export function charsPerSecond(speed: TextSpeed): number {
  if (speed === 'slow') return 22;
  if (speed === 'fast') return 78;
  return 46;
}

function must(sel: string): HTMLElement {
  const node = document.querySelector(sel);
  if (!(node instanceof HTMLElement)) throw new Error(`Missing ${sel}`);
  return node;
}
