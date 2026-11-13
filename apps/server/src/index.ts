import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { loadConfig } from './config.js';
import { createApp } from './app.js';
const config = loadConfig(process.env);
const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: config.DATABASE_URL }),
});
await db.$connect();
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
