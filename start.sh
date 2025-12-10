#!/bin/bash

# Pluribus Swarm - Start Script
# Starts both frontend and backend servers

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

echo "🐝 Starting Pluribus Swarm..."

# Load environment variables
if [ -f "$SCRIPT_DIR/.env" ]; then
  export $(cat "$SCRIPT_DIR/.env" | grep -v '^#' | xargs)
fi

# Kill any existing processes on our ports
lsof -ti:3001 | xargs kill -9 2>/dev/null
lsof -ti:5173 | xargs kill -9 2>/dev/null

# Start backend server
echo "📡 Starting backend server..."
cd "$SCRIPT_DIR/server" && npm run dev &
BACKEND_PID=$!

# Wait for backend to be ready
sleep 3

# Start frontend
echo "🎨 Starting frontend..."
cd "$SCRIPT_DIR" && npm run dev &
FRONTEND_PID=$!

echo ""
echo "✨ Pluribus Swarm is running!"
echo "   Frontend: http://localhost:5173"
echo "   Backend:  http://localhost:3001"
echo ""
echo "Press Ctrl+C to stop both servers"

# Handle shutdown
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" SIGINT SIGTERM

# Wait for both processes
wait
