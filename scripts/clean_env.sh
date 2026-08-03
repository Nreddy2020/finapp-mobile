#!/bin/bash
set -e

echo "🧹 Cleaning Fintech Application Environment..."

# Clean Backend
echo "  - Removing Backend Virtual Environment..."
rm -rf backend/venv
rm -rf backend/.venv

echo "  - Removing __pycache__..."
find . -type d -name "__pycache__" -exec rm -rf {} +

# Clean Frontend
echo "  - Removing Node Modules..."
rm -rf node_modules
rm -rf package-lock.json
# Note: Usually kept lockfile, but user requested 'fresh' installation.

echo "  - Removing Expo Cache..."
rm -rf .expo

echo "✅ Environment Cleaned Successfully!"
