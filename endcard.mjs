/**
 * The 3-second end card on every Reel: the channel logo, who Bob is, a reason to
 * follow and the pointer to the full video, over Bob's own photo (blurred and
 * darkened). It sits in the middle of the screen: Instagram covers about the
 * bottom fifth of a Reel with the caption and buttons.
 *
 * Wording (Sam, Oct 14): never a promise about how often, so "more scenes like this".
 * The photo lives in bts-source/ (not in git: the repository is public).
 */
import { existsSync, writeFileSync } from 'node:fs';
import { hoursWord } from './lib.mjs';

export const END_LENGTH = 3;
export const END_FADE = 0.5;
export const END_PHOTO = 'bts-source/bob-at-tripod.jpg';
export const END_LOGO = 'brand/profile-1080.jpg';

const SERIF = 'fonts/PlayfairDisplay.ttf', SANS = 'fonts/SpaceGrotesk.ttf';
const spaced = (s) => s.toUpperCase().split('').join(' ').replace(/ {3}/g, '   ');

function dt(dir, name, value, { font, size, y, color = 'white' }) {
  const file = `${dir}/${name}.txt`;
  writeFileSync(file, value);
  return `drawtext=fontfile=${font}:textfile=${file}:fontsize=${size}:fontcolor=${color}:x=(w-text_w)/2:y=${y}:shadowcolor=black@0.65:shadowx=0:shadowy=3:expansion=none`;
}

export const endCardAvailable = () => existsSync(END_PHOTO) && existsSync(END_LOGO);

/** ffmpeg input arguments for the card's photo and logo (two inputs, in this order). */
export const endCardInputs = (photo = END_PHOTO) => [
  '-loop', '1', '-framerate', '30', '-t', String(END_LENGTH), '-i', photo,
  '-loop', '1', '-framerate', '30', '-t', String(END_LENGTH), '-i', END_LOGO,
];

/** Filters that turn the photo input (index p) and logo input (index l) into the labelled stream [end]. */
export function endCardFilters(dir, p, l, hours, line1 = 'Real places, real sound.') {
  const text = [
    dt(dir, 'e_name', spaced('The Ambience Experience'), { font: SANS, size: 32, y: 640, color: '0xE8E4DC' }),
    dt(dir, 'e_l0', "Hi, I'm Bob.", { font: SERIF, size: 76, y: 720 }),
    dt(dir, 'e_l1', line1, { font: SERIF, size: 48, y: 836 }),
    dt(dir, 'e_l2', 'Follow for more scenes like this.', { font: SERIF, size: 48, y: 920 }),
    dt(dir, 'e_c0', `The full ${hoursWord(hours)}-hour video`, { font: SANS, size: 40, y: 1060, color: '0xE09A52' }),
    dt(dir, 'e_c1', 'is on YouTube.', { font: SANS, size: 40, y: 1118, color: '0xE09A52' }),
    dt(dir, 'e_c2', 'Link in bio.', { font: SANS, size: 40, y: 1176, color: '0xE09A52' }),
  ];
  return [
    `[${p}:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=22:2,eq=brightness=-0.32:saturation=0.9,fps=30[ebg]`,
    `[${l}:v]scale=240:240,format=rgba,geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':a='if(lt(hypot(X-120,Y-120),120),255,0)'[elogo]`,
    `[ebg][elogo]overlay=420:340,${text.join(',')},format=yuv420p,fps=30[end]`,
  ];
}
