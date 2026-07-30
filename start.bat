@echo off
echo Preparing Exam Cell AI Application...

if not exist "%~dp0exam-dashboard\server\node_modules\" (
    echo Installing backend dependencies...
    cd /d "%~dp0exam-dashboard\server" && npm install
)

if not exist "%~dp0exam-dashboard\client\node_modules\" (
    echo Installing frontend dependencies...
    cd /d "%~dp0exam-dashboard\client" && npm install
)

echo Killing anything on port 5000...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5000') do taskkill /F /PID %%a 2>nul

echo Starting Backend and Frontend...
start "Backend" cmd /k "cd /d %~dp0exam-dashboard\server && node index.js"
start "Frontend" cmd /k "cd /d %~dp0exam-dashboard\client && npm start"

echo Done. Open http://localhost:3000 in your browser.
