@echo off
cd /d "%~dp0"
where node >nul 2>nul || (echo Node.js is required for co-op: https://nodejs.org  - opening solo mode instead & start "" "%~dp0index.html" & pause & exit /b)
if not exist node_modules call npm install
start "" http://localhost:8080
node server.js
