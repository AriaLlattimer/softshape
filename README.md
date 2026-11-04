# SoftShape — Feminizing Workout Tracker

Local-first web app for tracking feminizing strength training while on MTF HRT.

## Features

- Profile with weight, activity level, equipment, and HRT start date (“Week N on HRT”)
- Equipment-aware weekly plan with how-to steps and “why this helps” for each move
- Workout logging with rest timer
- Body measurements + simple trends
- Optional online exercise discovery (wger + web search)
- MyFitnessPal logging guide with copyable calorie estimates
- JSON export/import for offline backup / cross-device sync

Data stays in your browser (IndexedDB). No account required.

## Setup from scratch

These steps assume **Linux** with Node.js installed. Paths with spaces are fine.

### Prerequisites

- **Node.js 20+** and **npm** — [nodejs.org](https://nodejs.org/) or your distro packages
- **Optional (desktop workflow):** Wofi or another app launcher, `libnotify` (`notify-send`)
- **Optional (system tray):** Waybar (or another host) with a **tray** module, plus indicator libraries (see below)
- **Optional (phone URL to clipboard):** `wl-copy` (Wayland) or `xclip`

On **macOS** or **Windows**, you can use `npm install` and `npm run dev` only; the Wofi launcher and tray scripts are Linux-oriented.

### Get the project

- Clone the repo, or send a zip/tar **without** `node_modules` or `dist` (they are not needed and should be installed on each machine).
- Open a terminal in the project folder.

### First-time install

```bash
npm install
chmod +x scripts/install-launcher.sh
./scripts/install-launcher.sh
```

This creates:

- `~/.local/bin/softshape` → this project’s `scripts/softshape`
- `~/.local/share/applications/softshape.desktop` for Wofi and other launchers

Ensure `~/.local/bin` is on your `PATH` (common on Arch/Hyprland setups).

**System tray (optional, Arch Linux):**

```bash
./scripts/install-tray-deps.sh
```

That installs `libayatana-appindicator`, `libayatana-indicator`, and `libappindicator`, then checks that Python can load `AyatanaAppIndicator3`. Restart SoftShape afterward (`softshape stop` then start from Wofi).

Other distros: install the Ayatana/AppIndicator GTK3 packages that provide `AyatanaAppIndicator3` or `AppIndicator3` for Python GObject introspection.

Disable the tray if you prefer: `SOFTSHAPE_TRAY=0 softshape start`.

### Daily use

| Method | What it does |
|--------|----------------|
| **Wofi** | Search **SoftShape** → starts or stops the server; opens the browser when starting |
| **Terminal** | `softshape start` · `stop` · `toggle` · `status` · `open` |
| **Tray** | Open SoftShape · Show phone URL · Quit SoftShape |
| **In-app** | Settings → **Stop SoftShape server** |

Environment variables:

| Variable | Default | Meaning |
|----------|---------|---------|
| `SOFTSHAPE_PORT` | `5173` | HTTP port |
| `SOFTSHAPE_TRAY` | `1` | Show tray icon while running |
| `SOFTSHAPE_OPEN` | `1` | Open browser on `start` / Wofi toggle-on |

### Phone on the same Wi‑Fi

The dev server listens on your LAN (`host: true`, port 5173). When you start SoftShape, the notification (or tray **Show phone URL**) gives an address like `http://192.168.x.x:5173/`. Use that on your phone—not `localhost`.

**Share data between devices:**

- **Export/import:** Settings → export JSON on one device, import on another.
- **LAN sync:** While the server runs on one PC, phones on the same network can use the sync endpoints; the host stores `.softshape-sync.json` in the project folder. Only one machine should “host” the dev server at a time.

### Development (terminal only)

```bash
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173/`).

### Optional production build

```bash
npm run build
npm run preview -- --host
```

Preview serves static files. In-app **Stop SoftShape server** and LAN sync APIs are for the **dev** server (`softshape start` / Vite dev), not preview.

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `Exec format error` when running `vite` | Do **not** copy `node_modules` from Windows. Delete `node_modules` and run `npm install` on Linux. |
| Wofi doesn’t list SoftShape | Re-run `./scripts/install-launcher.sh`. Log out/in if the launcher cache is stale. |
| No tray icon | Install indicator packages; confirm Waybar (or similar) has a tray module. Or `SOFTSHAPE_TRAY=0`. |
| Phone can’t connect | Same Wi‑Fi; allow TCP **5173** in the firewall; use the LAN IP from the notification. |
| Port already in use | `softshape stop` or `SOFTSHAPE_PORT=5174 softshape start` |

Logs: `~/.cache/softshape/server.log`

## Sharing with a friend

Send the project (git link or archive **without** `node_modules` / `dist`) and point them to **Setup from scratch** above. No account or cloud service is required. Remind them this app is a fitness companion, not medical or HRT dosing advice.

## Privacy

Workout data lives in the browser (IndexedDB) on each device. LAN sync writes a JSON file only on the machine running the SoftShape dev server.

## Note

This is a fitness support companion, not medical or HRT dosing advice. Calorie estimates are approximate for MyFitnessPal logging.
