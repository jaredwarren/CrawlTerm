# ⭐ Crawl-Term: Star Wars Perspective Terminal Emulator

A 3D perspective terminal emulator for macOS that renders your command line as an authentic, receding Star Wars intro crawl.

![Star Wars Terminal](https://img.shields.io/badge/Star_Wars-Crawl_Term-FFE81F?style=for-the-badge&logo=starwars)

## 🚀 Features

- **3D Perspective Projection**: Monospace font rendered on an inclined 3D plane receding into a vanishing point with an authentic Lucasfilm angle.
- **Zero-Flicker Continuous Scroll**: Smooth pixel-by-pixel upward glide. Lines rise continuously from an invisible bottom ingress threshold into space.
- **Adjustable Speed Slider**: Pacing adjustable from `Instant (0s)` up to `2.5s per line` (default `0.8s` for authentic reading speed).
- **Zero-Latency Command Typing**: Keystrokes bypass queue delays so command input and line editing remain completely responsive.
- **Interactive HUD Settings Bar**:
  - **MODE**: Quick presets for `Crawl (18°)`, `Subtle (8°)`, and `Flat (0°)`.
  - **SPEED**: Live millisecond/second crawl speed slider.
  - **FONT**: Live text scaling buttons.
  - **THEME**: `Gold`, `Sith Crimson`, `Hoth Cyan`, and `Dagobah Green`.
  - **TILT**: Live degree angle slider.
  - **SOUND**: Retro Web Audio synthesizer for opening brass fanfare and keystroke/scroll ticks.
- **Single Self-Contained Binary**: Embedded HTML/CSS/JS assets (`embed.FS`) allow the binary to be executed from any directory.

---

## 🛠️ Quick Start

### 1. Build & Run
```bash
# Clone or navigate to directory
cd /Users/jaredwarren/go/src/github.com/jaredwarren/crawl-term

# Build executable
go build -o crawlterm .

# Run (opens http://127.0.0.1:8765 in your default browser)
./crawlterm
```

### 2. Flags
- `-port 8765`: Set custom HTTP/WebSocket port.
- `-shell /bin/zsh`: Set shell binary (defaults to `$SHELL` or `/bin/zsh`).
- `-no-open`: Do not automatically open the browser on start.

### 3. Test Crawl
In the browser terminal, run:
```bash
cat intro.txt
```
