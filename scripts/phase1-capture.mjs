import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const out = process.env.ARTIFACTS || '/opt/cursor/artifacts';
fs.mkdirSync(out, { recursive: true });
const base = process.env.GAME_URL || 'http://127.0.0.1:5173/capy-dindon/?nosw=1';

const save = {
  version: 1,
  introSeen: true,
  stage: 0,
  challenges: { glands: false, pantry: false, parade: false },
  paradeBest: 0,
  settings: {
    music: 0,
    sfx: 0,
    muted: true,
    quality: 'medium',
    reducedMotion: false,
    textSpeed: 'fast',
    subtitles: false,
  },
};

const only = process.env.ONLY?.split(',').filter(Boolean);
const scenes = [
  ['glands', 'challenge-glands'],
  ['pantry', 'challenge-pantry'],
  ['ruee', 'challenge-ruee'],
  ['evolve', 'evolve-screen'],
].filter(([name]) => !only || only.includes(name));

async function ready(page) {
  await page.waitForFunction(() => {
    const fade = document.querySelector('#fade');
    return fade && !fade.classList.contains('on') && window.__CAPY__?.ready;
  });
}

async function openScene(page, name, testid) {
  await page.evaluate((shot) => window.__CAPY__?.showcase(shot), name);
  await page.waitForSelector(`[data-testid="${testid}"]`);
  await ready(page);
  await page.waitForTimeout(1600);
}

async function sampleFps(page) {
  const samples = [];
  for (let i = 0; i < 10; i++) {
    await page.waitForTimeout(400);
    const state = await page.evaluate(() => window.__CAPY__?.getState());
    if (state) samples.push(state);
  }
  const settled = samples.slice(2);
  const median = (rows, key) => {
    const sorted = rows.map((row) => row[key]).filter((value) => value != null).sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)] ?? 0;
  };
  const last = settled.at(-1) ?? samples.at(-1);
  return {
    fps: median(settled, 'fps'),
    frameMs: median(settled, 'frameMs'),
    renderMs: last?.renderMs,
    dpr: last?.dpr,
    quality: last?.quality,
    draws: last?.draws,
  };
}

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'],
});

async function stills(viewport, prefix) {
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: 1,
    hasTouch: viewport.width < 1200,
    isMobile: viewport.width < 1200,
  });
  await context.addInitScript((data) => localStorage.setItem('capydindon.save.v1', JSON.stringify(data)), save);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  await page.goto(base);
  await page.waitForSelector('[data-testid="title-screen"]');
  await ready(page);
  const perf = {};
  for (const [name, testid] of scenes) {
    await openScene(page, name, testid);
    const file = path.join(out, `${prefix}-${name}.png`);
    await page.screenshot({ path: file });
    perf[name] = await sampleFps(page);
    console.log(prefix, name, perf[name].fps, 'fps');
  }
  console.log(prefix, 'errors', errors);
  await context.close();
  return perf;
}

const tablet = await stills({ width: 1366, height: 1024 }, 'phase1-tablet');
const phone = await stills({ width: 844, height: 390 }, 'phase1-phone');
fs.writeFileSync(path.join(out, 'phase1-fps.json'), JSON.stringify({ tablet, phone }, null, 2));

async function film(id, seconds) {
  const dir = path.join(out, 'phase1-video-raw');
  fs.mkdirSync(dir, { recursive: true });
  const context = await browser.newContext({
    viewport: { width: 1366, height: 1024 },
    deviceScaleFactor: 1,
    recordVideo: { dir, size: { width: 1366, height: 1024 } },
  });
  await context.addInitScript((data) => localStorage.setItem('capydindon.save.v1', JSON.stringify(data)), save);
  const page = await context.newPage();
  const started = Date.now();
  await page.goto(base);
  await page.waitForSelector('[data-testid="title-screen"]');
  await ready(page);
  await page.evaluate((level) => window.__CAPY__?.playCourse(level), id);
  await page.waitForSelector(`[data-testid="challenge-${id}"]`);
  const lead = (Date.now() - started) / 1000 + 0.15;
  await page.waitForTimeout(seconds * 1000);
  const video = page.video();
  await context.close();
  const saved = await video?.path();
  if (!saved) return;
  const dest = path.join(out, `phase1-${id}-play.webm`);
  const trimmed = spawnSync('ffmpeg', [
    '-y', '-ss', lead.toFixed(2), '-t', String(seconds), '-i', saved,
    '-an', '-c:v', 'libvpx-vp9', '-crf', '34', '-b:v', '0', '-cpu-used', '4', '-deadline', 'good',
    dest,
  ], { encoding: 'utf8' });
  if (trimmed.status !== 0) {
    fs.copyFileSync(saved, dest);
    console.log('video copy', dest, trimmed.stderr?.slice(-200));
  } else console.log('video', dest);
}

if (!only) {
  await film('glands', 12);
  await film('pantry', 4);
  await film('ruee', 12);
}
await browser.close();
