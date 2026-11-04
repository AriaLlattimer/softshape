#!/usr/bin/env bash
# Arch Linux: libraries required for scripts/softshape-tray (Waybar tray icon).
set -euo pipefail

if ! command -v pacman >/dev/null 2>&1; then
  echo "This helper is for Arch Linux (pacman)." >&2
  echo "Install Ayatana AppIndicator GTK3 + Python GObject on your distro." >&2
  exit 1
fi

pkgs=(libayatana-appindicator libayatana-indicator libappindicator)
missing=()
for p in "${pkgs[@]}"; do
  if ! pacman -Q "$p" >/dev/null 2>&1; then
    missing+=("$p")
  fi
done

if ((${#missing[@]} == 0)); then
  echo "Tray packages already installed."
else
  echo "Installing: ${missing[*]}"
  sudo pacman -S --needed "${missing[@]}"
fi

if python3 -c "import gi; gi.require_version('AyatanaAppIndicator3','0.1')" 2>/dev/null; then
  echo "AyatanaAppIndicator3 OK — restart SoftShape (Wofi or: softshape stop && softshape start)."
else
  echo "AyatanaAppIndicator3 still missing after install — check errors above." >&2
  exit 1
fi
