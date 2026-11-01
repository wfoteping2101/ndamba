# Platform Feasibility: Godot 4.7.x for Web, Android, Windows, Steam and handheld PCs

Research dossier for NDAMBA. Compiled 2026-10-31 from the Godot stable docs (site and godot-docs source), the Godot 4.7 release page, Steamworks partner docs, Google Play Console help and GodotSteam pages. Godot 4.7.2 is the current maintenance release (57 fixes, around August 22, 2026).

## 1. Web export (HTML5)

Requirements, straight from the docs:
- Renderer: only the Compatibility renderer (WebGL 2.0) works on the web. Forward+ and Mobile are not supported because WebGPU is not supported. The browser must have WebAssembly and WebGL 2.0.
- Threads vs single-threaded: single-threaded export is the default since 4.3 and the recommended option. It needs no special server headers and works on ad-supported portals such as itch.io. It cannot use threads and loses low-latency Stream audio. Thread Support turns on multithreading and better audio but needs cross-origin isolation and HTTPS.
- Headers for the threaded build: `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp`. If the host cannot set them, enable Progressive Web App in the export preset; its service worker simulates the headers, but a secure context is still required.
- Hosting: HTTPS; `.wasm` as `application/wasm`, `.pck` as `application/octet-stream`; gzip or Brotli (gzip cuts the wasm to about a quarter). GitHub Pages compresses on the fly; itch.io and GitLab Pages do not. The bundled `serve.py` is for testing only.
- Exported files: `index.html` (custom shell possible), `.wasm` (largest), `.pck`, `.js`, splash `.png`. Rename only the HTML.
- Mobile browsers: single-threaded builds work on macOS and iOS; Safari has WebGL 2.0 issues, so the docs recommend Chromium or Firefox. WebAssembly is slower than native; use feature tags to lower settings.
- Audio: default since 4.3 is Sample playback (Web Audio API) with no AudioEffects, reverb or procedural audio; Stream playback restores them at a latency cost. Browsers block autoplay: require a key press or tap before the first sound.
- Gamepads: detected only after a button press, mapping may be wrong per browser and OS, secure context required.
- Touch: Godot 4.7 adds a built-in VirtualJoystick node (Fixed, Dynamic, Following).
- PWA: icons, display mode, orientation, offline loading after the first visit (cache may be evicted).
- Limitations: C# cannot export to web in Godot 4; GDExtension needs Extension Support and web-compiled extensions; only HTTP, WebSocket client and WebRTC networking; the tab pauses when inactive; `user://` saves need IndexedDB and cookies (private browsing loses them); fullscreen must be triggered from an input callback.
- Size: the docs give no numbers. Levers are a custom template with unused modules disabled and server compression; the engine wasm dominates a small pixel-art game.

## 2. Android export

