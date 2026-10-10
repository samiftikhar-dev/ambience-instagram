# Ambience Instagram: how a Claude session works here

Instagram Reels for Sam's father-in-law's YouTube channel,
youtube.com/@theambienceexperience (channel id UCwysoW8U7j4eWShR09rhd3A).
Unrelated to Schedulign. README.md has the pipeline; this file has the state
and the rules.

## Rules

- Every fact a post states comes from catalog.json, written only from his own
  YouTube descriptions. "I recorded this" only where `onSite` is true. Every
  caption carries the `made` line (what is real, what was added with AI).
- Nothing posts that Sam has not seen on out/review.html.
- At most one Reel a day. LuxyBasement's Meta app was blocked at about 57
  posts a day.
- Never automate comments on other people's posts (Instagram forbids it).
  Replies on his own posts and a daily hand-posted comment list are fine.
- Never ask for or repeat a token in chat; secrets go in with `gh secret set`
  or the GitHub secrets page.
- Sam ruled out Metricool (Oct 9 2026): everything runs as code in GitHub Actions.
- On Windows, write files with the Write tool, not bash heredocs or `node -e`
  with backticks (a backtick ran a README command on Oct 9).

## Strategy (Sam, Oct 10 2026)

- Voice: Bob, first person. First Reel per video carries the about line in
  lib.mjs (long engineering career, retired, records and shoots it himself);
  the rest sign "— Bob". Never his former employer (lint refuses "Boeing").
- Goal: YouTube growth; every caption points to the full video.
- Audience: sleep and focus both; two Reels a day, ~9:30am and ~8:30pm Pacific.
- Layout: whole frame on a blurred copy (fit "full"), channel name under it.
- AI: one honest line per caption, never the headline.
- Behind-the-scenes posts wait for photos of Bob recording (Sam will send).
- Comments: daily list at 7am from the scheduled task
  ambience-daily-comment-list (C:\Users\samif\.claude\scheduled-tasks),
  written to C:\Users\samif\ambience-engagement\<date>.md; Mackenzie posts
  them by hand.
- Open with Bob: Pinnacle Peak (kSJ4KJAGqwI) credits audio to "Lance", so it
  is left out of the catalog; "Johnsin Creek" spelling (V63ZKoDurZ0 is
  captioned "a mountain creek cabin" until confirmed).
- Sources so far are 2-minute 720p clips (the clip_<id>_0-120_*.mp4 names
  Sam downloads); rename to <id>.mp4.

## State (Oct 9 2026)

- Instagram: @the.ambience.experience (email theambienceexp@gmail.com, name
  "The Ambience Experience", bio and profile picture set from brand/).
- Meta app AutoPosterTAE (app id 1808192427042708, Instagram app id
  4328569424032206), development mode, admin = Waid Louie's Facebook account.
  Permissions added: instagram_business_basic, _content_publish,
  _manage_comments, _manage_insights. Basic settings: PRIVACY.md links,
  category Entertainment, contact theambienceexp@gmail.com. App icon still
  to upload (brand/app-icon-1024.jpg).
- CONNECTED Oct 10 2026: IG_ACCESS_TOKEN set 05:27 UTC; check run 38027636076
  green ("@the.ambience.experience: 0 Reels posted", quota 0/100). Tester is
  "Instagram Tester" (not "Tester", which looks for a Facebook user). The
  browser pane also holds a LuxyBasement Instagram session: the token pop-up
  used it and dropped to the feed until Sam switched accounts. Claude Code's
  auto mode refuses to grant app roles or accept invites; Sam clicks those.
- WAITING ON HIM: source videos named <youtubeId>.mp4 into sources/. Nothing
  is rendered yet (tested only on a synthetic pattern).
- Token lasts 60 days: renew around Nov 28 2026.
- YouTube Shorts: built (youtube.mjs, shorts.yml, yt-auth.mjs) but PARKED and
  the workflow disabled (Sam: Instagram first). Uploads from an unaudited
  Google project are forced private until the YouTube API audit passes.
- Not built yet: auto-replies to factual questions on his posts; the daily
  hand-posted comment list (model: C:\Users\samif\luxybasement-engagement and
  the luxybasement-daily-comment-list scheduled task).

## Next session

1. When the sources arrive: `node plan.mjs`, `node render.mjs`,
   `node queue.mjs review`, show Sam out/review.html, adjust start/focus/fit/
   hold, then `node queue.mjs upload`.
