#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUTPUT_PATH="$ROOT_DIR/deploy-f-project.zip"

rm -f "$OUTPUT_PATH"

cd "$ROOT_DIR"

zip -r "$OUTPUT_PATH" \
  package.json \
  package-lock.json \
  tsconfig.json \
  vite.config.ts \
  index.html \
  firebase-applet-config.json \
  firebase.json \
  firestore.rules \
  storage.rules \
  .env.example \
  README.md \
  Dockerfile \
  .dockerignore \
  DEPLOY_F.md \
  public \
  server \
  src \
  scripts \
  -x "node_modules/*" \
  -x "dist/*" \
  -x ".env" \
  -x ".codex-backups/*" \
  -x "*.log" \
  -x "*.zip" \
  -x "public/presentations/*"

echo "Created $OUTPUT_PATH"
