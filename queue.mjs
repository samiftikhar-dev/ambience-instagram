/**
 * Two jobs, run after render.mjs:
 *
 *   node queue.mjs review   writes out/review.html: every rendered Reel in posting
 *                           order, playing, with its caption, so a person can look
 *                           before anything goes out
 *   node queue.mjs upload   uploads the rendered Reels to the "queue" release, which
 *                           is what publish.mjs posts from (skips clips on hold)
 *
 * Needs the gh CLI signed in for upload.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { catalog, placeLine } from './lib.mjs';

const clips = JSON.parse(readFileSync('clips.json', 'utf8'));
const done = existsSync('published.json') ? JSON.parse(readFileSync('published.json', 'utf8')) : {};
const rendered = clips.filter((c) => existsSync(`out/${c.id}.mp4`));
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

function review() {
  const videos = catalog();
  const cards = rendered.map((c, i) => {
    const status = c.hold ? 'On hold' : done[c.id]?.status === 'published' ? 'Posted' : `#${i + 1} in line`;
    return `<article><video src="${c.id}.mp4" poster="${c.id}.jpg" controls loop muted playsinline preload="none"></video>
<p class="meta"><b>${esc(status)}</b> · ${esc(c.id)} · ${esc(placeLine(videos[c.video]))}</p>
<pre>${esc(readFileSync(`out/${c.id}.txt`, 'utf8'))}</pre></article>`;
  });
  writeFileSync('out/review.html', `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Reels to review</title>
<style>body{font:15px system-ui;margin:16px;background:#111;color:#eee}main{display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));gap:20px}
video{width:100%;aspect-ratio:9/16;background:#000;border-radius:10px}pre{white-space:pre-wrap;font:13px system-ui;color:#ccc}.meta{color:#9ab}</style>
<h1>${rendered.length} Reels, in posting order</h1><p>Unmute a video to hear it. Anything wrong: set "hold": true on that clip in clips.json, or change its start, focus or hook and render it again.</p>
<main>${cards.join('\n')}</main>`);
  console.log(`out/review.html: ${rendered.length} Reels.`);
}

/**
 * Only Reels in approved.json go up: approved on the review page AND their
 * video's facts confirmed there (Claude writes the file from the page's data
 * when Sam says to resume). No file, nothing uploads.
 */
function upload() {
  if (!existsSync('approved.json')) { console.log('approved.json is missing, so nothing is uploaded. It lists the Reels approved on the review page whose video facts are confirmed.'); return; }
  const approved = new Set(JSON.parse(readFileSync('approved.json', 'utf8')));
  const repo = execFileSync('gh', ['repo', 'view', '--json', 'nameWithOwner', '--jq', '.nameWithOwner']).toString().trim();
  try {
    execFileSync('gh', ['release', 'view', 'queue', '--repo', repo], { stdio: 'ignore' });
  } catch {
    execFileSync('gh', ['release', 'create', 'queue', '--repo', repo, '--title', 'Reels waiting to post', '--notes', 'Rendered Reels. publish.mjs posts from here in clips.json order.']);
  }
  const files = rendered.filter((c) => !c.hold && approved.has(c.id)).map((c) => `out/${c.id}.mp4`);
  if (!files.length) { console.log('Nothing approved and rendered to upload.'); return; }
  execFileSync('gh', ['release', 'upload', 'queue', '--repo', repo, '--clobber', ...files], { stdio: 'inherit' });
  console.log(`Uploaded ${files.length} Reels to the queue release.`);
}

const job = { review, upload }[process.argv[2]];
if (job) job(); else console.log('Usage: node queue.mjs review | upload');
