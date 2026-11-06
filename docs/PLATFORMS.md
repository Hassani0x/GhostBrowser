# Platform previews

Windows remains the tested desktop platform. Version remains 0.3.1; these platform builds are experimental.

## Glass

Use Glass to open the appearance controls. Background tint changes transparency while text stays fully opaque. Surface blur adjusts the toolbar treatment; desktop native blur strength is controlled by Windows/macOS. Right-click Glass to reopen settings without toggling. Website backgrounds can be restyled with the experimental checkbox; disable it if a site becomes hard to read. Images, video, canvases and cross-origin frames are not universally restyled. Solid mode restores the original site appearance. Desktop settings are remembered.

## Mac

The manual Platform preview builds workflow creates unsigned Intel and Apple Silicon ZIPs. These are not notarized. macOS screen-recording and microphone permissions may be needed. ScreenCaptureKit can capture protected windows: do not rely on this build for screen-sharing invisibility. Global shortcuts use Command on Mac. No physical Mac verification has been performed.

## Android

The workflow creates a debug-signed APK for Android 8 or later. Open the app, grant Display over other apps, then tap Open floating browser again. Drag the header to move. Drag the bottom resize handle or use Smaller/Larger in Glass settings. Adjust tint and background blur in the settings. Blur requires Android 12+ and device support; battery-saving/system settings may disable it. Text remains sharp. Use native text selection or Copy selected text. Close with × or the persistent notification.

The Android preview is a separate WebView application. It supports HTTPS browsing and native selection/copy. Microphone, file uploads, multi-tab UI, screenshots of other apps, and desktop keyboard shortcuts are not implemented. FLAG_SECURE is requested before the overlay appears; recordings may show a blank region. Device-specific validation is required. It cannot overlay secure system screens or apps that reject overlays. The debug key is for testing, not a stable production signing identity.

Build locally with JDK 17, Android SDK 35, and Gradle 8.9: `gradle -p android assembleDebug`.

## Download previews

Download all platforms from [release Assets](https://github.com/Hassani0x/GhostBrowser/releases/tag/v0.3.1). Choose the Apple Silicon or Intel Mac ZIP, or the Android APK. Windows EXE includes Glass. SHA256SUMS.txt covers each download.
