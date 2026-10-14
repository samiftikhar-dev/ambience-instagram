/**
 * Renders the Reels listed in clips.json from the creator's own source videos.
 *
 * Each Reel is a short, seamless loop cut straight from one of his scenes, with
 * his real recorded sound: no music, no stock footage, nothing generated here.
 * The 16:9 frame is cropped to 9:16 around `focus` (0 = left edge, 1 = right),
 * or with fit "full" the whole frame sits on a blurred copy of itself.
 * The last second blends back into the first, so the clip loops without a jump
 * when Instagram replays it.
 *
 * The opening line (the hook) fades in and out over the first few seconds, so
 * the scene then plays clean. Text stays inside the Reels safe zone.
 *
 *   node render.mjs            render every clip with a source and no output yet
 *   node render.mjs ID ID      render (or re-render) these clips
 *
 * Writes out/<id>.mp4, out/<id>.jpg (the frame Instagram shows as the cover)
 * and out/<id>.txt (the caption). Needs ffmpeg and ffprobe on the PATH.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync, rmSync } from 'node:fs';
import { posix } from 'node:path';
import { catalog, captionFor, lintCaption, lintHook, overlap, placeLine } from './lib.mjs';
import { END_LENGTH, END_FADE, endCardAvailable, endCardInputs, endCardFilters } from './endcard.mjs';

const W = 1080, H = 1920, FPS = 30;
export const LENGTH = 12;   // seconds of Reel
const BLEND = 1.2;          // seconds the end takes to blend into the start
const SERIF = 'fonts/PlayfairDisplay.ttf', SANS = 'fonts/SpaceGrotesk.ttf';
const COVER_AT = 2.4;       // hook fully visible

export function sourceFor(videoId) {
  if (!existsSync('sources')) return null;
  const f = readdirSync('sources').find((n) => n.startsWith(`${videoId}.`) && /\.(mp4|mov|mkv|webm|m4v)$/i.test(n));
  return f ? posix.join('sources', f) : null;
}

export function durationOf(file) {
  return Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]).toString().trim());
}

export function heightOf(file) {
  return Number(execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=height', '-of', 'csv=p=0', file]).toString().trim());
}

function wrap(text, width) {
  const out = [];
  let line = '';
  for (const word of text.split(/\s+/)) {
    if (!line) line = word;
    else if ((line + ' ' + word).length <= width) line += ' ' + word;
    else { out.push(line); line = word; }
  }
  if (line) out.push(line);
  return out;
}

/**
 * The small line under the opening words. Mackenzie (Oct 10): a title or place
 * read right after the opening line, saying the same thing, "doesn't read well".
 * So it only appears when it adds something: the video's short title if the
 * opening line doesn't already say it, else the region, else nothing.
 */
export function labelFor(clip, v) {
  if (overlap(v.short, clip.hook) < 0.34) return v.short;
  const region = v.region && v.region.split(', ').slice(0, 2).join(', ');
  if (region && region.length <= 26 && overlap(region, clip.hook) < 0.34) return region;
  return null;
}

const spaced = (s) => s.toUpperCase().split('').join(' ').replace(/ {3}/g, '   ');

/** drawtext from a file, so quotes, colons and apostrophes need no escaping. */
function text(dir, name, value, { font, size, y, alpha, color = 'white' }) {
  const file = posix.join(dir, `${name}.txt`);
  writeFileSync(file, value);
  return `drawtext=fontfile=${font}:textfile=${file}:fontsize=${size}:fontcolor=${color}:x=(w-text_w)/2:y=${y}` +
    `:shadowcolor=black@0.55:shadowx=0:shadowy=3:expansion=none:alpha='${alpha}'`;
}

// In at 0.3s, out by 4.8s: the scene then plays with nothing on it.
const HOOK_ALPHA = 'if(lt(t,0.3),0,if(lt(t,0.9),(t-0.3)/0.6,if(lt(t,4.2),1,if(lt(t,4.8),(4.8-t)/0.6,0))))';

