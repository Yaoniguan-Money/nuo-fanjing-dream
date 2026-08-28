#!/bin/bash
set -euo pipefail

CONFIG_FILE=".autonomous-executor/config.json"

if [[ ! -f "$CONFIG_FILE" ]]; then
  echo "Missing $CONFIG_FILE" >&2
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "jq is required" >&2
  exit 1
fi

jq -e '.features | length > 0' "$CONFIG_FILE" >/dev/null
jq -r '.features[] | "[\(.status)] \(.id) \(.title)"' "$CONFIG_FILE"

pending=$(jq '[.features[] | select(.status == "pending" or .status == "in_progress")] | length' "$CONFIG_FILE")
failed=$(jq '[.features[] | select(.status == "failed")] | length' "$CONFIG_FILE")

if [[ "$failed" -gt 0 ]]; then
  exit 2
fi

if [[ "$pending" -gt 0 ]]; then
  exit 1
fi
