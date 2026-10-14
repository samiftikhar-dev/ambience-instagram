# Ambience Instagram: how a Claude session works here

Instagram Reels for Sam's father-in-law Bob's YouTube channel,
youtube.com/@theambienceexperience (channel id UCwysoW8U7j4eWShR09rhd3A).
Unrelated to Schedulign. README.md has the pipeline; this file has the rules,
the lessons and the state.

## Rules

- Every fact a post states comes from catalog.json, written only from Bob's own
  YouTube descriptions plus corrections from Bob and Mackenzie. Never infer
  provenance: whether a picture is a photograph or a video, what is AI, what
  was recorded where. Where a description is silent, use the placeholder line.
- Nothing posts unless a Reel is approved on the review page AND its video's
  facts are confirmed there. Nothing starts until Sam says "go".
- ONE Reel a day, about 8:30pm Pacific, never 11pm to 7am. (Mackenzie asked,
  Sam agreed, Oct 13 2026.) LuxyBasement's Meta app was blocked at about 57
  posts in a day.
- Never automate comments on other people's posts (Instagram forbids it).
  Replies on his own posts and a daily hand-posted comment list are fine.
- Never ask for or repeat a token in chat; secrets go in with `gh secret set`
  or the GitHub secrets page.
- Everything runs as code in GitHub Actions (no Metricool, Sam's ruling).
- On Windows, write files with the Write tool, not bash heredocs or `node -e`
  with backticks (a backtick ran a README command on Oct 9).
- Claude Code's auto mode refuses to grant app roles or accept invites; Sam
  clicks those. Instagram password change = Generate token again.

## How to read Mackenzie's feedback (the process mistake of Oct 11)

Her feedback lives in THREE places and all must be read before touching
anything: the note boxes (ArtifactData collections `approvals`, `facts`, and the
old `holds`) AND the comment threads on the page (ArtifactComments, action
read). On Oct 11 only the note boxes were read and half her feedback was
missed. Then: treat each note as a RULE for every video, not a fix for one
video; encode it in catalog.json, the lint in lib.mjs or the renderer; and run
an audit across ALL Reels before saying it is done. Report what was changed per
note. Sessions here are never to claim a fix without checking the whole set.

## What Mackenzie has taught us (rules, each enforced in code)

- Facts: descriptions are loose. Fall Creek was not a night recording and is
  never "Fall Creek Falls". The desert storm began as a hike photo with the
  shelter and storm AI. Palisades Creek, Mount Rainier and Fall Creek are VIDEO
  recordings, not photographs. For Kay Falls only the sound is a recording.
- `photo` and `footage` flags: lintCaption/lintHook refuse "photo" unless
  `photo`, and refuse "filmed", "footage", "video", "I recorded this" unless
  `footage`. Never write "photographs" for a video of unknown picture type.
- ALL fires are AI-generated, none were recorded. Every video with `fire: true`
  says "The fire is AI-generated" (madeLine adds it; lint requires it).
- Wording: no colon in any describing line or hook, no "Sound on:" openers, no
  repeated lines (opening, place, made, sound lines must not overlap 60% or
  more; the place line is dropped when already said; `anon` places have none),
  Pacific Northwest at most once, no hooks that just list the sounds, no hot tub.
- On screen: the small label under the opening words only appears when it adds
  something (render.mjs labelFor), so a title never reads twice in a row.
- AI is secondary: "The place and the sound are real, and AI helps shape the
  visuals." Real first, AI second. Keep the short disclosure (Sam's ruling).
- Lead with the charming real details (the fly fisherman, the hummingbird, the
  ducks, nearly 100 lightning strikes). Newest upload (Autumn Falls) first.
- Seasons: spring videos are held while it is fall (plan.mjs HELD_SEASONS;
  `season` in the catalog). Held now: the creek-side cabin, Palisades Creek,
  the Skagit tulips, the Cascades cabin. Summer and winter are NOT held.
- The Cherry Blossom video is removed (almost entirely AI). Videos already seen
  on Instagram once (`posted`: Fall Creek, the desert storm, Kay Falls) go last.
- The first Reel of each video opens with Mackenzie's own introduction
  (INTRO in lib.mjs, "Hi, I'm Bob! 👋 ..."), except where `sharedSound` is true
  (the desert storm: other recordists). Never the employer's name.
- Every Reel ends with a 3-second end card (endcard.mjs): the logo, "Hi, I'm Bob.", "Real places, real sound.", "Follow for more scenes like this." and "The full nine-hour video is on YouTube. Link in bio." over Bob's own photo (bts-source/bob-at-tripod.jpg, NOT in git: the repo is public). NEVER promise a cadence ("every day") in any text, Sam's ruling Oct 14: we may not be able to deliver it. Instagram covers the bottom fifth of a Reel, so on-screen text stays above y 1500.
- Each Reel pops up "Full video on YouTube · link in bio" at 6 seconds. The
  Reels API cannot attach links, so the bio link stays the YouTube channel and
  each caption names the exact video to look for. A page of every video
  (docs/index.html, node hub.mjs) is built but NOT published: GitHub Pages would
  show Sam's username. A custom domain would revive it.

## State (Oct 13 2026)

- Posting is LIVE since Oct 13 2026 (Sam: "start posting"). publish.yml is enabled: one Reel a day at 8:30pm Pacific. Reel 1 (Autumn Falls) went out Oct 13 5:30pm Pacific. approved.json holds the 45 Reels queued (approved by Mackenzie AND facts confirmed); Kay Falls, Mount Rainier, Fall Creek and the desert storm are NOT queued until their facts are confirmed on the review page. To add more: update approved.json from the page, node queue.mjs upload.
- 57 Reels from 19 videos are rendered in out/ (gitignored) in posting order
  (clips.json). Review page: https://claude.ai/artifact/D4LW92esaec6xU2BTQUNCv
  (collections `approvals` and `facts`; rebuild with the scratchpad build.mjs,
  or recreate: page shows Reels tab + Facts tab, notes save as typed).
- Instagram @the.ambience.experience (theambienceexp@gmail.com). Meta app
  AutoPosterTAE (id 1808192427042708) in development mode, admin Waid Louie's
  Facebook account. IG_ACCESS_TOKEN works (checked Oct 10); it lasts 60 days,
  renew around Dec 1 2026. Mackenzie also manages the account.
- Comments: Sam asks in chat each day; follow COMMENTS.md (read-only browsing,
  signed in as the.ambience.experience), save to
  C:\Users\samif\ambience-engagement\<date>.md and history.json.
- YouTube Shorts: built (youtube.mjs, shorts.yml, yt-auth.mjs) but PARKED.
- Sources are 2-minute 720p clips in sources/ named <youtubeId>.mp4 (the
  downloads arrive as clip_<id>_0-120_*.mp4).

- BEFORE writing any claim about a video (pairings, split screens, captions), read that video's own YouTube description (videos.json, or fetch the watch page): Bob writes the facts there. On Oct 14 the Fall Creek valley waterfalls were nearly left out of a caption although its description says they were filmed on location.

## Open questions (waiting on Mackenzie, Bob or Sam)

- The desert storm Reel 1 and Kay Falls Reel 1 were marked "needs redone";
  Kay Falls is rebuilt, the desert storm has no specific change yet.
- Mount Rainier: are the fire and chairs on screen added?
- Pinnacle Peak (kSJ4KJAGqwI) credits audio to "Lance": left out of the
  catalog until Bob explains. "Johnsin Creek" spelling (V63ZKoDurZ0).
- Behind-the-scenes posts wait for photos of Bob recording.
- A shortened Instagram bio from Mackenzie's intro, under 150 characters,
  is proposed but not applied (Sam's phone, Edit profile).

## Next session

1. Read ALL of Mackenzie's feedback (see above), including comment threads.
2. `node plan.mjs`, `node render.mjs`, then rebuild the review page.
