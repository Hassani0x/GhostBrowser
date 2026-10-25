# Gost Browser — Windows 11 preview

A separate browser for websites and web apps, with Windows capture exclusion enabled before its window appears. Keep Google Meet in Chrome and use Gost for other websites.

## Run

Close the older Gost window, then open `release/Gost-Browser-0.3.1-Windows.exe`. This is a portable, unsigned preview; installation and administrator access are not required. Website cookies and sign-ins are stored in Gost's own profile, separate from Chrome.

From source (Node.js required):

```powershell
npm.cmd ci
npm.cmd start
```

## Controls

- Address bar: open an HTTP/HTTPS website or search Google.
- Ctrl+L: focus address bar. Ctrl+T / Ctrl+W: open / close tab.
- Ctrl+Tab / Ctrl+Shift+Tab: switch tabs. Ctrl+R: reload.
- Ctrl+Shift+Space: hide / show the whole browser, even while Chrome is focused.
- Pin on top: keep Gost above other windows.
- On this system Windows sometimes refuses pin-on-top while taskbar hiding is enabled. Gost reports that failure; microphone and capture exclusion still work.
- Gost is hidden from the taskbar. Click its system-tray icon near the clock (possibly under the up arrow) to show/hide it. Right-click for Show, Hide, and Quit. This also works if another app owns the shortcut.

## Microphone

Click a website's voice/microphone button, then choose **Allow for this session** in Gost's permission bar. Permission applies to that website origin and resets when Gost quits. Choose **Block** to deny a request. **Mic allowed · Reset** revokes permission and reloads all tabs for that origin to stop existing audio tracks.

## Screenshot an area outside Gost

Click the camera button beside **Pin on top**, or press **Ctrl+Shift+S** while working in another app. The tray menu also offers **Capture area**. If another application owns the shortcut, the button still works and its tooltip reports the conflict.

Gost temporarily hides itself and captures the monitor containing your pointer. Drag over the area you want; releasing the mouse copies a PNG image to the clipboard. Click the destination message field and paste with **Ctrl+V** (not Ctrl+B), or use the **Paste** button beside the screenshot camera. Right-click editable fields for Paste. **Esc** or **Cancel** leaves the clipboard unchanged. **Enter** captures the entire selected monitor. Move the pointer to another monitor before starting to capture that monitor; a selection cannot span multiple monitors in this version.

The selection overlay is excluded from supported captures before it is shown and has no taskbar entry. It uses its own interface, without opening Windows Snipping Tool or a save dialog. Gost restores its previous visibility afterwards; if it was hidden before the shortcut, it stays hidden. Nothing is saved to a file or uploaded automatically. The image remains in the Windows clipboard until replaced, and Windows clipboard history/sync may retain it if enabled.

The shared mouse pointer may still be visible to meeting participants. Capture exclusion is API-dependent: verify the **selection overlay as well as Gost** from a second Meet participant's view before relying on it. Other capture-protected apps may appear absent or blank in your screenshot.

## Verify your Google Meet setup

1. Open Meet in Chrome and join a test meeting from a second device or with someone who can check the received video.
2. Start sharing your **entire screen** in Chrome.
3. Open Gost over a recognizable background and browse a harmless test page.
4. On the receiving device, verify that the background remains visible and the Gost window is absent. Check moving, resizing, pinning, tab changes, and hiding/showing.
5. Repeat for every monitor and capture mode you plan to use. Repeat after Windows, Chrome, or app updates.

The status “Capture exclusion on” means the setting is enabled; it does **not** mean Meet has been independently verified. Windows implements this through `SetWindowDisplayAffinity(WDA_EXCLUDEFROMCAPTURE)` via Electron. Capture APIs and software can differ. This is not a universal invisibility guarantee and does not hide the app from process lists or someone looking at the physical screen. Screen exclusion does not suppress shared audio or the shared cursor.

## Preview scope

- Tabs, navigation, search, persistent cookies, quick links, always-on-top, hide/show.
- Web pages are sandboxed, with no Node.js or app-control access.
- New HTTP/HTTPS windows are redirected into tabs inside the protected window. Pop-ups requiring `window.opener`, POST data, or special authentication flows may not work. No automatic external browser launch.
- ChatGPT and other sites can impose their own embedded-browser/login restrictions. Actual account sign-in needs user testing; no credentials are imported from Chrome.
- Microphone access uses the permission prompt above. Downloads, notifications, camera, screen capture, geolocation and other permissions remain disabled.
- File upload pickers and other operating-system UI are outside the app's capture protection; do not open them during sharing if their contents are private.
- Websites and web apps only, not arbitrary Windows applications. No extensions, password manager, or automatic updates in this preview.

## Development and checks

```powershell
npm.cmd test
npm.cmd run test:app
npm.cmd run test:screenshot
npm.cmd run dist
```

The app checks use a temporary isolated browser profile and a local fixture. They verify the actual Windows display-affinity value, navigation, protected pop-up handling, keyboard controls, renderer isolation, and microphone allow/block/revoke using a simulated audio device. They write `test-results/verification.json` and app-only screenshots. They do not constitute a Google Meet participant-side test or a physical microphone check.

Screenshot selection tests use a synthetic screen image and an in-memory clipboard substitute; an additional check writes the production PNG to the real clipboard and restores its previous contents. They verify the real overlay's native Windows exclusion flag, exact cropped pixels, reverse dragging, cancellation, duplicate suppression, error recovery, and visibility restoration. Geometry tests cover mixed scaling. The `tests/capture-roundtrip.js` check captures a controlled colored app window and verifies that clipboard pixels exactly match the cropped screen image. The optional `tests/capture-smoke.js` Electron entry point checks the real capture API and discards the pixels without saving or copying them.

Built independently; OpenCluely was a concept reference, and no OpenCluely code was copied.

References: [Electron content protection](https://www.electronjs.org/docs/latest/api/browser-window#winsetcontentprotectionenable), [Microsoft display affinity](https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-setwindowdisplayaffinity).

