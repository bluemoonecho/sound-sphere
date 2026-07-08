# Implementation Plan: Sound Sphere Performance Platform

**Branch**: `[001-sound-sphere-spec]` | **Date**: 2026-07-08 | **Spec**: `/specs/001-sound-sphere-spec/spec.md`

**Input**: Feature specification from `/specs/001-sound-sphere-spec/spec.md`

## Summary

Deliver spec-aligned behavior for real-time synchronized sound/visual performance with MIDI-first input arbitration, reliable keyboard fallback, expressive controls, and local session persistence. Implementation extends the existing browser app to close requirement gaps (notably warning UX, disconnect sustain timeout, and explicit normalization parity) while preserving low-latency interaction (<=30 ms target) and stable rendering under visual concurrency limits.

## Technical Context

**Language/Version**: JavaScript (ES Modules), Node.js 16+ runtime for tooling

**Primary Dependencies**: `p5` (visual rendering), `strudel` (sound patterns/synthesis), Vite 5 build/dev tooling, Web MIDI API

**Storage**: Browser `localStorage` for session persistence; no server-side database

**Testing**: Current baseline is manual browser validation; planned automated coverage via unit-style module tests and browser E2E smoke scenarios in Phase 2 (`/speckit.tasks`)

**Target Platform**: Modern desktop browsers; MIDI path optimized for Chrome/Edge/Opera with keyboard-only fallback on unsupported/denied MIDI

**Project Type**: Single-project frontend web application (client-only)

**Performance Goals**: <=30 ms trigger-to-feedback latency for note-on feedback path; maintain responsive animation loop with up to 8 concurrent visual instances

**Constraints**: Offline-usable after initial setup, deterministic 3-octave mapping, MIDI-priority arbitration, forced release within 250 ms after MIDI disconnect

**Scale/Scope**: Single-user local performance app, 36 mapped notes, 4 visual modes, one persisted session profile

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- Constitution file at `.specify/memory/constitution.md` is a placeholder template with no enforceable project-specific principles yet.
- Pre-Phase-0 Gate: PASS (no explicit constitutional constraints to violate).
- Post-Phase-1 Gate: PASS (design artifacts remain consistent with the placeholder constitution; no conflicts detected).
- Follow-up recommendation: finalize constitution before implementation to avoid ambiguous governance in `/speckit.tasks` and `/speckit.implement`.

## Project Structure

### Documentation (this feature)

```text
specs/001-sound-sphere-spec/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── input-behavior-contract.md
├── checklists/
│   └── requirements.md
└── tasks.md             # Created later by /speckit.tasks
```

### Source Code (repository root)

```text
src/
├── main.js
├── style.css
├── midi/
│   ├── KeyboardInput.js
│   ├── MidiConfig.js
│   └── MidiInput.js
├── session/
│   └── SessionManager.js
├── sound/
│   ├── PatternLibrary.js
│   └── StrudelEngine.js
└── visual/
    ├── AnimationController.js
    └── P5Sketch.js

index.html
```

**Structure Decision**: Continue with the existing single-project frontend architecture. Feature work will focus on harmonizing input normalization/dispatch behavior in `src/main.js`, `src/midi/MidiInput.js`, and `src/midi/KeyboardInput.js`, plus UI warning/session controls in `index.html`/`src/style.css` and persistence coordination in `src/session/SessionManager.js`.

## Phase 0: Research Focus

- Resolve runtime and UX decisions for unsupported MIDI, denied permissions, and disconnect handling.
- Define best-practice low-latency dispatch path for shared note normalization between MIDI and keyboard input.
- Choose validation strategy for latency and fallback reliability in a browser-only environment.

## Phase 1: Design Focus

- Data model definitions for normalized note events, visual instances, input source state, and persisted session state.
- Interface contract for input arbitration and fallback behavior, including disconnect timeout semantics.
- Quickstart validation scenarios that demonstrate requirement-level behavior and success criteria alignment.

## Complexity Tracking

No constitutional violations identified that require justification at planning time.
