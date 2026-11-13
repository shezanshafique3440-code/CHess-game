import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { loadConfig } from './config.js';
import { createApp } from './app.js';
const config = loadConfig(process.env);
const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: config.DATABASE_URL }),
});
try {
  // The JS adapter can initialize a pool without authenticating. A real query
  // must succeed before we announce that the API is listening.
  await db.$queryRaw`SELECT 1`;
} catch {
  console.error(
    'Database connection failed. Start PostgreSQL with docker compose up -d --wait postgres, then check DATABASE_URL in apps/server/.env (local Docker defaults to port 5433).',
  );
  await db.$disconnect();
  process.exit(1);
}
const server = createApp(db, config).listen(config.PORT, '0.0.0.0', () =>
  console.log(`Sangat API listening on port ${config.PORT}`),
);
async function shutdown() {
  server.close(async () => {
    await db.$disconnect();
    process.exit(0);
  });
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
