#!/bin/bash
# setup_and_run.sh — installs everything and starts the full stack
set -e
PROJ="/media/abinivesh-m/Data/Agentverse"
AGENTS="$PROJ/exam-cell-agent"
DASHBOARD="$PROJ/exam-dashboard"

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║   Exam Cell AI Hub — Full Setup & Launch     ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

# ── Fix VS Code GPG key ───────────────────────────────────────────────────────
sudo curl -fsSL https://packages.microsoft.com/keys/microsoft.asc \
  -o /tmp/microsoft.asc 2>/dev/null || true
if [ -f /tmp/microsoft.asc ]; then
  sudo gpg --dearmor -o /usr/share/keyrings/microsoft.gpg /tmp/microsoft.asc 2>/dev/null || true
fi
if [ -f /etc/apt/sources.list.d/vscode.list ]; then
  sudo sed -i \
    's|deb \[arch=amd64\] |deb [arch=amd64 signed-by=/usr/share/keyrings/microsoft.gpg] |g' \
    /etc/apt/sources.list.d/vscode.list 2>/dev/null || true
fi

# ── 1. Node.js + npm ─────────────────────────────────────────────────────────
echo "▶ Ensuring Node.js and npm are installed..."
if ! command -v npm &>/dev/null; then
  echo "  npm missing — installing npm and nodejs via NodeSource..."
  sudo apt remove -y nodejs nodejs-doc 2>/dev/null || true
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt install -y nodejs
fi
echo "✅ Node $(node --version)  npm $(npm --version)"

# ── 2. MongoDB ───────────────────────────────────────────────────────────────
if ! command -v mongod &>/dev/null; then
  echo "▶ Installing MongoDB 7.0..."
  sudo apt install -y gnupg curl
  sudo rm -f /etc/apt/sources.list.d/mongodb-org-7.0.list
  curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc -o /tmp/mongodb-7.0.asc
  sudo gpg --dearmor -o /usr/share/keyrings/mongodb-server-7.0.gpg /tmp/mongodb-7.0.asc
  echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" \
    | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
  sudo apt update -qq
  sudo apt install -y mongodb-org
else
  echo "✅ MongoDB already installed"
fi

echo "▶ Starting MongoDB..."
sudo systemctl start mongod 2>/dev/null || sudo service mongod start 2>/dev/null || true
sleep 2

# ── 3. Ollama ────────────────────────────────────────────────────────────────
if ! command -v ollama &>/dev/null; then
  echo "▶ Installing Ollama..."
  curl -fsSL https://ollama.com/install.sh | sh
else
  echo "✅ Ollama already installed"
fi

echo "▶ Starting Ollama server..."
pkill ollama 2>/dev/null || true
sleep 1
ollama serve &>/tmp/ollama.log &
sleep 3

echo "▶ Pulling llama3 model (first run: ~4GB, takes a few minutes)..."
ollama pull llama3

# ── 4. Python venv ───────────────────────────────────────────────────────────
echo "▶ Setting up Python venv for agents..."
sudo apt install -y python3.12-venv 2>/dev/null || true
if [ ! -d "$AGENTS/venv" ]; then
  python3 -m venv "$AGENTS/venv"
fi
source "$AGENTS/venv/bin/activate"
pip install -q pandas openpyxl requests
deactivate
echo "✅ Python venv ready"

# ── 5. npm install ───────────────────────────────────────────────────────────
echo "▶ Installing server npm packages..."
cd "$DASHBOARD/server" && npm install --silent

echo "▶ Installing client npm packages..."
cd "$DASHBOARD/client" && npm install --silent

# ── 6. Update .env ───────────────────────────────────────────────────────────
VENV_PYTHON="$AGENTS/venv/bin/python3"
sed -i "s|PYTHON_PATH=.*|PYTHON_PATH=$VENV_PYTHON|" "$DASHBOARD/server/.env"
echo "✅ .env updated: PYTHON_PATH=$VENV_PYTHON"

# ── 7. Launch ────────────────────────────────────────────────────────────────
echo ""
echo "▶ Starting Express server on port 5000..."
cd "$DASHBOARD/server"
node index.js &>/tmp/exam-server.log &
SERVER_PID=$!
sleep 2

if kill -0 $SERVER_PID 2>/dev/null; then
  echo "✅ Server running (PID $SERVER_PID)"
else
  echo "❌ Server failed. Logs:"
  cat /tmp/exam-server.log
  exit 1
fi

echo "▶ Starting React client on port 3000..."
cd "$DASHBOARD/client"
BROWSER=none npm start &>/tmp/exam-client.log &
CLIENT_PID=$!

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║  ✅ All services started!                    ║"
echo "║                                              ║"
echo "║  Dashboard → http://localhost:3000           ║"
echo "║  API       → http://localhost:5000           ║"
echo "║  MongoDB   → mongodb://localhost:27017       ║"
echo "║  Ollama    → http://localhost:11434          ║"
echo "║                                              ║"
echo "║  Logs:                                       ║"
echo "║    Server  → /tmp/exam-server.log            ║"
echo "║    Client  → /tmp/exam-client.log            ║"
echo "║    Ollama  → /tmp/ollama.log                 ║"
echo "║                                              ║"
echo "║  Press Ctrl+C to stop all services           ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

wait $CLIENT_PID
