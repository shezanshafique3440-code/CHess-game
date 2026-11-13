import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { randomBytes, randomUUID } from 'node:crypto';
import { Prisma, type PrismaClient, type User } from '@prisma/client';
import { z } from 'zod';
import type { ServerConfig } from './config.js';
import { registerSchema, loginSchema, guestSchema } from './validation.js';
export const COOKIE_NAME = '__Host-sangat-session';
const cookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: 'lax' as const,
  path: '/',
};
const hashOptions = {
  type: argon2.argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
};
const sessionSchema = z.object({
  sub: z.uuid(),
  version: z.number().int().nonnegative(),
});
const publicUser = (user: User) => ({
  id: user.id,
  username: user.username,
  email: user.email,
  rating: user.rating,
  isGuest: user.isGuest,
  expiresAt: user.expiresAt,
  createdAt: user.createdAt,
});
export function createApp(
  db: PrismaClient,
  config: ServerConfig,
  limits = { auth: 60, creation: 15, login: 10 },
) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', config.TRUST_PROXY_HOPS);
  app.use(helmet());
  app.use(
    cors({
      origin: config.WEB_ORIGIN,
      credentials: true,
      methods: ['GET', 'POST'],
      allowedHeaders: ['Content-Type'],
    }),
  );
  app.use(express.json({ limit: '16kb' }));
  app.use(cookieParser());
  app.get('/health', async (_req, res) => {
    await db.$queryRaw`SELECT 1`;
    res.json({ status: 'ok' });
  });
  app.use('/auth', (_req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });
  app.use('/auth', (req, res, next) => {
    if (
      req.method === 'POST' &&
      req.get('origin') &&
      req.get('origin') !== config.WEB_ORIGIN
    ) {
      res.status(403).json({ code: 'ORIGIN_NOT_ALLOWED' });
      return;
    }
    next();
  });
  const limiter = (
    limit: number,
    windowMs: number,
    skipSuccessfulRequests = false,
  ) =>
    rateLimit({
      windowMs,
      limit,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      skipSuccessfulRequests,
      handler: (_req, res) => res.status(429).json({ code: 'RATE_LIMITED' }),
    });
  app.use('/auth', limiter(limits.auth, 15 * 60 * 1000));
  const creationLimit = limiter(limits.creation, 60 * 60 * 1000);
  const loginLimit = limiter(limits.login, 15 * 60 * 1000, true);
  // Equalize Argon2 work for an unknown email; no credential is persisted here.
  const dummyHash = argon2.hash(randomBytes(32), hashOptions);
  async function currentUser(req: Request): Promise<User | null> {
    const token: unknown = req.cookies[COOKIE_NAME];
    if (typeof token !== 'string') return null;
    let payload: z.infer<typeof sessionSchema>;
    try {
      payload = sessionSchema.parse(
        jwt.verify(token, config.JWT_SECRET, {
          algorithms: ['HS256'],
          issuer: 'sangat-auth',
          audience: 'sangat-web',
        }),
      );
    } catch {
      return null;
    }
    const user = await db.user.findUnique({ where: { id: payload.sub } });
    if (
      !user ||
      user.authVersion !== payload.version ||
      (user.isGuest &&
        (!user.expiresAt || user.expiresAt.getTime() <= Date.now()))
    )
      return null;
    return user;
  }
  function issueSession(res: Response, user: User) {
    const duration = user.isGuest
      ? Math.max(1, Math.floor((user.expiresAt!.getTime() - Date.now()) / 1000))
      : 7 * 24 * 60 * 60;
    const token = jwt.sign({ version: user.authVersion }, config.JWT_SECRET, {
      algorithm: 'HS256',
      subject: user.id,
      expiresIn: duration,
      issuer: 'sangat-auth',
      audience: 'sangat-web',
      jwtid: randomUUID(),
    });
    res.cookie(COOKIE_NAME, token, {
      ...cookieOptions,
      maxAge: duration * 1000,
    });
  }
  app.post('/auth/register', creationLimit, async (req, res) => {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        code: 'VALIDATION_ERROR',
        fields: [...new Set(parsed.error.issues.map((issue) => issue.path[0]))],
      });
      return;
    }
    const { password, ...data } = parsed.data;
    const user = await db.user.create({
      data: { ...data, passwordHash: await argon2.hash(password, hashOptions) },
    });
    issueSession(res, user);
    res.status(201).json({ user: publicUser(user) });
  });
  app.post('/auth/login', loginLimit, async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ code: 'VALIDATION_ERROR' });
      return;
    }
    const user = await db.user.findUnique({
      where: { email: parsed.data.email },
    });
    const valid = await argon2.verify(
      user?.passwordHash || (await dummyHash),
      parsed.data.password,
    );
    if (!user || user.isGuest || !valid) {
      res.status(401).json({ code: 'INVALID_CREDENTIALS' });
      return;
    }
    issueSession(res, user);
    res.json({ user: publicUser(user) });
  });
  app.post('/auth/guest', creationLimit, async (req, res) => {
    if (!guestSchema.safeParse(req.body ?? {}).success) {
      res.status(400).json({ code: 'VALIDATION_ERROR' });
      return;
    }
    const user = await db.user.create({
      data: {
        username: `guest_${randomBytes(8).toString('hex')}`,
        isGuest: true,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });
    issueSession(res, user);
    res.status(201).json({ user: publicUser(user) });
  });
  app.get('/auth/me', async (req, res) => {
    const user = await currentUser(req);
    if (!user) {
      res.clearCookie(COOKIE_NAME, cookieOptions);
      res.status(401).json({ code: 'UNAUTHENTICATED' });
      return;
    }
    res.json({ user: publicUser(user) });
  });
  app.post('/auth/logout', async (req, res) => {
    const user = await currentUser(req);
    if (user)
      await db.user.updateMany({
        where: { id: user.id, authVersion: user.authVersion },
        data: { authVersion: { increment: 1 } },
      });
    res.clearCookie(COOKIE_NAME, cookieOptions);
    res.status(204).end();
  });
  app.use((_req, res) => res.status(404).json({ code: 'NOT_FOUND' }));
  app.use(
    (error: unknown, _req: Request, res: Response, _next: NextFunction) => {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        res.status(409).json({ code: 'ACCOUNT_EXISTS' });
        return;
      }
      if (error instanceof SyntaxError && 'body' in error) {
        res.status(400).json({ code: 'INVALID_JSON' });
        return;
      }
      if (
        typeof error === 'object' &&
        error &&
        'type' in error &&
        error.type === 'entity.too.large'
      ) {
        res.status(413).json({ code: 'PAYLOAD_TOO_LARGE' });
        return;
      }
      // Never log request bodies, cookies, JWTs, passwords or database URLs.
      console.error(
        'API request failed',
        error instanceof Error ? error.name : 'UnknownError',
      );
      res.status(503).json({ code: 'SERVICE_UNAVAILABLE' });
    },
  );
  return app;
}
