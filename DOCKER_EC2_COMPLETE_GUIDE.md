# 🐳 Complete Docker & EC2 Deployment Guide for Phyo Server

**Last Updated**: March 2026
**Status**: Production Ready

---

## Table of Contents

1. [Quick Start (5 minutes)](#quick-start)
2. [Prerequisites](#prerequisites)
3. [Local Docker Setup](#local-docker-setup)
4. [EC2 Deployment](#ec2-deployment)
5. [Monitoring & Maintenance](#monitoring--maintenance)
6. [Troubleshooting](#troubleshooting)
7. [Advanced Setup](#advanced-setup)

---

## Quick Start

### For Experienced Developers (5 minutes)

```bash
# Local: Build and push
cd phyo_server
docker build -t phyo-server .
docker tag phyo-server YOUR_USERNAME/phyo-server:latest
docker push YOUR_USERNAME/phyo-server:latest

# EC2: Deploy
ssh -i key.pem ec2-user@IP
nano ~/.env  # Paste environment variables
docker pull YOUR_USERNAME/phyo-server:latest
docker run -d --name phyo-server -p 4000:4000 --env-file ~/.env --restart unless-stopped YOUR_USERNAME/phyo-server:latest
```

### For New Users
→ Follow the step-by-step guide below

---

## Prerequisites

### AWS Account Setup
- [ ] EC2 instance running (Amazon Linux 2, t3.micro or larger)
- [ ] Security group allows:
  - Inbound: Port 4000 from your IP
  - Outbound: All traffic
- [ ] Key pair (.pem file) downloaded and secured
- [ ] Public IP assigned

### Local Machine
- [ ] Docker installed ([download here](https://docs.docker.com/get-docker/))
- [ ] Git installed
- [ ] Docker Hub account ([create here](https://hub.docker.com))

### Environment Variables
- [ ] `.env` file created with all required keys
- [ ] MongoDB URI (Atlas or self-hosted)
- [ ] API keys (OpenAI, Anthropic, etc.)
- [ ] AWS credentials
- [ ] JWT secret

---

## Local Docker Setup

### 1. Build Docker Image

```bash
cd c:/full\ stack\ phyo/phyo_server

# Build image
docker build -t phyo-server:latest .

# Verify build
docker images | grep phyo-server
```

**Output:**
```
REPOSITORY        TAG       IMAGE ID       SIZE
phyo-server       latest    abc123def456   250MB
```

### 2. Test Locally

```bash
# Run container
docker run -d \
  --name phyo-server-test \
  -p 4000:4000 \
  --env-file .env \
  phyo-server:latest

# Wait 3 seconds for startup
sleep 3

# Check logs
docker logs phyo-server-test

# Test endpoint
curl http://localhost:4000

# Stop container
docker stop phyo-server-test
docker rm phyo-server-test
```

### 3. Using Docker Compose (Recommended)

```bash
# Start services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### 4. Push to Docker Hub

```bash
# Login
docker login

# Tag image with your username
docker tag phyo-server:latest YOUR_USERNAME/phyo-server:latest

# Push
docker push YOUR_USERNAME/phyo-server:latest

# Verify
docker pull YOUR_USERNAME/phyo-server:latest
```

---

## EC2 Deployment

### Step 1: Create Environment File

**Local machine:**
```bash
# Get your .env contents
cat phyo_server/.env
```

**SSH into EC2:**
```bash
ssh -i /path/to/key.pem ec2-user@YOUR_EC2_IP

# Create .env file
cat > ~/.env << 'EOF'
PORT=4000
MONGO_URI=mongodb+srv://...
OPENAI_API_KEY=sk-proj-...
JWT_SECRET=your_secret
... (rest of env vars)
EOF

# Verify file was created
cat ~/.env
```

### Step 2: Install Docker

```bash
# Update system
sudo yum update -y

# Install Docker
sudo yum install docker -y

# Start Docker
sudo systemctl start docker
sudo systemctl enable docker

# Verify installation
docker --version
```

### Step 3: Add User to Docker Group

```bash
# Add ec2-user to docker group
sudo usermod -aG docker ec2-user

# Log out and back in
exit

# SSH back in
ssh -i key.pem ec2-user@IP

# Verify group membership
groups ec2-user
# Should show: ec2-user : ec2-user docker
```

### Step 4: Deploy Container

```bash
# Pull image
docker pull YOUR_USERNAME/phyo-server:latest

# Run container
docker run -d \
  --name phyo-server \
  -p 4000:4000 \
  --env-file ~/.env \
  --restart unless-stopped \
  --log-driver json-file \
  --log-opt max-size=10m \
  --log-opt max-file=3 \
  YOUR_USERNAME/phyo-server:latest

# Verify
docker ps
docker logs phyo-server
```

### Step 5: Enable in Security Group

1. Go to AWS Console → EC2 → Security Groups
2. Find your EC2 instance's security group
3. Edit inbound rules:
   - Type: Custom TCP
   - Port: 4000
   - Source: Your IP (or 0.0.0.0/0 for testing)
4. Save rules

### Step 6: Test Connection

```bash
# From your local machine
curl http://YOUR_EC2_IP:4000

# Should respond with server info
```

---

## Monitoring & Maintenance

### View Logs

```bash
# Real-time logs
docker logs -f phyo-server

# Last 100 lines
docker logs --tail 100 phyo-server

# With timestamps
docker logs --timestamps phyo-server

# Specific time range
docker logs --since 1h phyo-server
```

### Container Management

```bash
# List containers
docker ps -a

# Container info
docker inspect phyo-server

# Resource usage
docker stats phyo-server

# Restart container
docker restart phyo-server

# Stop container
docker stop phyo-server

# Start container
docker start phyo-server
```

### System Checks

```bash
# Disk space
df -h

# Docker usage
docker system df

# System load
top

# Memory usage
free -h
```

### Backup Data

```bash
# Backup .env file
cp ~/.env ~/env.backup

# Backup logs
docker logs phyo-server > ~/phyo-logs-$(date +%Y%m%d).txt
```

---

## Troubleshooting

### Container Won't Start

```bash
# Check logs
docker logs phyo-server

# Inspect container
docker inspect phyo-server

# Check if port is in use
sudo netstat -tlnp | grep 4000

# Try rebuilding
docker stop phyo-server
docker rm phyo-server
docker pull YOUR_USERNAME/phyo-server:latest
docker run -d --name phyo-server -p 4000:4000 --env-file ~/.env --restart unless-stopped YOUR_USERNAME/phyo-server:latest
```

### MongoDB Connection Failed

```bash
# Verify MONGO_URI
grep MONGO_URI ~/.env

# Test connection from EC2
docker exec phyo-server ping -c 1 mongodb.net

# Check MongoDB Atlas whitelist
# 1. Go to MongoDB Atlas
# 2. Network Access → IP Whitelist
# 3. Add your EC2 public IP
```

### Port 4000 Not Accessible

```bash
# Check container is running
docker ps | grep phyo-server

# Check if container is listening
docker exec phyo-server netstat -tlnp | grep 4000

# Check security group allows port 4000
# AWS Console → EC2 → Security Groups

# Test with curl
curl http://localhost:4000

# Check firewall
sudo systemctl status firewalld
```

### Out of Memory

```bash
# Check memory usage
docker stats phyo-server

# Increase swap
sudo dd if=/dev/zero of=/swapfile bs=1G count=2
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Clean up
docker system prune -a
```

### High CPU Usage

```bash
# Monitor in real-time
docker stats phyo-server

# Check container processes
docker top phyo-server

# Check application logs for errors
docker logs phyo-server
```

---

## Advanced Setup

### 1. Docker Hub Automated Builds

```bash
# Option 1: GitHub Integration
# 1. Go to Docker Hub → Repositories → Build Settings
# 2. Connect GitHub repository
# 3. Set build rules to trigger on push

# Option 2: Webhook trigger
# When code is pushed to GitHub, automatically rebuild Docker image
```

### 2. Multi-Stage Docker Build

```dockerfile
# Stage 1: Build
FROM node:18-alpine AS builder
WORKDIR /build
COPY package*.json ./
RUN npm ci

# Stage 2: Runtime
FROM node:18-alpine
WORKDIR /app
COPY --from=builder /build/node_modules ./node_modules
COPY . .
EXPOSE 4000
CMD ["node", "index.js"]
```

### 3. Docker Networking

```bash
# Create custom network
docker network create phyo-network

# Run with network
docker run -d \
  --name phyo-server \
  --network phyo-network \
  -p 4000:4000 \
  --env-file ~/.env \
  YOUR_USERNAME/phyo-server:latest

# Multiple services can communicate
docker run -d \
  --name redis \
  --network phyo-network \
  redis:latest
```

### 4. Volume Management

```bash
# Create volume for logs
docker volume create phyo-logs

# Run with volume
docker run -d \
  --name phyo-server \
  -v phyo-logs:/app/logs \
  -p 4000:4000 \
  --env-file ~/.env \
  YOUR_USERNAME/phyo-server:latest

# Backup volume
docker run --rm -v phyo-logs:/logs -v $(pwd):/backup alpine tar czf /backup/logs-backup.tar.gz /logs
```

### 5. Nginx Reverse Proxy

```nginx
# /etc/nginx/sites-available/phyo.ai
upstream phyo_backend {
    server localhost:4000;
}

server {
    listen 80;
    server_name api.phyo.ai;

    location / {
        proxy_pass http://phyo_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

### 6. Health Check & Auto-restart

Already configured in Dockerfile:
```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:4000/', ...)"
```

---

## CI/CD Pipeline Example

### GitHub Actions Workflow

```yaml
name: Build and Deploy to EC2

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2

      - name: Build Docker Image
        run: docker build -t phyo-server:latest .

      - name: Login to Docker Hub
        uses: docker/login-action@v1
        with:
          username: ${{ secrets.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_PASSWORD }}

      - name: Push to Docker Hub
        run: |
          docker tag phyo-server:latest ${{ secrets.DOCKER_USERNAME }}/phyo-server:latest
          docker push ${{ secrets.DOCKER_USERNAME }}/phyo-server:latest

      - name: Deploy to EC2
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.EC2_HOST }}
          username: ec2-user
          key: ${{ secrets.EC2_KEY }}
          script: |
            docker pull ${{ secrets.DOCKER_USERNAME }}/phyo-server:latest
            docker stop phyo-server || true
            docker rm phyo-server || true
            docker run -d --name phyo-server -p 4000:4000 --env-file ~/.env --restart unless-stopped ${{ secrets.DOCKER_USERNAME }}/phyo-server:latest
```

---

## Common Commands Reference

```bash
# Build
docker build -t phyo-server .

# Run
docker run -d --name phyo-server -p 4000:4000 --env-file .env phyo-server

# Logs
docker logs -f phyo-server

# Stop
docker stop phyo-server

# Restart
docker restart phyo-server

# Remove
docker rm phyo-server

# Compose
docker-compose up -d
docker-compose logs -f
docker-compose down

# Push
docker push YOUR_USERNAME/phyo-server:latest

# Pull
docker pull YOUR_USERNAME/phyo-server:latest

# Stats
docker stats phyo-server

# Exec
docker exec -it phyo-server /bin/sh
```

---

## Security Best Practices

✅ **Do:**
- [ ] Keep Docker images updated
- [ ] Use specific versions, not latest
- [ ] Scan images for vulnerabilities (`docker scan`)
- [ ] Use environment variables for secrets
- [ ] Limit container resources
- [ ] Enable logging
- [ ] Use health checks
- [ ] Regular backups of .env
- [ ] Monitor container activity

❌ **Don't:**
- [ ] Run containers as root
- [ ] Expose sensitive data in image
- [ ] Use weak secrets
- [ ] Disable security group rules
- [ ] Commit .env to git
- [ ] Use very old Node versions
- [ ] Share container across environments

---

## Support & Resources

- **Docker Docs**: https://docs.docker.com
- **AWS EC2 Guide**: https://docs.aws.amazon.com/ec2/
- **Node.js Best Practices**: https://nodejs.org/en/docs/
- **Docker Hub**: https://hub.docker.com

---

**Happy Deploying! 🚀**
