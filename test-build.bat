@echo off
echo 🚀 Testing InstaTalk Build Process...

REM Step 1: Install frontend dependencies
echo 📦 Installing frontend dependencies...
npm install
if errorlevel 1 (
    echo ❌ Frontend dependency installation failed
    exit /b 1
)

REM Step 2: Build frontend
echo 🏗️ Building frontend...
npm run build
if errorlevel 1 (
    echo ❌ Frontend build failed
    exit /b 1
)

REM Step 3: Install server dependencies
echo 📦 Installing server dependencies...
cd server
npm install
if errorlevel 1 (
    echo ❌ Server dependency installation failed
    exit /b 1
)

cd ..

echo ✅ Build process completed successfully!
echo 📁 Frontend built to: dist/
echo 🚀 Ready for deployment!

REM Check if dist folder exists
if exist "dist" (
    echo ✅ Frontend build successful - dist/ folder created
    dir dist
) else (
    echo ❌ Frontend build failed - dist/ folder not found
    exit /b 1
)

pause