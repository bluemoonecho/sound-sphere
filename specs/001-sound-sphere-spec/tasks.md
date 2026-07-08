# Tasks: Sound Sphere Performance Platform

**Input**: Design documents from `/specs/001-sound-sphere-spec/`

**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

**Tests**: No automated test tasks are included because the spec does not explicitly require TDD or new automated test suites. Validation tasks use quickstart scenarios.

**Organization**: Tasks are grouped by user story so each story can be implemented and validated independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: User story label for story-phase tasks only
- Each task includes concrete file path(s)

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Prepare project structure and feature wiring points for implementation.

- [X] T001 Confirm feature baseline and branch alignment in `specs/001-sound-sphere-spec/spec.md` and `specs/001-sound-sphere-spec/plan.md`
- [X] T002 Create implementation notes and scenario checklist in `specs/001-sound-sphere-spec/quickstart.md`
- [X] T003 [P] Add input warning banner shell and status area in `index.html` and `src/style.css`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Build shared input normalization/arbitration foundations required by all user stories.

**CRITICAL**: No story work should begin until this phase is complete.

- [X] T004 Define shared normalized note-event shape and playable range helpers in `src/midi/MidiConfig.js`
- [X] T005 [P] Refactor MIDI raw-event parsing to normalized event output in `src/midi/MidiInput.js`
- [X] T006 [P] Refactor keyboard raw-event parsing to normalized event output in `src/midi/KeyboardInput.js`
- [X] T007 Implement centralized input source state and arbitration policy (MIDI-priority) in `src/main.js`
- [X] T008 Implement shared dispatch bridge from normalized events to sound/visual modules in `src/main.js`
- [X] T009 Wire warning-state update plumbing for unsupported/denied/disconnected MIDI in `src/main.js`

**Checkpoint**: Foundation ready; user stories can be implemented.

---

## Phase 3: User Story 1 - Play Audio-Visual Notes (Priority: P1) 🎯 MVP

**Goal**: MIDI mapped notes trigger synchronized sound and visuals with deterministic trigger/release behavior.

**Independent Test**: Connect MIDI device, play mapped notes, verify synchronized sound+visual note-on/note-off behavior.

### Implementation for User Story 1

- [X] T010 [US1] Enforce mapped-note acceptance and note-on/note-off lifecycle in `src/midi/MidiInput.js`
- [X] T011 [US1] Implement synchronized note trigger/release handling in `src/sound/StrudelEngine.js`
- [X] T012 [US1] Align visual spawn/release lifecycle with normalized note phases in `src/visual/AnimationController.js`
- [X] T013 [US1] Ensure each visual instance is keyed by note identity and cleaned on note-off in `src/visual/P5Sketch.js`
- [X] T014 [US1] Integrate MIDI note path end-to-end and latency timestamp capture in `src/main.js`
- [X] T015 [US1] Run Scenario A validation and record pass/fail evidence in `specs/001-sound-sphere-spec/quickstart.md`

**Checkpoint**: User Story 1 is independently functional and demonstrable.

---

## Phase 4: User Story 2 - Perform Without MIDI Hardware (Priority: P1)

**Goal**: Keyboard-only fallback works with behavior parity for mapped note trigger/release.

**Independent Test**: Run without MIDI device, play mapped keyboard notes, verify parity with MIDI note behavior.

### Implementation for User Story 2

- [X] T016 [US2] Implement keyboard mapped note-on/note-off parity behavior in `src/midi/KeyboardInput.js`
- [X] T017 [US2] Apply MIDI-priority filtering so keyboard note triggers are ignored when MIDI is active in `src/main.js`
- [X] T018 [US2] Implement unsupported/permission-denied warning banner states and keyboard-only mode transitions in `src/main.js` and `src/style.css`
- [X] T019 [US2] Ensure keyboard-triggered note events drive identical sound trigger/release paths in `src/sound/StrudelEngine.js`
- [X] T020 [US2] Ensure keyboard-triggered note events drive identical visual trigger/release paths in `src/visual/AnimationController.js`
- [X] T021 [US2] Run Scenarios B, C, and D validation and record pass/fail evidence in `specs/001-sound-sphere-spec/quickstart.md`

**Checkpoint**: User Story 2 is independently functional and demonstrable.

---

## Phase 5: User Story 3 - Shape Performance in Real Time (Priority: P2)

**Goal**: Expressive controls and high-intensity play remain responsive with bounded visuals.

