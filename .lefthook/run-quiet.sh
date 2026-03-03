#!/usr/bin/env bash
# Runs a command and truncates output on failure for cleaner hook output.
# Usage: bash .lefthook/run-quiet.sh 'CI=true bun run lint'

set -o pipefail

MAX_LINES="${MAX_LINES:-20}"

output=$(eval "$*" 2>&1)
code=$?

if [ $code -ne 0 ]; then
  total=$(printf '%s\n' "$output" | wc -l)
  if [ "$total" -gt "$MAX_LINES" ]; then
    printf '%s\n' "$output" | tail -n "$MAX_LINES"
    printf '\n  ... %d lines hidden — rerun command for full output\n' "$((total - MAX_LINES))"
  else
    printf '%s\n' "$output"
  fi
fi

exit $code
