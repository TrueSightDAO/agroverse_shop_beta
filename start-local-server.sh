#!/bin/bash
# Quick local server startup script for Agroverse Shop
# This script provides multiple options for running a local server

echo "🌱 Agroverse Shop - Local Development Server"
echo "=============================================="
echo ""

# Check if Node.js is installed
if command -v node &> /dev/null; then
    echo "✅ Node.js found"
    
    # Check if http-server is installed
    if command -v http-server &> /dev/null || [ -d "node_modules/http-server" ]; then
        echo "✅ http-server found"
        echo ""
        echo "Starting server on http://127.0.0.1:8000"
        echo "Press Ctrl+C to stop"
        echo ""
        
        if [ -d "node_modules/http-server" ]; then
            npx http-server -p 8000 -a 127.0.0.1 -c-1
        else
            http-server -p 8000 -a 127.0.0.1 -c-1
        fi
        exit 0
    else
        echo "⚠️  http-server not found. Installing..."
        npm install
        echo ""
        echo "Starting server on http://127.0.0.1:8000"
        echo "Press Ctrl+C to stop"
        echo ""
        npx http-server -p 8000 -a 127.0.0.1 -c-1
        exit 0
    fi
fi

# Check if Python 3 is installed
if command -v python3 &> /dev/null; then
    echo "✅ Python 3 found"
    echo ""
    echo "Starting server on http://127.0.0.1:8000"
    echo "Press Ctrl+C to stop"
    echo ""
    python3 -m http.server 8000 --bind 127.0.0.1
    exit 0
fi

# Check if Python 2 is installed
if command -v python &> /dev/null; then
    echo "✅ Python 2 found"
    echo ""
    echo "Starting server on http://127.0.0.1:8000"
    echo "Press Ctrl+C to stop"
    echo ""
    python -m SimpleHTTPServer 8000
    exit 0
fi

echo "❌ No suitable server found!"
echo ""
echo "Please install one of the following:"
echo "  - Node.js: https://nodejs.org/"
echo "  - Python 3: https://www.python.org/"
echo ""
echo "Or manually run:"
echo "  npm install && npm run dev"
echo "  OR"
echo "  python3 -m http.server 8000 --bind 127.0.0.1"
exit 1


