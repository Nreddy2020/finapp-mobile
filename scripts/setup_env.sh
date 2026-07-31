#!/bin/bash
set -e

echo "🛠️  Setting up Fintech Application Environment..."

# Backend Setup
echo "🔹 Setting up Backend..."
cd backend

if [ ! -d "venv" ]; then
    echo "  - Creating Python Virtual Environment..."
    python3 -m venv venv
fi

echo "  - Activating Virtual Environment..."
source venv/bin/activate

echo "  - Upgrading pip..."
pip install --upgrade pip

echo "  - Installing Python Requirements..."
pip install -r requirements.txt

# Verify installation of key packages
if pip show slowapi > /dev/null; then
    echo "    ✅ slowapi installed"
else
    echo "    ❌ Failed to install slowapi"
    exit 1
fi

cd ..

# Frontend Setup
echo "🔹 Setting up Frontend..."
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found in root!"
    exit 1
fi

echo "  - Installing Node Dependencies..."
npm install --legacy-peer-deps

echo "✅ Environment Setup Complete!"
echo "👉 Run './scripts/start_all.sh' to start the application."
