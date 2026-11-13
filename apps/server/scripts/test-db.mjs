import 'dotenv/config';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const url = process.env.TEST_DATABASE_URL;
if (!url)
  throw new Error(
    'Set TEST_DATABASE_URL to a separate PostgreSQL database ending in _test.',
  );
const parsed = new URL(url);
const development = process.env.DATABASE_URL
  ? new URL(process.env.DATABASE_URL)
  : null;
if (
  !/^postgres(ql)?:$/.test(parsed.protocol) ||
  !parsed.pathname.endsWith('_test') ||
  (development &&
    parsed.host === development.host &&
    parsed.pathname === development.pathname)
)
  throw new Error(
    'Refusing to run destructive auth tests against a non-test or development database.',
  );
const env = { ...process.env, NODE_ENV: 'test', DATABASE_URL: url };
const test = process.argv.includes('--browser')
  ? [
      require.resolve('@playwright/test/cli'),
      ['test', '--config', '../web/playwright.auth.config.ts'],
    ]
  : [require.resolve('vitest/vitest.mjs'), ['run']];
for (const [entry, args] of [
  [fileURLToPath(new URL('./migrate.mjs', import.meta.url)), []],
  test,
]) {
  const result = spawnSync(process.execPath, [entry, ...args], {
    env,
    stdio: 'inherit',
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
