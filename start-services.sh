#!/bin/bash

echo "🚀 Starting Squdy Burn-to-Win Platform..."

# Kill any existing processes
echo "🧹 Cleaning up existing processes..."
pkill -f "node dist/index.js" 2>/dev/null
pkill -f "vite" 2>/dev/null
pkill -f "nodemon" 2>/dev/null

sleep 2

# Start backend
echo "🔧 Starting backend..."
cd backend
npm run build
node dist/index.js &
BACKEND_PID=$!
cd ..

sleep 3

# Test backend
echo "🧪 Testing backend..."
if curl -s http://localhost:3001/health > /dev/null; then
    echo "✅ Backend is running on http://localhost:3001"
else
    echo "❌ Backend failed to start"
    exit 1
fi

# Start frontend
echo "🎨 Starting frontend..."
npm run dev &
FRONTEND_PID=$!

sleep 5

# Test frontend
echo "🧪 Testing frontend..."
if curl -s http://localhost:8080 > /dev/null; then
    echo "✅ Frontend is running on http://localhost:8080"
else
    echo "❌ Frontend failed to start"
    exit 1
fi

echo ""
echo "🎉 Both services are running!"
echo "📱 Frontend: http://localhost:8080"
echo "🔧 Backend: http://localhost:3001"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for interrupt
trap "echo '🛑 Stopping services...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT
wait 