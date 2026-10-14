/**
 * Split-screen Reels: Bob's own phone clip from the real place on top, the
 * finished YouTube scene below, with the scene's real sound, then a 3-second
 * end card on the full screen (logo, who Bob is, why follow, which video).
 * Only pairs Bob has confirmed. Everything on screen is what is plainly there.
 *
 * Why an end card and not text below the panels: Instagram covers about the
 * bottom fifth of a Reel with the caption and buttons.
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
  photo: 'bts-source/bob-at-tripod.jpg', logo: 'brand/profile-1080.jpg',
  length: 12, endLength: 3,
  hook: 'The view from the trail, and the scene it became',
  top: 'On the trail', bottom: 'The finished scene',
  end: {
    name: 'The Ambience Experience',
    lines: ["Hi, I'm Bob.", 'Real places, real sound.', 'Follow for a new scene every day.'],
    cta: ['The full nine-hour video', 'is on YouTube.', 'Link in bio.'],
  },
  caption: [
    'The view from the trail, and the scene it became.', '',
    'On top, a day out at Fall Creek. Below, the finished scene. The valley, the waterfalls and the sound are real. AI added the patio, the seating and the fire.',
    "You'll hear flowing water, birdsong and a crackling fire. No music.", '',
    '— Bob', '',
    'Find the full nine-hour video, "Fall Creek valley", on YouTube at The Ambience Experience. Link in bio.', '',
    '#behindthescenes #fallcreek #waterfallsounds #natureasmr #relaxingsounds',
  ].join('\n'),
}];

function dt(dir, name, value, { font, size, x = '(w-text_w)/2', y, color = 'white', alpha = '1' }) {
  const file = `${dir}/${name}.txt`;
  writeFileSync(file, value);
  return `drawtext=fontfile=${font}:textfile=${file}:fontsize=${size}:fontcolor=${color}:x=${x}:y=${y}:shadowcolor=black@0.65:shadowx=0:shadowy=3:expansion=none:alpha='${alpha}'`;
}

mkdirSync('out', { recursive: true });
for (const p of PAIRS) {
  const dir = `work/${p.id}`;
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const L = p.length, E = p.endLength, FADE = 0.5, total = L + E - FADE;

  const hookLines = wrap(p.hook, 26);
  const over = [
    dt(dir, 'brand', spaced('The Ambience Experience'), { font: SANS, size: 30, y: 110 }),
    ...hookLines.map((l, i) => dt(dir, `h${i}`, l, { font: SERIF, size: 64, y: 190 + i * 78 })),
    dt(dir, 'top', spaced(p.top), { font: SANS, size: 24, x: 84, y: 424 }),
    dt(dir, 'bot', spaced(p.bottom), { font: SANS, size: 24, x: 84, y: 1004 }),
  ];

  // End card, all inside the safe area (nothing below y 1500).
  const e = p.end;
  const endText = [
    dt(dir, 'e_name', spaced(e.name), { font: SANS, size: 32, y: 640, color: '0xE8E4DC' }),
    ...e.lines.map((l, i) => dt(dir, `e_l${i}`, l, { font: SERIF, size: i === 0 ? 76 : 48, y: 720 + (i === 0 ? 0 : 20) + i * 84 + (i > 0 ? 12 : 0), color: 'white' })),
    ...e.cta.map((l, i) => dt(dir, `e_c${i}`, l, { font: SANS, size: 40, y: 1060 + i * 58, color: '0xE09A52' })),
  ];

  const f = [
    // main: split screen, 12 seconds
    `[1:v]split[s0][s1]`,
    `[s0]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=30:2,eq=brightness=-0.15[bg]`,
    `[s1]scale=960:540:force_original_aspect_ratio=increase,crop=960:540,setsar=1,fps=30[scene]`,
    `[0:v]scale=960:540:force_original_aspect_ratio=increase,crop=960:540,setsar=1,fps=30,tpad=stop_mode=clone:stop_duration=3,trim=duration=${L},setpts=PTS-STARTPTS[bts]`,
    `[bg][bts]overlay=60:400[a]`,
    `[a][scene]overlay=60:980,${over.join(',')},format=yuv420p,fps=30[main]`,
    // end card: Bob's photo, blurred and darkened, with the logo in a circle
    `[2:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=22:2,eq=brightness=-0.32:saturation=0.9,fps=30[ebg]`,
    `[3:v]scale=240:240,format=rgba,geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':a='if(lt(hypot(X-120,Y-120),120),255,0)'[logo]`,
    `[ebg][logo]overlay=420:340,${endText.join(',')},format=yuv420p,fps=30[end]`,
    `[main][end]xfade=transition=fade:duration=${FADE}:offset=${L - FADE},format=yuv420p[v]`,
    `[1:a]aformat=sample_rates=48000:channel_layouts=stereo,loudnorm=I=-16:TP=-1.5,afade=t=in:d=0.4,afade=t=out:st=${total - 0.8}:d=0.8[a2]`,
  ];
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error',
    '-ss', String(p.btsStart), '-t', String(L), '-i', p.bts,
    '-ss', String(p.sceneStart), '-t', String(total + 0.2), '-i', p.scene,
    '-loop', '1', '-framerate', '30', '-t', String(E), '-i', p.photo,
    '-loop', '1', '-framerate', '30', '-t', String(E), '-i', p.logo,
    '-filter_complex', f.join(';'), '-map', '[v]', '-map', '[a2]',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-t', String(total), '-movflags', '+faststart', `out/${p.id}.mp4`], { stdio: 'inherit' });
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', String(total - 1), '-i', `out/${p.id}.mp4`, '-frames:v', '1', '-q:v', '3', `out/${p.id}-end.jpg`]);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', '6', '-i', `out/${p.id}.mp4`, '-frames:v', '1', '-q:v', '3', `out/${p.id}.jpg`]);
  writeFileSync(`out/${p.id}.txt`, p.caption);
  console.log(`✓ ${p.id} (${total}s)`);
}
