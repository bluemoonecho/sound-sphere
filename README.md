# Sound Sphere

A browser-based platform that synchronizes sound and visuals through MIDI input. Connect a MIDI keyboard to trigger pre-coded sound patterns (Strudel) and responsive animations (p5.js). Works offline—no internet required.

## Features

- **MIDI Keyboard Integration**: Connect any MIDI keyboard via Web MIDI API
- **3-Octave Range**: Maps 36 MIDI notes (3 octaves) to sound patterns and visuals
- **Real-time Sound Synthesis**: Strudel-powered procedural audio generation
- **Responsive Animations**: 4 distinct animation types with p5.js (black & white, geometry-based)
- **MIDI Modulation Support**: Velocity, mod wheel, pitch bend, sustain pedal
- **Keyboard Parity Mode**: Computer keyboard note input follows the same normalized note lifecycle as MIDI
- **MIDI Priority Arbitration**: Keyboard note events are ignored while a MIDI device is active
- **Fallback Warning States**: Visible warning for unsupported, permission-denied, or disconnected MIDI
- **Disconnect Safety**: Active MIDI notes are force-released within 250 ms after disconnect
- **Session Persistence**: Save/load sessions via localStorage
- **Offline Operation**: Fully functional without internet connection
- **Keyboard Shortcuts**: Number keys (1-4) to switch animation types; Space to clear

## Tech Stack

