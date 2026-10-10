/**
 * Shrinks full-length downloads in sources/ to a 3-minute piece each, so a
 * 9-hour, 45 GB file becomes a few hundred MB at the same quality (the video
 * and sound are copied, not re-encoded, so it takes seconds).
 *
 * The piece starts a third of the way in, past any fade-in. Three minutes
 * is plenty: plan.mjs cuts three 12-second Reels from different points in it.
 *
 *   node trim.mjs            make <name>.trim.<ext> next to each long file
 *   node trim.mjs --delete   the same, then delete each original once its
 *                            piece is checked (length and sound present)
 *
 * After trimming, rename the piece to the video's YouTube id (or ask Claude to
 * match it) and run node plan.mjs.
 */
import { execFileSync } from 'node:child_process';
import { readdirSync, rmSync, statSync } from 'node:fs';
import { posix } from 'node:path';
import { durationOf } from './render.mjs';

const PIECE = 180;              // seconds kept
const LONG = 10 * 60;           // only files longer than this are trimmed
const del = process.argv.includes('--delete');
const gb = (b) => (b / 1e9).toFixed(1);

const hasAudio = (file) => execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'a', '-show_entries', 'stream=index', '-of', 'csv=p=0', file]).toString().trim() !== '';

for (const name of readdirSync('sources')) {
  if (!/\.(mp4|mov|mkv|webm|m4v)$/i.test(name) || /\.trim\./.test(name)) continue;
  const src = posix.join('sources', name);
  const d = durationOf(src);
  if (d <= LONG) continue;
  const out = src.replace(/\.(\w+)$/, '.trim.$1');
  const start = Math.round(d / 3);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', String(start), '-i', src, '-t', String(PIECE), '-map', '0:v:0', '-map', '0:a:0', '-c', 'copy', '-avoid_negative_ts', 'make_zero', out], { stdio: 'inherit' });
  const kept = durationOf(out);
  const ok = kept > PIECE - 10 && hasAudio(out);
  console.log(`${ok ? '✓' : '✗'} ${name}: ${gb(statSync(src).size)} GB, ${Math.round(d / 60)} min -> ${posix.basename(out)} ${gb(statSync(out).size)} GB, ${Math.round(kept)} s`);
  if (del && ok) { rmSync(src); console.log(`  deleted ${name}`); }
  if (!ok) console.log('  the piece looks wrong, so the original was kept');
}
