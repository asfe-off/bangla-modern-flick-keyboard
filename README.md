# Bangla Modern Flick Keyboard

A compact Japanese-style nine-tile flick keyboard for Bangla and English. This repository contains the Android test app; an iOS app is not implemented yet.

Original code: MIT. Bundled word/emoji/icon data retain their original licenses in `third_party/`.

An offline Android input-method service using the approved nine-tile Bengali/English flick interface. Android API 26+ (Android 8 or later), with a current Android System WebView. Compiled against API 36 and targeting API 36.

## Install on your phone

1. Transfer `Bangla-Modern-Flick-Keyboard-0.1.2-test.apk` to your phone and open it. Install over the previous test APK to retain your settings. If Android asks, allow this installer/browser to install this APK.
2. Open **Bangla Modern Flick Keyboard** once. The nine-square launcher icon is a placeholder.
3. Tap **Enable keyboard** and enable Bangla Modern Flick Keyboard in Android's keyboard settings. Android displays its standard input-method warning.
4. Tap **Select keyboard** and select **Bangla Modern Flick Keyboard**.
5. Type in the app's test box, then try a notes app and your chat app. Settings and Help are available from ⚙ in the keyboard; you do not need to revisit the launcher for normal use.

Use your phone's keyboard-picker button, or **Settings → Switch keyboard**, to switch back. The app has no Internet permission, does not require an account, and does not request contacts, microphone or storage access. Vibration uses Android's normal VIBRATE permission.

## What is in this build

- Nine-tile Bangla/English typing, vowel signs and explicit যুক্ত joining.
- The two agreed চিহ্ন pages; the third press returns to letters.
- Tab, reverse-cycle, Emoji and Dictionary in the 1:1:2:2 left sidebar, which stays visible in panels.
- Favorites, Recent and category-based emoji; suggestions from words typed in the app editor.
- Dictionary completion, a small phrase-based next-word model, optional local learning and personal words.
- Compact key sizes, grouped Settings, Help and prototype About/Terms/Privacy/feedback pages.
- Undo/Redo toggle, hold-to-delete, double-tap Shift Caps Lock, native editor actions on tap Enter and new line on hold.
- Optional Android system key sounds, off by default. The original ↵ Enter symbol and small যুক্ত label are retained.
- Placeholder launcher icon and an enable/select setup screen.

## Testing status and limits

The APK is compiled, aligned and signed with a **local test key**. It is installable for personal testing; it is not a Play release or an AAB.

Verified here: Java compilation, resources/manifest packaging, APK signature, 5,018 editor-delta cases, and the packaged UI against a simulated Android editor (conjuncts, selections, deletion, Undo/Redo, cycling, emoji, numeric and password fields, native actions, cleanup, and compact phone sizes).

The user reported that the previous 0.1.1 build works on their phone. No Android device was connected for this audit, so the updated 0.1.2 build and its Android Keystore storage have **not been exercised on a physical phone by these automated checks**. Actual WebView/IME lifecycle, cursor movement in third-party chat apps, app action buttons, rotation, navigation-bar insets and sound latency still need broader phone testing.

This is a WebView-backed InputMethodService, not a browser page shown over another app. It communicates with the active editor through Android InputConnection. Host snapshots are checked before replacement, and edits from a stale field/session are rejected. If the app changes text externally, the keyboard refreshes its context. Context and Undo are cleared when the keyboard is hidden or the field changes. Huge unreadable selections are rejected rather than replaced blindly.

Password fields and editors with `IME_FLAG_NO_PERSONALIZED_LEARNING` disable learning. Password fields also suppress suggestions, dictionary access and feedback preparation. No complete messages are intentionally written to preferences. Settings, favorite/recent emoji, personal words and explicitly enabled word-pair learning are stored in app-private preferences, encrypted with AES-256-GCM using an Android Keystore key. The previous plaintext WebView preference entry is migrated and removed; an encryption failure does not fall back to plaintext. This protects saved keyboard data, not the messages stored by another app. App backup and data transfer are excluded. App and WebView debugging are disabled in the supplied APK.

The security pass also ran 163 authenticated-encryption tests with the desktop Java provider, including tampering, truncation, wrong keys, different nonces and size limits. These verify the encryption implementation; they do not exercise Android Keystore on a device. See SECURITY.md for the findings and remaining checks. This is not an independent penetration test or a claim of zero vulnerabilities.

The Dictionary manages spellings/personal words and does not contain word definitions. Prediction is basic, not Gboard-level. Feedback is a report you review and copy; there is no server or automatic submission.

## Build again

Open this project in Android Studio with JDK 17, SDK 36 and Gradle 8.13. Run `:app:assembleDebug`. Source and packaged assets are included, so rebuilding does not require the original chat workspace.

For the minimal local build used here, run:

```powershell
./tools/build-local.ps1 -JavaHome 'C:/path/to/jdk17' -BuildTools 'C:/path/to/sdk/build-tools/36.0.0' -AndroidJar 'C:/path/to/sdk/platforms/android-36/android.jar'
```

The script packages resources, compiles Java, produces DEX, aligns and signs the APK. It creates a test key in `test-signing/local-test.p12` (password `android`). Keep this key for future local updates. Android Studio's debug key is different: uninstall this test APK before installing a build signed with a different key. Uninstalling clears preferences.

The editable keyboard interface is in `app/src/main/assets/keyboard.html` (layout/styles) and `keyboard-engine.js` (typing/UI logic). Bangla, English and emoji data are separate attributed JavaScript files. Android Studio builds these bundled files directly; there is no dependency on the original chat workspace.

## Before a Google Play release

Use a permanent application ID and production signing key, build a release AAB, complete physical-device testing and accessibility/performance work, and update the prototype privacy/terms pages for the actual publisher and data behavior. The personal test package is `dev.banglaflick.test`.

Source attribution and notices are bundled in `third_party/` and `app/src/main/assets/keyboard.html`. Apple recordings from the personal prototype are omitted from this public source and public APK. Public builds use Android system key feedback.

Implementation references: [Android input methods](https://developer.android.com/develop/ui/views/touch-and-input/creating-input-method), [InputConnection](https://developer.android.com/reference/android/view/inputmethod/InputConnection), [Play target API requirements](https://developer.android.com/google/play/requirements/target-sdk).

