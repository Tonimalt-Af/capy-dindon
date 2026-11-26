import * as THREE from 'three';
import { driveLevel, LevelSim } from '../logic/level';
import { LEVELS } from '../logic/levels';
import type { LevelId, SimEvent } from '../logic/types';
import { cupFor } from '../logic/save';
import { Capybara, SCENE_LIGHT } from '../render/capybara';
import { Particles } from '../render/particles';
import { groundIsland, PaintedBackdrop } from '../render/painted';
import { paintedProp, type PropId, type PropSprite } from '../render/props';
import { CUPS, HELP, PLACES, TEXT, VICTORY } from '../text';
import { hudChrome, wireHud } from '../ui';
import type { GameContext, Scene } from '../context';

const HERD: PropId[] = ['pumpkinA', 'pumpkinB', 'pumpkinC'];

export class LevelScene implements Scene {
  readonly id: LevelId;
  readonly challengeId?: 'glands' | 'pantry';
  private stop = new AbortController();
  private sim: LevelSim;
  private capy = new Capybara();
  private acorns = new Map<string, PropSprite>();
  private babies = new Map<string, PropSprite>();
  private hazards = new Map<string, PropSprite>();
  private mushrooms: PropSprite[] = [];
  private lanterns = new Map<string, PropSprite>();
  private islands = new Map<string, THREE.Object3D>();
  private crates = new Map<string, PropSprite>();
  private plates = new Map<string, PropSprite>();
  private gate: PropSprite | null = null;
  private relic: PropSprite | null = null;
  private glideFeather: PropSprite | null = null;
  private hatch: PropSprite | null = null;
  private lumi: PropSprite | null = null;
  private portal: PropSprite | null = null;
  private glow: THREE.PointLight | null = null;
  private sparks: Particles | null = null;
  private backdrop: PaintedBackdrop | null = null;
  private lit = new Set<string>();
  private hold = 0;
  private squashed = 0;
  private finished = false;
  private framed = false;
  private countEl: HTMLElement | null = null;

  constructor(private readonly ctx: GameContext, id: LevelId) {
    this.id = id;
    if (id === 'glands' || id === 'pantry') this.challengeId = id;
    this.sim = new LevelSim(LEVELS[id]);
  }

