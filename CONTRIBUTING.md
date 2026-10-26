# Contributing

Thanks for helping improve Gost Browser. Small, focused changes are easiest to review.

## Develop

Fork the repository, create a feature branch, and run `npm.cmd ci` on Windows 11 with Node.js 24 LTS. Start the app with `npm.cmd start`. Run `npm.cmd test` and the relevant Electron checks described in the README before submitting a pull request. Include what changed, why, and how you verified it.

Preserve renderer sandboxing, keep app-control IPC unavailable to remote websites, apply capture protection before showing a window, and keep microphone grants scoped to website origins. Never include credentials, browser profiles, or private screenshots in commits.

## Report a bug

Include the Gost and Windows versions, steps to reproduce, expected and actual results, and relevant display scaling and monitor arrangement. For capture issues, identify the sharing application and whether the result was observed on a receiving device. Remove private content from screenshots and logs. For security concerns, follow SECURITY.md.

## Useful contributions

- Reproducible website sign-in compatibility reports.
- Mixed-DPI and multi-monitor testing.
- Keyboard navigation and accessibility improvements.
- Build size, packaging, and update support.
- Clearer documentation and receiver-side compatibility evidence.

Avoid claiming universal capture invisibility. Describe the specific setup you tested.
