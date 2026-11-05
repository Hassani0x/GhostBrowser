# Ghost Browser 0.3.1 — Windows, macOS & Android

Download the file for your device from **Assets** below. This updates the existing 0.3.1 release, including the Windows build, with Glass mode and platform previews.

| File | Device | Status |
| --- | --- | --- |
| Ghost-Browser-0.3.1-Windows.exe | Windows 11 x64 | Portable, unsigned desktop build |
| Ghost-Browser-0.3.1-macOS-Apple-Silicon.zip | Mac with Apple Silicon (M-series) | Experimental, unsigned, not notarized |
| Ghost-Browser-0.3.1-macOS-Intel.zip | Intel Mac | Experimental, unsigned, not notarized |
| Ghost-Browser-0.3.1-Android-preview.apk | Android 8+ | Experimental, debug-signed APK |
| SHA256SUMS.txt | All platforms | SHA-256 checksums for the four downloads |

**Windows:** close the old app and run the EXE. **Mac:** extract the appropriate ZIP to access the app; normal macOS security checks still apply. **Android:** install the APK, open Ghost, grant Display over other apps, then tap Open floating browser again. Drag the header to move it; close with × or its notification.

## Appearance and behavior

Glass toggles whole-window translucency; the original solid appearance remains available. Desktop source also includes website clipboard writes, copy context menus, always-on-top requests, and a refresh that clears the current site's local data (including cookies/sign-ins). Windows can still refuse pin-on-top on some systems; the app reports that failure.

## Platform limits

- macOS ScreenCaptureKit may capture protected windows. Do not rely on Mac screen-sharing invisibility.
- Android is an initial floating WebView browser. Tabs, microphone access, uploads, and capturing other apps are not implemented. Secure overlays may show as blank in recordings.
- Builds have compiled successfully. Mac and Android physical-device testing is pending. Windows capture protection depends on the sharing app and mode; verify the receiver's view.
- No automatic updater. Android uses a test signing key; future previews may require reinstalling, which can remove local data.

See the repository README and docs/PLATFORMS.md for setup and limitations. GitHub's automatically generated Source code ZIP/TAR files contain source, not installable apps.
