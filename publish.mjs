/**
 * Posts the next Reel to Instagram. Runs once a day from publish.yml.
 *
 * The next Reel is the first clip in clips.json that is not on hold, not posted
 * yet, and whose video is in the "queue" release (render.mjs makes it, queue.mjs
 * uploads it; nothing posts that a person has not been able to look at first).
 * The caption is rebuilt from catalog.json, so a fixed fact fixes every post.
 *
 * Instagram (Instagram Login API) takes a Reel only from a public URL with a
 * video/mp4 type, so the file is pushed alone to a throwaway branch, reel-media,
 * and served through jsDelivr, as the LuxyBasement poster does.
 *
 * MODE=check    verify the token, the account, the quota and the next Reel; post nothing.
 * MODE=publish  post the next Reel (the default).
 *
 * Exit 0 = posted or nothing to do, 1 = this Reel failed, 75 = quota or rate
 * limit (try later), 76 = blocked or token dead: a person must look (the
 * workflow writes blocked.txt and stops posting until it is removed).
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { posix } from 'node:path';
import { catalog, captionFor, lintCaption } from './lib.mjs';

const API = 'https://graph.instagram.com/v23.0';
const TOKEN = process.env.IG_ACCESS_TOKEN;
const MODE = process.env.MODE || 'publish';
const REPO = process.env.GITHUB_REPOSITORY;
const MIN_GAP_HOURS = 18;  // never two Reels in one evening, even if a run is retried
const RATE_LIMIT = new Set([4, 9, 17, 32, 613]);
const BLOCKED = new Set([368, 190, 10, 200]);

class ApiError extends Error {
  constructor(message, code, subcode) { super(message); this.code = code; this.subcode = subcode; }
}

async function api(path, { method = 'GET', params = {} } = {}) {
  const body = new URLSearchParams({ ...params, access_token: TOKEN });
  const url = method === 'GET' ? `${API}/${path}?${body}` : `${API}/${path}`;
  const res = await fetch(url, method === 'GET' ? {} : { method, body });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.error) {
    const e = json.error || {};
    throw new ApiError(`${method} ${path.split('?')[0]} failed: ${e.message || res.status} (code ${e.code ?? '?'}${e.error_subcode ? '/' + e.error_subcode : ''})`, e.code, e.error_subcode);
  }
  return json;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Names of the videos uploaded to the queue release (none before the first upload). */
function queued() {
  let out = '';
  try {
    out = execFileSync('gh', ['release', 'view', 'queue', '--repo', REPO, '--json', 'assets', '--jq', '.assets[].name'], { stdio: ['ignore', 'pipe', 'pipe'] }).toString();
  } catch (err) {
    if (!/release not found/.test(String(err.stderr))) throw err;
  }
  return new Set(out.split('\n').filter((n) => n.endsWith('.mp4')).map((n) => n.slice(0, -4)));
}

async function hostVideo(id) {
  const dir = posix.join('work', 'media');
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  execFileSync('gh', ['release', 'download', 'queue', '--repo', REPO, '--pattern', `${id}.mp4`, '--dir', dir]);
  const bot = ['-c', 'user.name=github-actions[bot]', '-c', 'user.email=41898282+github-actions[bot]@users.noreply.github.com'];
  const git = (...args) => execFileSync('git', args, { cwd: dir, stdio: ['ignore', 'pipe', 'inherit'] }).toString().trim();
  git('init', '-q', '-b', 'reel-media');
  git(...bot, 'add', '.');
  git(...bot, 'commit', '-q', '-m', `Reel: ${id}`);
  git('push', '-q', '-f', `https://x-access-token:${process.env.GH_TOKEN}@github.com/${REPO}.git`, 'HEAD:refs/heads/reel-media');
  const sha = git('rev-parse', 'HEAD');
  const url = `https://cdn.jsdelivr.net/gh/${REPO}@${sha}/${id}.mp4`;
  for (let i = 0; i < 24; i++) {
    const res = await fetch(url, { method: 'HEAD' }).catch(() => null);
    if (res?.ok) return url;
    await sleep(5000);
  }
  throw new Error('hosted video never became reachable');
}

