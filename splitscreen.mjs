/**
 * Split-screen Reels: Bob's own phone clip from the real place on top, the
 * finished YouTube scene below, with the scene's real sound. Only the pairs
 * Bob has confirmed. Everything on screen is what is plainly there.
 *
 *   node splitscreen.mjs
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';

const SERIF = 'fonts/PlayfairDisplay.ttf', SANS = 'fonts/SpaceGrotesk.ttf';
const spaced = (s) => s.toUpperCase().split('').join(' ').replace(/ {3}/g, '   ');
const wrap = (t, n) => { const o = []; let l = ''; for (const w of t.split(' ')) { if (!l) l = w; else if ((l + ' ' + w).length <= n) l += ' ' + w; else { o.push(l); l = w; } } if (l) o.push(l); return o; };

const PAIRS = [{
  id: 'split-fallcreek-valley',
  bts: 'bts-source/v2.mp4', btsStart: 9,
  scene: 'sources/aTX1B8qvLdU.mp4', sceneStart: 30,
  length: 12,
  hook: 'The view from the trail, and the scene it became',
  top: 'On the trail', bottom: 'The finished scene',
  caption: [
    'The view from the trail, and the scene it became.', '',
    'On top, a day out at Fall Creek. Below, the finished scene. The valley, the waterfalls and the sound are real. AI added the patio, the seating and the fire.',
    "You'll hear flowing water, birdsong and a crackling fire. No music.", '',
    '— Bob', '',
    'Find the full nine-hour video, "Fall Creek valley", on YouTube at The Ambience Experience. Link in bio.', '',
    '#behindthescenes #fallcreek #waterfallsounds #natureasmr #relaxingsounds',
  ].join('\n'),
}];

function dt(dir, name, value, { font, size, x, y, alpha = '1' }) {
  const file = `${dir}/${name}.txt`;
  writeFileSync(file, value);
  return `drawtext=fontfile=${font}:textfile=${file}:fontsize=${size}:fontcolor=white:x=${x}:y=${y}:shadowcolor=black@0.65:shadowx=0:shadowy=3:expansion=none:alpha='${alpha}'`;
}

mkdirSync('out', { recursive: true });
for (const p of PAIRS) {
  const dir = `work/${p.id}`;
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const L = p.length;
  const hookLines = wrap(p.hook, 26);
  const over = [
    dt(dir, 'brand', spaced('The Ambience Experience'), { font: SANS, size: 30, x: '(w-text_w)/2', y: 110 }),
    ...hookLines.map((l, i) => dt(dir, `h${i}`, l, { font: SERIF, size: 64, x: '(w-text_w)/2', y: 190 + i * 78 })),
    dt(dir, 'top', spaced(p.top), { font: SANS, size: 24, x: 84, y: 424 }),
    dt(dir, 'bot', spaced(p.bottom), { font: SANS, size: 24, x: 84, y: 1004 }),
  ];
  const f = [
    `[1:v]split[s0][s1]`,
    `[s0]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=30:2,eq=brightness=-0.15[bg]`,
    `[s1]scale=960:540:force_original_aspect_ratio=increase,crop=960:540,setsar=1,fps=30[scene]`,
    `[0:v]scale=960:540:force_original_aspect_ratio=increase,crop=960:540,setsar=1,fps=30,tpad=stop_mode=clone:stop_duration=3,trim=duration=${L},setpts=PTS-STARTPTS[bts]`,
    `[bg][bts]overlay=60:400[a]`,
    `[a][scene]overlay=60:980,${over.join(',')},format=yuv420p[v]`,
    `[1:a]aformat=sample_rates=48000:channel_layouts=stereo,loudnorm=I=-16:TP=-1.5,afade=t=in:d=0.4,afade=t=out:st=${L - 0.8}:d=0.8[a2]`,
  ];
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', String(p.btsStart), '-t', String(L), '-i', p.bts, '-ss', String(p.sceneStart), '-t', String(L), '-i', p.scene,
    '-filter_complex', f.join(';'), '-map', '[v]', '-map', '[a2]',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-t', String(L), '-movflags', '+faststart', `out/${p.id}.mp4`], { stdio: 'inherit' });
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', '6', '-i', `out/${p.id}.mp4`, '-frames:v', '1', '-q:v', '3', `out/${p.id}.jpg`]);
  writeFileSync(`out/${p.id}.txt`, p.caption);
  console.log(`✓ ${p.id}`);
}
