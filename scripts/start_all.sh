#!/bin/bash
set -e

echo "🚀 Starting Fintech Application Stack..."

# 1. Start MongoDB (Check if running, if not start)
# Note: In WSL, systemd might not be available. We try standard service or mongod directly.
if pgrep -x "mongod" > /dev/null
then
    echo "✅ MongoDB is already running."
else
    echo "🔹 Starting MongoDB..."
    # Attempt to start service (requires sudo usually, but assumes user handles permissions or running manually)
    # If this is purely local dev in WSL, we might need to rely on the user having started it, 
    # or try to start it as background process if dbpath exists.
    # For safety in this script, we'll assume standard service command or warn.
    if command -v mongod >/dev/null; then
         echo "🔹 Starting MongoDB (User Mode)..."
         mkdir -p $HOME/data/db
         nohup mongod --dbpath $HOME/data/db --logpath $HOME/mongod.log --bind_ip 127.0.0.1 >/dev/null 2>&1 &
         echo "   ✅ MongoDB started."
    else
         echo "⚠️  'mongod' command not found. Please ensure Mongod is installed."
    fi
fi

# 2. Start Backend
echo "🔹 Starting Backend (Uvicorn)..."
cd backend
source venv/bin/activate
# Run in background, log to file
nohup python3 -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload > ../backend.log 2>&1 &
BACKEND_PID=$!
echo "   PID: $BACKEND_PID (Logs: backend.log)"
cd ..

# 3. Start Frontend
echo "🔹 Starting Frontend (Expo)..."
# We want to see frontend output, so we run it in foreground or verify it starts.
# For "start everything", we usually put existing processes in bg.
nohup npx expo start --port 8081 --tunnel > frontend.log 2>&1 &
FRONTEND_PID=$!
echo "   PID: $FRONTEND_PID (Logs: frontend.log)"

echo "✅ All Services Started!"
echo "   Backend: http://localhost:8000"
echo "   Frontend: http://localhost:8081"
echo "   (Use 'pkill -f uvicorn' and 'pkill -f expo' to stop)"
