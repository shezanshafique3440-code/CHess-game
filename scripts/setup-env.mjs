import { readFile, writeFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
for (const app of ['server', 'web']) {
  const folder = new URL(`../apps/${app}/`, import.meta.url);
  let contents = await readFile(new URL('.env.example', folder), 'utf8');
  if (app === 'server')
    contents = contents.replace(
      'replace-with-a-random-secret-of-at-least-32-characters',
      randomBytes(48).toString('hex'),
    );
  try {
    await writeFile(new URL('.env', folder), contents, {
      flag: 'wx',
      mode: 0o600,
    });
    console.log(`Created apps/${app}/.env`);
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
    console.log(`Kept existing apps/${app}/.env`);
  }
}
