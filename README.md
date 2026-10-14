# archer-ai
ARCHER AI — ADK-powered mobile AI agent operating system with multi-agent workflows, skills, memory, and real-time execution.

## Quick start (desktop)

```bash
npm install
npm run build
npm start            # backend on http://localhost:4000
npm run dev          # backend + frontend dev servers
```

Set `GEMINI_API_KEY` (`.env` in `backend/` or your environment) to enable the
chat agent: https://aistudio.google.com/apikey

## Mobile install (Android 16 / Android 17 ONLY)

ARCHER AI's Android shell supports **Android 16 (API 36) and Android 17 (API
37) only** — `minSdkVersion 36` blocks older devices, and the installer
refuses to run on anything else.

### Option A — APK (Capacitor)

1. Point the app at your backend (running on a laptop, VPS, or the phone
   itself) and build the APK:

   ```bash
   cd frontend
   VITE_API_URL=http://<backend-host>:4000 npm run mobile:apk
   ```

2. Install `android/app/build/outputs/apk/debug/app-debug.apk` on the phone
   (Android 16/17). The backend must be reachable from the phone; if it runs
   on a laptop, both devices must share the network and use the laptop's LAN
   IP.

3. Optional: load a hosted frontend instead of bundled assets by syncing with
   `ARCHER_WEBVIEW_URL=https://your-frontend-url` (`npx cap sync android`).

Requirements to build the APK: Android SDK with platform 37 (Android 16/17
build tools), Java 21.

### Option B — Termux (backend on the phone)

```bash
pkg install -y curl
curl -fsSL <repo-url>/raw/main/scripts/mobile/install-termux.sh | bash
```

or clone the repo and run `bash scripts/mobile/install-termux.sh`. The script
checks the device is Android 16/17 (API 36/37) and exits on anything else,
then installs Node, builds the project, and prints how to run the backend on
the device (`npm run start:backend`).

## Project layout

- `backend/` — Express API + ADK agent runtime (Gemini)
- `frontend/` — React chat UI (Vite) + Capacitor Android shell (`frontend/android`)
- `scripts/mobile/` — on-device installers
