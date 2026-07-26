#!/bin/bash
echo "Stopping all Exam Cell AI Hub services..."
pkill -f "node index.js" 2>/dev/null && echo "✅ Server stopped" || echo "Server was not running"
pkill -f "react-scripts start" 2>/dev/null && echo "✅ Client stopped" || echo "Client was not running"
pkill -f "ollama serve" 2>/dev/null && echo "✅ Ollama stopped" || echo "Ollama was not running"
echo "Done."
