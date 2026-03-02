#!/bin/bash
# Refinery - Development Startup Script
# Usage: ./start.sh

set -e

echo "================================================"
echo "  Refinery - Where Prose Becomes Perfect"
echo "  Starting development servers..."
echo "================================================"

# Check for required tools
command -v python3 >/dev/null 2>&1 || { echo "Python 3 is required. Install from python.org"; exit 1; }
command -v node >/dev/null 2>&1 || { echo "Node.js is required. Install from nodejs.org"; exit 1; }

# Backend
echo ""
echo "[Backend] Setting up virtual environment..."
cd backend
if [ ! -d ".venv" ]; then
  python3 -m venv .venv
fi
# shellcheck source=/dev/null
source .venv/bin/activate
echo "[Backend] Installing dependencies..."
python3 -m pip install -r requirements.txt --quiet 2>/dev/null || python3 -m pip install -r requirements.txt
mkdir -p uploads exports

echo "[Backend] Starting FastAPI server on http://localhost:8000..."
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!
cd ..

# Frontend
echo ""
echo "[Frontend] Installing dependencies..."
cd frontend
npm install --silent 2>/dev/null || npm install

echo "[Frontend] Starting Vite dev server on http://localhost:5173..."
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "================================================"
echo "  Refinery is running!"
echo "  Frontend: http://localhost:5173"
echo "  Backend:  http://localhost:8000"
echo "  API Docs: http://localhost:8000/docs"
echo "================================================"
echo "Press Ctrl+C to stop all servers"

# Cleanup on exit
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo 'Servers stopped.'" EXIT

wait
