#!/bin/sh
set -eu
PROJECT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
export GRADLE_USER_HOME="${GRADLE_USER_HOME:-$PROJECT_DIR/.gradle/user-home}"
if [ -z "${JAVA_HOME:-}" ] && [ -d "/Applications/Android Studio.app/Contents/jbr/Contents/Home" ]; then
    export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
fi
if [ -z "${ANDROID_HOME:-}" ] && [ -d "$HOME/Library/Android/sdk" ]; then
    export ANDROID_HOME="$HOME/Library/Android/sdk"
fi
if [ -z "${NODE_BINARY:-}" ]; then
    for candidate in "$HOME"/.nvm/versions/node/v22.*/bin/node; do
        if [ -x "$candidate" ]; then NODE_BINARY="$candidate"; fi
    done
    export NODE_BINARY="${NODE_BINARY:-node}"
fi
if [ "$#" -eq 0 ]; then set -- :app:assembleDebug :app:lintDebug; fi
python3 - "$PROJECT_DIR" "$@" <<'PY'
import os
import signal
import subprocess
import sys

process = subprocess.Popen(
    ["./gradlew", "--no-daemon", "--console=plain", *sys.argv[2:]],
    cwd=sys.argv[1], start_new_session=True,
)
try:
    sys.exit(process.wait(timeout=600))
except subprocess.TimeoutExpired:
    os.killpg(process.pid, signal.SIGTERM)
    try:
        process.wait(timeout=10)
    except subprocess.TimeoutExpired:
        os.killpg(process.pid, signal.SIGKILL)
    print("Android build exceeded 600 seconds", file=sys.stderr)
    sys.exit(124)
PY
