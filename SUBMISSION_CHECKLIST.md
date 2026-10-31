# Orbit submission rehearsal

Validated October 30, 2026. Feature development is frozen for the hackathon.

## Readiness

**READY WITH MINOR ISSUES** for a rehearsed recording. No reproducible application blocker was found in the completed live journey. Deploy this hardening pass and rehearse the submitted production URL before recording; this pass did not deploy anything.

The main remaining risk is scientific image accuracy. Muse Image can still reverse arrows or add misleading structures despite prompt constraints. Inspect each image used in the recording. Do not present generation as a guarantee of factual accuracy.

## Evidence and limits

| Area | Completed evidence | Remaining limit |
| --- | --- | --- |
| Automated gates | 282 tests pass; lint, production build and diff check pass | Parallel Vite tests report a non-failing HMR port 24678 warning; Git reports Windows line-ending conversion warnings |
| Real learning journey | In Chrome, created an Orbital motion space, started a Spark lesson, loaded Muse imagery, used I lost you and Show me, submitted a partial/wrong activity response, received targeted feedback, answered a quiz incorrectly then its follow-up correctly, continued and returned | Full journey used the local serverless runtime, not production |
| Teaching and mastery | Recovery changed the analogy; activity feedback corrected the gravity misconception without scoring it; quiz evidence changed mastery; continuation and preference edits did not | No exhaustive curriculum/factual-quality evaluation |
| Presentation | All five real desktop modes inspected, including text-only lesson and conversation Focus; real text-only lesson and conversation inspected at tablet width; phone lesson, activity input and tool wrapping inspected at 390/320px. At 320px, generated imagery fit without cropping and the navigation drawer/Home worked | Responsive Chrome viewports are not physical devices; no exhaustive mode-by-width matrix in this pass. Small embedded image labels need zoom on narrow phones |
| Image quality | Real orbital, photosynthesis and React props/state images inspected. Final photosynthesis sample had correct input/output arrows and large labels; React parent state to child props flow was clear | Earlier orbital arrows remained ambiguous/inaccurate; an earlier photosynthesis sample reversed CO2 flow. Prompt changes improved the final sample but cannot guarantee future samples |
| Two profiles | Saved both contrasting profiles in Chrome; different guidance and return behavior. Direct real Spark comparison after fixes produced about 45 versus 90 words, early versus late example, image brief versus none. The fuller profile's next Chrome lesson was text-only | Generated wording varies per request; the profile is instructional guidance, not a learner classification |
| Image requests | Network inspection showed one request for recovery imagery and one for the changed explicit Show me context; activity and quiz switching did not regenerate images. Repeating Show me on a later unchanged activity image retained exactly one image request in Network. New lessons cleared prior images | StrictMode, late-response races, signed-URL decode failures, explicit retry and persistence exclusions are covered by automated tests; actual signed-URL expiration was not awaited |
| Conversation | Two real successful requests; composer cleared, learner/Orbit styling differed, completed exchanges remained ordered without duplicates | Partial streaming cadence was not captured visually; incremental rendering and interrupted retry are covered by tests |
| Failures | Live invalid payloads returned safe 400 responses from lesson, image, activity and conversation routes. Automated tests cover provider errors, interrupted streams, preserved drafts/content, retry and stale results | Chrome Offline still allowed localhost calls through. Targeted Network menu control was unreliable. These attempts do not prove failed-request UI behavior; rehearse a deliberate blocked request manually |
| Accessibility | Keyboard save, visible focus, native radio indicators, labelled controls and headings inspected; image alt text shortened. Reduced-motion and loading-announcement code/tests inspected | No full screen-reader or browser reduced-motion walkthrough |
| Production | Vercel project is Vite/Node 24; server key is marked sensitive in Production, Preview and Development. Public production alias returned 200, lesson API GET returned 405, review HTML returned 404. Build contains no server key name or review entry | No paid production model request in this pass; new code is not deployed yet |

No mock success was substituted in the real journey. Existing isolated previews and automated tests use mocks and remain separate evidence.

## Fixes in this pass

- Removed conflicting lesson prompt guidance so length and example order follow the selected profile. Enforced on-request automatic-visual suppression at the lesson response boundary; explicit Show me remains available.
- Tightened image composition prompts after observing excessive embedded text and reversed process arrows: large short labels, no duplicated titles/footer explanations, explicit input/output flow, and no invented molecular bonds.
- Cleaned return recaps so Markdown headings and clipped words do not appear, while preserving summaries of actual practice/discussion.
- Shortened image alt text to its teaching purpose and labels instead of repeating the full explanation.
- Replaced raw provider errors and exception logs in four older handlers with safe failure messages; added regression tests.

No layout redesign, scoring change, dependency, new model, database change, migration, historical migration edit, or manual SQL is required.

## Recording setup

Use a **fresh browser profile** for the recording, preserving your existing local learning data. Do not clear the profile used for development. The validation browser retains the added Orbital motion space and the contrasting fuller/on-request profile; apply the recording choices below in the recording profile.

