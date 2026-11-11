#!/usr/bin/env bash
# Cài venv + mã ppt-master (MIT) đúng commit đang dùng. Chạy một lần trên máy chủ.
set -euo pipefail
HOME_DIR="${PPTMASTER_HOME:-$HOME/Apps/pptmaster}"
COMMIT=3c6ffd0ee6d6e31aa9ca316bd157173802e3526f
python3 -m venv "$HOME_DIR"
"$HOME_DIR/bin/pip" install -q python-pptx XlsxWriter skia-pathops uharfbuzz PyYAML
TMP=$(mktemp -d)
git clone -q https://github.com/hugohe3/ppt-master.git "$TMP/ppt-master"
git -C "$TMP/ppt-master" checkout -q "$COMMIT"
mkdir -p "$HOME_DIR/src"
rm -rf "$HOME_DIR/src/ppt-master"
cp -r "$TMP/ppt-master/skills/ppt-master" "$HOME_DIR/src/ppt-master"
echo "hugohe3/ppt-master $COMMIT, MIT" > "$HOME_DIR/src/UPSTREAM.txt"
rm -rf "$TMP"
"$HOME_DIR/bin/python" -c "import pptx, pathops, uharfbuzz; print('ppt-master sẵn sàng ở $HOME_DIR')"
