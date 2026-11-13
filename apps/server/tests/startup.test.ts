import { spawnSync } from 'node:child_process';
import { expect, it } from 'vitest';
it('refuses to announce startup when PostgreSQL authentication fails', () => {
  const url = new URL(process.env.DATABASE_URL!);
  url.password = 'deliberately-invalid-startup-test-password';
  const child = spawnSync(
    process.execPath,
    ['--import', 'tsx', 'src/index.ts'],
    {
      env: {
        ...process.env,
        DATABASE_URL: url.toString(),
        JWT_SECRET: 'startup-test-secret-'.repeat(3),
        WEB_ORIGIN: 'http://localhost:5173',
        PORT: '3099',
      },
      encoding: 'utf8',
      timeout: 15000,
    },
  );
  expect(child.error).toBeUndefined();
  expect(child.status).toBe(1);
  expect(child.stderr).toContain('Database connection failed');
  expect(child.stderr).toContain('apps/server/.env');
  expect(child.stdout).not.toContain('API listening');
  expect(child.stderr).not.toContain(url.password);
});
