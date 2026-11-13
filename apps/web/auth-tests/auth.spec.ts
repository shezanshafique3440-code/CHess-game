import { test, expect } from '@playwright/test';
test('protected lobby, registration, reload, logout and login with real cookies', async ({
  page,
  context,
}) => {
  await page.goto('/#/lobby');
  await expect(page).toHaveURL(/#\/login$/);
  await page.getByRole('link', { name: 'Create account', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Create account', exact: true }),
  ).toBeVisible();
  const unique = crypto.randomUUID().replaceAll('-', '').slice(0, 12);
  const email = `${unique}@example.com`;
  await page.getByLabel('Username', { exact: true }).fill(`player_${unique}`);
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page
    .getByLabel('Password', { exact: true })
    .fill('strong-test-password');
  await page
    .getByRole('button', { name: 'Create account', exact: true })
    .click();
  await expect(page).toHaveURL(/#\/lobby$/);
  await expect(page.locator('h3')).toHaveText(`player_${unique}`);
  const cookie = (await context.cookies()).find(
    (cookie) => cookie.name === '__Host-sangat-session',
  );
  expect(cookie).toMatchObject({
    secure: true,
    httpOnly: true,
    sameSite: 'Lax',
  });
  expect(await page.evaluate(() => document.cookie)).not.toContain(
    '__Host-sangat-session',
  );
  await page.reload();
  await expect(page.locator('h3')).toHaveText(`player_${unique}`);
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page).toHaveURL(/#\/login$/);
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page
    .getByLabel('Password', { exact: true })
    .fill('wrong-test-password');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('incorrect');
  await page
    .getByLabel('Password', { exact: true })
    .fill('strong-test-password');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/#\/lobby$/);
});
test('guest session, Urdu screens, and local chess remain accessible', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#/login');
  await page.getByRole('button', { name: 'اردو', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await page
    .getByRole('button', { name: 'مہمان بن کر کھیلیں', exact: true })
    .click();
  await expect(page).toHaveURL(/#\/lobby$/);
  await expect(page.locator('h3')).toContainText('guest_');
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole('button', { name: 'English', exact: true }).click();
  await page
    .getByRole('link', { name: 'Play locally', exact: false })
    .last()
    .click();
  await expect(page.locator('[data-square="e2"]')).toBeVisible();
  await expect(page.locator('h1')).toContainText('Good things');
  await page.getByRole('button', { name: 'With a friend' }).click();
  await page.locator('[data-square="e2"]').click();
  await page.locator('[data-square="e4"]').click();
  await expect(page.locator('.move-list')).toContainText('e4');
});
