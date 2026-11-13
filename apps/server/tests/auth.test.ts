import { beforeEach, afterAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { createApp, COOKIE_NAME } from '../src/app.js';
import type { ServerConfig } from '../src/config.js';
if (
  process.env.NODE_ENV !== 'test' ||
  !new URL(process.env.DATABASE_URL!).pathname.endsWith('_test')
)
  throw new Error(
    'Auth tests require the isolated test database. Run npm run test:server.',
  );
const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});
const config: ServerConfig = {
  DATABASE_URL: process.env.DATABASE_URL!,
  JWT_SECRET: 'test-only-secret-'.repeat(4),
  WEB_ORIGIN: 'http://localhost:5173',
  PORT: 3001,
  NODE_ENV: 'test',
  TRUST_PROXY_HOPS: 0,
};
const credentials = {
  username: 'PlayerOne',
  email: 'PLAYER@EXAMPLE.COM',
  password: 'great-password-123',
};
let app = createApp(db, config);
const session = (response: request.Response) =>
  (response.headers['set-cookie'] as unknown as string[])[0].split(';')[0];
beforeEach(async () => {
  await db.game.deleteMany();
  await db.user.deleteMany();
  app = createApp(db, config);
});
afterAll(async () => {
  await db.game.deleteMany();
  await db.user.deleteMany();
  await db.$disconnect();
});
describe('auth endpoints against PostgreSQL', () => {
  it('registers, hashes with Argon2id, sets a Secure HttpOnly cookie and restores me', async () => {
    const response = await request(app)
      .post('/auth/register')
      .send(credentials)
      .expect(201);
    expect(response.body.user).toMatchObject({
      username: 'playerone',
      email: 'player@example.com',
      rating: 1200,
      isGuest: false,
    });
    expect(response.body.user).not.toHaveProperty('passwordHash');
    expect(response.body).not.toHaveProperty('token');
    const cookie = response.headers['set-cookie'][0];
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('Secure');
    expect(cookie).toContain('SameSite=Lax');
    expect(cookie).toContain('Path=/');
    const stored = await db.user.findUniqueOrThrow({
      where: { id: response.body.user.id },
    });
    expect(stored.passwordHash).toMatch(/^\$argon2id\$/);
    expect(
      await argon2.verify(stored.passwordHash!, credentials.password),
    ).toBe(true);
    const me = await request(app)
      .get('/auth/me')
      .set('Cookie', session(response))
      .expect(200);
    expect(me.body.user.id).toBe(stored.id);
    expect(me.headers['cache-control']).toBe('no-store');
  });
  it('handles unique username and email conflicts after normalization', async () => {
    await request(app).post('/auth/register').send(credentials).expect(201);
    await request(app)
      .post('/auth/register')
      .send({ ...credentials, email: 'other@example.com' })
      .expect(409);
    await request(app)
      .post('/auth/register')
      .send({ ...credentials, username: 'someone' })
      .expect(409);
  });
  it('logs in with valid credentials, and gives the same error for unknown/wrong credentials', async () => {
    await request(app).post('/auth/register').send(credentials);
    const login = await request(app)
      .post('/auth/login')
      .send({ email: ' player@example.com ', password: credentials.password })
      .expect(200);
    await request(app)
      .get('/auth/me')
      .set('Cookie', session(login))
      .expect(200);
    const wrong = await request(app)
      .post('/auth/login')
      .send({ email: credentials.email, password: 'wrong-password' })
      .expect(401);
    const absent = await request(app)
      .post('/auth/login')
      .send({ email: 'absent@example.com', password: 'wrong-password' })
      .expect(401);
    expect(wrong.body).toEqual(absent.body);
  });
  it('logs out idempotently, clears cookies, and revokes replayed JWTs', async () => {
    const registration = await request(app)
      .post('/auth/register')
      .send(credentials);
    const cookie = session(registration);
    const logout = await request(app)
      .post('/auth/logout')
      .set('Cookie', cookie)
      .expect(204);
    expect(logout.headers['set-cookie'][0]).toContain(
      'Expires=Thu, 01 Jan 1970',
    );
    await request(app).get('/auth/me').set('Cookie', cookie).expect(401);
    await request(app).post('/auth/logout').expect(204);
  });
  it('creates distinct temporary guests, and rejects expired guests', async () => {
    const first = await request(app).post('/auth/guest').send({}).expect(201);
    const second = await request(app).post('/auth/guest').send({}).expect(201);
    expect(first.body.user.username).toMatch(/^guest_[a-f0-9]{16}$/);
    expect(first.body.user.username).not.toBe(second.body.user.username);
    expect(first.body.user.email).toBeNull();
    expect(new Date(first.body.user.expiresAt).getTime()).toBeGreaterThan(
      Date.now() + 23 * 60 * 60 * 1000,
    );
    await request(app)
      .get('/auth/me')
      .set('Cookie', session(first))
      .expect(200);
    await db.user.update({
      where: { id: first.body.user.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    await request(app)
      .get('/auth/me')
      .set('Cookie', session(first))
      .expect(401);
  });
  it('rejects malformed, expired, wrongly signed and wrong-algorithm JWTs', async () => {
    const registration = await request(app)
      .post('/auth/register')
      .send(credentials);
    const sub = registration.body.user.id;
    for (const token of [
      'bad-token',
      jwt.sign({ version: 0 }, config.JWT_SECRET, {
        subject: sub,
        expiresIn: -1,
        issuer: 'sangat-auth',
        audience: 'sangat-web',
      }),
      jwt.sign({ version: 0 }, 'wrong-secret', { subject: sub }),
      jwt.sign({ version: 0 }, config.JWT_SECRET, {
        subject: sub,
        algorithm: 'HS384',
      }),
    ])
      await request(app)
        .get('/auth/me')
        .set('Cookie', `${COOKIE_NAME}=${token}`)
        .expect(401);
    await request(app).get('/auth/me').expect(401);
  });
  it('validates payloads and rejects oversized or malformed JSON', async () => {
    await request(app)
      .post('/auth/register')
      .send({ ...credentials, rating: 3000 })
      .expect(400);
    await request(app)
      .post('/auth/login')
      .send({ email: 'not-email', password: 'x' })
      .expect(400);
    await request(app)
      .post('/auth/guest')
      .send({ username: 'admin' })
      .expect(400);
    await request(app)
      .post('/auth/register')
      .set('Content-Type', 'application/json')
      .send('{bad')
      .expect(400);
    await request(app)
      .post('/auth/register')
      .send({ ...credentials, password: 'x'.repeat(20000) })
      .expect(413);
    expect(await db.user.count()).toBe(0);
  });
  it('allows the web origin with credentials and blocks cross-origin mutation', async () => {
    const response = await request(app)
      .get('/auth/me')
      .set('Origin', config.WEB_ORIGIN)
      .expect(401);
    expect(response.headers['access-control-allow-origin']).toBe(
      config.WEB_ORIGIN,
    );
    expect(response.headers['access-control-allow-credentials']).toBe('true');
    await request(app)
      .post('/auth/guest')
      .set('Origin', 'https://evil.example')
      .send({})
      .expect(403);
    expect(await db.user.count()).toBe(0);
    const preflight = await request(app)
      .options('/auth/login')
      .set('Origin', config.WEB_ORIGIN)
      .set('Access-Control-Request-Method', 'POST')
      .expect(204);
    expect(preflight.headers['access-control-allow-origin']).toBe(
      config.WEB_ORIGIN,
    );
  });
  it('rate limits auth, account creation and failed logins', async () => {
    const limited = createApp(db, config, { auth: 2, creation: 2, login: 2 });
    await request(limited).get('/auth/me');
    await request(limited).get('/auth/me');
    await request(limited).get('/auth/me').expect(429);
    const creation = createApp(db, config, {
      auth: 100,
      creation: 1,
      login: 2,
    });
    await request(creation).post('/auth/guest').send({}).expect(201);
    await request(creation).post('/auth/guest').send({}).expect(429);
    const login = createApp(db, config, { auth: 100, creation: 100, login: 1 });
    const data = { email: 'unknown@example.com', password: 'wrong-password' };
    await request(login).post('/auth/login').send(data).expect(401);
    await request(login).post('/auth/login').send(data).expect(429);
  });
  it('persists schema relations and enforces per-game unique ply', async () => {
    const a = await request(app).post('/auth/guest').send({});
    const b = await request(app).post('/auth/guest').send({});
    const game = await db.game.create({
      data: {
        whiteId: a.body.user.id,
        blackId: b.body.user.id,
        timeControl: '3+2',
        whiteRatingBefore: 1200,
        blackRatingBefore: 1200,
      },
    });
    const move = {
      gameId: game.id,
      ply: 1,
      san: 'e4',
      fen: 'test-fen',
      timeLeftMs: 180000,
    };
    await db.move.create({ data: move });
    await expect(db.move.create({ data: move })).rejects.toMatchObject({
      code: 'P2002',
    });
    await db.game.delete({ where: { id: game.id } });
    expect(await db.move.count()).toBe(0);
  });
});