async function publishReel(igId, videoUrl, caption) {
  const container = await api(`${igId}/media`, {
    method: 'POST',
    params: { media_type: 'REELS', video_url: videoUrl, caption, share_to_feed: 'true', thumb_offset: '2400' },
  });
  for (let i = 0; i < 60; i++) {
    const { status_code: status, status: detail } = await api(container.id, { params: { fields: 'status_code,status' } });
    if (status === 'FINISHED') break;
    if (status === 'ERROR' || status === 'EXPIRED') throw new Error(`reel ${status}: ${detail || ''}`);
    await sleep(10000);
  }
  for (let i = 1; ; i++) {
    try {
      return (await api(`${igId}/media_publish`, { method: 'POST', params: { creation_id: container.id } })).id;
    } catch (err) {
      if (err.subcode !== 2207027 || i === 4) throw err;
      await sleep(20000);
    }
  }
}

async function main() {
  if (!TOKEN) { console.log('IG_ACCESS_TOKEN is not set yet; see README.md.'); return; }
  const videos = catalog();
  const clips = JSON.parse(readFileSync('clips.json', 'utf8'));
  const done = existsSync('published.json') ? JSON.parse(readFileSync('published.json', 'utf8')) : {};
  const inQueue = queued();

  const me = await api('me', { params: { fields: 'user_id,username' } });
  const igId = me.user_id || me.id;
  const next = clips.find((c) => !c.hold && inQueue.has(c.id) && (!done[c.id] || done[c.id].status === 'failed'));
  const posted = Object.values(done).filter((d) => d.status === 'published');
  const waiting = clips.filter((c) => !c.hold && inQueue.has(c.id) && !done[c.id]).length;
  console.log(`@${me.username}: ${posted.length} Reels posted, ${waiting} rendered and waiting.`);

  if (MODE === 'check') {
    const q = (await api(`${igId}/content_publishing_limit`, { params: { fields: 'quota_usage,config' } })).data?.[0] || {};
    console.log(`Quota used: ${q.quota_usage ?? 0}/${q.config?.quota_total ?? 100}. Next: ${next ? `${next.id} "${next.hook}"` : 'nothing queued'}.`);
    return;
  }
  if (!next) { console.log('Nothing rendered and waiting. Render more with render.mjs and upload with queue.mjs.'); return; }

  const last = posted.map((d) => Date.parse(d.at)).sort().pop();
  if (last && Date.now() - last < MIN_GAP_HOURS * 3600e3) { console.log('A Reel already went out in the last 18 hours.'); process.exit(75); }

  const v = videos[next.video];
  const caption = captionFor(next, v);
  const problems = lintCaption(caption, v);
  if (problems.length) { console.error(`Refusing ${next.id}: ${problems.join('; ')}`); process.exit(1); }

  try {
    const url = await hostVideo(next.id);
    const mediaId = await publishReel(igId, url, caption);
    const { permalink } = await api(mediaId, { params: { fields: 'permalink' } }).catch(() => ({}));
    done[next.id] = { status: 'published', video: next.video, hook: next.hook, mediaId, permalink, at: new Date().toISOString() };
    console.log(`Posted ${next.id}: ${permalink || mediaId}`);
  } catch (err) {
    if (RATE_LIMIT.has(err.code)) { console.error(err.message); process.exit(75); }
    if (BLOCKED.has(err.code)) { console.error(err.message); process.exit(76); }
    const prior = done[next.id];
    done[next.id] = { status: prior?.status === 'failed' ? 'skipped' : 'failed', error: err.message, at: new Date().toISOString() };
    console.error(`Reel ${next.id} failed: ${err.message}`);
    process.exitCode = 1;
  } finally {
    writeFileSync('published.json', `${JSON.stringify(done, null, 2)}\n`);
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
