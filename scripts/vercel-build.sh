#!/usr/bin/env sh
set -eu

if [ -n "${SUPABASE_URL:-}" ] && [ -n "${SUPABASE_ANON_KEY:-}" ]; then
  cat > js/config.js <<CFG
window.SUPABASE_URL = '${SUPABASE_URL}';
window.SUPABASE_ANON_KEY = '${SUPABASE_ANON_KEY}';
window.__APP_CONFIG_LOADED__ = true;
CFG
else
  cp js/config.example.js js/config.js
fi
