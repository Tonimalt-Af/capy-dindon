import { expect, test } from 'playwright/test';

test('loads, reaches the camp, and clears a challenge', async ({ page }, info) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  await page.goto('/capy-dindon/?nosw=1');
  await expect(page.getByTestId('title-screen')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'CapyDindon' })).toBeVisible();
  await page.getByTestId('btn-play').click();
  await expect(page.getByTestId('intro-screen')).toBeVisible();
  await page.getByTestId('skip-intro').click();
  await expect(page.getByTestId('hub')).toBeVisible();
  const touch = page.getByTestId('touch-controls');
  if (info.project.name === 'desktop') await expect(touch).toBeHidden();
  else await expect(touch).toBeVisible();
  await page.evaluate(() => window.__CAPY__?.startChallenge('parade'));
  await expect(page.getByTestId('challenge-parade')).toBeVisible();
  await page.evaluate(() => window.__CAPY__?.completeCurrentChallenge());
  await expect(page.getByTestId('challenge-complete')).toBeVisible();
  const state = await page.evaluate(() => window.__CAPY__?.getState());
  expect(state?.challenge?.id).toBe('parade');
  expect(state?.relics).toBeGreaterThan(0);
  expect(errors, errors.join('\n')).toEqual([]);
});

test('asks for landscape in portrait', async ({ page }) => {
  await page.setViewportSize({ width: 820, height: 1100 });
  await page.goto('/capy-dindon/?nosw=1');
  await expect(page.getByTestId('portrait')).toBeVisible();
});