export function renderClip(clip, v, outDir = 'out') {
  const src = sourceFor(clip.video);
  if (!src) throw new Error(`no source in sources/ for ${clip.video}`);
  if (!endCardAvailable()) throw new Error('the end card needs bts-source/bob-at-tripod.jpg and brand/profile-1080.jpg');
  const dir = posix.join('work', clip.id);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  mkdirSync(outDir, { recursive: true });

  const L = LENGTH, F = BLEND;
  const focus = Math.min(1, Math.max(0, clip.focus ?? 0.5));
  const frame = clip.fit === 'full'
    ? `split[bg0][fg0];[bg0]scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},boxblur=30:2,eq=brightness=-0.12[bg];` +
      `[fg0]scale=${W}:-2[fg];[bg][fg]overlay=0:(H-h)/2`
    : `crop=w=ih*9/16:h=ih:x=(iw-ow)*${focus}:y=0,scale=${W}:${H}`;

  const hookLines = wrap(clip.hook, 18);
  const label = labelFor(clip, v);
  // The full layout's frame starts about 656px down; keep the place line clear of it.
  const top = clip.fit === 'full' ? 230 : 300;
  // The channel's name stays on for the whole clip (so the loop has no jump),
  // in the blurred band under the frame, above where Instagram draws the caption.
  const brandY = clip.fit === 'crop' ? 1340 : 1310;
  // The tagline gives way to a pop-up at 6 seconds: where the full video is.
  const TAG_ALPHA = 'if(lt(t,5.5),0.75,if(lt(t,6.2),0.75*(6.2-t)/0.7,0))';
  const LINK_ALPHA = 'if(lt(t,6),0,if(lt(t,6.7),0.95*(t-6)/0.7,0.95))';
  const overlays = [
    text(dir, 'brand', spaced('The Ambience Experience'), { font: SANS, size: 32, y: brandY, alpha: '0.92' }),
    text(dir, 'tagline', 'real places · real sound', { font: SERIF, size: 34, y: brandY + 56, alpha: TAG_ALPHA }),
    text(dir, 'link', 'Full video on YouTube · link in bio', { font: SERIF, size: 34, y: brandY + 56, alpha: LINK_ALPHA }),
    ...hookLines.map((line, i) => text(dir, `h${i}`, line, { font: SERIF, size: 78, y: top + i * 96, alpha: HOOK_ALPHA })),
    ...(label ? [text(dir, 'place', spaced(label), { font: SANS, size: 30, y: top + hookLines.length * 96 + 40, alpha: HOOK_ALPHA })] : []),
  ];

  const f = [
    `[0:v]${frame},fps=${FPS},setsar=1,format=yuv420p,split=3[va][vb][vc]`,
    `[va]trim=0:${F},setpts=PTS-STARTPTS[head]`,
    `[vb]trim=${F}:${L},setpts=PTS-STARTPTS[body]`,
    `[vc]trim=${L}:${L + F},setpts=PTS-STARTPTS[tail]`,
    `[tail][head]xfade=transition=fade:duration=${F}:offset=0[seam]`,
    `[seam][body]concat=n=2:v=1:a=0,${overlays.join(',')},format=yuv420p,fps=${FPS}[main]`,
    ...endCardFilters(dir, 1, 2, v.hours),
    `[main][end]xfade=transition=fade:duration=${END_FADE}:offset=${L - END_FADE},format=yuv420p[v]`,
    `[0:a]aformat=sample_rates=48000:channel_layouts=stereo,asplit=3[aa][ab][ac]`,
    `[aa]atrim=0:${F},asetpts=PTS-STARTPTS[ahead]`,
    `[ab]atrim=${F}:${L},asetpts=PTS-STARTPTS[abody]`,
    `[ac]atrim=${L}:${L + F},asetpts=PTS-STARTPTS[atail]`,
    `[atail][ahead]acrossfade=d=${F}:c1=tri:c2=tri[aseam]`,
    `[aseam][abody]concat=n=2:v=0:a=1,loudnorm=I=-16:TP=-1.5:LRA=11,asplit[am1][am2]`,
    // The sound runs on under the end card: the loop's own first seconds, which it
    // already blends into, so the ambience never breaks.
    `[am2]atrim=0:${END_LENGTH},asetpts=PTS-STARTPTS[am3]`,
    `[am1][am3]acrossfade=d=${END_FADE}:c1=tri:c2=tri[a]`,
  ];

  const out = posix.join(outDir, `${clip.id}.mp4`);
  execFileSync('ffmpeg', [
    '-y', '-loglevel', 'error',
    '-ss', String(clip.start), '-t', String(L + F + 0.5), '-i', src,
    ...endCardInputs(),
    '-filter_complex', f.join(';'),
    '-map', '[v]', '-map', '[a]',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-r', String(FPS),
    '-maxrate', '12M', '-bufsize', '20M',
    '-c:a', 'aac', '-b:a', '192k', '-ar', '48000',
    '-t', String(L + END_LENGTH - END_FADE), '-movflags', '+faststart',
    out,
  ], { stdio: 'inherit' });

  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', String(COVER_AT), '-i', out, '-frames:v', '1', '-q:v', '3', posix.join(outDir, `${clip.id}.jpg`)]);
  writeFileSync(posix.join(outDir, `${clip.id}.txt`), captionFor(clip, v));
  rmSync(dir, { recursive: true, force: true });
  return out;
}

function main() {
  const videos = catalog();
  const clips = JSON.parse(readFileSync('clips.json', 'utf8'));
  const wanted = process.argv.slice(2);
  const todo = wanted.length
    ? clips.filter((c) => wanted.includes(c.id))
    : clips.filter((c) => !existsSync(posix.join('out', `${c.id}.mp4`)) && sourceFor(c.video));
  let failed = 0;
  for (const clip of todo) {
    const v = videos[clip.video];
    const problems = v ? [...lintHook(clip.hook, v), ...lintCaption(captionFor(clip, v), v)] : ['video is not in catalog.json'];
    if (problems.length) { console.error(`✗ ${clip.id}: ${problems.join('; ')}`); failed++; continue; }
    try {
      renderClip(clip, v);
      console.log(`✓ ${clip.id}  ${placeLine(v)}  "${clip.hook}"`);
    } catch (err) {
      console.error(`✗ ${clip.id}: ${err.message}`);
      failed++;
    }
  }
  console.log(`${todo.length - failed} rendered, ${failed} refused or failed.`);
  if (failed) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`) main();