- **[p5.js](https://p5js.org/)** - 2D visual rendering
- **[Strudel](https://strudel.cycles/)** - Procedural audio synthesis
- **[Vite](https://vitejs.dev/)** - Build tool and dev server
- **Web MIDI API** - Hardware keyboard integration

## Project Structure

```
sound-sphere/
├── src/
│   ├── midi/
│   │   ├── MidiInput.js         # Web MIDI API handler
│   │   └── MidiConfig.js        # 3-octave note mapping & CC config
│   ├── sound/
│   │   ├── StrudelEngine.js     # Strudel initialization & control
│   │   └── PatternLibrary.js    # Pre-coded sound patterns
│   ├── visual/
│   │   ├── P5Sketch.js          # p5.js sketch & animation base classes
│   │   └── AnimationController.js # Animation triggering & lifecycle
│   ├── session/
│   │   └── SessionManager.js    # localStorage persistence
│   ├── main.js                  # App orchestration & UI setup
│   └── style.css                # UI styling
├── index.html                   # Entry point
├── vite.config.js              # Vite configuration
├── package.json                # Dependencies
└── README.md                   # This file
```

## Getting Started

### Prerequisites

- Node.js 16+ and npm
- A modern browser with Web MIDI support (Chrome, Edge, Opera)
- A MIDI keyboard or controller

### Installation

```bash
# Install dependencies
npm install

# Start dev server (opens browser at http://localhost:5173)
npm run dev

# Build for production
npm run build
```

### Usage

1. **Connect MIDI Keyboard**: Plug in your MIDI keyboard via USB
2. **Select Device**: Open the app, select your device from the dropdown
3. **Play!**: Press MIDI keys to trigger sounds and animations
4. **Switch Animations**: Use number keys 1-4 or the dropdown menu
5. **Save Session**: Click "Save Session" to persist current state (localStorage)
6. **Use Modulation**: Adjust mod wheel, pitch bend, sustain pedal for real-time effects

## Architecture

### MIDI Event Flow

```
MIDI Keyboard
    ↓
Web MIDI API (MidiInput.js)
    ↓ Normalized note + control events
    ↓
Keyboard Input (KeyboardInput.js)
    ↓ Normalized note events
    ↓
Arbitration (MIDI priority)
    ↓
Shared Event Dispatcher
    ├─→ StrudelEngine (sound trigger)
    └─→ AnimationController (animation trigger)
        └─→ P5Sketch (visual rendering)
```

### Input Arbitration Rules

- If a MIDI input is selected and active, keyboard note events are ignored.
- If MIDI is unavailable or permission is denied, keyboard mode remains playable and warning UI is shown.
- On MIDI disconnect during active notes, the app switches to keyboard mode and enforces forced note release at 250 ms.

### Animation Lifecycle

Each MIDI note triggers an animation with:
- **Velocity mapping**: Higher velocity → larger/brighter animation
- **Duration**: ~1–2 seconds fade-out
- **Max concurrent**: 8 animations (performance limit)
- **Fade out**: Last 20% of duration fades to black

### Sound Generation

- Each MIDI note (36–71) maps to a pre-coded Strudel pattern
- Velocity controls gain/loudness
- Mod wheel controls filter/modulation
- Pitch bend and sustain pedal apply to active notes

## Current Implementation Status

### ✅ Phase 1: Complete
- [x] Vite project setup with p5.js & Strudel
- [x] MIDI input handler (Web MIDI API)
- [x] 3-octave keyboard mapping (MIDI notes 36–71)
- [x] MIDI event dispatcher (noteOn, noteOff, modWheel, pitchBend, sustain)
- [x] Basic Strudel sound engine with pattern registry
- [x] p5.js sketch with 4 animation types
- [x] Animation controller with lifecycle management
- [x] Session manager (localStorage)
- [x] UI controls and keyboard shortcuts
- [x] Offline operation support

### 🔄 Phase 2–6: Planned
- [ ] **Phase 2**: Enhanced sound patterns (drums, bass, melody, effects)
- [ ] **Phase 3**: Advanced animation types and parameter bridges
- [ ] **Phase 4**: Full audio-visual coupling (velocity → animation size, etc.)
- [ ] **Phase 5**: Session UI improvements (save/load dropdown)
- [ ] **Phase 6**: Optimization, performance tuning, documentation

## Development Notes

### Browser DevTools

Open DevTools (F12) to see:
- MIDI events logged to console
- FPS and animation count overlay (top-left)
- Performance profiler for rendering latency

### Adding New Animation Types

Edit `src/visual/P5Sketch.js`:
1. Create a new class extending `Animation`
2. Implement `draw(p)` method
3. Add to `AnimationTypes` object in `getAnimationClass()`
4. Add option to `animation-select` in `index.html`

### Adding New Sound Patterns

Edit `src/sound/PatternLibrary.js`:
1. Add pattern definition with ADSR envelope
2. Update `StrudelEngine.createDefaultPatterns()` to use patterns
3. Assign patterns to MIDI note ranges

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `1` | Animation type: Radiating Circles |
| `2` | Animation type: Particle Burst |
| `3` | Animation type: Wave Pattern |
| `4` | Animation type: Expanding Rectangles |
| Space | Clear all animations |

## Troubleshooting

### MIDI keyboard not detected
- Ensure browser supports Web MIDI (Chrome, Edge, Opera)
- Check that keyboard is plugged in and powered on
- Try refreshing the page
- Verify in browser permissions that MIDI access is allowed

### Keyboard notes not triggering

- Confirm no MIDI input is currently selected (MIDI priority blocks keyboard note events).
- If MIDI was disconnected, wait up to 250 ms for forced note release to complete.

### No sound
- Check browser console for Strudel initialization errors
- Ensure system audio output is enabled
- Verify Strudel library loaded correctly

### Low frame rate
- Close other apps
- Reduce animation complexity (fewer simultaneous animations)
- Check DevTools Performance tab for bottlenecks

## Future Enhancements

1. **Live Strudel Code Editor**: Modify patterns in-app
2. **MIDI Learn**: Map custom CC values to parameters
3. **Animation Chaining**: Sequence animations based on note patterns
4. **Preset Manager**: Save/load animation and sound configurations
5. **Visualization Themes**: Color modes beyond black & white
6. **Multi-touch Support**: Touch keyboard alternative
7. **Audio Analysis**: Reactive visuals based on output frequency

## License

MIT

## Contributing

Contributions welcome! For major changes, please open an issue first.

---

**Status**: Active Development (Phase 1 complete)  
**Last Updated**: June 2026
