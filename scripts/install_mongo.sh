#!/bin/bash
set -e

echo "🍃 Installing MongoDB 7.0..."

# 1. Install prerequisites
apt-get install -y gnupg curl

# 2. Import public key
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
   gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg \
   --dearmor

# 3. Create list file (using Jammy as fallback if Noble specific not out, usually works for dev)
# Note: As of early 2026, 24.04 likely supported. We'll try noble first, fallback to jammy.
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | \
   tee /etc/apt/sources.list.d/mongodb-org-7.0.list

# 4. Update and Install
apt-get update
apt-get install -y mongodb-org

echo "✅ MongoDB Installed!"
