#!/bin/bash

# Memory-optimized build script for RM Portal (Manager Panel)
# This prevents OOM errors on servers with limited RAM

set -e

echo "========================================="
echo "  Building RM Portal (Manager Panel)"
echo "========================================="

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
fi

# Set memory limit for Node.js (2GB)
export NODE_OPTIONS="--max-old-space-size=2048"

echo ""
echo "Building with memory optimization..."
echo "Node memory limit: 2048 MB"
echo ""

# Run Vite build
npm run build

echo ""
echo "========================================="
echo "  Build completed successfully!"
echo "  Output: dist/"
echo "========================================="
