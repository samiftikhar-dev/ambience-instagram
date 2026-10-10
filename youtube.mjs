/**
 * Posts the next Reel to the channel as a YouTube Short. Runs daily from shorts.yml.
 *
 * Same queue and order as Instagram (clips.json, the "queue" release); its own
 * record (shorts.json), so one platform failing never holds the other back.
 * A vertical video under three minutes becomes a Short on its own. The title is
 * the hook; the description is the Instagram caption plus a link to the full
 * video, and the AI disclosure YouTube asks for is set on every upload.
 *
 * Credentials (repository secrets, never printed): YT_CLIENT_ID, YT_CLIENT_SECRET
 * and YT_REFRESH_TOKEN, the last made once by yt-auth.mjs on the channel's account.
 *
 * MODE=check    verify the credentials and the channel; upload nothing.
 * MODE=publish  upload the next Short (the default).
 *
 * Exit 0 = done or nothing to do, 1 = this Short failed, 75 = quota (try
 * tomorrow), 76 = credentials refused: a person must look.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { posix } from 'node:path';
import { catalog, captionFor, lintCaption } from './lib.mjs';

const MODE = process.env.MODE || 'publish';
const REPO = process.env.GITHUB_REPOSITORY;
const MIN_GAP_HOURS = 18;

async function accessToken() {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    body: new URLSearchParams({
      client_id: process.env.YT_CLIENT_ID,
      client_secret: process.env.YT_CLIENT_SECRET,
      refresh_token: process.env.YT_REFRESH_TOKEN,
      grant_type: 'refresh_token',
    }),
  });
  const json = await res.json();
  if (!json.access_token) { console.error(`Google refused the refresh token: ${json.error || res.status}`); process.exit(76); }
  return json.access_token;
}

async function yt(token, path, init = {}) {
  const res = await fetch(`https://www.googleapis.com/${path}`, { ...init, headers: { Authorization: `Bearer ${token}`, ...init.headers } });
  if (!res.ok) {
    const body = await res.text();
    if (/quotaExceeded|uploadLimitExceeded|rateLimitExceeded/.test(body)) { console.error(`YouTube quota: ${body.slice(0, 300)}`); process.exit(75); }
    if (res.status === 401 || res.status === 403) { console.error(`YouTube refused (${res.status}): ${body.slice(0, 300)}`); process.exit(76); }
    throw new Error(`${path.split('?')[0]} ${res.status}: ${body.slice(0, 300)}`);
  }
  return res;
}

/** "Sound on: the real Kay Falls #Shorts", inside YouTube's 100 characters. */
const titleFor = (clip) => `${clip.hook} #Shorts`.slice(0, 100);

function descriptionFor(clip, v) {
  const caption = captionFor(clip, v).replace('The full', `Watch the full`).replace('is on YouTube. Link in bio.', `here: https://youtu.be/${clip.video}`);
  return caption.slice(0, 4900);
}

async function main() {
  if (!process.env.YT_REFRESH_TOKEN) { console.log('YT_REFRESH_TOKEN is not set yet; see README.md.'); return; }
  const token = await accessToken();
  const { items = [] } = await (await yt(token, 'youtube/v3/channels?part=snippet&mine=true')).json();
  console.log(`Signed in as channel: ${items[0]?.snippet?.title || '(none)'}`);

  const videos = catalog();
  const clips = JSON.parse(readFileSync('clips.json', 'utf8'));
  const done = existsSync('shorts.json') ? JSON.parse(readFileSync('shorts.json', 'utf8')) : {};
  let out = '';
  try {
    out = execFileSync('gh', ['release', 'view', 'queue', '--repo', REPO, '--json', 'assets', '--jq', '.assets[].name'], { stdio: ['ignore', 'pipe', 'pipe'] }).toString();
  } catch (err) {
    if (!/release not found/.test(String(err.stderr))) throw err;
  }
  const inQueue = new Set(out.split('\n').filter((n) => n.endsWith('.mp4')).map((n) => n.slice(0, -4)));
  const next = clips.find((c) => !c.hold && inQueue.has(c.id) && (!done[c.id] || done[c.id].status === 'failed'));
  console.log(`Next Short: ${next ? `${next.id} "${next.hook}"` : 'nothing queued'}.`);
  if (MODE === 'check' || !next) return;

  const last = Object.values(done).filter((d) => d.status === 'published').map((d) => Date.parse(d.at)).sort().pop();
  if (last && Date.now() - last < MIN_GAP_HOURS * 3600e3) { console.log('A Short already went up in the last 18 hours.'); process.exit(75); }

  const v = videos[next.video];
  const problems = lintCaption(captionFor(next, v), v);
  if (problems.length) { console.error(`Refusing ${next.id}: ${problems.join('; ')}`); process.exit(1); }

  const dir = posix.join('work', 'short');
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  execFileSync('gh', ['release', 'download', 'queue', '--repo', REPO, '--pattern', `${next.id}.mp4`, '--dir', dir]);
  const file = readFileSync(posix.join(dir, `${next.id}.mp4`));

  try {
    const meta = {
      snippet: {
        title: titleFor(next),
        description: descriptionFor(next, v),
        tags: v.tags.map((t) => t.slice(1)).concat(['ambience', 'nature sounds', 'shorts']),
        categoryId: '24',
      },
      status: { privacyStatus: 'public', selfDeclaredMadeForKids: false, containsSyntheticMedia: v.ai !== false },
    };
    const start = await yt(token, 'upload/youtube/v3/videos?uploadType=resumable&part=snippet,status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=UTF-8', 'X-Upload-Content-Type': 'video/mp4', 'X-Upload-Content-Length': String(file.length) },
      body: JSON.stringify(meta),
    });
    const put = await yt(token, start.headers.get('location').replace('https://www.googleapis.com/', ''), {
      method: 'PUT', headers: { 'Content-Type': 'video/mp4' }, body: file,
    });
    const video = await put.json();
    done[next.id] = { status: 'published', video: next.video, youtubeId: video.id, privacy: video.status?.privacyStatus, at: new Date().toISOString() };
    console.log(`Short up: https://youtube.com/shorts/${video.id} (${video.status?.privacyStatus})`);
    // An unaudited Google project has every upload locked to private; say so loudly.
    if (video.status?.privacyStatus !== 'public') console.log('::warning::The Short is not public. Until the YouTube API audit passes, uploads from this project stay private.');
  } catch (err) {
    const prior = done[next.id];
    done[next.id] = { status: prior?.status === 'failed' ? 'skipped' : 'failed', error: err.message, at: new Date().toISOString() };
    console.error(`Short ${next.id} failed: ${err.message}`);
    process.exitCode = 1;
  } finally {
    writeFileSync('shorts.json', `${JSON.stringify(done, null, 2)}\n`);
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
