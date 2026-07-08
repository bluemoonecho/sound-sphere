# Feature Specification: Sound Sphere Performance Platform

**Feature Branch**: `[001-sound-sphere-spec]`

**Created**: 2026-07-08

**Status**: Draft

**Input**: User description: "checkout #user-stories and create a specification out of them"

## Clarifications

### Session 2026-07-08

- Q: How should simultaneous MIDI and computer-keyboard note input be arbitrated when both are available? -> A: MIDI priority mode; ignore computer-keyboard note triggers whenever a MIDI device is active.
- Q: What is the maximum trigger-to-feedback latency target? -> A: <=30 ms.
- Q: How should unsupported browsers or denied MIDI permissions be handled? -> A: Continue in keyboard-only mode with a visible warning banner.
- Q: How should MIDI disconnect during active performance be handled? -> A: Auto-switch to keyboard source and keep active notes sustained until release timeout.
- Q: What is the release-timeout duration after MIDI disconnect? -> A: 250 ms.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Play Audio-Visual Notes (Priority: P1)

A performer can use a connected MIDI keyboard to trigger synchronized sound and visuals in real time across a defined playable note range.

**Why this priority**: This is the core product value; without this loop, the product does not fulfill its primary purpose.

**Independent Test**: Can be fully tested by connecting a MIDI device, playing mapped notes, and verifying each note produces both audible and visual output.

**Acceptance Scenarios**:

1. **Given** a supported MIDI device is connected and selected, **When** the user presses a mapped note, **Then** the system produces synchronized sound and visual output for that note.
2. **Given** a mapped note is currently active, **When** the user releases the note, **Then** the corresponding sound and visual state transitions complete without error.

---

### User Story 2 - Perform Without MIDI Hardware (Priority: P1)

A performer can trigger the same mapped notes using the normal computer keyboard when no MIDI device is available.

**Why this priority**: Hardware-free operation is required for accessibility, demos, and fallback usability.

**Independent Test**: Can be fully tested by running the app without a MIDI device and playing mapped notes from the computer keyboard.

**Acceptance Scenarios**:

1. **Given** no MIDI device is connected, **When** the user presses a mapped computer keyboard key, **Then** the system triggers sound and visuals for the mapped note.
2. **Given** equivalent mapped notes are played via MIDI and computer keyboard, **When** outputs are compared, **Then** behavior is functionally equivalent for note triggering and release.

---

### User Story 3 - Shape Performance in Real Time (Priority: P2)

A performer can shape output dynamics during play through note intensity and available expressive controls, while visuals remain responsive and bounded.

**Why this priority**: Expressive control improves musical usefulness and engagement but depends on core note triggering.

**Independent Test**: Can be tested by varying note intensity and control inputs during sustained play and observing consistent output adjustments.

**Acceptance Scenarios**:

1. **Given** a note is triggered, **When** the user plays with higher intensity, **Then** both sound and visual output reflect stronger energy.
2. **Given** multiple notes are played rapidly, **When** concurrency limits are reached, **Then** the system preserves responsiveness and avoids instability.

---

### User Story 4 - Resume Creative Sessions (Priority: P3)

A user can save and restore session state locally so they can continue quickly without manual reconfiguration.

**Why this priority**: Session continuity improves repeated use but is not required for first-use core interaction.

**Independent Test**: Can be tested by saving state, reloading the application, and restoring the prior session.

**Acceptance Scenarios**:

1. **Given** a user has selected input and visual settings, **When** they save and later reload state, **Then** those settings are restored correctly.
2. **Given** persisted state exists, **When** the app restarts offline, **Then** the user can restore prior settings without network dependency.

### Edge Cases

- On MIDI disconnect during active play, system auto-switches to keyboard source while currently active notes sustain for up to 250 ms release timeout.
- Unsupported browser or denied MIDI permission MUST fall back to keyboard-only mode with a visible warning.
- What happens when both MIDI and computer keyboard inputs are used simultaneously?
- When MIDI is active, computer-keyboard note triggers are ignored to prevent duplicate note activation.
- How does the system behave when inputs exceed configured concurrent visual limits?
- What happens when saved state is missing, outdated, or corrupted?

## Visual Aesthetic Direction *(added 2026-07-08)*

The visual output layer targets an **experimental retro** aesthetic with the following properties:

