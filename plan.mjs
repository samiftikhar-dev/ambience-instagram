/**
 * Writes clips.json: the order Reels go out in.
 *
 * One clip per hook in catalog.json, so each video gives three Reels cut from
 * different points in the scene. Videos take turns (never the same scene twice
 * in a row), starting with the ones YouTube viewers liked best.
 *
 * Hand edits survive a re-run: start, focus, fit and hold are kept for any clip
 * id already in clips.json. A clip gets its start time once its source video is
 * in sources/ (ffprobe reads the length; cuts are spread through the scene).
 *
 *   node plan.mjs
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { catalog } from './lib.mjs';
import { sourceFor, durationOf, heightOf, LENGTH } from './render.mjs';

const videos = catalog();
const views = existsSync('videos.json') ? JSON.parse(readFileSync('videos.json', 'utf8')) : {};
const old = new Map((existsSync('clips.json') ? JSON.parse(readFileSync('clips.json', 'utf8')) : []).map((c) => [c.id, c]));

const ids = Object.keys(videos).sort((a, b) => (views[b]?.views || 0) - (views[a]?.views || 0));
const rounds = Math.max(...ids.map((id) => videos[id].hooks.length));
const clips = [];
for (let k = 0; k < rounds; k++) {
  for (const id of ids) {
    const hook = videos[id].hooks[k];
    if (!hook) continue;
    const clipId = `${id}-${k + 1}`;
    const prior = old.get(clipId) || {};
    let start = prior.start ?? null;
    const src = sourceFor(id);
    if (start == null && src) {
      // Spread the cuts: 8%, 38% and 68% of the way in, never past the end.
      const d = durationOf(src);
      start = Math.max(0, Math.min(d - LENGTH - 3, Math.round(d * (0.08 + 0.3 * k))));
    }
    // Below 1080p a 9:16 crop is enlarged past 1.8x and looks soft, so the
    // whole frame goes on a blurred copy instead. A hand-set fit is kept.
    const fit = prior.fit ?? (src ? (heightOf(src) < 1080 ? 'full' : 'crop') : null);
    clips.push({ id: clipId, video: id, hook, start, focus: prior.focus ?? 0.5, fit, ...(prior.hold ? { hold: true } : {}) });
  }
}
writeFileSync('clips.json', `${JSON.stringify(clips, null, 2)}\n`);
const ready = clips.filter((c) => c.start != null).length;
console.log(`clips.json: ${clips.length} clips from ${ids.length} videos; ${ready} have a source and a start time.`);
