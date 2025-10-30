# 🚀 Deployment Guide - Real-Time Chat App

## 📋 Deployment Options

### 1. **Local Development Setup**
```bash
# Install dependencies
npm install
cd server && npm install

# Start development servers
npm run dev          # Client (port 5173)
cd server && npm start  # Server (port 3001)
```

### 2. **Production Deployment**

## 🌐 **Option A: Railway/Render (Recommended)**

### Railway Deployment
1. **Create Railway Account**: [railway.app](https://railway.app)
2. **Deploy Server**:
   ```bash
   # Connect your GitHub repo
   # Railway will auto-detect and deploy from /server
   ```
3. **Add Environment Variables**:
   ```
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/chatapp
   JWT_SECRET=your-super-secure-jwt-secret-here
   NODE_ENV=production
   PORT=8080
   CORS_ORIGINS=https://your-frontend-domain.com
   ```

### Render Deployment
1. **Create Render Account**: [render.com](https://render.com)
2. **Deploy Server** (Web Service):
   - Root Directory: `server`
   - Build Command: `npm install`
   - Start Command: `npm start`
3. **Deploy Client** (Static Site):
   - Root Directory: `.` (project root)
   - Build Command: `npm run build`
   - Publish Directory: `dist`

## 🌐 **Option B: Vercel + MongoDB Atlas**

### 1. Frontend (Vercel)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy frontend
vercel --prod
```

### 2. Backend (Vercel Serverless)
Create `vercel.json` in server directory:
```json
{
  "version": 2,
  "builds": [
    {
      "src": "index.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/index.js"
    }
  ]
}
```

## 🗄️ **Database Setup (MongoDB Atlas)**

### 1. Create MongoDB Atlas Account
1. Go to [mongodb.com/atlas](https://www.mongodb.com/atlas)
2. Create free cluster
3. Get connection string

### 2. Configure Database
```bash
# Replace in your .env file
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/chatapp
```

### 3. Setup Database User
1. Database Access → Add Database User
2. Network Access → Add IP Address (0.0.0.0/0 for all)

## 🌐 **Option C: DigitalOcean/AWS/Google Cloud**

### 1. Server Setup
```bash
# Ubuntu server commands
sudo apt update
sudo apt install nodejs npm nginx

# Clone your repository
git clone https://github.com/your-username/chat-app.git
cd chat-app

# Install dependencies
npm install
cd server && npm install

# Install PM2 for process management
npm install -g pm2

# Start server with PM2
pm2 start index.js --name "chat-server"
pm2 startup
pm2 save
```

### 2. Nginx Configuration
```nginx
# /etc/nginx/sites-available/chatapp
server {
    listen 80;
    server_name your-domain.com;

    # Frontend
    location / {
        root /var/www/chatapp/dist;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Socket.io
    location /socket.io/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 3. SSL Certificate (Let's Encrypt)
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

## 🔧 **Environment Variables for Production**

### Server (.env)
```bash
# Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/chatapp

# Server
PORT=3001
NODE_ENV=production

# Security
JWT_SECRET=your-super-secure-random-string-here
SESSION_SECRET=another-secure-random-string

# CORS (your frontend domains)
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

### Client Environment
Update Socket.io connection in `SocketContext.jsx`:
```javascript
const newSocket = io(process.env.NODE_ENV === 'production' 
  ? 'https://your-backend-domain.com' 
  : 'http://localhost:3001'
);
```

## 📦 **Build Process**

### 1. Client Build
```bash
# Build for production
npm run build

# Test production build locally
npm run preview
```

### 2. Server Preparation
```bash
cd server
npm install --production
```

## 🚀 **Quick Deploy Scripts**

### deploy.sh (Linux/Mac)
```bash
#!/bin/bash
echo "🚀 Deploying Chat App..."

# Build client
echo "📦 Building client..."
npm run build

# Install server dependencies
echo "📦 Installing server dependencies..."
cd server
npm install --production

# Start server
echo "🔄 Starting server..."
pm2 restart chat-server || pm2 start index.js --name "chat-server"

echo "✅ Deployment complete!"
```

### deploy.bat (Windows)
```batch
@echo off
echo 🚀 Deploying Chat App...

echo 📦 Building client...
call npm run build

echo 📦 Installing server dependencies...
cd server
call npm install --production

echo 🔄 Starting server...
call pm2 restart chat-server

echo ✅ Deployment complete!
```

## 📊 **Monitoring & Maintenance**

### 1. Server Monitoring
```bash
# PM2 monitoring
pm2 status
pm2 logs chat-server
pm2 monit

# System monitoring
htop
df -h
```

### 2. Database Monitoring
- MongoDB Atlas dashboard
- Monitor connection count
- Check storage usage

### 3. Backup Strategy
```bash
# Database backup
mongodump --uri="mongodb+srv://..." --out=backup/

# Code backup
git push origin main
```

## 🔒 **Security Checklist**

- [ ] Environment variables secured
- [ ] HTTPS enabled (SSL certificate)
- [ ] Database user has minimal permissions
- [ ] CORS properly configured
- [ ] Rate limiting implemented
- [ ] Input validation on all endpoints
- [ ] Regular security updates

## 🐛 **Troubleshooting**

### Common Issues

1. **CORS Errors**
   - Check CORS_ORIGINS environment variable
   - Verify frontend domain matches

2. **Database Connection Failed**
   - Check MongoDB Atlas IP whitelist
   - Verify connection string format
   - Test database credentials

3. **Socket.io Connection Issues**
   - Check firewall settings
   - Verify WebSocket support
   - Test with different transport methods

4. **Build Failures**
   - Clear node_modules and reinstall
   - Check Node.js version compatibility
   - Verify all dependencies are installed

## 📈 **Performance Optimization**

### 1. Client Optimizations
- Code splitting
- Lazy loading components
- Optimize bundle size
- Enable gzip compression

### 2. Server Optimizations
- Database indexing
- Connection pooling
- Caching strategies
- Load balancing

### 3. Database Optimizations
- Proper indexing on queries
- Message archiving strategy
- Connection optimization
- Query optimization

---

## 🎯 **Quick Start for Production**

1. **Setup MongoDB Atlas** (5 minutes)
2. **Deploy to Railway/Render** (10 minutes)
3. **Configure environment variables** (5 minutes)
4. **Test deployment** (5 minutes)

**Total deployment time: ~25 minutes** ⚡

Your chat app will be live and ready for users! 🎉