# Quickstart Validation Guide

This guide validates the feature end-to-end against the specification.

## Prerequisites

- Node.js 16+ and npm available.
- Modern desktop browser (Chrome recommended for Web MIDI).
- Optional: USB MIDI keyboard/controller.

## Setup

```bash
npm install
npm run dev
```

Open the local Vite URL shown in terminal (typically `http://localhost:5173`).

## Implementation Notes

- Input routing now uses a shared normalized note-event contract for both MIDI and keyboard sources.
- MIDI-priority arbitration is enforced at dispatch time; keyboard note events are ignored while a MIDI input is active.
- Warning banner states are surfaced for unsupported MIDI, denied permission, and disconnect fallback transitions.
- MIDI disconnect applies a 250 ms forced-release timeout for active MIDI notes.

## Scenario Checklist

- [ ] Scenario A (MIDI sync)
- [ ] Scenario B (keyboard fallback)
- [ ] Scenario C (MIDI priority)
- [ ] Scenario D (warning banner)
- [ ] Scenario E (disconnect timeout)
- [ ] Scenario F (session restore)

## Validation Scenarios

### Scenario A: MIDI note triggers synchronized sound + visual (FR-001/2/3, SC-001)

1. Connect a MIDI device and allow browser MIDI permission.
2. Select the device in the app input selector.
3. Press mapped notes in the supported range.

Expected outcome:
- Each mapped note produces audible output and a corresponding visual instance.
- Release events stop/release both audio and visual states.
- Interaction feels immediate (target <=30 ms).

### Scenario B: Keyboard fallback when no MIDI (FR-007/8, SC-003)

1. Disconnect MIDI device (or use a browser without MIDI support).
2. Trigger mapped notes using keyboard keys.

Expected outcome:
- Keyboard note-on/note-off behavior matches MIDI behavior for mapped notes.
- Sound and visual outputs remain synchronized.

### Scenario C: MIDI priority arbitration (FR-013, SC-006)

1. Connect and activate a MIDI device.
2. While MIDI is active, press mapped keyboard note keys.
3. Play equivalent note on MIDI device.

Expected outcome:
- Keyboard note triggers are ignored when MIDI is active.
- MIDI note trigger is processed normally.
- No duplicate note activation from mixed-source input.

### Scenario D: Unsupported/denied MIDI warning path (FR-014, SC-007)

1. Use unsupported browser or deny MIDI permission prompt.
2. Observe UI status and attempt keyboard performance.

Expected outcome:
- Visible warning banner indicates fallback reason.
- Keyboard note triggering continues to function.

### Scenario E: MIDI disconnect timeout behavior (FR-015, SC-008)

1. Start sustained notes from MIDI device.
2. Disconnect MIDI device during active playback.
3. Observe release behavior and test keyboard input immediately after disconnect.

Expected outcome:
- App auto-switches to keyboard input mode.
- Active notes are forced released within 250 ms.
- Keyboard triggering works after switch.

### Scenario F: Session save/restore offline (FR-010/12, SC-005)

1. Select visual mode and input settings.
2. Save session state.
3. Reload app without network.
4. Restore session.

Expected outcome:
- Prior settings are restored correctly from local storage.
- No network dependency for restore flow.

## Related Design Artifacts

- Data model: `data-model.md`
- Input behavior contract: `contracts/input-behavior-contract.md`
- Requirement baseline: `spec.md`

## Validation Evidence Log

| Scenario | Status | Evidence |
|---|---|---|
| A | blocked | Requires physical MIDI hardware in this environment. |
| B | pending | Manual browser validation not executed in this run. |
| C | pending | Manual mixed-input validation not executed in this run. |
| D | pending | Manual warning-banner validation not executed in this run. |
| E | pending | Manual disconnect timing validation not executed in this run. |
| F | pending | Manual save/reload validation not executed in this run. |

### Build Verification

- Command: `npm run build`
- Result: pass (Vite production build completed successfully)
- Note: bundle size warning reported for large output chunk; no build failure.