  mount(): void {
    this.stop = new AbortController();
    this.sim = new LevelSim(LEVELS[this.id]);
    this.poseForShot();
    const level = this.sim.level;
    const room = level.room;
    const light = room ? SCENE_LIGHT.pantry : SCENE_LIGHT.day;
    const { stage, audio, save } = this.ctx;
    stage.clear();
    stage.mood(room ? 'pantry' : 'day');
    stage.paintMode();
    audio.playSong(room ? 'pantry' : 'glands');
    const root = stage.root;
    this.backdrop = new PaintedBackdrop(level.backdrop, room
      ? { span: 26, groundY: 0, apron: 0.7, apronColor: '#c17a45' }
      : { span: 22, groundY: 0.02, ground: false, lockMid: false });
    root.add(this.backdrop.group);
    if (level.islands) {
      for (const plat of level.platforms) {
        const land = groundIsland(level.backdrop, plat.w, 0.18);
        land.position.set(plat.x, plat.top, 0.43);
        root.add(land);
        this.islands.set(plat.id, land);
      }
    }
    for (const acorn of level.acorns) {
      const model = paintedProp('acorn', light);
      model.root.position.set(acorn.x, acorn.y - model.height / 2, 0.2);
      root.add(model.root);
      this.acorns.set(acorn.id, model);
    }
    for (const baby of level.babies) {
      const model = paintedProp(baby.pose === 'sit' ? 'babySit' : 'babyIdle', light);
      model.root.position.set(baby.x, baby.y, 0.28);
      root.add(model.root);
      this.babies.set(baby.id, model);
    }
    for (const hazard of level.hazards) {
      const model = paintedProp(hazard.roll ? HERD[hazard.variant] : 'pumpkin', light);
      root.add(model.root);
      this.hazards.set(hazard.id, model);
    }
    for (const mushroom of level.mushrooms) {
      const model = paintedProp('mushroom', light);
      model.root.position.set(mushroom.x, mushroom.y, 0.16);
      root.add(model.root);
      this.mushrooms.push(model);
    }
    for (const lamp of level.checkpoints) {
      const model = paintedProp('lanternOff', light);
      model.root.position.set(lamp.x, lamp.y, 0.12);
      root.add(model.root);
      this.lanterns.set(lamp.id, model);
    }
    if (level.shelf) {
      const board = paintedProp('shelf', light);
      const tabletop = 17 / 513;
      board.root.position.set(level.shelf.x, level.shelf.top - board.height * (1 - tabletop), 0.18);
      root.add(board.root);
    }
    if (level.hatch) {
      this.hatch = paintedProp('hatchClosed', light);
      this.hatch.root.position.set(level.hatch.x, 0, 0.1);
      root.add(this.hatch.root);
    }
    if (level.lumi) {
      this.lumi = paintedProp('lumi1', light);
      this.lumi.root.position.set(level.lumi.x, level.lumi.y - this.lumi.height / 2, 0.24);
      root.add(this.lumi.root);
    }
    if (level.glideFeather) {
      this.glideFeather = paintedProp('featherTemp', light);
      this.glideFeather.root.position.set(level.glideFeather.x, level.glideFeather.y - this.glideFeather.height / 2, 0.2);
      root.add(this.glideFeather.root);
    }
    for (const plate of level.plates) {
      const pad = paintedProp('plateUp', light);
      pad.root.position.set(plate.x, 0, 0.08);
      root.add(pad.root);
      this.plates.set(plate.id, pad);
    }
    for (const crate of this.sim.crates) {
      const model = paintedProp('crate', light);
      root.add(model.root);
      this.crates.set(crate.id, model);
    }
    if (level.gate) {
      this.gate = paintedProp('gateClosed', light);
      this.gate.root.position.set(level.gate.x, 0, 0.12);
      root.add(this.gate.root);
    }
    if (level.featherRect) {
      const pedestal = paintedProp('pedestal', light);
      pedestal.root.position.set(level.featherRect.x, 0, 0.05);
      root.add(pedestal.root);
      this.relic = paintedProp('feather', light);
      this.relic.root.position.set(level.featherRect.x, 0.5, 0.16);
      root.add(this.relic.root);
    }
    if (!room) {
      const exitPlat = [...level.platforms].reverse().find((plat) => plat.x + plat.w / 2 >= level.exit.x - 0.2);
      this.portal = paintedProp('portalOpen', light);
      this.portal.root.position.set(level.exit.x, exitPlat?.top ?? 0, 0.18);
      this.glow = new THREE.PointLight('#ffd56a', 1.05, 5, 2);
      this.glow.position.set(0, 0.9, 0.2);
      this.portal.root.add(this.glow);
      root.add(this.portal.root);
    }
    this.capy.stage = save.data.stage;
    this.capy.featherGrow = save.data.stage;
    this.capy.setLight(light);
    root.add(this.capy.root);
    this.sparks = new Particles(root, this.ctx.reduced());
    const reset = room ? `<button type="button" class="chip" data-action="reset" style="position:absolute;left:16px;top:118px">${TEXT.resetCrates}</button>` : '';
    this.ctx.ui.setHud(`
      ${hudChrome({
        place: PLACES[this.id],
        testid: `challenge-${this.id}`,
        extra: `<span data-role="count">0/${level.acorns.length}</span>`,
        help: HELP[this.id],
        muted: save.data.settings.muted,
      })}
      ${reset}
    `);
    this.countEl = this.ctx.ui.hud.querySelector('[data-role="count"]');
    wireHud(this.ctx.ui.hud, this.stop.signal, {
      pause: () => this.ctx.requestPause(),
      mute: () => this.toggleMute(),
      details: () => this.details(),
    });
    this.ctx.ui.hud.querySelector('[data-action="reset"]')?.addEventListener('click', () => {
      this.sim.resetCrates();
      this.ctx.audio.click();
    }, { signal: this.stop.signal });
    this.refreshCount();
  }