**Independent Test**: Use control changes and rapid note bursts; verify stable response and bounded rendering.

### Implementation for User Story 3

- [X] T022 [US3] Normalize and route expressive MIDI controls (modulation, bend, sustain-style) in `src/midi/MidiInput.js`
- [X] T023 [US3] Apply expressive control updates to active audio voices in `src/sound/StrudelEngine.js`
- [X] T024 [US3] Apply expressive intensity mapping to active visual instances in `src/visual/P5Sketch.js`
- [X] T025 [US3] Enforce visual concurrency cap and deterministic eviction behavior in `src/visual/AnimationController.js`
- [X] T026 [US3] Add lightweight runtime counters/timing logs for trigger-to-feedback observation in `src/main.js`
- [X] T027 [US3] Run Scenario A latency checks and Scenario C stress checks, then record outcomes in `specs/001-sound-sphere-spec/quickstart.md`

**Checkpoint**: User Story 3 is independently functional and demonstrable.

---

## Phase 6: User Story 4 - Resume Creative Sessions (Priority: P3)

**Goal**: Users can save and restore local session settings, including source/mode state, without network dependency.

**Independent Test**: Save state, reload app, restore state offline, and verify settings are recovered safely.

### Implementation for User Story 4

- [X] T028 [US4] Extend session schema with versioned input source and warning-state metadata in `src/session/SessionManager.js`
- [X] T029 [US4] Add save/restore/reset wiring for source/mode state in `src/main.js`
- [X] T030 [US4] Implement safe restore fallback for missing/corrupt/unknown version state in `src/session/SessionManager.js`
- [X] T031 [US4] Add/adjust session control UX text and affordances in `index.html` and `src/style.css`
- [X] T032 [US4] Run Scenario F validation and record outcomes in `specs/001-sound-sphere-spec/quickstart.md`

**Checkpoint**: User Story 4 is independently functional and demonstrable.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Finalize consistency, docs, and release readiness across all stories.

- [X] T033 [P] Update developer/user documentation to reflect implemented behavior in `README.md`
- [X] T034 Run full quickstart validation sweep and consolidate evidence in `specs/001-sound-sphere-spec/quickstart.md`
- [X] T035 Run production build verification and capture result notes in `specs/001-sound-sphere-spec/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- Setup (Phase 1): starts immediately
- Foundational (Phase 2): depends on Setup; blocks all story work
- User Stories (Phases 3-6): depend on Foundational completion
- Polish (Phase 7): depends on completion of desired story phases

### User Story Dependencies

- **US1 (P1)**: starts after Phase 2; no dependency on other stories
- **US2 (P1)**: starts after Phase 2; depends on shared arbitration but independently testable
- **US3 (P2)**: starts after Phase 2; can proceed without US4
- **US4 (P3)**: starts after Phase 2; independent of US3

### Within Each User Story

- Event normalization/arbitration use must be in place before story integration tasks
- Source handlers before orchestration hooks
- Orchestration before validation task

---

## Parallel Execution Examples

### User Story 1

- T011 and T012 can proceed in parallel after T010.
- T013 can proceed after T012 while T014 integrates orchestration.

### User Story 2

- T019 and T020 can proceed in parallel after T016 and T017.
- T018 can proceed in parallel with T019/T020.

### User Story 3

- T023 and T024 can proceed in parallel after T022.
- T025 can proceed in parallel with T026.

### User Story 4

- T028 and T031 can proceed in parallel.
- T030 can proceed after T028 while T029 handles orchestration.

---

## Implementation Strategy

### MVP First (US1)

1. Complete Phase 1 and Phase 2.
2. Complete Phase 3 (US1).
3. Validate Scenario A.
4. Demo/review MVP behavior.

### Incremental Delivery

1. Add US2 for keyboard fallback and warning UX.
2. Add US3 for expressive control and performance stability.
3. Add US4 for session continuity.
4. Finalize with Phase 7 polish and build verification.

### Parallel Team Strategy

1. One developer owns foundational input pipeline (Phase 2).
2. After Phase 2, split ownership by story:
   - Dev A: US1
   - Dev B: US2
   - Dev C: US3/US4

---

## Notes

- Tasks marked [P] are safe to run in parallel because they target different files and do not require unfinished dependencies.
- All story phases include an independent validation task tied to quickstart scenarios.
- Build verification is captured as part of final polish to support implementation handoff.
