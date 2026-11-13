import { z } from 'zod';
const environment = z.object({
  DATABASE_URL: z.url().refine((value) => /^postgres(ql)?:/.test(value)),
  JWT_SECRET: z
    .string()
    .min(32)
    .refine((value) => !value.includes('replace-with-')),
  WEB_ORIGIN: z
    .url()
    .refine(
      (value) => new URL(value).origin === value,
      'Use an origin without a trailing slash or path',
    ),
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(5).default(0),
});
export type ServerConfig = z.infer<typeof environment>;
export function loadConfig(env: NodeJS.ProcessEnv): ServerConfig {
  const result = environment.safeParse(env);
  if (!result.success)
    throw new Error(
      `Invalid server configuration: ${[...new Set(result.error.issues.map((issue) => issue.path.join('.')))].join(', ')}`,
    );
  if (
    result.data.NODE_ENV === 'production' &&
    !result.data.WEB_ORIGIN.startsWith('https://')
  )
    throw new Error('Production WEB_ORIGIN must use HTTPS');
  return result.data;
}
