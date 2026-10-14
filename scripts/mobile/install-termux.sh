#!/data/data/com.termux/files/usr/bin/bash
# ARCHER AI — on-device installer for Termux (Android).
# The backend runs fully on the phone; the frontend can be served from the
# same device or pointed at this backend over LAN.
#
# Supported devices: Android 16 (API 36) and Android 17 (API 37) ONLY.
set -euo pipefail

api_level() {
  getprop ro.build.version.sdk 2>/dev/null || true
}

API="$(api_level)"
if [ -z "$API" ]; then
  echo "ERROR: could not read Android API level (are you inside Termux?)"
  exit 1
fi

if [ "$API" != "36" ] && [ "$API" != "37" ]; then
  echo "ERROR: ARCHER AI mobile install supports Android 16 (API 36) and"
  echo "       Android 17 (API 37) only. This device reports API level $API."
  exit 1
fi

if [ -z "${TERMUX_VERSION:-}" ] && [ ! -d "/data/data/com.termux/files/usr" ]; then
  echo "ERROR: this script must be run inside Termux."
  exit 1
fi

echo "Android API level $API detected — supported (Android 16/17)."
echo "Installing ARCHER AI..."

pkg update -y && pkg install -y nodejs-lts git
npm install
npm run build

if [ ! -f .env ] && [ -z "${GEMINI_API_KEY:-}" ]; then
  echo
  echo "NOTE: no GEMINI_API_KEY found. The chat agent needs one:"
  echo "  echo 'GEMINI_API_KEY=your-key-here' > .env"
  echo "Get a free key at https://aistudio.google.com/apikey"
fi

echo
echo "Done. Start the backend with:  npm run start:backend"
echo "It listens on http://localhost:4000 (UI in phone browser: build the"
echo "frontend with VITE_API_URL=http://localhost:4000 and serve dist/)."
