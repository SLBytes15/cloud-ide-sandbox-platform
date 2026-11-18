#!/usr/bin/env bash

# ========================================================
# Zaalima Cloud IDE - Developer Setup Verification Script
# ========================================================

set -e

echo "🔍 Running Zaalima Cloud IDE Setup Verification..."
echo "----------------------------------------------------"

# 1. Check Node.js
if command -v node >/dev/null 2>&1; then
  NODE_VER=$(node -v)
  echo "✅ Node.js installed: $NODE_VER"
else
  echo "❌ Node.js is NOT installed. Required: >= v20.0.0"
  exit 1
fi

# 2. Check npm
if command -v npm >/dev/null 2>&1; then
  NPM_VER=$(npm -v)
  echo "✅ npm installed: $NPM_VER"
else
  echo "❌ npm is NOT installed. Required: >= 10.0.0"
  exit 1
fi

# 3. Check MongoDB
if command -v mongod >/dev/null 2>&1; then
  MONGO_VER=$(mongod --version | head -n 1)
  echo "✅ MongoDB daemon installed: $MONGO_VER"
else
  echo "⚠️ MongoDB daemon (mongod) not found in PATH (Local or remote URI can still be used via MONGODB_URI in .env)"
fi

# 4. Check Docker (Future sandbox requirement)
if command -v docker >/dev/null 2>&1; then
  DOCKER_VER=$(docker --version)
  echo "ℹ️ Docker found: $DOCKER_VER (Reserved for future execution service)"
else
  echo "ℹ️ Docker is not installed or not in PATH (Not required for initial setup phase)"
fi

# 5. Check .env file
if [ -f .env ]; then
  echo "✅ .env file exists"
else
  echo "⚠️ .env file not found. Creating from .env.example..."
  cp .env.example .env
  echo "✅ Created .env from .env.example"
fi

echo "----------------------------------------------------"
echo "🎉 Prerequisite check complete! Run 'npm install' to initialize packages."
