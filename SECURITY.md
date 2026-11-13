# Security and testing status — 0.1.2-test

Reviewed 13 November 2026. This is a developer hardening pass and automated test report, not an independent security audit or a guarantee that no vulnerabilities remain. The previous build worked on the user's phone; this updated build has not yet been tested on a connected Android device.

## Findings addressed

| Finding | Change |
| --- | --- |
| Saved keyboard preferences and optionally learned words used plaintext WebView local storage | AES-256-GCM encryption with a per-install Android Keystore key, authenticated versioned envelope, randomized IV and bounded payload. Migrates/removes the legacy entry; no plaintext fallback. |
| Local test APK and WebView could expose debugging interfaces | App manifest and supplied APK set debuggable=false; WebView debugging explicitly disabled. |
| Password text could reach dictionary save controls | Password fields suppress suggestions, dictionary and feedback; all automatic learning also respects password/no-personalized-learning flags. |
| Hidden dictionary content and learning context could survive a field change | Clear hidden panel contents, draft feedback, undo/redo and word context on input-session changes/finish. Memory is cleared by dropping references; secure RAM erasure is not claimed. |
| A held delete could continue after changing fields | Cancel active key gestures and repeat timers on a session change. |
| WebView allowed inline executable scripts | Scripts are packaged files; CSP script-src self, no frames, network connections, objects, base changes or forms. Only explicit local asset paths are served. Navigation and file/content access are blocked. |
| Invalid or stale bridge edits could damage editor text | Bounded messages, action allowlist, session/revision/context checks, editor-text comparisons and rejection of unreadable selections. Null context no longer bypasses a nonempty expected context. |
| Emoji lookup could mistake inherited JavaScript property names for emoji keywords | Check only the keyword object's own properties. |

## Verified

- 5,018 editor-delta cases: Bangla, conjuncts, emoji, selections, replacements and Undo.
- 163 AES-GCM checks with the desktop Java provider: round trips, tampering at each byte, truncation, wrong keys, randomized encryption and size bounds. **Android Keystore itself is not simulated or tested by these cases.**
- Packaged keyboard UI tested in Edge with a simulated Android bridge: real touch/mouse input, conjuncts, Undo/Redo, deletion, cycle, selections, emoji, editor action buttons, numeric/password fields, completion and picker controls.
- Additional interface checks: legacy preference migration/removal, no plaintext fallback on save failure, no automatic learning or dictionary in password fields, stale edit rejection, markup-like host text, held-key cancellation, hidden-content cleanup and widths 320/360/412.
- Java/resources/DEX build, alignment and APK signature verification (v2/v3).
- Compiled manifest: no Internet permission, only VIBRATE; BIND_INPUT_METHOD protects the input service; debugging, cleartext traffic and backups disabled; cloud/device-transfer data excluded.
- Source/archive review excludes private signing keys and build output. The local test key is retained outside the source archive so an update can install over 0.1.1.

## Remaining before a public release

1. Test the new APK on Android: preference retention across process death/reboot/update, migration from 0.1.1, Keystore failure/corruption recovery, password/number/email fields, different apps and OEM WebViews.
2. Exercise IME lifecycle under rotation, app switching, long selections, autofill, accessibility, gestures and navigation insets. Browser tests do not validate Android InputConnection implementations or editor actions in real chat apps.
3. Independent mobile security review, dependency/SDK review, performance and accessibility testing, final release signing/AAB and publisher-specific privacy disclosures.
4. Keep the public source free of the archived Apple recordings; this public version uses Android system key feedback. Retain all dictionary/content notices.

## Data boundary

Typing/dictionary/prediction run offline; no accounts, analytics SDKs or advertising SDKs are included. Optional learning is off by default. Saved keyboard preferences, favorites/recent emoji and optional learned words are encrypted at rest. Editor text must still exist in memory while typing. Encryption here does not encrypt the target chat app's storage or messages, protect a fully compromised phone, or prove all code is vulnerability-free. This remains a test package signed with a local development key.

The JavaScript bridge remains a privileged surface. It is restricted to bundled content with no remote navigation or frames; introducing remote HTML/scripts would invalidate that boundary. Keep Android System WebView updated.

References: [Android cryptography](https://developer.android.com/privacy-and-security/cryptography), [Android Keystore](https://developer.android.com/privacy-and-security/keystore), [WebView native bridge risks](https://developer.android.com/privacy-and-security/risks/insecure-webview-native-bridges).
