#!/bin/bash
set -euo pipefail

jq '{project_name, features: [.features[] | {id, title, status, attempts, commit_hash, error}]}' .autonomous-executor/config.json
