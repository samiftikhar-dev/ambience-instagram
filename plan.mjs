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
import { sourceFor, durationOf, LENGTH } from './render.mjs';

const videos = catalog();
const views = existsSync('videos.json') ? JSON.parse(readFileSync('videos.json', 'utf8')) : {};
const old = new Map((existsSync('clips.json') ? JSON.parse(readFileSync('clips.json', 'utf8')) : []).map((c) => [c.id, c]));

// Mackenzie (Oct 10): the newest upload goes out first, then best-liked first.
const newest = Object.keys(videos).sort((a, b) => String(views[b]?.published || '').localeCompare(String(views[a]?.published || '')))[0];
// Mackenzie (Oct 10): hold the spring videos while it is fall. Edit this set as
// the seasons turn; the held videos stay in catalog.json and come back by themselves.
const HELD_SEASONS = new Set(['spring']);
// A video with `until` (the Halloween one) drops out of the plan after that date.
const today = new Date().toISOString().slice(0, 10);
const ids = Object.keys(videos).filter((id) => !HELD_SEASONS.has(videos[id].season) && !(videos[id].until && today > videos[id].until)).sort((a, b) => (b === newest) - (a === newest) || (views[b]?.views || 0) - (views[a]?.views || 0));
const rounds = Math.max(...ids.map((id) => videos[id].hooks.length));
const clips = [];
for (let k = 0; k < rounds; k++) {
  for (const id of ids) {
    const hook = videos[id].hooks[k];
    if (!hook) continue;
    const clipId = `${id}-${k + 1}`;
    const prior = old.get(clipId) || {};
    let start = prior.start ?? null;
    // A video can have several source clips: `sources` lists their ids and `cuts`
    // says, per hook, which clip and where to start.
    const cut = videos[id].cuts?.[k];
    const srcId = cut ? videos[id].sources[cut.src] : id;
    const src = sourceFor(srcId);
    if (cut) start = cut.start; // the catalog decides these cuts, not an old clips.json
    if (start == null && src) {
      // Spread the cuts: 8%, 38% and 68% of the way in, never past the end.
      const d = durationOf(src);
      start = Math.max(0, Math.min(d - LENGTH - 3, Math.round(d * (0.08 + 0.3 * k))));
    }
    // Sam chose the whole frame on a blurred copy (Oct 10 2026) for every Reel;
    // "crop" (fills the screen) stays available per clip by hand.
    const fit = prior.fit ?? 'full';
    clips.push({ id: clipId, video: id, ...(srcId !== id ? { src: srcId } : {}), hook, start, focus: prior.focus ?? 0.5, fit, ...(prior.hold ? { hold: true } : {}) });
  }
}
// Mackenzie (Oct 10): videos already seen on Instagram once go way down, after
// every other video's Reels (a stable sort keeps the order otherwise).
clips.sort((a, b) => !!videos[a.video].posted - !!videos[b.video].posted);
// A priority video (Halloween, until its date) goes to the front.
clips.sort((a, b) => !!videos[b.video].priority - !!videos[a.video].priority);
writeFileSync('clips.json', `${JSON.stringify(clips, null, 2)}\n`);
const ready = clips.filter((c) => c.start != null).length;
console.log(`clips.json: ${clips.length} clips from ${ids.length} videos; ${ready} have a source and a start time.`);
