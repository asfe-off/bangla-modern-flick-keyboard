# Intermittent blank keyboard investigation

13 November 2026. Current status: **not reproduced on a connected Android device; root cause unconfirmed**. The 0.1.4 APK is an optional diagnostic/recovery test, not a certified fix.

## Observations supplied by the tester

- Oppo phone, Android 12, ColorOS 12.1; exact model and installed WebView version are not yet known. The diagnostic report reads them automatically.
- The entire keyboard becomes blank, including controls, but invisible keys continue entering text.
- Closing/reopening the keyboard alone did not reliably recover it. Reopening the host chat app (WhatsApp/Messenger) restores the display.
- Initially the failure seemed random or related to repeated typing. Later, substantially longer typing worked without failure.
- The strongest reproducible sequence, reported seven times, is: **tap keyboard Enter → keyboard closes → reopen keyboard → graphics disappear after a delay**. One fresh run stayed normal for about three minutes. The delay and any additional necessary condition are not established.

The repeated sequence is useful evidence of a trigger. It does not establish which component fails, or prove that every failure has this trigger.

## Ranked possibilities

| Possibility | Evidence and limits | What would distinguish it |
| --- | --- | --- |
| WebView/Android compositor or surface state after an IME visibility transition | Strongest current lead: pixels disappear while hit testing, script and editor input apparently continue; restarting the host app restores the display. Delayed onset after reopening could involve a later redraw. This is an inference, not a traced GPU fault. | Normal visible DOM, positive dimensions, attached/visible native view and continuing input during an actual blank screen would support a drawing failure. Draw callbacks alone do not prove pixels reached the screen. |
| Incorrect native view/window lifecycle or sizing in this app | Enter invokes an editor action, which can cause the host to hide/change its editor. Reused WebView/window state could become inconsistent. Existing invalidation did not solve it. | Timeline of editor action, input-view finish/start, window visibility and attach/detach; compare dimensions and optional fresh-view reopening. |
| Main-thread or bridge interaction during the editor action | Enter uses a synchronous JavaScript bridge call dispatched to the Android main thread. This crosses the host editor boundary and warrants device tracing. Continuing live typing makes a persistent deadlock a weaker explanation for the eventual blank. | Device trace showing blocked main/WebView threads or long action duration around the transition. Browser mocks do not test Binder or the native bridge's threading. |
| CSS/viewport/offscreen or page visibility fault | Could conceal content without crashing scripts. No intentional whole-keyboard hiding path was found; panel changes only replace the middle area. Browser stress has not reproduced a hidden/zero-size keyboard. | Reported zero height, offscreen origin, root visibility failure, unexpected scroll/viewport offset, or hidden native view. |
| Resource accumulation from suggestions, gestures or flick graphics | Repeated rendering can stress a graphics path. Ordinary typing alone is now a weaker trigger. Suggestion nodes are replaced, undo is bounded to 100 saves, gestures clear on release, and a single preview element is reused. | Increasing retained nodes/listeners/active gestures, device memory growth, graphics errors. Optional simpler CSS isolates shadows/filters; it is not equivalent to disabling hardware acceleration. |
| Renderer process exit or memory-pressure recovery | Must be considered on all phones. A dead JavaScript renderer would usually stop handling our keyboard's JS input, which conflicts with the reported continuing typing. GPU/compositor failures can differ from renderer death. | Renderer-exit counter/events and device process logs. The handler recreates a failed WebView, but its presence does not prove such an exit occurred. |
| Startup script/CSP/assets, keyboard mapping, prediction or network loading | Weak fit for a keyboard that works initially and keeps typing while invisible. Assets are bundled and there is no Internet permission. | Script/promise error counters, loading/lifecycle evidence. A script error alone would not establish a drawing failure. |

No public issue matching this exact Android 12/ColorOS 12.1 sequence has been verified. Reports about other Android versions, other browsers or other WebView releases do not identify this bug.

## Source review and controlled checks

- Inspected editor actions, hide/show/start/finish callbacks, WebView creation/reuse/renderer-exit recovery, height changes, scrolling, page rendering, gesture timers/capture, suggestions, preferences, sound and vibration dispatch.
- Published 0.1.3 does not call `WebView.onPause()`. Therefore an unmatched pause introduced by this app cannot explain that build's original failure. The diagnostic build retains the published pause policy by default.
- 1,800 page/session transitions on each of the installed-version assets and the diagnostic assets: **3,600 checks**, zero observed whole-DOM blank states or page errors, maximum 239 mounted DOM nodes in that test, minimum 24 visible buttons, maximum keyboard height 451 CSS pixels. Each version also received ten browser freeze/resume pairs and ten moderate memory-pressure notifications.
- **1,200 actual browser pointer releases**, including 300 directional flicks, with asynchronous simulated editor acknowledgements and sound/vibration calls enabled. After forced collection, DOM nodes stayed **257 → 257** and event listeners **316 → 316**. Used JS heap was approximately **4.41 → 4.56 MB**; this small difference is not evidence of a leak and cannot measure Android/GPU allocations. No script errors, abandoned active gestures, duplicate feedback dispatches or overlapping edit requests were observed.
- **60 simulated Enter → inactive editor → delayed reopen cycles** with 0/16/60/150 ms reopening delays. Send waited for queued text; the reopened editor stayed clear and late old-session acknowledgements were ignored. The keyboard DOM remained visible. This is not an Android window hide/show test.
- Existing packaged UI, panel/scroll/emoji and slow asynchronous editor checks pass. Diagnostic tests inject hidden layout/zero size and script failures, verify distinguishable metadata, and check that report fields are numeric/boolean and exclude the private sample text and error messages.
- Java/resources/DEX compile and APK v2/v3 signature verification pass. Earlier editor/encryption validation comprised 5,018 editor-delta cases and 163 desktop authenticated-encryption checks; those do not validate Android drawing or Android Keystore on a device.

