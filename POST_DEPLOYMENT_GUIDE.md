# 🚀 POST DEPLOYMENT - COMPLETE NEXT STEPS

> **Your backend is deployed! Now let's make it production-ready**

---

## 📋 Table of Contents

1. [Step 1: Frontend Deployment](#step-1-frontend-deployment)
2. [Step 2: Connect Frontend to Backend](#step-2-connect-frontend-to-backend)
3. [Step 3: Setup Custom Domain](#step-3-setup-custom-domain)
4. [Step 4: Setup HTTPS/SSL](#step-4-setup-httpsssl)
5. [Step 5: Setup Nginx Reverse Proxy](#step-5-setup-nginx-reverse-proxy)
6. [Step 6: Monitoring & Logging](#step-6-monitoring--logging)
7. [Step 7: Backup & Recovery](#step-7-backup--recovery)
8. [Step 8: CI/CD Pipeline](#step-8-cicd-pipeline)
9. [Step 9: Auto-Scaling](#step-9-auto-scaling)
10. [Step 10: Performance Optimization](#step-10-performance-optimization)

---

# ✅ STEP 1: FRONTEND DEPLOYMENT

## 1.1: Build Frontend for Production

```bash
# On your LOCAL machine, in phyo_client directory
cd c:/full\ stack\ phyo/phyo_client

# Build the Next.js app for production
npm run build

# Expected output:
# - info  - Creating an optimized production build...
# - info  - Compiled successfully
# - info  - Linting source files...
# - info  - Collecting page data...
# - info  - Generating static pages...
# - info  - Finalizing page optimization...
# - Route (pages)    Size     First Load JS
# / (SSG)            45 kB           120 kB
```

✅ **Build successful!**

---

## 1.2: Test Production Build Locally

```bash
# Start production server locally
npm run start

# Expected output:
# - ready - started server on 0.0.0.0:3000, url: http://localhost:3000

# Visit: http://localhost:3000
# Should see your full frontend (production version)
```

✅ **Production build works!**

---

## 1.3: Create Docker Image for Frontend

```bash
# Create Dockerfile for frontend
cat > Dockerfile.frontend << 'EOF'
# Build stage
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Runtime stage
FROM node:18-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --only=production
COPY --from=builder /app/.next ./.next
COPY public ./public
EXPOSE 3000
CMD ["npm", "start"]
EOF

# Build frontend image
docker build -f Dockerfile.frontend -t phyo-client:latest .

# Tag with Docker Hub username
docker tag phyo-client:latest YOUR_DOCKER_USERNAME/phyo-client:latest

# Push to Docker Hub
docker push YOUR_DOCKER_USERNAME/phyo-client:latest
```

✅ **Frontend image on Docker Hub!**

---

## 1.4: Create Frontend EC2 Instance

```bash
# Create separate EC2 instance for frontend
# Same as backend setup:
# - AMI: Amazon Linux 2
# - Type: t3.micro
# - Storage: 20GB
# - Security Group: Allow port 80, 443, 3000

# Get PUBLIC IP for frontend
# Example: 13.235.144.218
```

✅ **Frontend EC2 instance created!**

---

## 1.5: Deploy Frontend on EC2

```bash
# SSH into FRONTEND EC2 instance
ssh -i key.pem ec2-user@FRONTEND_EC2_IP

# Install Docker
sudo yum update -y
sudo yum install docker -y
sudo systemctl start docker
sudo usermod -aG docker ec2-user
exit

# Login again and deploy
ssh -i key.pem ec2-user@FRONTEND_EC2_IP

# Pull and run frontend container
docker pull YOUR_DOCKER_USERNAME/phyo-client:latest

docker run -d \
  --name phyo-client \
  -p 3000:3000 \
  -e NEXT_PUBLIC_API_URL=http://BACKEND_EC2_IP:4000/api \
  --restart unless-stopped \
  YOUR_DOCKER_USERNAME/phyo-client:latest

# Verify
docker ps | grep phyo-client
curl http://localhost:3000
```

✅ **Frontend deployed!**

---

# 🔗 STEP 2: CONNECT FRONTEND TO BACKEND

## 2.1: Update Frontend Environment Variables

```bash
# On FRONTEND EC2, update environment
docker exec phyo-client env | grep NEXT_PUBLIC_API_URL

# Should show: NEXT_PUBLIC_API_URL=http://13.235.144.217:4000/api

# If wrong, stop and restart with correct URL:
docker stop phyo-client
docker rm phyo-client

docker run -d \
  --name phyo-client \
  -p 3000:3000 \
  -e NEXT_PUBLIC_API_URL=http://BACKEND_EC2_IP:4000/api \
  --restart unless-stopped \
  YOUR_DOCKER_USERNAME/phyo-client:latest
```

✅ **Frontend → Backend connected!**

---

## 2.2: Test Full Stack Connection

```bash
# From LOCAL machine:
# 1. Visit frontend
curl http://FRONTEND_EC2_IP:3000

# 2. Frontend should load
# 3. Try to login
# 4. Should connect to backend at http://BACKEND_EC2_IP:4000

# 3. Check browser console (F12) for any errors
```

✅ **Full stack working!**

---

# 🌐 STEP 3: SETUP CUSTOM DOMAIN

## 3.1: Register Domain

```bash
# If not done yet:
# 1. Go to https://route53.aws.amazon.com (AWS Route 53)
# 2. Or use GoDaddy, Namecheap, etc.
# 3. Register domain: phyo.ai

# Keep DNS nameservers ready
```

✅ **Domain registered!**

---

## 3.2: Setup Route 53 (AWS DNS)

```bash
# In AWS Console:
# 1. Go to Route 53 → Hosted Zones
# 2. Create hosted zone for: phyo.ai
# 3. Note the nameservers provided
# 4. Update domain registrar with these nameservers
```

---

## 3.3: Create DNS Records

```bash
# In Route 53, create A records:

# Frontend
# Name: phyo.ai (or www.phyo.ai)
# Type: A
# Value: FRONTEND_EC2_IP (13.235.144.218)
# TTL: 300

# Backend API
# Name: api.phyo.ai
# Type: A
# Value: BACKEND_EC2_IP (13.235.144.217)
# TTL: 300
```

✅ **DNS configured!**

---

## 3.4: Test Domain Access

```bash
# Wait 5-10 minutes for DNS propagation

# Test frontend
curl http://phyo.ai

# Test backend
curl http://api.phyo.ai:4000

# Visit in browser
# Frontend: https://phyo.ai
# Backend: https://api.phyo.ai:4000
```

✅ **Domain working!**

---

# 🔒 STEP 4: SETUP HTTPS/SSL

## 4.1: Install Certbot (Backend)

```bash
# SSH into BACKEND EC2
ssh -i key.pem ec2-user@BACKEND_EC2_IP

# Install Certbot
sudo yum install certbot -y

# Create certificate for api.phyo.ai
# (This requires your domain to be working)
sudo certbot certonly --standalone -d api.phyo.ai

# Expected output:
# - Congratulations! Your certificate is saved at:
#   /etc/letsencrypt/live/api.phyo.ai/fullchain.pem
```

✅ **SSL certificate created!**

---

## 4.2: Setup Nginx Reverse Proxy (Backend)

```bash
# Install Nginx
sudo yum install nginx -y

# Create Nginx config
sudo nano /etc/nginx/conf.d/phyo-api.conf

# Paste this:
upstream phyo_backend {
    server localhost:4000;
}

server {
    listen 80;
    server_name api.phyo.ai;

    # Redirect HTTP to HTTPS
    location / {
        return 301 https://$server_name$request_uri;
    }
}

server {
    listen 443 ssl http2;
    server_name api.phyo.ai;

    ssl_certificate /etc/letsencrypt/live/api.phyo.ai/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.phyo.ai/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    location / {
        proxy_pass http://phyo_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket support
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}

# Save: Ctrl+X, Y, Enter

# Start Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Test configuration
sudo nginx -t
# Expected: nginx: configuration file test is successful
```

✅ **Nginx reverse proxy configured!**

---

## 4.3: Update Backend CORS

```bash
# SSH into backend EC2 and edit environment
# Update CORS in Docker container

# Add to your .env (on backend EC2):
ALLOWED_ORIGINS=https://phyo.ai,https://www.phyo.ai,https://api.phyo.ai

# Restart container
docker restart phyo-server
```

✅ **CORS updated!**

---

## 4.4: Setup Certbot Auto-Renewal

```bash
# On backend EC2:
# Setup automatic certificate renewal
sudo systemctl enable certbot-renew.timer

# Test renewal
sudo certbot renew --dry-run
```

✅ **SSL auto-renewal configured!**

---

# 🏗️ STEP 5: SETUP NGINX REVERSE PROXY

## 5.1: Nginx for Frontend (Optional)

```bash
# SSH into FRONTEND EC2
ssh -i key.pem ec2-user@FRONTEND_EC2_IP

# Install Nginx
sudo yum install nginx -y

# Create config
sudo nano /etc/nginx/conf.d/phyo-app.conf

# Paste:
upstream phyo_frontend {
    server localhost:3000;
}

server {
    listen 80;
    server_name phyo.ai www.phyo.ai;

    location / {
        return 301 https://$server_name$request_uri;
    }
}

server {
    listen 443 ssl http2;
    server_name phyo.ai www.phyo.ai;

    ssl_certificate /etc/letsencrypt/live/phyo.ai/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/phyo.ai/privkey.pem;

    location / {
        proxy_pass http://phyo_frontend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}

# Start Nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

✅ **Frontend Nginx configured!**

---

# 📊 STEP 6: MONITORING & LOGGING

## 6.1: Setup CloudWatch (AWS Monitoring)

```bash
# In AWS Console:
# 1. Go to CloudWatch
# 2. Create custom dashboard
# 3. Add metrics:
#    - EC2 CPU Utilization
#    - EC2 Network In/Out
#    - Container Logs

# Or use native Docker monitoring:
docker stats phyo-server phyo-client
```

---

## 6.2: Setup Log Rotation

```bash
# On EC2, logs are stored by Docker
# View logs:
docker logs phyo-server --tail 100

# Follow logs:
docker logs -f phyo-server

# Logs are automatically rotated (max 10MB per file, 3 files)
```

---

## 6.3: Setup Alerts

```bash
# AWS CloudWatch Alarms:
# 1. Go to CloudWatch → Alarms
# 2. Create alarm for high CPU (> 80%)
# 3. Create alarm for high memory
# 4. Set SNS notification (email alert)

# Or use external services:
# - Datadog
# - New Relic
# - Sentry (for error tracking)
```

---

# 💾 STEP 7: BACKUP & RECOVERY

## 7.1: Backup MongoDB

```bash
# Backup MongoDB Atlas data:
# 1. Go to MongoDB Atlas
# 2. Cluster → Backup
# 3. Create on-demand backup
# 4. Or enable automated backups (daily)
```

---

## 7.2: Backup Environment Variables

```bash
# On EC2, backup .env file
cp ~/.env ~/env.backup.$(date +%Y%m%d)

# Or download to local machine
scp -i key.pem ec2-user@IP:~/.env ~/phyo-env-backup
```

---

## 7.3: Create EC2 Snapshots

```bash
# In AWS Console:
# 1. Go to EC2 → Instances
# 2. Right-click instance
# 3. Image and templates → Create image
# 4. Save as AMI (Amazon Machine Image)
# 5. Can launch new instances from this AMI later
```

---

## 7.4: Docker Image Backups

```bash
# Backup Docker images locally
docker save YOUR_USERNAME/phyo-server:latest -o phyo-server-backup.tar
docker save YOUR_USERNAME/phyo-client:latest -o phyo-client-backup.tar

# Restore from backup
docker load -i phyo-server-backup.tar
docker load -i phyo-client-backup.tar
```

---

# 🔄 STEP 8: CI/CD PIPELINE

## 8.1: GitHub Actions Setup

```yaml
# Create file: .github/workflows/deploy.yml

name: Deploy to EC2

on:
  push:
    branches: [main]

env:
  DOCKER_USERNAME: ${{ secrets.DOCKER_USERNAME }}
  EC2_HOST: ${{ secrets.EC2_HOST }}
  EC2_USER: ec2-user
  EC2_KEY: ${{ secrets.EC2_KEY }}

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Build Docker Image
        run: docker build -t phyo-server:latest .

      - name: Login to Docker Hub
        uses: docker/login-action@v2
        with:
          username: ${{ secrets.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_PASSWORD }}

      - name: Push to Docker Hub
        run: |
          docker tag phyo-server:latest $DOCKER_USERNAME/phyo-server:latest
          docker push $DOCKER_USERNAME/phyo-server:latest

      - name: Deploy to EC2
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.EC2_HOST }}
          username: ec2-user
          key: ${{ secrets.EC2_KEY }}
          script: |
            docker pull $DOCKER_USERNAME/phyo-server:latest
            docker stop phyo-server || true
            docker rm phyo-server || true
            docker run -d \
              --name phyo-server \
              -p 4000:4000 \
              --env-file ~/.env \
              --restart unless-stopped \
              $DOCKER_USERNAME/phyo-server:latest
```

✅ **Push code → Automatically deploys to EC2!**

---

## 8.2: Add GitHub Secrets

```bash
# In GitHub repo settings, add secrets:
# DOCKER_USERNAME = your-docker-username
# DOCKER_PASSWORD = your-docker-password
# EC2_HOST = 13.235.144.217
# EC2_KEY = (paste your .pem file content)
```

---

# 📈 STEP 9: AUTO-SCALING

## 9.1: Setup Load Balancer

```bash
# In AWS Console:
# 1. Go to EC2 → Load Balancers
# 2. Create Application Load Balancer
# 3. Set listeners:
#    - Port 80 → Forward to backend (4000)
#    - Port 443 → Forward to backend (4000)
# 4. Add target group with backend EC2 instance
```

---

## 9.2: Setup Auto Scaling Group

```bash
# In AWS Console:
# 1. Go to EC2 → Auto Scaling Groups
# 2. Create Auto Scaling Group
# 3. Set launch template (use your AMI)
# 4. Min instances: 1
# 5. Max instances: 3
# 6. Desired capacity: 1
# 7. Add scaling policies:
#    - Scale up if CPU > 70%
#    - Scale down if CPU < 30%
```

---

## 9.3: Monitor Scaling

```bash
# View auto-scaling activity
# AWS Console → Auto Scaling Groups → Activity

# Monitor instances
docker ps  # On each instance

# Check load distribution
# AWS → Load Balancers → Target Health
```

---

# ⚡ STEP 10: PERFORMANCE OPTIMIZATION

## 10.1: Enable Caching

```bash
# Add to Nginx config:
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=api_cache:10m;

location / {
    proxy_cache api_cache;
    proxy_cache_valid 200 10m;
    proxy_cache_key "$scheme$request_method$host$request_uri";
    add_header X-Cache-Status $upstream_cache_status;

    proxy_pass http://phyo_backend;
}
```

---

## 10.2: Enable Compression

```bash
# Add to Nginx config:
gzip on;
gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss;
gzip_min_length 1000;
```

---

## 10.3: Optimize Database Queries

```bash
# On backend, use indexes
# MongoDB - add indexes for frequently queried fields
db.users.createIndex({ email: 1 });
db.campaigns.createIndex({ brand_id: 1 });
db.applications.createIndex({ campaign_id: 1 });
```

---

## 10.4: Setup CDN (Cloudfront)

```bash
# In AWS Console:
# 1. Go to CloudFront
# 2. Create distribution
# 3. Origin: Your Nginx server
# 4. Cache behaviors
# 5. Enable compression
# 6. Get CloudFront domain
# 7. Update Route 53 CNAME to CloudFront domain
```

---

## 10.5: Monitor Performance

```bash
# Tools:
# 1. New Relic - Application performance
# 2. Datadog - Infrastructure monitoring
# 3. Sentry - Error tracking
# 4. Google Lighthouse - Frontend performance

# Use curl to test response time:
curl -w "@curl-format.txt" -o /dev/null -s https://api.phyo.ai:4000/

# Where curl-format.txt contains:
# time_connect:  %{time_connect}n
# time_total:    %{time_total}n
```

---

# 📋 COMPLETE CHECKLIST

## Phase 1: Deployment
- [ ] Backend Docker image built and pushed
- [ ] Frontend Docker image built and pushed
- [ ] Backend running on EC2
- [ ] Frontend running on EC2
- [ ] Both accessible via IP addresses

## Phase 2: Domain & SSL
- [ ] Domain registered (phyo.ai)
- [ ] Route 53 configured
- [ ] A records created (frontend, backend)
- [ ] SSL certificates obtained (Let's Encrypt)
- [ ] HTTPS working on both apps

## Phase 3: Infrastructure
- [ ] Nginx reverse proxy configured
- [ ] CORS updated
- [ ] Security groups properly configured
- [ ] Backup strategy implemented
- [ ] Auto-renewal for SSL certificates

## Phase 4: Monitoring & Scaling
- [ ] CloudWatch dashboards created
- [ ] Alerts configured (CPU, Memory)
- [ ] Logging enabled and rotating
- [ ] Load balancer configured
- [ ] Auto-scaling group created

## Phase 5: Optimization
- [ ] Caching implemented
- [ ] Compression enabled
- [ ] Database indexes created
- [ ] CDN configured
- [ ] Performance monitoring tools installed

---

# 🎯 FINAL ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────┐
│                    Users (Internet)                         │
└────────────────────────┬────────────────────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
    ┌────▼──┐       ┌───▼────┐    ┌────▼──┐
    │ Route │       │CloudFront    │ Route │
    │  53   │       │  (CDN)       │  53   │
    └────┬──┘       └───┬────┘    └────┬──┘
         │               │             │
         │         ┌─────▼─────┐      │
         │         │   Cache   │      │
         │         └─────┬─────┘      │
         │               │             │
    ┌────▼──────┐   ┌───▼─────┐   ┌──▼────────┐
    │ Frontend   │   │  Nginx  │   │ Backend   │
    │ (phyo.ai)  │   │(Reverse │   │(api.phyo  │
    │            │   │ Proxy)  │   │.ai)       │
    │ 3000       │   │         │   │ 4000      │
    └────┬──────┘   └───┬─────┘   └──┬────────┘
         │               │            │
    ┌────▼──────┐   ┌───▼─────┐   ┌──▼────────┐
    │ Next.js    │   │Docker   │   │Docker     │
    │Container   │   │Container│   │Container  │
    └────┬──────┘   └───┬─────┘   └──┬────────┘
         │               │            │
    ┌────▼──────────────▼────────────▼──┐
    │     EC2 Instances (Auto-scaled)   │
    └─────────────────────────────────┬─┘
              │
         ┌────▼──────┐
         │ MongoDB   │
         │  Atlas    │
         │(Database) │
         └───────────┘
```

---

# 🚀 NEXT STEPS SUMMARY

1. ✅ **Deploy Frontend** - Build and push frontend Docker image
2. ✅ **Connect Apps** - Update env variables to connect frontend & backend
3. ✅ **Custom Domain** - Register domain and setup Route 53
4. ✅ **HTTPS/SSL** - Get certificates and configure Nginx
5. ✅ **Monitoring** - Setup CloudWatch and alerts
6. ✅ **Backup** - Create backup strategy
7. ✅ **CI/CD** - Setup GitHub Actions for auto-deployment
8. ✅ **Scaling** - Configure load balancer and auto-scaling
9. ✅ **Performance** - Optimize caching, compression, CDN
10. ✅ **Maintenance** - Regular monitoring and updates

---

**Your app is now production-ready! 🎉**

Questions? Check the detailed deployment guides or Docker documentation.
