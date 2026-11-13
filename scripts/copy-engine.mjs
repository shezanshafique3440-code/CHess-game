import { copyFile, mkdir } from 'node:fs/promises';
const source = new URL('../node_modules/stockfish/', import.meta.url);
const destination = new URL('../public/engine/', import.meta.url);
await mkdir(destination, { recursive: true });
// Pin both names to the installed Stockfish version. Fail rather than ship a
// broken worker if a future dependency update changes the engine layout.
for (const extension of ['js', 'wasm']) {
  const file = `stockfish-19-lite-single.${extension}`;
  await copyFile(new URL(`bin/${file}`, source), new URL(file, destination));
  console.log(`Copied ${file}`);
}
await copyFile(
  new URL('Copying.txt', source),
  new URL('../public/STOCKFISH-LICENSE.txt', import.meta.url),
);
