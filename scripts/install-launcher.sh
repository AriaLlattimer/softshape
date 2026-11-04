#!/usr/bin/env bash
# Install Wofi/desktop launcher and ~/.local/bin/softshape for this copy of SoftShape.
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BINDIR="${HOME}/.local/bin"
APPS_DIR="${HOME}/.local/share/applications"
DESKTOP="${APPS_DIR}/softshape.desktop"
TEMPLATE="${APP_DIR}/scripts/softshape.desktop.template"

mkdir -p "$BINDIR" "$APPS_DIR"
chmod +x "${APP_DIR}/scripts/softshape" "${APP_DIR}/scripts/softshape-tray"
ln -sf "${APP_DIR}/scripts/softshape" "${BINDIR}/softshape"

if [[ ! -f "$TEMPLATE" ]]; then
  echo "Missing template: $TEMPLATE" >&2
  exit 1
fi

sed -e "s|@APP_DIR@|${APP_DIR}|g" -e "s|@BINDIR@|${BINDIR}|g" "$TEMPLATE" >"$DESKTOP"
chmod 644 "$DESKTOP"

if command -v update-desktop-database >/dev/null 2>&1; then
  update-desktop-database "$APPS_DIR" 2>/dev/null || true
fi

echo "Installed:"
echo "  ${BINDIR}/softshape -> ${APP_DIR}/scripts/softshape"
echo "  ${DESKTOP}"
echo "Launch SoftShape from Wofi, or run: softshape toggle"
if ! python3 -c "import gi; gi.require_version('AyatanaAppIndicator3','0.1')" 2>/dev/null; then
  echo ""
  echo "Tray icon libraries not installed yet. In a terminal, run:"
  echo "  ${APP_DIR}/scripts/install-tray-deps.sh"
fi
