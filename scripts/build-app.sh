#!/bin/bash
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_NAME="CrawlTerm.app"
APP_PATH="$DIR/$APP_NAME"
CONTENTS="$APP_PATH/Contents"
MACOS_DIR="$CONTENTS/MacOS"
RESOURCES_DIR="$CONTENTS/Resources"

echo "Stopping any existing CrawlTerm processes..."
make -C "$DIR" kill 2>/dev/null || true

echo "Building CrawlTerm binary with native macOS WebKit..."
make -C "$DIR" build

echo "Creating native macOS application bundle..."
rm -rf "$APP_PATH"
mkdir -p "$MACOS_DIR" "$RESOURCES_DIR"

# Mach-O binary as CFBundleExecutable (shell launchers are unreliable in Dock/Finder).
cp "$DIR/crawlterm" "$MACOS_DIR/CrawlTerm"
chmod +x "$MACOS_DIR/CrawlTerm"

# Ship demo crawl text next to the binary so `cat intro` works from the app cwd.
if [ -f "$DIR/intro" ]; then
  cp "$DIR/intro" "$MACOS_DIR/intro"
fi

ICON_KEYS=""
if [ -f "$DIR/build/CrawlTerm.icns" ]; then
  echo "Applying custom application icon..."
  cp "$DIR/build/CrawlTerm.icns" "$RESOURCES_DIR/CrawlTerm.icns"
  ICON_KEYS=$'    <key>CFBundleIconFile</key>\n    <string>CrawlTerm</string>'
fi

if [ -f "$DIR/build/CrawlTerm.png" ]; then
  cp "$DIR/build/CrawlTerm.png" "$RESOURCES_DIR/CrawlTerm.png"
fi

APP_VERSION=$(tr -d ' \t\r\n' < "$DIR/VERSION" 2>/dev/null || echo "1.0.0")

cat > "$CONTENTS/Info.plist" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>CFBundleName</key>
    <string>CrawlTerm</string>
    <key>CFBundleDisplayName</key>
    <string>CrawlTerm</string>
    <key>CFBundleIdentifier</key>
    <string>com.jaredwarren.crawl-term</string>
    <key>CFBundleVersion</key>
    <string>${APP_VERSION}</string>
    <key>CFBundleShortVersionString</key>
    <string>${APP_VERSION}</string>
    <key>CFBundleExecutable</key>
    <string>CrawlTerm</string>
${ICON_KEYS}
    <key>LSMinimumSystemVersion</key>
    <string>11.0</string>
    <key>NSHighResolutionCapable</key>
    <true/>
</dict>
</plist>
EOF

echo "Code-signing application bundle (ad-hoc)..."
codesign --force --deep --sign - "$APP_PATH" 2>/dev/null || true

if [ -d "/Applications/$APP_NAME" ]; then
  echo "Syncing updated app bundle to /Applications/$APP_NAME..."
  rm -rf "/Applications/$APP_NAME"
  cp -R "$APP_PATH" "/Applications/$APP_NAME"
fi

echo "Done! Native desktop application created at: $APP_PATH"
echo ""
echo "Launch:  open \"$APP_PATH\""
echo "Install: make update   # copies to /Applications and ready for Dock"
echo "Logs:    ~/Library/Logs/CrawlTerm/crawlterm.log"
echo "Then right-click the Dock icon → Options → Keep in Dock"
