# Zenith — IPM 1 presentation

## Six-minute walkthrough

1. Explain the problem: timetable information and notices arrive through separate channels.
2. Show the current class, room, remaining time and the next class. Open the timetable and point out the last successful sync.
3. Open a genuine upcoming deadline. Show its source, instructions and submission link.
4. Explain one subject's held attendance, remaining safe misses and penalty. This is a planning estimate; representative marks take priority over self-reported marks.
5. As a moderator, demonstrate a manual event. If notice extraction is configured, paste a non-sensitive notice, review the draft beside the original and publish only after checking its deadline.
6. Propose a small IPM 1 pilot with designated representatives and a faculty contact. Measure update speed, representative effort and student feedback.

## Check before presenting

- Verify the production commit in Vercel. Updates currently use the `codex/dashboard-security-revamp` branch; a push there does not establish that production was updated.
- Test sign-in with a student and moderator account. Students must not see notice imports or publish controls.
- Verify the ICS URL, last sync, course names, room and time against Registro.
- Rehearse on the presentation device. Keep screenshots or a short recording as a backup.
- Use genuine events. Synthetic events belong only in a clearly labelled demo environment.
- Rotate credentials previously shared in chat. Keep replacement secrets in local `.env` and Vercel environment settings.

## Notice extraction setup

Set either `GEMINI_API_KEY` (optional `GEMINI_MODEL`, default `gemini-2.5-flash`) or all three gateway variables: `AI_GATEWAY_URL`, `AI_GATEWAY_API_KEY`, `AI_GATEWAY_MODEL`. Gateway requests use the OpenAI-compatible chat-completions API with structured JSON output. Restart local development after changing environment settings; redeploy after changing Vercel settings.

Paste text or upload `.txt`, `.eml` or `.md` files under 20 KB. Uploads are read into the editor locally; text is sent to the provider only when creating drafts. PDF/image extraction is not implemented. Up to twelve draft events can be extracted from one notice. Missing or ambiguous deadlines require human input in IST. Repeated identical notices are deduplicated; matching published titles and deadlines are flagged during review. Publication uses the existing transactional review function and records the reviewer. Provider output is validated and cannot itself publish events.

## Rollout scope

IPM 1 is the pilot. IPM 2/3 need their rosters and policies before signup is enabled. MBA 1/2 labels are supported, but their real programme/section structure, rosters, timetable feeds and attendance policies still need to be supplied. Do not present all five cohort groups as operational yet.

## Verification for this update

- Production build, TypeScript, targeted lint and regression checks.
- Regression checks cover IST draft editing, ambiguous dates, duplicate matching, link validation and mocked provider success/failure, alongside the existing attendance and ICS checks.
- Live Supabase review tested in a rolled-back transaction: publication, source/reviewer recording and repeat approval returning the same event.
- Student access to notice review and the private queue checked with a student JWT context and the authenticated database role.
- Real AI extraction requires a configured provider key. Deployment and a full signed-in browser walkthrough require the appropriate account access.
