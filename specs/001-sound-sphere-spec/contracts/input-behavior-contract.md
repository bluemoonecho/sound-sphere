# Input Behavior Contract

This contract defines observable runtime behavior between input sources (MIDI and computer keyboard), normalization, and dispatch to sound/visual subsystems.

## 1. Inputs

### 1.1 MIDI Event (Raw)

```json
{
  "status": "0x90|0x80|0xB0|0xE0",
  "data1": 60,
  "data2": 100,
  "channel": 0,
  "receivedAt": 1720000000000
}
```

### 1.2 Keyboard Event (Raw)

```json
{
  "key": "z",
  "type": "keydown|keyup",
  "receivedAt": 1720000000000
}
```

## 2. Normalized Note Contract

Both sources must emit equivalent normalized note events for mapped notes.

```json
{
  "eventId": "evt-<unique>",
  "sourceType": "midi|keyboard",
  "phase": "noteOn|noteOff",
  "note": 60,
  "velocity": 100,
  "channel": 0,
  "receivedAt": 1720000000000,
  "dispatchAt": 1720000000005
}
```

Required invariants:
- Note range is restricted to configured 3-octave playable range.
- Note-on from keyboard and MIDI produce equivalent dispatch side effects.
- Note-off always releases corresponding active note.

## 3. Arbitration Contract

When `midiActive == true`:
- Keyboard note-on events MUST be ignored.
- MIDI note events MUST be processed.
- Non-note keyboard controls (for UI convenience) MAY remain enabled.

When `midiActive == false`:
- Keyboard note events MUST be accepted.
- Fallback warning status determines banner messaging only; it must not block play.

## 4. Disconnect Contract

On MIDI disconnect during active performance:
- Input source state transitions to `keyboard.active`.
- Previously active MIDI notes are held for at most `250 ms`.
- Notes are force-released after timeout if no matching note-off arrives.

Timeout guarantee:
- Forced release deadline = `disconnectTimestamp + 250 ms`.

## 5. Warning UX Contract

If MIDI is unsupported or permission is denied:
- App enters keyboard-only mode.
- A visible warning banner is displayed.
- Sound and visual triggering remains functional using keyboard mapping.

## 6. Performance Contract

- Trigger-to-feedback latency target: `<=30 ms` for successful mapped note-on path.
- Visual concurrency must be bounded to preserve responsiveness.
- Contract verification focuses on end-user-observable behavior, not internal implementation details.
