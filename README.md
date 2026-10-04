# Crawl-Term

A local terminal emulator that renders your shell output as a receding perspective crawl — as a native macOS app or in the browser.

> Fan project. Not affiliated with, endorsed by, or associated with Lucasfilm Ltd., Disney, or any related trademarks.

![Go](https://img.shields.io/badge/Go-1.25+-00ADD8?style=flat-square&logo=go)
![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)

## Features

- **Native macOS app** — Cocoa + WKWebView window, Dock icon, `/Applications` install
- **Perspective projection** — monospace output on an inclined plane into a vanishing point
- **Continuous scroll** — smooth upward glide with adjustable line timing
- **Live HUD** — mode presets, speed, font scale, theme, tilt, and optional Web Audio cues
- **Single binary** — HTML/CSS/JS embedded via `embed.FS`

## Requirements

- Go 1.25+
- macOS 11+ for the native desktop app (CGO + Cocoa/WebKit)
- Linux works in browser-fallback mode (PTY + system browser)

## Install as a native app (macOS)

```bash
make update          # build CrawlTerm.app and copy to /Applications
open -a CrawlTerm    # launch from Applications / Spotlight / Dock
```

Or build the bundle without installing:

```bash
make app
open ./CrawlTerm.app
```

Logs (GUI mode): `~/Library/Logs/CrawlTerm/crawlterm.log`

## Quick start (dev)

```bash
make run      # build and open the native window on http://127.0.0.1:8765
make kill     # stop CrawlTerm and free port 8765
```

Headless / browser-only:

```bash
./crawlterm -open=false
# or
./crawlterm -no-open
```

### Flags

| Flag | Default | Description |
|------|---------|-------------|
| `-port` | `8765` | HTTP / WebSocket port |
| `-shell` | `$SHELL` or `/bin/zsh` | Shell binary |
| `-open` | `true` | Open native desktop window (macOS) |
| `-no-open` | off | Alias for `-open=false` |

### Demo crawl

In the terminal:

```bash
cat intro
```

## HUD controls

- **MODE**: `Crawl (18°)`, `Subtle (8°)`, `Flat (0°)`
- **SPEED**: crawl timing slider
- **FONT**: text scale
- **THEME**: Gold, Sith Crimson, Hoth Cyan, Dagobah Green
- **TILT**: angle slider
- **SOUND**: optional fanfare / keystroke ticks

## Development

```bash
make build
make app
make update
make test
make fmt
make vet
make tidy
make clean
```

With `./static` present next to the binary, files are served from disk for live UI edits; otherwise embedded assets are used.

## Security note

Crawl-Term binds to `127.0.0.1` and spawns your local shell over a WebSocket. Treat it like any local terminal — do not expose the port to untrusted networks.

## License

MIT — see [LICENSE](LICENSE).

Third-party attributions: [THIRD_PARTY.md](THIRD_PARTY.md).
