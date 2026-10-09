/**
 * Shared by render, plan and publish: the catalog, captions and the caption lint.
 *
 * Every fact a post states comes from catalog.json, which is written only from
 * the creator's own YouTube descriptions. Captions are templates, never free
 * text, so a caption is the same every time it is rebuilt.
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

export function captionFor(clip, v) {
  const lines = [
    `${clip.hook}.`.replace(/([.?!])\.$/, '$1'),
    '',
    `${placeLine(v)}: ${v.sounds}, with no music.`,
    v.made,
    '',
    `The full ${hoursWord(v.hours)}-hour version is on YouTube. Link in bio.`,
    '',
    v.tags.slice(0, 5).join(' '),
  ];
  return lines.join('\n');
}

/**
 * Refuses wording that would undercut the account: typos the channel has made
 * before, claims the catalog can't back, and hashtag spam. Returns problems.
 */
export function lintCaption(text, v) {
  const problems = [];
  const lower = text.toLowerCase();
  if (/\bamsr\b/.test(lower)) problems.push('says "AMSR" (ASMR)');
  if (/100%|fully real|no ai\b|zero ai/.test(lower)) problems.push('claims no AI');
  if (/\bi recorded this\b/.test(lower) && !v.onSite) problems.push('says "I recorded this" but onSite is false');
  if (/link in description|subscribe now|follow for follow|f4f|l4l/.test(lower)) problems.push('spam phrase');
  const tags = text.match(/#\w+/g) || [];
  if (tags.length > 5) problems.push(`${tags.length} hashtags (5 at most)`);
  if (text.length > 2200) problems.push('longer than Instagram allows');
  if (!v.made) problems.push('no line saying what is real and what was added');
  return problems;
}

export function lintHook(hook, v) {
  const problems = [];
  if (hook.length > 48) problems.push(`hook is ${hook.length} characters (48 at most)`);
  if (/\bi recorded this\b/i.test(hook) && !v.onSite) problems.push('hook says "I recorded this" but onSite is false');
  return problems;
}
