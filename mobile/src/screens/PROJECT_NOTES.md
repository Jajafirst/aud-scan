# AUDScan — working notes

Read this before touching `CameraScreen.tsx`. It exists so a fresh session
doesn't re-derive what's already been learned the expensive way, by scanning
notes.

## What this is

Detects genuine vs counterfeit AUD banknotes using the phone camera only —
no trained model (only one genuine + one counterfeit note exists, not enough
to train on). Every check is a hand-built measurement of an RBA security
feature, calibrated against ONE matched pair: a genuine $5 and a counterfeit
$5, same serial `CE 163202271` printed on the fake.

## Ground truth so far (the one matched pair, scanned back to back, same lamp)

| measure | genuine | fake | separates? |
|---|---|---|---|
| front OVI colour **swing** | 0.0566 | 0.0060 | **yes, 9.4x — trust this one** |
| back OVI colour **swing** | 0.0150 | 0.0062 | yes, 2.4x — narrower |
| sharpness (P2) | 0.0535 | 0.0152 | yes, 3.5x |
| OVI colour **peak** | 0.13–0.17 | 0.12–0.15 | **no — fake often higher** |
| detail (P2) | 0.031–0.037 | 0.025–0.035 | no, overlaps |
| bird absolute brightness variance | varies wildly | varies wildly | no |
| bird ratio swing (win/ref) | 0.20–0.78 | 0.20 | **confounded — see below** |
| numeral OCR (plain/mirrored text) | never reads | never reads | dead, see below |
| hue | 32–42° one session, 23–29° another | similar spread | **collapsed under matched lighting — don't trust** |

