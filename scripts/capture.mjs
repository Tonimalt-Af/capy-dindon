import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const out = process.env.ARTIFACTS || '/opt/cursor/artifacts';
fs.mkdirSync(out, { recursive: true });
const base = process.env.GAME_URL || 'http://127.0.0.1:4180/capy-dindon/?nosw=1';

const save = {
  version: 1,
  introSeen: false,
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
    subtitles: true,
  },
};

async function shot(page, name) {
  await page.waitForFunction(() => {
    const fade = document.querySelector('#fade');
    return fade && !fade.classList.contains('on') && window.__CAPY__?.ready;
  });
  await page.waitForTimeout(900);
  const file = path.join(out, `${name}.png`);
  await page.screenshot({ path: file });
  console.log('shot', file);
}

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'],
});

if (process.env.VIDEO !== '1') {
const still = await browser.newContext({ viewport: { width: 1366, height: 1024 }, deviceScaleFactor: 1 });
await still.addInitScript((data) => localStorage.setItem('capydindon.save.v1', JSON.stringify(data)), save);
const page = await still.newPage();
page.on('pageerror', (error) => console.error('pageerror', error));
await page.goto(base);
await page.waitForSelector('[data-testid="title-screen"]');
await shot(page, '01-title');
const only = process.env.ONLY?.split(',');
for (const name of ['intro', 'hub', 'glands', 'pantry', 'parade', 'evolve']) {
  if (only && !only.includes(name) && name !== 'title') continue;
  await page.evaluate((shotName) => window.__CAPY__?.showcase(shotName), name);
  const testid = name === 'glands' ? 'challenge-glands' : name === 'pantry' ? 'challenge-pantry' : name === 'parade' ? 'challenge-parade' : name === 'evolve' ? 'evolve-screen' : name === 'intro' ? 'intro-screen' : 'hub';
  await page.waitForSelector(`[data-testid="${testid}"]`);
  await shot(page, `0${['intro', 'hub', 'glands', 'pantry', 'parade', 'evolve'].indexOf(name) + 2}-${name}`);
}
const perf = await page.evaluate(() => window.__CAPY__?.getState());
fs.writeFileSync(path.join(out, 'perf.json'), JSON.stringify(perf, null, 2));
console.log('perf', perf);
await still.close();

if (only) {
  await browser.close();
  process.exit(0);
}
}
const phone = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true });
await phone.addInitScript((data) => localStorage.setItem('capydindon.save.v1', JSON.stringify(data)), save);
const phonePage = await phone.newPage();
await phonePage.goto(base);
await phonePage.waitForSelector('[data-testid="title-screen"]');
await phonePage.evaluate(() => window.__CAPY__?.showcase('glands'));
await phonePage.waitForSelector('[data-testid="challenge-glands"]');
await shot(phonePage, '08-phone-glands');
await phone.close();

const videoDir = path.join(out, 'video-raw');
fs.mkdirSync(videoDir, { recursive: true });
const filming = await browser.newContext({
  viewport: { width: 1366, height: 1024 },
  deviceScaleFactor: 1,
  recordVideo: { dir: videoDir, size: { width: 1366, height: 1024 } },
});
await filming.addInitScript((data) => localStorage.setItem('capydindon.save.v1', JSON.stringify(data)), save);
const film = await filming.newPage();
await film.goto(base);
await film.waitForSelector('[data-testid="title-screen"]');
await film.evaluate(() => window.__CAPY__?.startDemo());
await film.waitForTimeout(56000);
const video = film.video();
await filming.close();
const saved = await video?.path();
if (saved) {
  fs.copyFileSync(saved, path.join(out, 'gameplay.webm'));
  console.log('video', path.join(out, 'gameplay.webm'));
}
await browser.close();
