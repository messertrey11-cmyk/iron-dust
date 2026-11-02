#!/bin/bash
cd "$(dirname "$0")"
if ! command -v node >/dev/null; then echo "Node.js is required for co-op (https://nodejs.org). Opening solo mode."; open index.html; exit; fi
[ -d node_modules ] || npm install
(sleep 2; open http://localhost:8080 2>/dev/null || xdg-open http://localhost:8080) &
node server.js