**Load-bearing finding:** peak/brightness/magnitude measures do NOT separate
these two notes — the fake matches or beats the genuine note on almost every
one. The only things that have ever separated them are (a) colour **swing**
(optically variable ink changes hue with angle; a flat print doesn't) and
(b) **counting distinct appearances** (see below). Any future work should
default to swing/state-based measures, not absolute or peak measures.

## Checks and their real status (as of commit 69b45b010)

1. **Serial Number** — OCR, works, auto-advances the scan step.
2. **Flying Bird** — was absolute window brightness variance → useless,
   flipped by hand movement alone (same fake: 0.0698 one scan, 0.0957 next).
   → made differential (window/reference ratio) → still confounded, because
   the genuine scan was just held less steadily (ref zone drifted
   0.512→0.362) and that alone produced a bigger "swing" than the fake.
   → now counts **distinct appearances** (`countDistinctStates` on aligned,
   normalised patches of the window zone). `TH_MIN_STATES = 2`,
   `TH_PATCH_SAME = 0.60` — **both provisional, not yet calibrated**. Every
   scan logs `dists=[...]`, the full pairwise distance list — use it to set
   `TH_PATCH_SAME` where genuine notes cluster into 2+ groups and the fake
   clusters into 1.
3. **Color Tone** — hue of the whole note. Unreliable; hue tracks white
   balance, not the note (see hue row above). Low score weight (0.05).
4. **Clear Window** — window/body luminance ratio swing across tilt. Never
   separated the pair; kept at low weight (0.05) as a legacy measure.
5. **Rolling Colour** (front OVI) — **rebuilt to use swing, not peak.** This
   is the strongest single check in the app (0.40 weight). Threshold
   `TH_OVI_SWING_FRONT = 0.025`, between fake 0.0060 and genuine 0.0566.
6. **Dynamic Movement** (back OVI) — same swing logic, back side.
   `TH_OVI_SWING_BACK = 0.010`. Real but narrower gap (0.15 weight... — check
   current weight in code, comments may drift from this file).
7. **3D Dynamic Image** — high-frequency detail (`noiseMean`). Weak,
   overlapping; low weight.
8. **Bump Patterns** — intaglio edge sharpness via Laplacian. Separates
   3.5x on the one pair; moderate weight (0.20).
9. **Reversing Numeral** — the RBA feature is a numeral that changes
   APPEARANCE with light direction (photographed: lit from left shows "5",
   lit from right shows a mirrored "5" — this is NOT a left-right pixel
   flip, it's a real optical effect on a holographic patch). Two failed
   approaches before the current one:
   - OCR + horizontal image flip → wrong test entirely, the feature isn't a
     mirror-image, it's a different optical state. Also: ML Kit cannot
     resolve the digit at all — swept 4 candidate crop bands, upscaled to
     1400px, always empty. **OCR is dead for this feature, don't retry it.**
   - Pixel-difference-at-fixed-crop → returned ~0.93–0.96 on the FAKE (a
     flat print that cannot change shape), because the handheld crop was
     landing on different parts of the note each frame. The "difference"
     was crop drift, not the dome.
   → now: patches are aligned (`alignedDifference`, ±6px search) before
   comparing, and distinct-appearances counting is used, same as the bird.
   **This is the most promising unproven check in the app** — the user
   physically observed 3 states on the genuine dome (blank/reversed/normal)
   vs 1 on the fake. Needs `dists=[...]` data from real scans to calibrate
   `TH_PATCH_SAME`.

## Architecture

- `mobile/src/screens/CameraScreen.tsx` — everything: scan flow (4 steps:
  serial → bird → front tilt → flip → back tilt), all pixel analysis
  (TensorFlow.js tensor ops), OCR (ML Kit), scoring, verdict computation.
  ~1650 lines. This is the only file that matters for the detection logic.
- `mobile/src/screens/VerdictScreen.tsx` — result display. Reads
  `pixelChecks` from navigation params; each key is `true` = FAILED,
  `null` = check didn't run (shown as "NOT READ", not scored either way).
- `mobile/src/navigation/types.ts` — the `Verdict` route param shape must
  match what `CameraScreen` sends in `pixelChecks` or fields silently show
  as "NOT READ" (this exact bug happened once — commit 653445f1f).

## Key architectural decisions and why

- **Denomination comes from OCR only**, never from the ML model. The
  Teachable Machine model is a denomination classifier trained ONLY on
  genuine notes — it scored a colour photocopy of a $10 at 0.96 confidence.
  It carries zero authenticity signal and must never feed the verdict. It
  also flip-flopped across frames of the same note (new-50, new-100, new-10,
  new-50 across 4 frames of one $5), and since denomination sizes every crop
  zone, a wrong ML guess silently corrupted the whole scan. Fixed in
  commit 46059de4b / cd61d118f.
- **Zones are fractions of a per-denomination note crop**, not fixed pixel
  rects — because the 5 denominations are different physical sizes
  (130/137/144/151/158mm long, all 65mm tall). See `NOTE_RATIO`.
- **Differential, not absolute, measurement.** Absolute brightness/chroma
  tracks ambient light and hand distance, not the note. Every working check
  compares one part of the note to another (window vs reference) or one
  frame to another (swing, state count) — never a raw value against a fixed
  number.
- **A check that can't read must not be scored.** Silent OCR failure used to
  count as evidence against the note (`reverseTried` bug, fixed 653445f1f /
  437df0d49). Any new check must follow this: return null/not-counted on
  failure to read, never default to "fail."
- **Median over repeat frames, not last-frame-wins.** Early bug: only the
  final frame's boolean survived per check. Now every measure collects an
  array across all frames and reduces at the end (`median()`, `range()`,
  peak, or state count).

## Known-bad ideas — don't redo these

- OCR-based mirrored numeral (image flip). Wrong physics, also OCR can't
  resolve the digit at any crop/upscale tried.
- Chroma peak as a genuineness signal. Fakes can be just as saturated as
  OVI, sometimes more.
- Hue as a genuineness signal. Tracks white balance; direction flips
  between sessions under different light.
- Absolute window brightness for the bird. Tracks torch distance/hand
  angle, not the note.
- Fixed-crop pixel difference without alignment. On a handheld note this
  measures crop drift, which can exceed the real signal (0.93 diff from a
  note that structurally cannot change).

## What's still open

1. **Calibrate `TH_PATCH_SAME` and `TH_MIN_STATES`** from real
   `dists=[...]` logs — bird and numeral checks are running on guessed
   thresholds right now.
2. **Only one matched pair has ever been measured.** Get 2+ repeat scans of
   each note to know if the numbers found are stable or noise.
3. **Flow redesign** (user-requested, not yet built): vertical framing for
   serial+denomination, then a fixed horizontal framing for all optical
   checks, flip, repeat, with bump-pattern check added to the back pass.
   Reason it matters: zones are still cropped from a handheld, un-registered
   note, which is the root cause behind several bugs above (reference zone
   drifting 0.545→0.323 within one 4-frame phase). A fixed frame would
   stabilize every check's input at once. Deliberately deferred — large,
   cross-cutting change; do it as its own commit, not mixed with detection
   logic changes, so a regression is traceable.
4. **`expo-image-manipulator` / `@teachablemachine/image` peer conflict** —
   resolved by uninstalling the unused `@teachablemachine/image` package
   (only its model URL string is used, never the package itself).
5. Only one genuine + one fake note exist — every threshold in this file is
   fit to n=1. State it as a limitation in the report; do not claim a
   detection rate the evidence doesn't support.

## Process notes for whoever (human or Claude) works on this next

- This session cannot push directly when GitHub access 403s; the human
  pushes from their Mac. Directory matters: the mobile app lives in
  `mobile/`, NOT the repo root (root is an unrelated Vite web app —
  running `expo run:ios` there once corrupted root `package.json` and
  produced native build errors chasing a completely different project).
- Build: `cd mobile && npx expo run:ios --device` (this runs prebuild +
  pod install itself; don't run `pod-install` separately, it errors).
- Every number changed in this file should come from a console log the user
  pasted, not from guessing. The pattern that has worked all session:
  propose what data to collect → user scans → read the log → change one
  thing → explain why in a code comment → commit → push → ask for the next
  scan. Don't skip the log-reading step even under pressure to "just fix
  it faster" — every fast guess this session either didn't move the needle
  or actively made a real note fail.
