import { test, expect, type Page } from '@playwright/test';
async function tap(page: Page, from: string, to: string) {
  await page.locator(`[data-square="${from}"]`).click();
  await page.locator(`[data-square="${to}"]`).click();
}
test('local tap moves, history, undo, save, language and tutorial', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await page.getByRole('button', { name: 'With a friend' }).click();
  await tap(page, 'e2', 'e4');
  await tap(page, 'e7', 'e5');
  await expect(page.locator('.move-list')).toContainText('e4');
  await expect(page.locator('.move-list')).toContainText('e5');
  await page.reload();
  await expect(page.locator('.move-list')).toContainText('e5');
  await page.getByRole('button', { name: 'Undo', exact: false }).click();
  await expect(page.locator('.move-list')).not.toContainText('e5');
  await page.getByRole('button', { name: 'اردو' }).click();
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.locator('h1')).toContainText('چالیں');
  await page.getByRole('button', { name: 'English', exact: false }).click();
  await page.getByRole('button', { name: 'Learn the basics' }).first().click();
  await expect(page.locator('.lesson')).toHaveCount(5);
  await page.getByRole('button', { name: 'Back to the board' }).click();
  await page.getByRole('button', { name: 'New game' }).click();
  await page.getByRole('button', { name: 'Let’s play' }).click();
  await expect(page.locator('.empty-history')).toBeVisible();
  expect(errors).toEqual([]);
});
test('real WASM computer reply, hint and full-turn undo', async ({ page }) => {
  await page.goto('/');
  await expect(
    page.getByRole('button', { name: 'Hint', exact: false }),
  ).toBeEnabled({ timeout: 30000 });
  await page.getByRole('button', { name: 'Hint', exact: false }).click();
  await expect(page.locator('.hint-message')).toContainText('Try', {
    timeout: 30000,
  });
  await tap(page, 'e2', 'e4');
  await expect(page.locator('.move-row b').nth(1)).not.toHaveText('—', {
    timeout: 30000,
  });
  await page.getByRole('button', { name: 'Undo', exact: false }).click();
  await expect(page.locator('.empty-history')).toBeVisible();
  for (const level of ['Casual', 'Challenger']) {
    await page.getByRole('button', { name: level, exact: true }).click();
    await tap(page, 'd2', 'd4');
    await expect(page.locator('.move-row b').nth(1)).not.toHaveText('—', {
      timeout: 30000,
    });
    await page.getByRole('button', { name: 'Undo', exact: false }).click();
    await expect(page.locator('.empty-history')).toBeVisible();
  }
});
test('mobile layout and offline reload with WASM', async ({
  page,
  context,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.getByText('Offline ready', { exact: true })).toBeVisible({
    timeout: 30000,
  });
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller)
      await new Promise<void>((resolve) =>
        navigator.serviceWorker.addEventListener(
          'controllerchange',
          () => resolve(),
          { once: true },
        ),
      );
  });
  await page.screenshot({ path: '/tmp/sangat-mobile.png', fullPage: true });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('h1')).toContainText('Good things');
  await expect(
    page.getByRole('button', { name: 'Hint', exact: false }),
  ).toBeEnabled({ timeout: 30000 });
  await tap(page, 'e2', 'e4');
  await expect(page.locator('.move-row b').nth(1)).not.toHaveText('—', {
    timeout: 30000,
  });
});

test('touch controls, legal highlights, board flip and Urdu at narrow width', async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 320, height: 740 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  await page.goto('/');
  await page.getByRole('button', { name: 'With a friend' }).tap();
  await page.locator('[data-square="e2"]').tap();
  await expect(
    page.locator('[data-square="e4"] > div').first(),
  ).toHaveAttribute('style', /radial-gradient/);
  await page.locator('[data-square="e4"]').tap();
  await expect(page.locator('.move-list')).toContainText('e4');
  await page.getByRole('button', { name: 'Flip board' }).tap();
  await page.getByRole('button', { name: 'اردو' }).tap();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: '/tmp/sangat-urdu.png', fullPage: true });
  await context.close();
});

test('promotion choice and an insufficient-material draw', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('sangat-mode', 'local');
    localStorage.setItem(
      'sangat-pgn',
      '[SetUp "1"]\n[FEN "7k/P7/8/8/8/8/8/7K w - - 0 1"]\n\n*',
    );
  });
  await page.goto('/');
  await tap(page, 'a7', 'a8');
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Knight', exact: false }).click();
  await expect(page.locator('.move-list')).toContainText('a8=N');
  await expect(page.getByRole('status').first()).toContainText('Draw');
});
