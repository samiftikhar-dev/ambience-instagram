/**
 * Builds docs/index.html: the page the Instagram bio links to. One card per
 * video, newest first, each linking straight to that video on YouTube, so a
 * Reel can say "link in bio" and the viewer finds the same title here.
 *
 *   node hub.mjs
 *
 * Served by GitHub Pages from the docs folder (switched on by Sam's say-so).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { catalog, hoursWord, placeLine } from './lib.mjs';

const videos = catalog();
const feed = existsSync('videos.json') ? JSON.parse(readFileSync('videos.json', 'utf8')) : {};
const ids = Object.keys(videos).sort((a, b) =>
  String(feed[b]?.published || '').localeCompare(String(feed[a]?.published || '')) || (feed[b]?.views || 0) - (feed[a]?.views || 0));

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
const cards = ids.map((id) => {
  const v = videos[id];
  return `<a class="card" href="https://www.youtube.com/watch?v=${id}" target="_blank" rel="noopener">
  <img src="https://i.ytimg.com/vi/${id}/hqdefault.jpg" alt="" loading="lazy" width="480" height="360">
  <span class="name">${esc(v.short)}</span>
  <span class="meta">${esc(placeLine(v))} · ${esc(hoursWord(v.hours))} hours</span>
</a>`;
}).join('\n');

const page = `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>The Ambience Experience</title>
<meta name="description" content="Full-length ambience videos from real places, with sound recorded on location. Watch on YouTube.">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,400;6..72,600&family=IBM+Plex+Sans:wght@400;500&display=swap">
<style>
:root { --bg: #f3f1ec; --ink: #1f2428; --muted: #646b70; --line: #dcd8cf; --ember: #b5651d; --surface: #fbfaf7;
  --display: "Newsreader", Georgia, serif; --body: "IBM Plex Sans", system-ui, -apple-system, "Segoe UI", sans-serif; color-scheme: light; }
@media (prefers-color-scheme: dark) { :root { --bg: #12171b; --ink: #e8e4dc; --muted: #9aa3a8; --line: #2c353b; --ember: #e09a52; --surface: #1a2126; color-scheme: dark; } }
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--ink); font: 16px/1.5 var(--body); }
.wrap { max-width: 1100px; margin: 0 auto; padding: 40px 16px 64px; }
h1 { font: 600 clamp(2rem, 5vw, 3rem)/1.1 var(--display); margin: 0 0 10px; text-wrap: balance; }
.lede { color: var(--muted); max-width: 60ch; margin: 0 0 22px; }
.channel { display: inline-block; font-weight: 500; color: var(--bg); background: var(--ink); padding: 10px 18px; border-radius: 999px; text-decoration: none; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 24px 18px; margin-top: 34px; }
.card { display: grid; gap: 4px; align-content: start; color: inherit; text-decoration: none; min-width: 0; }
.card img { width: 100%; height: auto; aspect-ratio: 4/3; object-fit: cover; border-radius: 10px; background: var(--surface); }
.name { font: 600 1.15rem/1.25 var(--display); margin-top: 6px; }
.meta { color: var(--muted); font-size: 14px; }
.card:hover .name { color: var(--ember); }
.card:focus-visible, .channel:focus-visible { outline: 2px solid var(--ember); outline-offset: 3px; border-radius: 10px; }
.note { margin-top: 44px; color: var(--muted); font-size: 14px; max-width: 70ch; border-top: 1px solid var(--line); padding-top: 16px; }
</style></head>
<body><div class="wrap">
<h1>The Ambience Experience</h1>
<p class="lede">Real places, with sound recorded on location. Each video runs nine hours, so you can leave it on. Find the one from the Reel and tap it to watch on YouTube.</p>
<a class="channel" href="https://www.youtube.com/@theambienceexperience" target="_blank" rel="noopener">All videos on YouTube</a>
<div class="grid">
${cards}
</div>
<p class="note">The scenes combine real places and recordings with AI-assisted visuals. Each video's description on YouTube says what is real and what was added.</p>
</div></body></html>
`;
mkdirSync('docs', { recursive: true });
writeFileSync('docs/index.html', page);
console.log(`docs/index.html: ${ids.length} videos`);
