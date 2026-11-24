// Solmar Bay — Sunset Run v6, a gta6-01 entry (Node 22, standard library only).
// The game lives in this directory's game/ folder — plain static files a desktop
// browser loads offline (game/index.html, its ES modules and the vendored
// three.js module build) — and this program hands it in: it copies game/ and
// screenshots/ from beside this file to /output and writes /output/dossier.json,
// the summary the judge reads, with the vendored make.fun library.
//
// Serve the game locally first and play it, then run this program:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

function fail(message) {
  throw new Error(`main.ts: ${message}`);
}

function checkShots(dir) {
  if (!existsSync(dir)) fail('screenshots/: no such directory — take 3 or 4 shots of the game first');
  const shots = readdirSync(dir).filter((name) => !name.startsWith('.')).sort();
  if (shots.length < 3 || shots.length > 4) fail(`screenshots/: holds ${shots.length} images, need 3 or 4`);
  for (const name of shots) {
    const size = statSync(join(dir, name)).size;
    if (size > 262144) fail(`screenshots/${name}: ${size} bytes, over the 256 KiB cap`);
  }
  return shots;
}

const shots = checkShots(join(here, 'screenshots'));
if (!existsSync(join(here, 'game', 'index.html'))) fail('game/index.html: no such file');

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the
// bytes; the others refuse an entry the scorer would refuse — more than 4
// screenshots or one over 256 KiB, more than 993 files in game/ or 48 MiB of
// game files in all, or a path under game/ over 1000 bytes.
const dossier = buildDossier(out, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(out, 'dossier.json'), dossier);

console.log(`Solmar Bay v6 handed in: ${shots.length} screenshots (${shots[0]} is the cover), dossier ${dossier.length} bytes.`);