  private poseForShot(): void {
    if (this.ctx.flags.shot !== this.id) return;
    const level = this.sim.level;
    const player = this.sim.player;
    if (this.id === 'glands') {
      const pump = level.platforms.find((plat) => plat.id === 'pump');
      if (pump) {
        player.x = pump.x - 1.2;
        player.y = pump.top + 0.55;
      }
    } else if (this.id === 'pantry') {
      player.x = -2.4;
      player.y = 0.62;
    } else {
      const isle = level.platforms.find((plat) => plat.id === 'r1');
      if (isle) {
        player.x = isle.x;
        player.y = isle.top + 0.55;
      }
    }
  }

  private toggleMute(): string {
    this.ctx.save.patchSettings({ muted: !this.ctx.save.data.settings.muted });
    this.ctx.audio.muted = this.ctx.save.data.settings.muted;
    this.ctx.audio.applyGains();
    return this.ctx.audio.muted ? '🔇' : '🔊';
  }

  private details(): void {
    this.ctx.setPauseLocked(true);
    const more = this.id === 'glands' ? HELP.glandsMore : this.id === 'pantry' ? HELP.pantryMore : HELP.rueeMore;
    this.ctx.ui.setModal(`<div class="modal-back"><div class="modal-card panel" role="dialog"><h2>${PLACES[this.id]}</h2><p>${more}</p><button type="button" class="btn primary" data-action="ok">${TEXT.close}</button></div></div>`);
    this.ctx.ui.modal.querySelector('[data-action="ok"]')?.addEventListener('click', () => {
      this.ctx.closeModal();
      this.ctx.setPauseLocked(false);
    }, { signal: this.stop.signal });
  }

  showVictory(): void {
    if (this.ctx.ui.modal.querySelector('[data-testid="challenge-complete"]')) return;
    this.finished = true;
    this.ctx.setPauseLocked(true);
    const save = this.ctx.save.data;
    const already = this.challengeId ? save.challenges[this.challengeId] : save.worlds.archipel.ruee.done;
    const cup = cupFor(this.sim.collected.size, this.sim.level.acorns.length);
    const prize = this.id === 'pantry' ? TEXT.featherGot : this.id === 'ruee' ? TEXT.bravo : TEXT.glandsGot;
    const line = VICTORY[this.id];
    this.ctx.ui.setModal(`
      <div class="modal-back" data-testid="challenge-complete"><div class="modal-card panel" role="dialog">
        <h2>${already ? TEXT.already : TEXT.bravo}</h2>
        <p><strong>${prize}.</strong> ${line}${cup === 'none' ? '' : ` ${CUPS[cup]}.`}</p>
        <button type="button" class="btn primary" data-action="hub">${TEXT.hubReturn}</button>
      </div></div>`);
    this.ctx.ui.say(line);
    this.ctx.ui.modal.querySelector('[data-action="hub"]')?.addEventListener('click', () => {
      this.ctx.setPauseLocked(false);
      this.ctx.goto('hub');
    }, { signal: this.stop.signal });
    if (this.ctx.flags.demo) window.setTimeout(() => this.ctx.goto('hub'), 1300);
  }

  getProgress() {
    return {
      won: this.sim.won,
      lost: false,
      progress: this.sim.collected.size,
      target: this.sim.level.acorns.length,
    };
  }

  update(dt: number): void {
    if (!this.finished) {
      const frame = this.ctx.input.frame;
      let input = {
        left: frame.left,
        right: frame.right,
        jumpHeld: frame.jumpHeld,
        jumpPressed: frame.jumpPressed,
        action: frame.actionPressed,
      };
      if (this.ctx.flags.demo && !this.ctx.flags.shot) {
        const driven = driveLevel(this.sim, this.hold, dt);
        this.hold = driven.hold;
        input = driven.input;
      }
      const hatchWas = this.sim.hatchOpen;
      this.sim.step(input, dt);
      this.react(this.sim.events, !hatchWas && this.sim.hatchOpen);
      if (this.sim.won) {
        this.remember(true);
        if (this.challengeId) this.ctx.grant(this.challengeId);
        this.ctx.audio.win();
        this.ctx.buzz([16, 40, 24]);
        this.showVictory();
      }
    }
    this.sync(dt);
  }

