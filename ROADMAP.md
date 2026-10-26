# Roadmap

Ghost Browser is a focused Windows preview, not a promise of universal capture invisibility. Priorities are based on reliability, compatibility evidence, and a small install footprint.

## Next

- Publish signed Windows builds and document the verification process.
- Maintain the existing Windows CI and release workflow; expand receiver-side validation.
- Collect receiver-side compatibility reports for Google Meet, Zoom, Teams, OBS, and Discord.
- Improve keyboard navigation, focus states, and screen-reader labels.
- Add clearer diagnostics for display scaling, monitor selection, and capture API behavior.

## Later

- Evaluate an update mechanism with explicit user control.
- Improve compatibility with authentication flows that require popups or opener state.
- Add optional export/save controls for screenshots without changing the clipboard-first default.
- Investigate macOS and Linux capture-protection equivalents only if they provide reliable, testable semantics.

## Not planned for the preview

- Claiming universal invisibility across every recorder or capture API.
- Importing Chrome passwords, cookies, or browser profiles.
- Running arbitrary native Windows applications inside Ghost.
- Adding extensions or a password manager before the security model is redesigned.

Have a concrete use case? Open a feature request with the workflow, constraints, and a safe reproduction.
