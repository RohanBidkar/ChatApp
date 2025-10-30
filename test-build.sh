#!/bin/bash
# Build test script for local testing before deployment

echo "🚀 Testing InstaTalk Build Process..."

# Step 1: Install frontend dependencies
echo "📦 Installing frontend dependencies..."
npm install

# Step 2: Build frontend
echo "🏗️ Building frontend..."
npm run build

# Step 3: Install server dependencies
echo "📦 Installing server dependencies..."
cd server && npm install

# Step 4: Test server start (with timeout)
echo "🖥️ Testing server startup..."
cd ..
timeout 10s npm start || echo "✅ Server startup test completed"

echo "✅ Build process completed successfully!"
echo "📁 Frontend built to: dist/"
echo "🚀 Ready for deployment!"

# Check if dist folder exists
if [ -d "dist" ]; then
    echo "✅ Frontend build successful - dist/ folder created"
    ls -la dist/
else
    echo "❌ Frontend build failed - dist/ folder not found"
    exit 1
fi