- Toolchain: OpenJDK 17 (higher versions also supported). Android SDK via the command-line tools: platform-tools, build-tools 36.1.0, platforms android-36, cmdline-tools latest, NDK 29.0.14206865, CMake 3.22.1 (the docs' current install line). On Linux, do not use a distro SDK. Set the Java SDK and Android SDK paths in Editor Settings (the latter must contain `platform-tools/adb`). Automatic SDK setup arrives in 4.8, not 4.7.
- Keystores: the debug keystore path comes from `keystore/debug` in the preset, `GODOT_ANDROID_KEYSTORE_DEBUG_PATH`, or `EditorSettings.export/android/debug_keystore`. Release keystore per the docs: `keytool -v -genkey -keystore mygame.keystore -alias mygame -keyalg RSA -validity 10000`; keystore and key passwords must match, letters and digits only; untick Export With Debug.
- Export templates download per platform and architecture in 4.7.
- APK vs AAB: new apps on Google Play must be AAB since August 2021, and AAB requires the Gradle build. Enable Gradle Build in the preset after installing the Gradle Build template from the Project menu (creates `res://android/build`). Expect slower exports.
- Target and minimum SDK: set `gradle_build/target_sdk` and `gradle_build/min_sdk` in the preset. Google Play requires new apps and updates to target API 35 (Android 15) since August 31, 2025 and API 36 (Android 16) from August 31, 2026, so set target_sdk to 36. Min SDK is a design choice; 24 or higher keeps the Compatibility renderer on OpenGL ES 3.0 devices.
- Adaptive icons: main icon 192x192, adaptive foreground and background 432x432 each, optional monochrome 432x432; keep key art in the centered 66 dp safe circle; only xxxhdpi needed.
- Orientation: set `display/window/handheld/orientation` in Project Settings to `sensor_landscape` or `landscape`. The `permissions/set_orientation` flag in the preset is a permission, not the setting.
- 4.7 extras: customizable splash screens in the Android export options, Perfetto tracing, and the Godot Android Build Environment is stable, so builds can even be produced on an Android device.

## 3. Windows export

- Godot converts the project icon to ICO automatically on export; rcedit is not mentioned on the current Windows page. The console wrapper toggle is also not on that page; check the preset's application section in the editor (unverified in this pass).
- Code signing is optional: SignTool.exe (Windows SDK) or osslsigncode (Linux, macOS) plus a certificate, configured in `Export > Windows > Sign Tool` and the preset's codesign identity.
- PCK is embedded into the executable by default, up to about 3.75 GB.
- Architectures: x86_64 default, arm64 for Windows on ARM, x86_32 not recommended. Ship x86_64 first.
- Steam integration: GodotSteam GDExtension 4.16.2 (Steamworks SDK 1.62) targets Godot 4.4 and newer on Windows, Linux and macOS, via the Godot Asset Library and Codeberg (the GitHub repo was archived on October 20, 2026). Current license MIT, but GodotSteam 4.20 is announced to move to a custom license. Pin a version and read the license before upgrading. Steam Input also works without GodotSteam through Steam's controller translation layer.

## 4. Steam Deck and Lenovo Legion Go

- Steam Deck is 1280x800 (16:10); Valve prefers native 1280x800 and accepts 1280x720. Legion Go is 1920x1200, also 16:10.
- Text legibility at 30 cm: at least 9 px tall at 1280x800, 12 px recommended. At 2x integer scale a 6 px font meets the minimum and 8 px meets the recommendation.
- 16:10 handling: 640x360 at 2x gives 1280x720 with 40 px bars top and bottom. Use stretch aspect `expand` so the viewport grows to 640x400 (anchor HUD to corners), which also scales 3x to 1920x1200 on Legion Go. Decide early.
- Verified requirements: full controller access with the default config, Deck or Xbox glyphs, no keyboard or mouse prompts, on-screen keyboard via the Steamworks API for text entry, playable frame rate by default, no device warnings, controller-navigable launcher if any.
- The review is Valve's: request it through the Steam Deck Compatibility Review link after a standard build review passes (not every partner has the link yet), or wait for automatic selection. Badges: Verified, Playable, Unsupported, Unknown. No self-certification.

## 5. Steamworks publishing requirements (current)

- Steam Direct fee: USD 100 per product, non-refundable, not payable with Steam Wallet; recouped once the product reaches USD 1,000 adjusted gross revenue.
- Paperwork: digital agreement, bank details under the legal name, identity verification and tax questionnaire; 15 to 30 days.
- Waiting periods: 30 days between paying the fee and releasing, and a public Coming Soon page for at least two weeks before release. These apply to a partner's first few titles.
- Review: Valve runs the game and checks the store page, configuration and behavior before pages or builds go live; 1 to 5 days each.
- Steps: Steamworks account, SDK, build and depots upload, optional features, store page and pricing, release prep.

## 6. Google Play prerequisites (current)

- Developer account: USD 25 one-time, identity verification (government ID and card under the legal name), personal or organization type; personal owners must verify an Android device through the Play Console app.
- New personal accounts (after November 13, 2023): closed test with at least 12 testers opted in for 14 consecutive days, then apply for production access from the Dashboard.
- Target API 35 since August 31, 2025; API 36 from August 31, 2026; extension to November 1, 2026 possible via Play Console.
- Format: AAB via Gradle build.

## 7. Recommended architecture

- One Godot 4.7.2 project, GDScript only (keeps web export open; C# would close it).
- Compatibility renderer everywhere (the only web option, best coverage on old Android, more than enough for 2D).
- Base viewport 640x360, stretch mode `viewport` (or `canvas_items` for sub-pixel motion), stretch aspect `expand`, scale mode `integer`, texture filter nearest. 640x360 scales cleanly to 720p, 1080p, 1440p and 4K; `expand` adds 20 rows top and bottom on 16:10.
- Shared core: match simulation, ball physics, surface model, AI, tournaments, save data.
- Platform input layer: one InputMap of named actions (move, pass, shoot, sprint, slide, switch, lob) fed by gamepad, keyboard and touch adapters (VirtualJoystick plus on-screen buttons on Android and mobile web). Glyphs follow the last-used device.
- Audio: short original samples, Sample playback on web, Stream elsewhere; an interaction gate before the first sound on web.
- Export presets: Web single-threaded with PWA (itch, GitHub Pages), Web threaded (own host with COOP and COEP), Android AAB via Gradle (target 36), Android debug APK, Windows x86_64, Linux x86_64 for Deck native.
- Steam: GodotSteam GDExtension pinned to a known MIT release; achievements and Remote Play Together only; no Steam-only gameplay paths.
- Feature tags (`web`, `mobile`) to lower particle counts and crowd density.

## Sources

- https://docs.godotengine.org/en/stable/tutorials/export/exporting_for_web.html
- https://raw.githubusercontent.com/godotengine/godot-docs/master/tutorials/export/exporting_for_web.rst
- https://docs.godotengine.org/en/stable/tutorials/export/exporting_for_android.html
- https://raw.githubusercontent.com/godotengine/godot-docs/master/tutorials/export/exporting_for_android.rst
- https://raw.githubusercontent.com/godotengine/godot-docs/master/tutorials/export/android_gradle_build.rst
- https://raw.githubusercontent.com/godotengine/godot-docs/master/classes/class_editorexportplatformandroid.rst
- https://docs.godotengine.org/en/stable/tutorials/export/exporting_for_windows.html
- https://raw.githubusercontent.com/godotengine/godot-docs/master/tutorials/export/exporting_for_windows.rst
- https://raw.githubusercontent.com/godotengine/godot-docs/master/tutorials/rendering/renderers.rst
- https://raw.githubusercontent.com/godotengine/godot-docs/master/tutorials/rendering/multiple_resolutions.rst
- https://godotengine.org/releases/4.7/
- https://linuxiac.com/?p=218015
- https://partner.steamgames.com/doc/gettingstarted
- https://partner.steamgames.com/steamdirect
- https://partner.steamgames.com/doc/steamdeck/compat
- https://support.google.com/googleplay/android-developer/answer/6112435
- https://support.google.com/googleplay/android-developer/answer/14151465
- https://support.google.com/googleplay/android-developer/answer/11926878
- https://github.com/GodotSteam/GodotSteam
- https://godotsteam.com/
- https://godotsteam.com/blog/category/licenses/
- https://godotassetlibrary.com/asset/j4zWKK/godotsteam-gdextension-4.4
