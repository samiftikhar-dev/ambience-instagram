/**
 * Behind-the-scenes Reels from Bob's own phone clips (bts-source/). Same look as
 * the scene Reels (whole frame on a blurred copy, channel name under it) but
 * with no title, no place and no claim about which video it belongs to: only
 * what is plainly on screen. Writes out/<id>.mp4, .jpg and .txt.
 *
 *   node bts.mjs
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';

const W = 1080, H = 1920, FPS = 30;
const SERIF = 'fonts/PlayfairDisplay.ttf', SANS = 'fonts/SpaceGrotesk.ttf';
const spaced = (s) => s.toUpperCase().split('').join(' ').replace(/ {3}/g, '   ');

const REELS = [
  { id: 'bts-1', src: 'bts-source/v1.mp4', start: 0, length: 10.4, hook: 'A big sky, and two cameras waiting' },
  { id: 'bts-2', src: 'bts-source/v2.mp4', start: 7, length: 14, hook: 'Out on the trail with the camera' },
];

function text(dir, name, value, { font, size, y, alpha }) {
  const file = `${dir}/${name}.txt`;
  writeFileSync(file, value);
  return `drawtext=fontfile=${font}:textfile=${file}:fontsize=${size}:fontcolor=white:x=(w-text_w)/2:y=${y}:shadowcolor=black@0.6:shadowx=0:shadowy=3:expansion=none:alpha='${alpha}'`;
}
const wrap = (t, n) => { const out = []; let l = ''; for (const w of t.split(' ')) { if (!l) l = w; else if ((l + ' ' + w).length <= n) l += ' ' + w; else { out.push(l); l = w; } } if (l) out.push(l); return out; };

mkdirSync('out', { recursive: true });
for (const r of REELS) {
  const dir = `work/${r.id}`;
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const lines = wrap(r.hook, 18);
  const hookA = 'if(lt(t,0.3),0,if(lt(t,0.9),(t-0.3)/0.6,if(lt(t,4.2),1,if(lt(t,4.8),(4.8-t)/0.6,0))))';
  const overlays = [
    ...lines.map((l, i) => text(dir, `h${i}`, l, { font: SERIF, size: 78, y: 230 + i * 96, alpha: hookA })),
    text(dir, 'brand', spaced('The Ambience Experience'), { font: SANS, size: 32, y: 1310, alpha: '0.92' }),
    text(dir, 'tag', 'behind the scenes', { font: SERIF, size: 34, y: 1366, alpha: '0.8' }),
  ];
  const f = [
    `[0:v]split[bg0][fg0]`,
    `[bg0]scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},boxblur=30:2,eq=brightness=-0.12[bg]`,
    `[fg0]scale=${W}:-2[fg]`,
    `[bg][fg]overlay=0:(H-h)/2,fps=${FPS},${overlays.join(',')},format=yuv420p[v]`,
    `[0:a]aformat=sample_rates=48000:channel_layouts=stereo,loudnorm=I=-20:TP=-1.5,afade=t=in:d=0.3,afade=t=out:st=${(r.length - 0.6).toFixed(2)}:d=0.6[a]`,
  ];
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', String(r.start), '-t', String(r.length), '-i', r.src,
    '-filter_complex', f.join(';'), '-map', '[v]', '-map', '[a]',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', `out/${r.id}.mp4`], { stdio: 'inherit' });
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', '2', '-i', `out/${r.id}.mp4`, '-frames:v', '1', '-q:v', '3', `out/${r.id}.jpg`]);
  const caption = [
    `${r.hook}.`, '',
    'Behind the scenes on a day out filming. This is how new scenes start.', '',
    "Hi, I'm Bob! 👋 After a long career as an engineer, I retired and went outside. Now I travel to peaceful places, record the sounds myself, and build each scene from my own photos and footage.", '',
    'Find the scenes on YouTube at The Ambience Experience. Link in bio.', '',
    '#behindthescenes #naturephotography #ambience #nature #sleepsounds',
  ].join('\n');
  writeFileSync(`out/${r.id}.txt`, caption);
  console.log(`✓ ${r.id}`);
}