- **Alphabet & glyph-centric**: Visual modes incorporate alphanumeric characters, punctuation, and symbols as primary graphic elements — not merely decoration. Some modes center on a note-name letter (A–G) as the dominant visual motif.
- **Retro / phosphor feel**: The canvas uses a dark (near-black) background with high-contrast phosphor-green or amber-tinted elements that evoke CRT monitors, vector-display arcade games, and early computer terminals.
- **Experimental character**: Animations should feel surprising and non-standard — letterforms scatter, stamp, ripple through scan lines, or orbit as polygon vertices — rather than conventional particle or geometric effects.
- **UI panel**: The sidebar panel mirrors the retro terminal aesthetic using a monospace font, dark background, and phosphor-green accent colors throughout labels, borders, controls, and status indicators.

### Visual Mode Names

| Type | Name | Character |
|------|------|-----------|
| 0 | Glyph Burst | Note-name letter + alphanumeric characters radiate outward |
| 1 | Scanline Ripple | CRT-style horizontal lines ripple and interfere from center |
| 2 | Retro Vector | Expanding polygon wireframes with letter vertices |
| 3 | Letter Stamp | Large note-name letter drops and impacts with fragment scatter |

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST detect available MIDI input devices and allow selection of an active device.
- **FR-002**: System MUST map a defined three-octave playable range to deterministic sound and visual outcomes.
- **FR-003**: System MUST process note-on and note-off events and keep audio and visual output synchronized per triggered note.
- **FR-004**: System MUST process expressive control input (including modulation, bend, and sustain-style controls) and apply updates during active performance.
- **FR-005**: System MUST provide at least four selectable visual behavior modes.
- **FR-006**: System MUST limit active visual instances to maintain runtime responsiveness.
- **FR-007**: System MUST support mapped note triggering from the normal computer keyboard when MIDI hardware is unavailable.
- **FR-008**: System MUST ensure computer keyboard note triggering is functionally equivalent to MIDI note triggering for mapped note-on and note-off behavior.
- **FR-009**: System MUST apply shared input normalization and dispatch rules across MIDI and computer keyboard note events.
- **FR-010**: System MUST allow users to save and restore session state locally.
- **FR-011**: System MUST expose basic performance controls for visual mode selection and clearing active visuals.
- **FR-012**: System MUST remain usable after initial setup without requiring network connectivity.
- **FR-013**: System MUST apply MIDI-priority arbitration: when a MIDI device is active, computer-keyboard note-trigger events are ignored.
- **FR-014**: System MUST continue in keyboard-only mode and display a visible warning when MIDI is unsupported or permission is denied.
- **FR-015**: System MUST auto-switch to keyboard input on MIDI disconnect and maintain already active notes for up to 250 ms before forced release.

### Key Entities *(include if feature involves data)*

- **Input Source**: Represents a user input origin; key attributes include source type (MIDI or keyboard), availability, and active status.
- **Mapped Note Event**: Represents a normalized playable event; key attributes include note identifier, trigger state (on/off), intensity, timestamp, and source.
- **Visual Instance**: Represents a time-bound visual output object; key attributes include mode, lifetime, intensity-derived parameters, and active state.
- **Session State**: Represents persisted user configuration; key attributes include selected input source, visual mode, and saved timestamp/version.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In usability testing, at least 95% of mapped note triggers produce both audible and visible output within <=30 ms trigger-to-feedback latency.
- **SC-002**: At least 95% of participants can complete a first note-trigger interaction in under 60 seconds from page load.
- **SC-003**: For matched mapped notes, keyboard-triggered and MIDI-triggered behavior is judged functionally equivalent in at least 95% of test cases.
- **SC-004**: During a 5-minute continuous play session at typical interaction intensity, no critical interaction-path failure occurs.
- **SC-005**: At least 90% of session save-and-restore attempts recover user settings successfully on next load.
- **SC-006**: In mixed-input tests where MIDI is active, 100% of computer-keyboard note-trigger attempts are ignored (no duplicate note trigger side effects).
- **SC-007**: In unsupported/denied MIDI scenarios, 100% of test runs show keyboard-note triggering remains operational and a visible warning is presented.
- **SC-008**: In MIDI-disconnect tests during active play, 100% of runs auto-switch to keyboard input and enforce forced release of previously active notes within 250 ms.

## Assumptions

- Users run the application in a modern desktop browser with standard audio output enabled.
- The initial release targets a single-user local experience and does not include cloud sync or collaboration.
- A default mapped keyboard layout is acceptable for fallback input in the first release.
- When a MIDI device is active, keyboard note triggers are ignored by design.
- Active-note sustain timeout after MIDI disconnect is fixed at 250 ms in this release.
- Local persistence capacity is sufficient for lightweight session settings.
