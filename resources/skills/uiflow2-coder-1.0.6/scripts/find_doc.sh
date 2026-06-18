#!/bin/bash
# UIFlow2 Documentation Quick Finder
# Automatically detects documentation directory relative to this script

SCRIPT_DIR=$(dirname "$(readlink -f "$0")")
DOCS_DIR="$SCRIPT_DIR/../docs"

if [ ! -d "$DOCS_DIR" ]; then
    echo "Error: Documentation directory not found at $DOCS_DIR"
    exit 1
fi

if [ $# -lt 1 ]; then
    echo "Usage: ./find_doc.sh <keyword>"
    exit 1
fi

KEYWORD="$1"

echo "Searching UIFlow2 docs for: $KEYWORD"
echo "------------------------------------------"

find "$DOCS_DIR" -type f -iname "*${KEYWORD}*.md" | sed "s|$DOCS_DIR/||" | sort
EOF
chmod +x ~/.openclaw/workspace/skills/uiflow2-coder/scripts/find_doc.sh
