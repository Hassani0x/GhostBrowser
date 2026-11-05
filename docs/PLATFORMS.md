# Platform previews

Windows remains the tested desktop platform. Version remains 0.3.1; these platform builds are experimental.

## Glass

Use the Glass toolbar button to toggle whole-window translucency (88% opacity). The solid dark appearance remains available and is the default. Desktop preference is remembered. Website content is translucent, not blurred; the toolbar has a frosted visual treatment.

## Mac

The manual Platform preview builds workflow creates unsigned Intel and Apple Silicon ZIPs. These are not notarized. macOS screen-recording and microphone permissions may be needed. ScreenCaptureKit can capture protected windows: do not rely on this build for screen-sharing invisibility. Global shortcuts use Command on Mac. No physical Mac verification has been performed.

## Android

The workflow creates a debug-signed APK for Android 8 or later. Open the app, grant Display over other apps, then tap Open floating browser again. Drag the header to move, use Glass for translucency, and close using × or the persistent notification.

The Android preview is a separate WebView application. It supports HTTPS browsing and native selection/copy. Microphone, file uploads, multi-tab UI, screenshots of other apps, and desktop keyboard shortcuts are not implemented. FLAG_SECURE is requested before the overlay appears; recordings may show a blank region. Device-specific validation is required. It cannot overlay secure system screens or apps that reject overlays. The debug key is for testing, not a stable production signing identity.

Build locally with JDK 17, Android SDK 35, and Gradle 8.9: `gradle -p android assembleDebug`.

## Download previews

[Successful Mac and Android build](https://github.com/Hassani0x/GhostBrowser/actions/runs/42070903162): scroll to Artifacts and sign in to GitHub to download. Extract the downloaded archive. Artifacts have limited retention. The existing Windows release EXE predates Glass; compile current source to use the latest desktop changes.
