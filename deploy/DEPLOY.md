# Moving the Terminal Music backend to your always-on server

The phone app **only ever talks to the backend over HTTP** — it never touches
YouTube directly. So moving the server is just: run the backend somewhere stable,
then point the app at that address. No app logic changes.

There are two ways to run it. **Use Docker (Option A)** unless you have a reason
not to — it bundles ffmpeg and restarts on reboot automatically.

---

## What you need on the server

- A machine that stays on (home server, VPS, mini PC, NAS with Docker, etc.).
- Either **Docker + Docker Compose** (Option A), or **Python 3.10+ and ffmpeg**
  (Option B).
- The repo copied to the server (or at least the `server/` folder + the compose
  files). `git clone` or `scp` the project over.

---

## Option A — Docker (recommended)

From the **repo root** on the server:

```bash
# 1. Create your env file and edit it (see "Secrets" below).
cp .env.example .env
nano .env

# 2. Build + start in the background.
docker compose up -d --build

# 3. Check it's healthy.
docker compose ps
curl http://localhost:8000/health
```

`/health` should return `{"status":"ok",...}`. Downloads/caches persist in the
`tm-data` Docker volume, so `docker compose down` / updates won't wipe them.

**Updating** (yt-dlp and ytmusicapi go stale fast — update every few weeks):

```bash
docker compose up -d --build        # rebuilds, picking up newer yt-dlp per requirements.txt
```

**Logs / restart / stop:**

```bash
docker compose logs -f
docker compose restart
docker compose down
```

Files involved: [`docker-compose.yml`](../docker-compose.yml),
[`server/Dockerfile`](../server/Dockerfile), [`.dockerignore`](../.dockerignore),
[`.env.example`](../.env.example).

---

## Option B — Bare Linux + systemd (no Docker)

```bash
sudo apt update && sudo apt install -y python3-venv ffmpeg       # ffmpeg is REQUIRED for downloads
sudo mkdir -p /opt/terminal-music && sudo chown $USER /opt/terminal-music
# copy the repo into /opt/terminal-music (git clone / scp), then:
cd /opt/terminal-music
python3 -m venv .venv
.venv/bin/pip install -r server/requirements.txt
cp .env.example .env && nano .env        # fill in secrets

# install the service
sudo cp deploy/terminal-music.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now terminal-music
systemctl status terminal-music
curl http://localhost:8000/health
```

Update later with:
`cd /opt/terminal-music && .venv/bin/pip install -U -r server/requirements.txt && sudo systemctl restart terminal-music`

File involved: [`deploy/terminal-music.service`](terminal-music.service).

---

## Reaching the server from your phone

Pick ONE of these for the address the app will use:

| Setup | App base URL | Notes |
| --- | --- | --- |
| Same home Wi-Fi, static LAN IP | `http://192.168.x.y:8000` | Give the server a **static IP / DHCP reservation** so it never changes. This is the #1 cause of "it suddenly stopped working." |
| Anywhere, with a domain + HTTPS | `https://music.example.com` | Best. Never breaks on IP change. Use the [`Caddyfile`](Caddyfile) reverse proxy. Also lets you later drop the Android cleartext-HTTP workaround. |
| Anywhere, no domain | `http://<public-ip>:8000` | Needs port-forwarding 8000 on your router; IP may change unless you have a static one or DDNS. |

Open the firewall / forward the port as needed (e.g. `sudo ufw allow 8000`).

### HTTPS with a domain (optional but recommended)
Point an A record at the server, open ports 80+443, edit
[`Caddyfile`](Caddyfile) (replace `music.example.com`), and run Caddy. Then the
app URL is `https://music.example.com` with no `:8000`.

---

## Point the app at the new server

**Two places. Do both.**

### 1. In-app (instant, per-device) — for testing right now
Open the app → **Settings** → change the **backend/server URL** field to your new
address (e.g. `https://music.example.com` or `http://192.168.x.y:8000`). This is
read live by `app/src/store/settings.ts` (`baseUrl`). No rebuild needed — great
for confirming the server works before you rebuild the APK.

### 2. Baked default (for a fresh install) — `app/eas.json`
The APK bakes a default URL at build time via `EXPO_PUBLIC_API_URL`. Edit
`app/eas.json` → `build.preview.env.EXPO_PUBLIC_API_URL` (currently
`http://192.168.1.10:8000`) to your new address, then rebuild:

```bash
cd app
npx eas-cli@latest build --platform android --profile preview
```

Install the new APK. Now a fresh install points at your server with no manual
Settings step.

> Tip: if you used an **HTTPS domain**, you can also set
> `build.preview.env.EXPO_PUBLIC_API_URL` to the `https://…` URL and you no longer
> depend on cleartext HTTP at all.

---

## Secrets (do this once)

`server/config.py:27` currently has a **hardcoded YouTube Data API key**. For your
own deployment:

1. Create your own key at <https://console.cloud.google.com/> → enable
   **YouTube Data API v3**.
2. Put it in `.env` as `TM_YOUTUBE_API_KEY=...`.
3. Replace the hardcoded default in `server/config.py:27` with an empty string so
   the committed code carries no secret. (The old key should be rotated/deleted in
   Google Cloud since it has been in the source.)

---

## Verify end to end

1. `curl http://<server>:8000/health` → ok.
2. `curl "http://<server>:8000/search?q=test&type=songs"` → JSON results.
3. In the app (Settings URL set): search a song, play it, then try **Download
   playlist**. Downloads hit `GET /download/{id}` on this server — if the server
   is reachable, they now succeed. (A flaky LAN IP was the likely reason downloads
   failed before — see the note in the main reply.)
