import { test, expect, type Page } from '@playwright/test';
async function tap(page: Page, from: string, to: string) {
  await page.locator(`[data-square="${from}"]`).click();
  await page.locator(`[data-square="${to}"]`).click();
}
async function local(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'With a friend' }).click();
}
test('clock preset, increment, undo and timeout modal', async ({ page }) => {
  await local(page);
  await page.clock.install();
  await page.getByLabel('Time control').selectOption('3+2');
  await tap(page, 'e2', 'e4');
  await expect(page.locator('.clock-face time').first()).toHaveText('3:02');
  await expect(page.getByLabel('Time control')).toBeDisabled();
  await page.getByRole('button', { name: 'Undo', exact: false }).click();
  await expect(page.locator('.clock-face time').first()).toHaveText('3:00');
  await page.getByLabel('Time control').selectOption('1+0');
  await page.getByRole('button', { name: 'Start clock', exact: true }).click();
  await page.clock.fastForward(61000);
  await expect(page.getByRole('dialog')).toContainText('Black wins');
  await expect(page.getByRole('dialog')).toContainText('Time ran out');
  await page.getByRole('button', { name: 'Review game', exact: true }).click();
  await tap(page, 'e2', 'e4');
  await expect(page.locator('.empty-history')).toBeVisible();
  await page.reload();
  await expect(page.getByRole('dialog')).toContainText('Time ran out');
});
test('agreement, resignation, PGN result export and invalid import protection', async ({
  page,
}) => {
  await local(page);
  await tap(page, 'e2', 'e4');
  await page.getByRole('button', { name: 'Offer draw', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText(
    'Both players must agree',
  );
  await page.getByRole('button', { name: 'Decline', exact: true }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.getByRole('button', { name: 'Offer draw', exact: true }).click();
  await page.getByRole('button', { name: 'Accept draw', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('Draw by agreement');
  await page.getByRole('button', { name: 'Review game', exact: true }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export PGN', exact: false }).click();
  const download = await downloadPromise;
  const stream = await download.createReadStream();
  const parts = [];
  for await (const chunk of stream!) parts.push(chunk);
  expect(Buffer.concat(parts).toString()).toContain('[Result "1/2-1/2"]');
  await page.getByRole('button', { name: 'New game', exact: false }).click();
  await page.getByRole('button', { name: 'Let’s play' }).click();
  await page.getByRole('button', { name: 'Resign', exact: true }).click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Resign', exact: true })
    .click();
  await expect(page.getByRole('dialog')).toContainText('Black wins');
  await page.getByRole('button', { name: 'Review game', exact: true }).click();
  await page.reload();
  await expect(page.getByRole('dialog')).toContainText('Resign');
  await page.getByRole('button', { name: 'Review game', exact: true }).click();
  await page.getByRole('button', { name: 'Import PGN', exact: false }).click();
  await page.locator('textarea').fill('1. invalid');
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Import PGN', exact: true })
    .click();
  await expect(page.getByRole('alert')).toContainText('Invalid PGN');
});
test('PGN import, history navigation and customization persist', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Import PGN', exact: false }).click();
  await page.locator('textarea').fill('1. e4 e5 2. Nf3 Nc6 *');
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Import PGN', exact: true })
    .click();
  await expect(page.locator('.move-list')).toContainText('Nc6');
  await page.getByRole('button', { name: 'e4', exact: true }).click();
  await expect(
    page.locator('[data-square="e7"] [data-piece="bP"]'),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Hint', exact: false }),
  ).toBeDisabled();
  await page
    .getByRole('button', { name: 'Return to live game', exact: true })
    .first()
    .click();
  await expect(
    page.locator('[data-square="c6"] [data-piece="bN"]'),
  ).toBeVisible();
  await page.getByLabel('Board theme').selectOption('blue');
  await page.getByLabel('Piece set').selectOption('letters');
  await expect(page.locator('[data-square="a1"] text')).toHaveText('R');
  await page.getByRole('button', { name: 'Mute sounds', exact: true }).click();
  await page.reload();
  await expect(page.getByLabel('Board theme')).toHaveValue('blue');
  await expect(page.getByLabel('Piece set')).toHaveValue('letters');
  await expect(
    page.getByRole('button', { name: 'Enable sounds', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'اردو' }).click();
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.getByLabel('وقت کا انتخاب')).toBeVisible();
});
test('checkmate and stalemate game-over dialogs from imported positions', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Import PGN', exact: false }).click();
  await page.locator('textarea').fill('1. f3 e5 2. g4 Qh4# 0-1');
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Import PGN', exact: true })
    .click();
  await expect(page.getByRole('dialog')).toContainText('Black wins');
  await expect(page.getByRole('dialog')).toContainText('Checkmate');
  await page.getByRole('button', { name: 'Review game', exact: true }).click();
  await page.getByRole('button', { name: 'Import PGN', exact: false }).click();
  await page
    .locator('textarea')
    .fill('[SetUp "1"]\n[FEN "7k/5Q2/6K1/8/8/8/8/8 b - - 0 1"]\n\n*');
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Import PGN', exact: true })
    .click();
  await expect(page.getByRole('dialog')).toContainText('Draw by stalemate');
});
test('premove runs after the computer reply and is cancellable', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const NativeWorker = window.Worker;
    window.Worker = class extends NativeWorker {
      postMessage(message: unknown, options?: StructuredSerializeOptions) {
        if (typeof message === 'string' && message.startsWith('go '))
          setTimeout(() => super.postMessage(message, options), 1200);
        else super.postMessage(message, options);
      }
    };
  });
  await page.goto('/');
  await expect(
    page.getByRole('button', { name: 'Hint', exact: false }),
  ).toBeEnabled();
  await tap(page, 'e2', 'e4');
  await tap(page, 'g1', 'f3');
  await expect(
    page.getByRole('button', { name: 'Cancel premove' }),
  ).toBeVisible();
  await expect(page.locator('.move-list')).toContainText('Nf3');
  await expect(
    page.locator('.move-row').nth(1).locator('b').nth(1),
  ).not.toHaveText('—');
  await tap(page, 'b1', 'c3');
  // White just moved twice automatically; a fresh queue is only possible while Black thinks.
  await page.getByRole('button', { name: 'New game', exact: false }).click();
  await page.getByRole('button', { name: 'Let’s play' }).click();
  await tap(page, 'e2', 'e4');
  await tap(page, 'g1', 'f3');
  await page.getByRole('button', { name: 'Cancel premove' }).click();
  await expect(
    page.locator('.move-row').first().locator('b').nth(1),
  ).not.toHaveText('—');
  await expect(page.locator('.move-row')).toHaveCount(1);
});