  private remember(done = false): void {
    const level = this.sim.level;
    this.ctx.save.noteLevel(this.id, {
      acorns: [...this.sim.collected].filter((id) => level.acorns.some((acorn) => acorn.id === id)),
      babies: [...this.sim.babies],
      totalAcorns: level.acorns.length,
      time: done ? this.sim.time : undefined,
      done,
    });
  }

  private react(events: SimEvent[], hatchOpened: boolean): void {
    for (const event of events) {
      if (event.type === 'jump') {
        this.ctx.audio.jump();
        this.ctx.buzz(12);
        if (event.id && this.sim.level.mushrooms.some((mushroom) => mushroom.id === event.id)) this.squashed = 0.22;
      } else if (event.type === 'land') {
        this.ctx.audio.land();
        this.ctx.stage.nudge(0.16, this.ctx.reduced());
      } else if (event.type === 'collect') {
        this.ctx.audio.collect();
        this.ctx.buzz([8, 24, 10]);
        this.ctx.stage.impact(0.045, 0.06, this.ctx.reduced());
        this.sparks?.burst(event.x, event.y, 0.3, 12, '#ffd56a');
        this.sparks?.ring(event.x, event.y, 0.3, '#fff1b0');
        this.capy.setMood('happy');
        window.setTimeout(() => this.capy.setMood('idle'), 500);
        if (event.id === 'plume' && this.ctx.subtitles()) this.ctx.ui.toast(TEXT.glideOn);
        else if (event.id?.startsWith('b') && this.ctx.subtitles()) this.ctx.ui.toast(TEXT.babyGot);
        this.remember(false);
        this.refreshCount();
      } else if (event.type === 'bonk') {
        this.ctx.audio.bomb();
        this.ctx.stage.impact(0.07, 0.16, this.ctx.reduced());
        this.capy.setMood('wow');
        window.setTimeout(() => this.capy.setMood('idle'), 280);
        if (this.ctx.subtitles()) this.ctx.ui.toast(TEXT.oups);
      } else if (event.type === 'respawn' && this.ctx.subtitles()) this.ctx.ui.toast(TEXT.oups);
      else if (event.type === 'push') {
        this.ctx.audio.push();
        this.ctx.stage.kick(0.04, this.ctx.reduced());
      }
    }
    if (hatchOpened) {
      this.ctx.audio.click();
      this.sparks?.ring(this.sim.level.hatch?.x ?? 0, 1.1, 0.2, '#fff1c9');
    }
  }

  private refreshCount(): void {
    if (!this.countEl) return;
    const total = this.sim.level.acorns.length;
    const cup = cupFor(this.sim.collected.size, total);
    const label = cup === 'none' ? '' : ` · ${CUPS[cup]}`;
    this.countEl.textContent = `${this.sim.collected.size}/${total}${label}`;
    this.countEl.classList.remove('pop');
    void this.countEl.offsetWidth;
    this.countEl.classList.add('pop');
  }

