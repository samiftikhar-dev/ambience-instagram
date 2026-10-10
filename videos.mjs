/**
 * Refreshes videos.json from the channel's public YouTube feed (no key needed).
 * The feed lists the latest 15 uploads; older ones stay in videos.json once seen.
 *
 *   node videos.mjs            fetch the live feed
 *   node videos.mjs feed.xml   read a saved copy instead
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

export const CHANNEL_ID = 'UCwysoW8U7j4eWShR09rhd3A';
const FEED = `https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`;

const decode = (s) => s
  .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#39;/g, "'");

export function parseFeed(xml) {
  return xml.split('<entry>').slice(1).map((e) => {
    const tag = (re) => decode((e.match(re) || [])[1] || '');
    return {
      id: tag(/<yt:videoId>([^<]*)/),
      title: tag(/<title>([^<]*)/),
      published: tag(/<published>([^<]*)/),
      views: Number(tag(/views="(\d+)"/) || 0),
      description: tag(/<media:description>([\s\S]*?)<\/media:description>/),
    };
  });
}

async function main() {
  const xml = process.argv[2]
    ? readFileSync(process.argv[2], 'utf8')
    : await (await fetch(FEED)).text();
  const known = existsSync('videos.json') ? JSON.parse(readFileSync('videos.json', 'utf8')) : {};
  let added = 0;
  for (const v of parseFeed(xml)) {
    if (!known[v.id]) added++;
    known[v.id] = { ...known[v.id], ...v };
  }
  writeFileSync('videos.json', `${JSON.stringify(known, null, 2)}\n`);
  console.log(`videos.json: ${Object.keys(known).length} videos (${added} new).`);
}

if (process.argv[1] && import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`) main();