- **Space:** Photosynthesis
- **Starting topic:** Where does a plant's food come from? How a leaf uses sunlight, carbon dioxide and water to make sugar.
- **Syllabus/materials:** None needed; use the self-directed space.
- **Viewport:** Approximately 1440px wide, browser zoom 100%, DevTools closed, normal networking.
- **Preload:** Save the five choices below, create the space, and rehearse its first lesson and image. Keep a separate prepared backup space, React props and state.
- **Images:** Use genuine Muse output. For a reliable short take, generate and inspect the opening image immediately beforehand, retain the mounted tab, and avoid refreshing. Record at least one real Show me generation if demonstrating the generation step; allow the loading state to finish. Do not substitute a fabricated response or show an inaccurate image as correct.
- **Timing:** Observed real teaching requests were generally about 7–16 seconds, with one recommendation around 20 seconds. Image samples took about 11–16 seconds, but the configured provider timeout is 180 seconds. Rehearse with time margin and avoid repeated clicks while pending.
- **Refresh:** Local progress/preferences survive. Temporary image URLs/bytes are not saved, so a full reload can issue a new image request. Activities and quizzes start fresh after a full restore; Home-to-Learn navigation retains mounted work.

Exact five answers:

1. **Short and focused**
2. **With a concrete example**
3. **Often, when a picture helps explain**
4. **One clear step, with quick understanding checks**
5. **Remind me where I left off**

Contrasting profile for an optional comparison: **A little more detail** / **Explain the idea, then give an example** / **Let me ask for it** / **Keep the tools in view so I can choose** / **Just let me continue**. Changes affect the next request, not already generated content.

## Click-by-click demo

1. Home → **Set up my preferences** → select the five recording answers → **Save preferences**.
2. **New space** → enter **Photosynthesis** in **Topic or skill** → enter the topic above in **A starting point (optional)** → **Create space** → **Try this** to start the lesson. If using a prepared space, open it and begin from its genuine first lesson.
3. Let Spark finish and the Muse image load. Explain that the lesson and image are separate requests; inspect the image before using it in the take.
4. Click **I lost you**. Show the changed explanation and calmer Recover composition.
5. Open **Study tools → Show me**. Let the new image finish; describe how it addresses the current explanation/confusion. Use **That helps** if shown when ready to leave recovery.
6. **Study tools → Let me try it**. Read the actual generated task, then submit a plausible partial answer. If relevant to that task, use: “Plants get their food from the soil; sunlight just warms them.” Do not give a rehearsed answer to an unrelated generated question.
7. Click **Share response**. Show which part was understood and which misconception Orbit corrected.
8. **Study tools → Quiz me**. Answer the actual question. If incorrect, read the adapted explanation and answer the follow-up; show the knowledge check before advancing.
9. Click **Continue to next lesson**. Show the new concept and cleared previous image; continuation itself does not establish mastery.
10. Click **Home → Learn** to return to the active thread. Show the current lesson and preference-based recap. Home can recommend another space when several exist; Learn returns to the retained Study session.
11. Optional: **Study tools → Talk it through**, ask “If plants get matter from air and water, what does soil contribute?”, then show the cleared composer and contextual reply.

**Primary topic:** Photosynthesis, because judges can follow the misconception, practice and input/output image without specialist knowledge. **Backup:** React props/state: a parent owns a count and passes its value to a child; props are read-only. The full interactive journey was tested on orbital motion; photosynthesis and React were tested with real lesson/image requests and inspected image files, so rehearse this exact recording path on the chosen topic.

## Final production and manual checklist

- Deploy the reviewed hardening commit to the existing Vercel project. No deployment or commit was created by this pass.
- Confirm the submitted URL opens in a signed-out/private window without a Vercel login gate. The current public alias is `https://orbit-roan-mu.vercel.app/`; verify whichever URL is actually submitted.
- Keep `MODEL_API_KEY` server-only, sensitive and available in Production. Confirm access to both existing Muse models. Never use a `VITE_` key or paste credentials into browser tools, logs or screenshots.
- Confirm framework Vite, repository root, production branch/commit and successful build. Preserve the image function's 200-second duration and conversation cancellation configuration.
- Run one real production lesson, image, activity, quiz and conversation request. Check safe status/errors and model access in that environment; a GET 405 proves route existence, not successful model generation.
- Confirm `.env*` and `.vercel` remain ignored; review pages return 404 in production and are absent from `dist`.
- Rehearse one deliberately blocked API request in DevTools. Verify retained learning content/draft, restrained retry, no raw error and no duplicate progress. Restore normal networking before recording. Also check an image-load failure/expired URL without an automatic retry loop.
- Inspect each recorded image for correct directions, labels and science. Use the backup topic if a new sample is misleading.
- Complete a short Tab/Shift+Tab and reduced-motion pass, plus screen-reader and physical-phone checks when available. These are not claimed as completed here.

## Remaining issue ranking

- **Blocker:** None reproduced in the tested local journey. Production deployment and a successful production rehearsal are still required before submitting the new code.
- **Minor:** Generated diagrams vary in factual accuracy; inspect the recorded sample. Real failure/expiry UI and live partial-stream timing remain manual checks. Long detailed activities require scrolling on a 320px screen, but controls remain reachable.
- **Ignore for hackathon:** Durable image history, cross-session image deduplication, exhaustive device parity, legacy renderer removal, broader performance work, accounts and cloud sync. Preserve the current feature freeze.

## Temporary files and commit

Keep `.orbit-review.html`, `.orbit-review-frame.html` and `.orbit-review-frame.jsx` as intentional development regression fixtures. They are tracked, excluded from the production build and unavailable at the tested production review URL. Keep their existing mocked image-failure and request-count controls. Do not delete test infrastructure to make the repository appear smaller.

Real request JSON, downloaded image samples and the test log were kept in the operating-system temporary directory, outside the repository. Do not commit signed image URLs or response dumps. No temporary assets were added to production.

Suggested commit: `Harden Orbit teaching preferences, image prompts, and demo reliability`
