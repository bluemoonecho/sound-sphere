# Phase 0 Research: Sound Sphere Performance Platform

## Decision 1: Input Arbitration Model

- Decision: Use MIDI-priority arbitration at dispatch time. When at least one MIDI input is connected and active, keyboard note-on triggers are ignored; keyboard control shortcuts that are not note-on events remain available.
- Rationale: This directly satisfies FR-013 and SC-006 while preventing duplicate note activation from mixed sources.
- Alternatives considered:
  - Last-input-wins arbitration: rejected because source switching can become nondeterministic under fast performance.
  - Merge both sources: rejected because duplicate note-on side effects violate the requirement.

## Decision 2: Unsupported/Denied MIDI Fallback UX

- Decision: Keep app operational in keyboard-only mode and show a persistent, visible warning banner with the reason (unsupported API or denied permission).
- Rationale: Meets FR-014 and SC-007 while preserving usability without hardware.
- Alternatives considered:
  - Blocking modal requiring MIDI: rejected because it prevents keyboard-only operation.
  - Silent fallback without warning: rejected because the requirement mandates visible warning feedback.

## Decision 3: MIDI Disconnect Handling

- Decision: On MIDI disconnect, auto-switch to keyboard input and retain already-active notes for up to 250 ms before forced release.
- Rationale: Enforces FR-015 and SC-008 with a bounded sustain window that avoids abrupt audio artifacts.
- Alternatives considered:
  - Immediate note kill on disconnect: rejected because it can produce audible pops and violates required timeout behavior.
  - Long grace period (>250 ms): rejected because it increases stuck-note risk and violates the fixed timeout.

## Decision 4: Shared Event Normalization

- Decision: Normalize both MIDI and keyboard note events into a common event shape before dispatch to sound and animation subsystems.
- Rationale: Satisfies FR-008 and FR-009 by creating one deterministic trigger/release path.
- Alternatives considered:
  - Keep separate handlers for each source: rejected due to behavioral drift and duplicated logic.
  - Full event bus refactor: deferred as higher complexity than required for this feature scope.

## Decision 5: Performance and Concurrency Guardrails

- Decision: Keep active visual-instance cap at 8 and prioritize frame stability over unbounded visual spawning.
- Rationale: Aligns with FR-006 and supports SC-001/SC-004 latency and reliability outcomes.
- Alternatives considered:
  - Unlimited visuals: rejected due to predictable frame drops during rapid note bursts.
  - Dynamic cap based on FPS: deferred to later optimization phase; unnecessary for current acceptance scope.

## Decision 6: Validation Strategy During Planning

- Decision: Use deterministic manual validation scenarios now (quickstart) and defer automated test scaffolding details to `/speckit.tasks`.
- Rationale: Current repository has no test harness yet; planning can still define executable validation evidence.
- Alternatives considered:
  - Require full automated tests before planning completion: rejected because it blocks plan generation and exceeds this command's scope.
  - Skip explicit validation guidance: rejected because measurable success criteria require a reproducible runbook.
