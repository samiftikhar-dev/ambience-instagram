/**
 * Shared by render, plan and publish: the catalog, captions and the caption lint.
 *
 * Every fact a post states comes from catalog.json, which is written only from
 * Bob's own YouTube descriptions plus corrections from Bob and Mackenzie.
 * Captions are templates, never free text, so a caption is the same every time
 * it is rebuilt.
 */
import { readFileSync } from 'node:fs';

export const catalog = () => {
  const all = JSON.parse(readFileSync('catalog.json', 'utf8'));
  delete all._rules;
  return all;
};

const HOURS = { 1: 'one', 2: 'two', 3: 'three', 8: 'eight', 9: 'nine', 10: 'ten' };
export const hoursWord = (n) => HOURS[n] || String(n);

/** Where the place is, as a caption phrase: "Bow Falls, Banff, Alberta". */
export const placeLine = (v) => [v.place, v.region].filter(Boolean).join(', ');

/**
 * Posts speak as Bob (Sam, Oct 10 2026). The first Reel from each video
 * introduces him in one line; the others just sign off. Built from his own
 * channel About text (places he has explored, his own photography and video).
 * Never his former employer: he doesn't want to be easy to identify.
 */
// Mackenzie's own wording (Oct 10), without her last two sentences: the "Find the
// full video" line that follows names the exact video and says link in bio.
export const INTRO = "Hi, I'm Bob! 👋 After a long career as an engineer, I retired and went outside. Now I travel to peaceful places, record the sounds myself, and build each scene from my own photos and footage. Whether you need to focus, unwind, or drift off to sleep, I hope these little escapes help.";

const FIRE_AI = /fire[^.]*\bAI\b|\bAI\b[^.]*fire/i;
/**
 * The "how it was made" line. Mackenzie (Oct 10): none of the fires were ever
 * recorded, they are all AI-generated, so any video with a fire says so.
 */
export function madeLine(v) {
  return v.fire && !FIRE_AI.test(v.made) ? `${v.made} The fire is AI-generated.` : v.made;
}

const STOP = new Set('i the a an at in of and my me we this that is was were to for on by with it its you ll no from as or are be there here'.split(' '));
const words = (s) => new Set(s.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter((w) => w && !STOP.has(w)));
/** Share of the shorter text's words that the other one also has (0 to 1). */
export function overlap(a, b) {
  const A = words(a), B = words(b);
  if (!A.size || !B.size) return 0;
  let n = 0;
  for (const w of A) if (B.has(w)) n++;
  return n / Math.min(A.size, B.size);
}
const firstSentence = (s) => s.split(/(?<=[.!?]) /)[0];

/**
 * The lines of a caption that say what the Reel is about: the opening line, the
 * place (only when neither the opening line nor the made line already names it),
 * the made line and the sound line. Mackenzie (Oct 10): the first two lines
 * must never repeat each other.
 */
function bodyLines(clip, v) {
  const hook = `${clip.hook}.`.replace(/([.?!])\.$/, '$1');
  const said = `${clip.hook} ${v.made}`;
  const showPlace = !v.anon && overlap(v.place, said) < 0.6;
  return { hook, place: showPlace ? `${placeLine(v)}.` : null, made: madeLine(v), hear: `You'll hear ${v.sounds}.${v.music ? '' : ' No music.'}` };
}

/** Mackenzie's note (Oct 10): a place followed by a colon reads as clunky, so every line is a sentence. */
export function captionFor(clip, v) {
  const first = /-1$/.test(clip.id);
  const b = bodyLines(clip, v);
  const lines = [
    b.hook,
    '',
    ...(b.place ? [b.place] : []),
    b.made,
    b.hear,
    '',
    // The intro says Bob records the sounds himself, so it is not used where others did.
    first && !v.sharedSound ? (v.intro || INTRO) : '— Bob',
    '',
    `Find the full ${hoursWord(v.hours)}-hour video, "${v.short}", on YouTube at The Ambience Experience. Link in bio.`,
    '',
    v.tags.slice(0, 5).join(' '),
  ];
  return lines.join('\n');
}

