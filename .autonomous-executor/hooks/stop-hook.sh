#!/bin/bash
set -euo pipefail

config_file=".autonomous-executor/config.json"
pending=$(jq '[.features[] | select(.status == "pending" or .status == "in_progress")] | length' "$config_file")

if [[ "$pending" -gt 0 ]]; then
  echo "$pending autonomous features remain" >&2
  exit 1
fi
