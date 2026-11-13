import { describe, expect, it } from 'vitest';
import { registerSchema, loginSchema, guestSchema } from '../src/validation.js';
import { loadConfig } from '../src/config.js';
const valid = {
  username: 'Player_1',
  email: ' PLAYER@EXAMPLE.COM ',
  password: 'correct-horse-123',
};
describe('auth validation', () => {
  it('normalizes usernames and emails, preserving password bytes', () =>
    expect(registerSchema.parse(valid)).toEqual({
      ...valid,
      username: 'player_1',
      email: 'player@example.com',
    }));
  it.each([
    { username: 'x' },
    { username: 'bad name' },
    { username: 'guest_fake' },
    { email: 'invalid' },
    { password: 'short' },
    { password: 'x'.repeat(129) },
    { role: 'admin' },
  ])('rejects invalid registration data %j', (data) =>
    expect(registerSchema.safeParse({ ...valid, ...data }).success).toBe(false),
  );
  it('rejects missing credentials, unknown fields and non-string inputs', () => {
    expect(loginSchema.safeParse({}).success).toBe(false);
    expect(loginSchema.safeParse({ email: 1, password: 2 }).success).toBe(
      false,
    );
    expect(guestSchema.safeParse({ rating: 9999 }).success).toBe(false);
  });
  it('rejects weak/placeholder config and production HTTP origins', () => {
    const config = {
      DATABASE_URL: 'postgresql://localhost/sangat',
      JWT_SECRET: 'a'.repeat(48),
      WEB_ORIGIN: 'http://localhost:5173',
    };
    expect(loadConfig(config).PORT).toBe(3001);
    expect(() => loadConfig({ ...config, JWT_SECRET: 'short' })).toThrow();
    expect(() =>
      loadConfig({
        ...config,
        JWT_SECRET: 'replace-with-a-long-secret-of-32-characters',
      }),
    ).toThrow();
    expect(() => loadConfig({ ...config, NODE_ENV: 'production' })).toThrow();
    expect(() =>
      loadConfig({ ...config, WEB_ORIGIN: 'http://localhost:5173/' }),
    ).toThrow();
  });
});