  private sync(dt: number): void {
    const player = this.sim.player;
    const level = this.sim.level;
    this.capy.glide = this.sim.gliding;
    this.capy.root.position.set(player.x, player.y - player.h / 2, 0.35);
    this.capy.turn(player.facing);
    this.capy.calm = this.ctx.reduced();
    this.capy.update(dt, { speed: Math.abs(player.vx), vy: player.vy, grounded: player.grounded, landed: false });
    for (const [id, model] of this.acorns) {
      const at = this.sim.acornAt(id);
      model.root.visible = !this.sim.collected.has(id);
      if (at) {
        const bob = Math.sin(this.sim.time * 3 + at.x) * 0.06;
        model.root.position.set(at.x, at.y - model.height / 2 + bob, 0.2);
      }
    }
    for (const [id, model] of this.babies) {
      model.root.visible = !this.sim.babies.has(id);
      const bob = Math.sin(this.sim.time * 2.2 + model.root.position.x) * 0.03;
      const baby = level.babies.find((item) => item.id === id);
      if (baby) model.root.position.y = baby.y + bob;
    }
    for (const hazard of this.sim.hazards) {
      const model = this.hazards.get(hazard.id);
      if (!model) continue;
      model.root.position.set(hazard.x, hazard.y - hazard.h / 2, 0.3);
      const spec = level.hazards.find((item) => item.id === hazard.id);
      model.root.rotation.z = spec?.roll ? -this.sim.time * 5 : Math.sin(this.sim.time * 3) * 0.08;
    }
    this.squashed = Math.max(0, this.squashed - dt);
    for (const model of this.mushrooms) model.setFrame(this.squashed > 0 ? 'mushroomSquash' : 'mushroom');
    if (this.sim.lamp) this.lit.add(this.sim.lamp);
    for (const [id, model] of this.lanterns) model.setFrame(this.lit.has(id) ? 'lanternOn' : 'lanternOff');
    if (this.hatch) this.hatch.setFrame(this.sim.hatchOpen ? 'hatchOpen' : 'hatchClosed');
    if (this.lumi && level.lumi) {
      this.lumi.setFrame(Math.floor(this.sim.time * 3) % 2 === 0 ? 'lumi1' : 'lumi2');
      this.lumi.root.position.y = level.lumi.y - this.lumi.height / 2 + Math.sin(this.sim.time * 3.4) * 0.06;
    }
    if (this.glideFeather && level.glideFeather) {
      this.glideFeather.root.visible = !this.sim.gliding;
      const bob = Math.sin(this.sim.time * 2.2) * 0.08;
      this.glideFeather.root.position.y = level.glideFeather.y - this.glideFeather.height / 2 + bob;
      this.glideFeather.root.rotation.z = Math.sin(this.sim.time * 1.6) * 0.08;
    }
    const pressed = this.sim.platesPressed();
    for (const [id, pad] of this.plates) {
      pad.setFrame(pressed[id] ? 'plateDown' : 'plateUp');
      pad.root.position.y = pressed[id] ? -0.015 : 0;
    }
    for (const crate of this.sim.crates) {
      const model = this.crates.get(crate.id);
      if (model) model.root.position.set(crate.x, crate.y - crate.h / 2, 0.22);
    }
    if (this.gate) this.gate.setFrame(this.sim.gateOpen ? 'gateOpen' : 'gateClosed');
    if (this.relic) this.relic.root.rotation.z = Math.sin(this.sim.time * 1.4) * 0.08;
    if (this.portal) {
      const pulse = 1 + Math.sin(this.sim.time * 3.2) * 0.025;
      this.portal.squash(pulse, pulse);
    }
    this.sparks?.update(dt, player.x);
    if (level.room) {
      const shot = this.backdrop?.place(this.ctx.stage.camera.aspect, player.x);
      if (shot) this.ctx.stage.follow(shot.x, shot.y, shot.distance, 0);
    } else this.frameCourse();
    if (!this.framed) {
      this.ctx.stage.snap();
      this.framed = true;
    }
    this.backdrop?.sync(this.ctx.stage.camera, dt, this.ctx.reduced());
    for (const plat of level.platforms) {
      if (!plat.mover) continue;
      const solid = this.sim.solids.find((item) => item.id === plat.id);
      const land = this.islands.get(plat.id);
      if (solid && land) land.position.y = solid.y + solid.h / 2;
    }
  }

  private frameCourse(): void {
    const aspect = Math.max(0.9, this.ctx.stage.camera.aspect || 1.33);
    const distance = 14.8;
    const half = Math.tan((14 * Math.PI) / 180) * distance;
    const player = this.sim.player;
    const ahead = player.facing * 2.2;
    const bounds = this.sim.level.bounds;
    const minX = bounds.minX + half * aspect;
    const maxX = bounds.maxX - half * aspect;
    let goalX = player.x + ahead;
    goalX = minX <= maxX ? Math.min(maxX, Math.max(minX, goalX)) : (bounds.minX + bounds.maxX) / 2;
    const minLook = bounds.minY + half;
    const maxLook = bounds.maxY - half;
    let look = Math.max(0.85, player.y * 0.42 + 0.85);
    look = minLook <= maxLook ? Math.min(maxLook, Math.max(minLook, look)) : look;
    this.ctx.stage.follow(goalX - ahead, look - 0.78, distance, ahead);
  }

  unmount(): void {
    this.stop.abort();
    this.ctx.ui.clearHud();
    this.ctx.setPauseLocked(false);
  }
}
