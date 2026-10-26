# Ghost Browser launch kit

Prepared for the existing Windows 0.3.1 preview. These are drafts, not published announcements.

## Positioning

**A separate web workspace for screen-sharing sessions.**

Audience: Windows users presenting demos, teaching, or providing live support who want reference tabs separate from their shared material.

Evidence available: a downloadable portable build, source, automated Windows display-affinity checks, screenshot/clipboard checks, and permission tests. Receiver-side meeting compatibility is still awaiting reports. Do not describe these checks as proof that every meeting app hides Ghost.

## Short post

I built Ghost Browser: an MIT-licensed Windows browser for keeping reference tabs in a separate workspace during screen sharing.

It enables Windows capture exclusion, supports area screenshots and per-site microphone prompts, and runs as a portable app. Capture behavior depends on your sharing software; please verify it from a second device.

I'm looking for Windows testers, especially for Google Meet in Chrome and mixed-DPI monitors. A reproducible compatibility report would help a lot.

Source and download: https://github.com/Hassani0x/GhostBrowser

## Technical community draft

Title: Ghost Browser — a Windows web workspace with capture exclusion

I built this because I wanted reference tabs separate from the browser hosting a screen-sharing session. Ghost is an Electron app using Windows display affinity, with sandboxed pages, session-scoped microphone grants, and a screenshot-to-clipboard workflow.

The current 0.3.1 build is a portable, unsigned Windows 11 x64 preview. There are important limits: capture APIs differ, OS dialogs and shared audio are outside the protection, and some website sign-in flows may fail. Automated tests verify the local Windows flag and clipboard behavior; they do not establish receiver-side compatibility.

I'd appreciate reports of both successes and failures, including the capture app version, Windows version, sharing mode, and display scaling. Source, download, and test instructions: https://github.com/Hassani0x/GhostBrowser

## 30-second evidence-based demo script

Use harmless sample content and record both the local desktop and an independent receiver. Do not simulate the receiver's view.

| Time | Shot | Caption |
| --- | --- | --- |
| 0–5s | Presentation in Chrome, Ghost reference tab on the local screen | Keep reference tabs in a separate workspace. |
| 5–15s | Labelled local and receiver views side by side | Show the actual observed result, including failures. |
| 15–23s | Area capture and paste into a local test field | Capture an area. Paste the PNG. |
| 23–30s | Version, tested setup, and repository URL | Windows 0.3.1 preview. Test your setup before relying on it. |

Record exact Windows and browser versions and capture mode in the video description. If exclusion fails, report the failure; do not edit it into a success story. Publish broad compatibility claims only after repeatable evidence exists.

## Seven-day launch sequence

These are manual steps, not scheduled automation.

1. **Day 1:** Capture one real receiver-side test and fill the compatibility report. Record the initial metrics.
2. **Day 2:** Produce the short demo above. Put it near the README introduction with the tested setup.
3. **Day 3:** Share one founder post with the demo and one request: try the app and report a result.
4. **Day 4:** Choose one relevant technical community. Read its current promotion rules, disclose authorship, adapt the technical draft, and answer questions.
5. **Day 5:** Triage reproducible failures. Document workarounds and identify small contributor tasks with clear acceptance criteria.
6. **Day 6:** Publish a factual testing update only if there is new evidence. Thank testers who consent to attribution.
7. **Day 7:** Compare downloads, reports, contributors, and stars with the baseline. Continue the channel producing useful testers; revise the pitch if visitors do not try the app.

No star target is a forecast. Aim first for five independent reports and one reproducible demo. Stars, visits, and asset downloads are different measures; downloads are not unique users. The repo owner can inspect GitHub Traffic for views, clones, and referrals.

## Useful links

- Download: https://github.com/Hassani0x/GhostBrowser/releases/tag/v0.3.1
- Report: https://github.com/Hassani0x/GhostBrowser/issues/new?template=compatibility-report.yml
- Compatibility: https://github.com/Hassani0x/GhostBrowser/blob/main/docs/COMPATIBILITY.md
- Logo: [SVG](ghost-browser-logo.svg)
- Workflow illustration: [SVG](workflow.svg)

## Why these changes

GitHub documents topics as a way to find related repositories and explains how a README helps visitors understand and use a project. These are discoverability tools, not a guaranteed ranking formula.

- https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/classifying-your-repository-with-topics
- https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository
