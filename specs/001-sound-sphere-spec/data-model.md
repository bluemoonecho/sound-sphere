# Data Model: Sound Sphere Performance Platform

## 1. InputSource

Represents a currently available or active control source.

| Field | Type | Required | Description |
|---|---|---|---|
| id | string | yes | Stable identifier (`midi:<device-id>` or `keyboard`) |
| type | enum(`midi`,`keyboard`) | yes | Source category |
| status | enum(`active`,`available`,`unavailable`) | yes | Current usability state |
| priority | integer | yes | Arbitration priority (`midi` > `keyboard`) |
| warningState | enum(`none`,`unsupported`,`permission-denied`,`device-disconnected`) | no | UI warning reason |
| updatedAt | number (epoch ms) | yes | Last state transition timestamp |

Validation rules:
- Exactly one source is active at a time for note triggering.
- If any MIDI input is active, keyboard note-on events are ignored.
- `warningState != none` implies keyboard mode remains usable.

State transitions:
- `keyboard.available -> midi.active` when MIDI device connects and selected.
- `midi.active -> keyboard.active` when MIDI disconnects or access is revoked.

## 2. MappedNoteEvent

Normalized per-note event consumed by sound and visual dispatch.

| Field | Type | Required | Description |
|---|---|---|---|
| eventId | string | yes | Unique event identifier |
| sourceType | enum(`midi`,`keyboard`) | yes | Originating source |
| note | integer | yes | MIDI note number (3-octave playable range) |
| phase | enum(`noteOn`,`noteOff`) | yes | Trigger phase |
| velocity | integer | yes | 0-127 normalized intensity |
| channel | integer | no | MIDI channel for hardware events |
| receivedAt | number (epoch ms) | yes | Capture timestamp |
| dispatchAt | number (epoch ms) | yes | Dispatch timestamp |

Validation rules:
- `note` must be inside configured playable range.
- `velocity > 0` for `noteOn`; `velocity = 0` for `noteOff`.
- Keyboard-generated note events must be behaviorally equivalent to MIDI note events after normalization.

State transitions:
- `noteOn` enters active-note set.
- `noteOff` removes note from active-note set.
- On MIDI disconnect, active notes remain until forced release at `disconnectTime + 250 ms`.

## 3. VisualInstance

Represents a live animation instance linked to an active or recently released note.

| Field | Type | Required | Description |
|---|---|---|---|
| id | string | yes | Unique visual identifier |
| note | integer | yes | Triggering note number |
| mode | integer | yes | Selected visual mode (0-3 minimum) |
| intensity | number | yes | Normalized value derived from velocity |
| startedAt | number (epoch ms) | yes | Start timestamp |
| durationMs | integer | yes | Total lifecycle duration |
| isActive | boolean | yes | Active/inactive state |

Validation rules:
- Active visual instances are capped (max 8 concurrent).
- Visual mode must be one of selectable modes exposed in UI.
- Fade-out must complete cleanly after note release.

State transitions:
- Created on accepted `noteOn` event.
- Updated by modulation/pitch/sustain controls.
- Deactivated on corresponding `noteOff` or forced release.

## 4. SessionState

Persisted user configuration for fast resume.

| Field | Type | Required | Description |
|---|---|---|---|
| version | string | yes | Session schema version |
| selectedInputSource | string | yes | Preferred source id |
| selectedVisualMode | integer | yes | Active visual mode |
| savedAt | number (epoch ms) | yes | Last save timestamp |
| metadata | object | no | Optional compatibility flags |

Validation rules:
- Unknown or corrupt state must fail safely and load defaults.
- Restore must not require network access.
- Version mismatches should degrade gracefully without crash.

State transitions:
- Captured on explicit save action.
- Loaded on app initialization or explicit restore action.
- Cleared by explicit user action.
