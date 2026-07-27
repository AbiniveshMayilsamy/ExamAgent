@echo off
echo Killing anything on port 5000...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5000') do taskkill /F /PID %%a 2>nul

echo Starting Backend and Frontend...
start "Backend" cmd /k "cd /d %~dp0exam-dashboard\server && node index.js"
start "Frontend" cmd /k "cd /d %~dp0exam-dashboard\client && npm start"

echo Done. Open http://localhost:3000 in your browser.
