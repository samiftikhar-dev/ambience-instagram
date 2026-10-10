# Daily comment list

Sam asks for this in chat ("today's comments"); there is no scheduled routine (Sam, Oct 10 2026). Reply with the list in chat, ready to forward to Mackenzie.

Build today's Instagram comment list for The Ambience Experience (Instagram: @the.ambience.experience; YouTube: youtube.com/@theambienceexperience). The channel is Bob's: after a long engineering career he retired and now visits real places, records the sound himself and builds 9-hour ambience videos (fire, water, rain, cabins) from his own photos and footage, with some AI-assisted animation that he discloses. Mackenzie posts the comments by hand from @the.ambience.experience. Your job is only to find the posts and draft the comments. Comments are in Bob's first-person voice.

HARD RULES
- Read only. Never like, follow, comment, message, save or post anything on Instagram yourself, and never log in or out or switch accounts. If Instagram shows a challenge, captcha or "suspicious activity" screen, stop and report it.
- Use the built-in browser (tools named mcp__Claude_Browser__*). Load them in one ToolSearch call with query "mcp__Claude_Browser__" if they are deferred. Prefer javascript_tool / get_page_text over screenshots for reading.
- Keep it light: no more than about 40 page loads in total, a few seconds apart.
- Never mention his former employer or anything that identifies him beyond "Bob".

STEP 1: FACTS AND LOGIN
Read C:\Users\samif\ambience-instagram\catalog.json. Each entry (keyed by YouTube video id) has the place, region, sounds, onSite (true means the main sound was recorded at that place) and made (what is real, what was added). These are the ONLY facts you may use about his videos.
Open https://www.instagram.com/ . If it shows a "Log in" button you are logged out: carry on with the public pages and say so at the top of the list.

STEP 2: COLLECT CANDIDATES (two kinds)
A. Place posts (about 6 of 10): people who visited the places in his videos. Use location hashtags for catalog places, rotating day to day, for example: grassilakes, bowfalls, banffnationalpark, canmore, fallcreekfalls, hohrainforest, olympicnationalpark, joshuatree, joshuatreenationalpark, skagitvalleytulipfestival, skagitvalley, mountrainier, mtrainier, reflectionlake, sawtoothmountains, stanleyidaho, salmonriver, snoqualmie, twinfallswa, kauai, coachellavalley, phoenixhiking, palisadescreek, britishcolumbia waterfalls. Keep a post only if it is clearly at that place (caption, location tag or hashtag).
B. Ambience posts (about 4 of 10): creators posting cozy ambience, rain, fireplace, cabin or nature-sound reels. Hashtags such as: cozyambience, ambiencevideo, rainsounds, fireplaceambience, natureasmr, cabinvibes, cozycabin, rainyday, sleepsounds.
On each page read the post links (a[href*="/p/"], a[href*="/reel/"]), account, caption and like count. Post age: shortcodes grow over time (early October 2026 starts with "De"); open a post and read its time element's datetime when needed. Aim for the last 7 days; up to 4 weeks if needed; never older than 2 months.

STEP 3: CHOOSE 10
- 10 different accounts. English captions only.
- Real people and small creators first (travel photos, hikers, campers, families, cozy-ambience hobbyists). Skip brands, tour companies, hotels, news pages, giveaway or "follow for follow" accounts, and anything political, sad, controversial or explicit, or with comments limited.
- For ambience posts, skip accounts that are clearly large channels selling something; small and mid creators are the best fit.
- Skip any post or account in C:\Users\samif\ambience-engagement\history.json (create the folder and file if missing; a JSON array of {date, account, url, kind}). Don't reuse an account within 14 days.

STEP 4: WRITE THE COMMENTS
One comment per post, 1–2 sentences, about that specific post: react to something real in it (the light, the water colour, the season, the trail, the sound, the mood). Warm, plain, the way a friendly retired guy who loves these places would write.
- Place posts: in about half of them (mark "(mention)"), lightly add that Bob has been there too, true to the catalog: if onSite is true for that place you may say he recorded the sound there for one of his ambience videos (e.g. "I recorded the falls here for a long ambience video and still hear them when I close my eyes."); if onSite is false, say only that he photographed it or that it became one of his scenes. Never say "check out my page", never a link, never "subscribe", never a hashtag. The other half: just a genuine comment about their post.
- Ambience posts: genuine appreciation from a fellow maker (the sound mix, the loop, the fire, the rain texture). At most one of the four may say lightly that he records his own sound too. Never criticise, never compare, never promote.
- At most one emoji per comment. Don't repeat phrasing across the 10. State only facts you are sure of.

STEP 5: OUTPUT
Write the list to C:\Users\samif\ambience-engagement\<YYYY-MM-DD>.md and append the 10 picks to history.json.
Format the file so it can be forwarded to Mackenzie as is:
- Title: "Comments for @the.ambience.experience, <date>".
- One line on login status, then the short how-to: post from @the.ambience.experience; like each post first; space comments a few minutes apart; reply if someone answers (Bob's voice, warm, short).
- A numbered list. Each entry: @account, what the post is and where (with like count and date), the full post URL on its own line, then the comment as a quote ready to copy. Mark "(mention)" where the comment mentions Bob's video, and "[ambience]" for creator posts.
Then reply in chat with the same list.
