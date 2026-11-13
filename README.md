# Bangla Modern Flick Keyboard

## [Download for Android — Version 0.1.5](https://raw.githubusercontent.com/asfe-off/bangla-modern-flick-keyboard/main/downloads/Bangla-Modern-Flick-Keyboard-0.1.5.apk)

**Latest version · Android 8 or later · Free · Offline**

A compact Japanese-style nine-tile flick keyboard for Bangla and English. Tap the middle letter or slide in one of four directions to choose another letter.

### Install

1. Tap **Download for Android** above on your phone, then open the downloaded APK.
2. Allow installation from your browser or Files app if Android asks, then install.
3. Open **Bangla Modern Flick Keyboard** → **Enable keyboard** → **Select keyboard**.
4. Start typing in your chat app. Use **⚙** on the keyboard for Settings and Help.

**Already installed?** Install this update over the existing app to keep your settings, favorites and personal words. Recovery is automatic; there is no rebuild switch to enable.

### What changed in 0.1.5

- Automatic recovery rebuilds the keyboard when it reopens, addressing the reported blank display after closing/Enter.
- The loading background matches the dark keyboard, and its previous height is retained during replacement to reduce flashing.
- The user confirmed this version works after a fresh install on an OPPO CPH2095 running Android 12 / ColorOS 12.1. Broader phone testing continues; the white-flash improvement is not separately confirmed yet.

[Download checksum](downloads/SHA256SUMS.txt) · [Display investigation](DISPLAY-INVESTIGATION.md) · [Security and testing](SECURITY.md)

The app runs offline and has no Internet permission or account requirement. Android displays its standard keyboard warning when enabling an input method. This APK is signed with the project's existing development key; it is not a Google Play release. An iOS app is not implemented yet.

Original code: MIT. Bundled word/emoji/icon data retain their original licenses in `third_party/`. Public builds use Android system key sounds.

## Changes in 0.1.3

Settings choices open inside the keyboard instead of using Android WebView dropdown dialogs. You can scroll from buttons and option rows. Emoji rows load as you scroll, and inserting an emoji updates history without rebuilding the entire picker. Host text refreshes preserve the current page and scroll position. Preference writes run off the immediate input path. Fast typing uses a single in-flight asynchronous editor request and coalesces queued changes; Send waits for all queued text to be committed. Android 12 and later use one bounded surrounding-text query instead of three separate queries when the editor supports it. System sound playback, opaque drawing, page scroll locking, compatibility colors and renderer recovery are updated; these were earlier improvements; automatic reopen recovery was added in 0.1.5.

Slide from a main or symbol tile to show the selected letter in an enlarged, pointed side bubble. The bubble appears on the left, right, top or bottom, and the original tile remains the anchor. Release to enter the letter; sliding back to the centre restores the middle choice. The preview follows the directional-guide behavior described in [SoftBank's flick-input manual](https://www.softbank.jp/mobile/support/manual/smartphone/arrows-u/detail/32360/); the Bangla mappings are this project's design.

For sound, enable **Settings → Touch & feedback → System key sounds** and use normal sound mode. Playback respects silent/vibrate mode. This public build uses Android system sounds, not Apple recordings.

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

The user confirmed 0.1.5 works after a fresh install on the affected Oppo phone. No Android device was connected to the development environment, so automated checks do not validate Android's real graphics, IME lifecycle or Keystore. Broader testing of cursor movement, editor actions, rotation, navigation insets and sound latency remains necessary.

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