**Testing boundary:** these browser checks use desktop Edge with phone dimensions and a simulated bridge. No Android device or emulator was connected. They cannot reproduce ColorOS, Android WebView composition, host-app InputConnection behavior, real system sounds/vibration, or GPU driver resource failures. Passing them narrows application-level suspects but does not prove the Android bug is fixed.

## Diagnostic/recovery build

0.1.4 keeps the normal renderer and input behavior as its default. Both experiments are off by default, with no manufacturer-specific branches:

1. **Rebuild keyboard after close:** destroy the old WebView and create a fresh keyboard view on reopening after it was hidden. Saved preferences remain; host chat messages are not changed. Hidden keyboard/session state is reset. Reopening may be slower. This tests whether reuse of view-specific state is involved; success would not by itself identify a GPU driver defect.
2. **Simpler graphics:** remove CSS shadows/filters/transitions while retaining hardware acceleration. Test separately from rebuilding so its effect can be interpreted.

The launcher also provides **Restore keyboard display** and **Display diagnostics → Copy report**. The report includes the exact device/WebView version, action and lifecycle event order, native size/visibility/attachment/drawing counts and the last active page's numeric/boolean state. It retains metadata across hiding; there are no message contents, individual key values, exception messages, app package names, screenshots or automatic uploads. Event history is limited to 32 entries and can wrap. A sample may precede the exact failure, and the report cannot detect blank pixels on its own.

For the reported sequence, first install the diagnostic build over the existing app, enable **Rebuild keyboard after close**, and leave **Simpler graphics** off. Use normal chat/Enter actions. If the problem recurs, open the launcher's diagnostics and copy the report **before** restoring the display, restarting the chat app or repeatedly opening other fields. Note which host app was used separately; it is not collected automatically. An improvement over one three-minute session is encouraging but insufficient to close the issue.

## Cross-phone verification still required

Compare normal and fresh-view modes on the affected Android 12/ColorOS phone first, using keyboard Enter as well as the chat app's own Send button and a manual hide/reopen. Repeat across several sessions, including an idle delay after reopening. This separates an editor action from visibility transitions generally.

Then exercise the same paths on a stock Android device and another manufacturer/WebView combination: Send, Done, Search, next field, holding Enter for newline, switching apps, screen lock/unlock, rotation, password fields and low-memory recreation. Check preferences, duplicate/dropped text, opening latency, scrolling, sound and touch behavior. Record Android, OEM and WebView versions for each result. A universal fix cannot be established from one phone or desktop emulation.

If normal DOM/native visibility persists during a blank screen, capture a consented device log/trace around the action and hide/show interval, focusing on the IME, WebView, rendering and window system. Do not log editor text. Compare compositor messages, renderer exits and main-thread stalls before deciding on a production workaround. If a fresh view consistently fixes the sequence, it can become a narrowly scoped recovery policy after device testing; it is currently optional.

## Why hardware acceleration stays enabled

Android documents that drawing faults can appear as invisible or incorrect elements and recommends testing on actual hardware. That describes a class of failures, not confirmation of this one. [Android hardware acceleration](https://developer.android.com/develop/ui/views/graphics/hardware-accel).

Chromium specifically discourages software drawing for WebView because it is slower, uses more memory and has compatibility/maintenance limitations. Consequently this build does not apply `LAYER_TYPE_SOFTWARE` or disable hardware acceleration globally. [Chromium WebView software drawing guidance](https://chromium.googlesource.com/chromium/src/+/HEAD/android_webview/docs/software_draw_deprecated.md).

WebView's visual-state callback indicates readiness for a subsequent draw; it is not an on-screen pixel-health check. Attachment and visibility also matter. [WebView API documentation](https://developer.android.com/reference/android/webkit/WebView).

## Phone follow-up and 0.1.5

The tester supplied OPPO CPH2095, Android 12, WebView 156.0.8078.50. The initial report had rebuild disabled and zero rebuilds. After enabling it, the tester reported that the blank display stopped, with a brief white flash on reopening. This supports keeping the optional recovery while further phone testing continues; it does not establish the underlying graphics defect. The recorded Enter action was 6 (Done), which the existing service explicitly follows by hiding itself.

0.1.5 sets the underlying IME window/decor background to the same dark color as the WebView and retains the previous keyboard height during replacement. This targets the light window exposed while replacing/loading the view. Rebuilding is now automatic, with no switch, and applies after any hide/reopen, including ordinary dismissal. The visual improvement requires confirmation on the affected phone.
