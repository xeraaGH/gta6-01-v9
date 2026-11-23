// Solara Bay — a 3D open-world crime game for make.fun's "Make GTA 6" bounty.
// The program hands the game in: it copies game/ and screenshots/ from beside
// this file to the output directory and writes dossier.json with the vendored
// make.fun library. Node 22, standard library only. Run: node main.ts
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Verify the finished output before declaring success: parse dossier.json back
// from the output directory and check it against the scorer's gate caps, so a
// broken handoff fails here (loudly) instead of at the grader.
function verifyOutput(outDir) {
  const fail = (msg) => { throw new Error('output verification failed: ' + msg); };
  const dossierPath = join(outDir, 'dossier.json');
  if (!existsSync(dossierPath)) fail('dossier.json missing from ' + outDir);
  const dossier = JSON.parse(readFileSync(dossierPath, 'utf8'));
  if (dossier.schema !== 'makefun/dossier/v1') fail('unexpected dossier schema ' + dossier.schema);
  if (!Array.isArray(dossier.images) || dossier.images.length < 1 || dossier.images.length > 4) {
    fail('expected 1-4 screenshots, got ' + (dossier.images ? dossier.images.length : 'none'));
  }
  if (typeof dossier.cover !== 'number' || dossier.cover < 0 || dossier.cover >= dossier.images.length) {
    fail('cover index out of range: ' + dossier.cover);
  }
  for (const img of dossier.images) {
    const decoded = Buffer.from(img.base64, 'base64').length;
    if (decoded > 262144) fail('screenshot ' + img.name + ' is ' + decoded + ' bytes (cap 262144)');
    if (img.media_type !== 'image/jpeg') fail('screenshot ' + img.name + ' is not JPEG');
  }
  const textBytes = Buffer.byteLength(dossier.text ?? '', 'utf8');
  if (textBytes > 163840) fail('dossier text is ' + textBytes + ' bytes (cap 163840)');
  // the game itself: index.html must exist, and the whole game/ tree must fit the caps
  const indexPath = join(outDir, 'game', 'index.html');
  if (!existsSync(indexPath) || statSync(indexPath).size === 0) fail('game/index.html missing or empty');
  let files = 0, bytes = 0;
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      const st = statSync(p);
      if (st.isDirectory()) walk(p);
      else { files++; bytes += st.size; }
    }
  };
  walk(join(outDir, 'game'));
  if (files > 993) fail('game/ has ' + files + ' files (cap 993)');
  if (bytes > 50331648) fail('game/ is ' + bytes + ' bytes (cap 50331648)');
  console.log(`verified: ${dossier.images.length} screenshots (cover ${dossier.cover}), text ${textBytes} bytes, game ${files} files / ${bytes} bytes`);
}

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the bytes;
// the others refuse an entry the scorer would refuse (more than 4 screenshots or
// one over 256 KiB; more than 993 files in game/ or 48 MiB of game files, in all,
// or a path under game/ over 1000 bytes).
const dossier = buildDossier(out, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(out, 'dossier.json'), dossier);
console.log(`dossier.json written: ${dossier.length} bytes`);
console.log('game/ and screenshots/ copied to ' + out);
verifyOutput(out);
