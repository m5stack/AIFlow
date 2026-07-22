#!/usr/bin/env bash
# UIFlow2 Documentation Quick Finder.
# Searches both file names and markdown content under this skill's docs directory.

set -u

if command -v realpath >/dev/null 2>&1; then
    SCRIPT_PATH=$(realpath "${BASH_SOURCE[0]}")
elif readlink -f "${BASH_SOURCE[0]}" >/dev/null 2>&1; then
    SCRIPT_PATH=$(readlink -f "${BASH_SOURCE[0]}")
else
    SCRIPT_PATH="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/$(basename "${BASH_SOURCE[0]}")"
fi

SCRIPT_DIR=$(cd "$(dirname "$SCRIPT_PATH")" && pwd)
DOCS_DIR=$(cd "$SCRIPT_DIR/../docs" && pwd)

if [ ! -d "$DOCS_DIR" ]; then
    echo "Error: Documentation directory not found at $DOCS_DIR"
    exit 1
fi

if [ $# -lt 1 ]; then
    echo "Usage: ./find_doc.sh <keyword> [keyword...]"
    echo "Example: ./find_doc.sh env temperature"
    exit 1
fi

QUERY="$*"
MAX_RESULTS="${MAX_RESULTS:-80}"
TMP_DIR=$(mktemp -d 2>/dev/null || mktemp -d -t uiflow-doc-search)
NAME_MATCHES="$TMP_DIR/name_matches.txt"
CONTENT_MATCHES="$TMP_DIR/content_matches.txt"
trap 'rm -rf "$TMP_DIR"' EXIT

echo "Searching UIFlow2 docs for: $QUERY"
echo "------------------------------------------"

{
    for keyword in "$@"; do
        (cd "$DOCS_DIR" && find . -type f -iname "*${keyword}*.md")
    done
} | sed 's|\\|/|g' | sed 's|^\./||' | sort -u > "$NAME_MATCHES"

if command -v rg >/dev/null 2>&1; then
    rg_args=()
    for keyword in "$@"; do
        rg_args+=(-e "$keyword")
    done
    (cd "$DOCS_DIR" && rg -i -n --glob '*.md' "${rg_args[@]}" .) 2>/dev/null \
        | sed 's|\\|/|g' | sed 's|^\./||' > "$CONTENT_MATCHES" || true
else
    : > "$CONTENT_MATCHES"
    for keyword in "$@"; do
        (cd "$DOCS_DIR" && grep -RInI --include='*.md' -- "$keyword" .) 2>/dev/null || true
    done | sed 's|\\|/|g' | sed 's|^\./||' | sort -u > "$CONTENT_MATCHES"
fi

name_count=$(wc -l < "$NAME_MATCHES" | tr -d ' ')
content_count=$(wc -l < "$CONTENT_MATCHES" | tr -d ' ')

echo
echo "File name matches ($name_count):"
if [ "$name_count" -gt 0 ]; then
    cat "$NAME_MATCHES"
else
    echo "  (none)"
fi

echo
echo "Content matches ($content_count line hits, first $MAX_RESULTS):"
if [ "$content_count" -gt 0 ]; then
    head -n "$MAX_RESULTS" "$CONTENT_MATCHES"
else
    echo "  (none)"
fi

if [ "$name_count" -eq 0 ] && [ "$content_count" -eq 0 ]; then
    exit 1
fi
