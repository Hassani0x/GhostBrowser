# Capture compatibility

Ghost uses Electron's Windows content-protection API, which maps to Windows display affinity. Whether a receiver sees an excluded window depends on the capture application, capture mode, Windows version, monitor, and display scaling.

This table records community results. A result is useful only when it was checked from a second device, a recording, or another independent receiver view.

| Application | Version | Mode | Windows | Result | Reproduction |
| --- | --- | --- | --- | --- | --- |
| Google Meet in Chrome | Not yet reported | Entire screen | Windows 11 | Open | [Report a result](https://github.com/Hassani0x/GhostBrowser/issues/new?template=compatibility-report.yml) |
| Microsoft Teams | Not yet reported | Entire screen | Windows 11 | Open | [Report a result](https://github.com/Hassani0x/GhostBrowser/issues/new?template=compatibility-report.yml) |
| Zoom | Not yet reported | Entire screen | Windows 11 | Open | [Report a result](https://github.com/Hassani0x/GhostBrowser/issues/new?template=compatibility-report.yml) |
| OBS Studio | Not yet reported | Display capture | Windows 11 | Open | [Report a result](https://github.com/Hassani0x/GhostBrowser/issues/new?template=compatibility-report.yml) |
| Discord | Not yet reported | Entire screen | Windows 11 | Open | [Report a result](https://github.com/Hassani0x/GhostBrowser/issues/new?template=compatibility-report.yml) |

## How to test safely

1. Use a harmless test page and a second device or recording.
2. Test Ghost itself and the screenshot selection overlay.
3. Record the Windows version, app version, capture mode, monitor count, and scaling percentage.
4. Repeat after moving, resizing, pinning, hiding, and showing Ghost.
5. Report whether the result was consistent across at least three runs.

An enabled `Capture exclusion on` status confirms the local Windows setting only. It is not proof of what a particular receiver sees.
