#!/bin/sh
# Build or refresh a Ghidra project for a Harmony firmware image.
#
# Auto-analysis on a raw binary finds almost nothing, because there is no entry point and
# no relocations to follow. Seeding it with the branch targets extracted beforehand is what
# takes coverage from nearly nothing to about 87%, so this script does both steps.
#
# Requires JDK 21: Ghidra 12 will not start on 17, which is the macOS Homebrew default.
#
# Usage:
#   HARMONY_LAB=/path/to/binaries ./bin/setup-ghidra.sh [image] [base]
#
# Defaults to the Harmony 700 2.8 image at 0x9000, which is the recommended target: it is
# complete, whereas the 600 dump is truncated.
set -e

REPO=$(cd "$(dirname "$0")/.." && pwd)
GHIDRA_HOME=${GHIDRA_HOME:-/opt/homebrew/Cellar/ghidra/12.1.2/libexec}
JAVA_HOME=${JAVA_HOME:-/opt/homebrew/opt/openjdk@21}
export JAVA_HOME

IMAGE=${1:-$HARMONY_LAB/700-2.8-Region_2-code-base0x9000.bin}
BASE=${2:-0x9000}
PROJECT_DIR=${GHIDRA_PROJECT_DIR:-$REPO/.ghidra}
PROJECT_NAME=harmony

if [ ! -f "$IMAGE" ]; then
    echo "image not found: $IMAGE" >&2
    echo "set HARMONY_LAB, or pass a path. See reference/checksums.md." >&2
    exit 1
fi
if [ ! -x "$GHIDRA_HOME/support/analyzeHeadless" ]; then
    echo "Ghidra not found at $GHIDRA_HOME" >&2
    echo "set GHIDRA_HOME to your install's libexec directory." >&2
    exit 1
fi

# analyzeHeadless rejects relative project paths, so this must be absolute.
mkdir -p "$PROJECT_DIR"
PROGRAM=$(basename "$IMAGE")

if [ ! -f "$PROJECT_DIR/$PROJECT_NAME.gpr" ]; then
    echo "== importing $PROGRAM at $BASE"
    "$GHIDRA_HOME/support/analyzeHeadless" "$PROJECT_DIR" "$PROJECT_NAME" \
        -import "$IMAGE" \
        -processor "PIC-18:LE:24:PIC-18" \
        -loader BinaryLoader -loader-baseAddr "$BASE"
else
    echo "== project exists, reusing $PROJECT_DIR/$PROJECT_NAME.gpr"
fi

echo "== seeding from tools/ghidra and analysing"
"$GHIDRA_HOME/support/analyzeHeadless" "$PROJECT_DIR" "$PROJECT_NAME" \
    -process "$PROGRAM" \
    -scriptPath "$REPO/tools/ghidra" \
    -postScript ExportInfo.java "$REPO/tools/ghidra" \
    -noanalysis

echo
echo "project ready: $PROJECT_DIR"
echo "function list: $REPO/tools/ghidra/ghidra_functions.txt"
echo "open the GUI with: JAVA_HOME=$JAVA_HOME $GHIDRA_HOME/ghidraRun"