/**
 * Refuses wording that would undercut the account: typos the channel has made
 * before, claims the catalog can't back, repeated phrases and hashtag spam.
 * Returns problems.
 */
export function lintCaption(text, v) {
  const problems = [];
  const lower = text.toLowerCase();
  const prose = lower.replace(/#\w+/g, '');
  if (/\bamsr\b/.test(lower)) problems.push('says "AMSR" (ASMR)');
  if (/100%|fully real|no ai\b|zero ai/.test(lower)) problems.push('claims no AI');
  if (/\bi recorded this\b/.test(lower) && !v.onSite) problems.push('says "I recorded this" but onSite is false');
  if (/boeing/.test(lower)) problems.push('names his former employer');
  if (/link in description|subscribe now|follow for follow|f4f|l4l/.test(lower)) problems.push('spam phrase');
  if ((prose.match(/pacific northwest|\bpnw\b/g) || []).length > 1) problems.push('says Pacific Northwest more than once');
  if (/fall creek falls/.test(lower)) problems.push('says "Fall Creek Falls" (it is Fall Creek)');
  const tags = text.match(/#\w+/g) || [];
  if (tags.length > 5) problems.push(`${tags.length} hashtags (5 at most)`);
  if (text.length > 2200) problems.push('longer than Instagram allows');
  if (!v.made) problems.push('no line saying what is real and what was added');
  // No two of the opening lines may say the same thing (Mackenzie, Oct 10).
  // Only the lines that describe the Reel, up to the sign-off (the "Find the full
  // video" line names the video's own title, so it echoes the opening on purpose).
  const all = text.split('\n').filter(Boolean);
  const end = all.findIndex((l) => l.startsWith("Hi, I'm Bob") || l.startsWith('— Bob'));
  const tops = all.slice(0, end < 0 ? 4 : end);
  // Mackenzie (Oct 10): never call a recording a photograph, and never make the
  // picture sound recorded when only the sound is. The catalog flags decide.
  const said = tops.join(' ').toLowerCase();
  if (tops.some((l) => l.includes(':'))) problems.push('a caption line has a colon (Mackenzie: every line is a plain sentence)');
  if (v.fire && !FIRE_AI.test(tops.join(' '))) problems.push('the video has a fire but the caption does not say the fire is AI-generated');
  if (/hot tub/i.test(tops.join(' '))) problems.push('mentions the hot tub (Mackenzie does not want it highlighted)');
  if (/\bphoto/.test(said) && !v.photo) problems.push('says photo/photograph, but the picture is not known to be a photograph');
  if (/\b(filmed|footage|video)\b/.test(said) && !v.footage) problems.push('says filmed/footage/video, but the picture is not known to be a recording');
  if (/\bi recorded this\b/.test(said) && !v.footage) problems.push('says "I recorded this", which reads as the picture, but only the sound is a recording');
  for (let i = 0; i < tops.length; i++) for (let j = i + 1; j < tops.length; j++) {
    const o = overlap(firstSentence(tops[i]), firstSentence(tops[j]));
    if (o >= 0.6) problems.push(`lines repeat each other (${o.toFixed(2)}): "${firstSentence(tops[i])}" / "${firstSentence(tops[j])}"`);
  }
  return problems;
}

export function lintHook(hook, v) {
  const problems = [];
  if (hook.length > 48) problems.push(`hook is ${hook.length} characters (48 at most)`);
  if (hook.includes(':')) problems.push('hook has a colon');
  if (/hot tub/i.test(hook)) problems.push('hook mentions the hot tub');
  if (/\bphoto/i.test(hook) && !v.photo) problems.push('hook says photo, but the picture is not known to be a photograph');
  if (/\b(i filmed|filmed this|footage|i recorded this)\b/i.test(hook) && !v.footage) problems.push('hook makes the picture sound recorded, but only the sound is');
  if (/\bi recorded this\b/i.test(hook) && !v.onSite) problems.push('hook says "I recorded this" but onSite is false');
  if (/\bnight\b/i.test(hook) && /fall creek/i.test(v.place)) problems.push('Fall Creek is not a night recording');
  return problems;
}
