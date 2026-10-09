# The Ambience Experience: Reels and Shorts

Short, looping Reels cut from the real scenes on
[youtube.com/@theambienceexperience](https://www.youtube.com/@theambienceexperience),
with the sound he recorded on location, posted once a day to Instagram as a Reel and to the channel as a YouTube Short.

What sets the channel apart is that the places are real and visited, the sound is
recorded on site, and he says plainly what was added with AI. Every post keeps
that: facts come only from `catalog.json` (written from his own descriptions),
and each caption carries the line saying what is real and what was added.

## How it runs

| Step | Who | What |
| --- | --- | --- |
| 1 | him | Drop the finished video (or its source loop) into the shared folder, named after its YouTube id, e.g. `ERo2kfGJJXA.mp4` |
| 2 | `node videos.mjs` | Reads the channel's public feed for titles and descriptions |
| 3 | a person, once per video | Add the video to `catalog.json`: place, sounds, what is real, three hooks |
| 4 | `node plan.mjs` | Three clips per video, scenes taking turns, best-liked first |
| 5 | `node render.mjs` | 12-second seamless loops, 1080x1920, his own audio, the hook on the first seconds |
| 6 | `node queue.mjs review` | `out/review.html`: watch every Reel with its caption before it can post |
| 7 | `node queue.mjs upload` | Puts the approved Reels in the `queue` release |
| 8 | `publish.yml` | Posts the next Reel every evening, records it in `published.json` |
| 9 | `shorts.yml` | Uploads the same clip as a Short (`youtube.mjs`, records in `shorts.json`) |

A clip with `"hold": true` in `clips.json` never posts. Change a clip's `start`
(seconds into the video), `focus` (0 left to 1 right, where the 9:16 crop sits)
or `fit: "full"` (whole frame on a blurred copy), then `node render.mjs <id>`.

Rendering needs ffmpeg (`winget install Gyan.FFmpeg`). Source videos and renders
stay on the computer (`sources/`, `out/` are not in git).

## Safety

- One Reel a day, at least 18 hours apart. LuxyBasement's app was blocked by
  Meta after about 57 posts in a day; this stays far below that.
- If Instagram refuses with a block or a dead token, the run writes `blocked.txt`
  and nothing posts again until a person renews the token and deletes the file.
- Comments on other people's posts are never automated (Instagram forbids it).

## Setup (one time)

Instagram
1. Switch the account to Professional, type Creator (free, reversible; the API
   cannot post for a plain personal account). No Facebook Page is needed.
2. developers.facebook.com: a new app (Business type), add "Instagram API with
   Instagram Login", add the account as an Instagram tester, accept the invite in
   Instagram (Settings, Website permissions, Apps and websites), then Generate token.
3. Store it (the value is never shown):
   `gh secret set IG_ACCESS_TOKEN --repo samiftikhar-dev/ambience-instagram`
4. Actions tab: run "Post a Reel" with mode `check`.
   The token lasts 60 days. Renew it around day 50 the same way.

YouTube
1. console.cloud.google.com: a new project, enable "YouTube Data API v3".
2. OAuth consent screen: External, then Publish app (In production). In testing
   mode Google drops the connection every 7 days.
3. Credentials: Create OAuth client ID, type Desktop app, download the JSON.
4. `node yt-auth.mjs path\to\client_secret.json`, signed in as the channel's owner
   (the "unverified app" screen is expected: Advanced, continue).
5. Ask for the API audit (https://support.google.com/youtube/contact/yt_api_form).
   Until Google approves it, every upload from a new project is locked private;
   youtube.mjs warns in the run when that happens.
