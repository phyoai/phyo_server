# 🚀 QUICK REFERENCE - ALL COMMANDS

> Copy-paste these commands for quick deployment

---

## 📊 COMPLETE WORKFLOW

```
LOCAL BUILD → DOCKER HUB → EC2 DEPLOY → VERIFY → MONITOR
```

---

## 🔨 PHASE 1: LOCAL BUILD (2-5 min)

```bash
# Navigate to server directory
cd c:/full\ stack\ phyo/phyo_server

# BUILD IMAGE
docker build -t phyo-server:latest .

# Verify build
docker images | grep phyo-server
```

---

## 🧪 PHASE 2: TEST LOCALLY (3-5 min)

```bash
# Run container
docker run -d \
  --name phyo-server-test \
  -p 4000:4000 \
  --env-file .env \
  phyo-server:latest

# Wait for startup
sleep 5

# Check status
docker ps | grep phyo-server-test

# View logs
docker logs phyo-server-test

# Test endpoint
curl http://localhost:4000

# Check health
docker inspect phyo-server-test | grep -A 5 "Health"

# Cleanup
docker stop phyo-server-test && docker rm phyo-server-test
```

---

## 📤 PHASE 3: PUSH TO DOCKER HUB (3-10 min)

```bash
# Login
docker login

# Tag image
docker tag phyo-server:latest YOUR_USERNAME/phyo-server:latest

# PUSH
docker push YOUR_USERNAME/phyo-server:latest

# Verify on Docker Hub
# Visit: https://hub.docker.com/repository/docker/YOUR_USERNAME/phyo-server
```

---

## 🌐 PHASE 4: EC2 SETUP (5-10 min)

```bash
# SSH into EC2
ssh -i /path/to/key.pem ec2-user@YOUR_EC2_IP

# Update system
sudo yum update -y

# Install Docker
sudo yum install docker -y

# Start Docker
sudo systemctl start docker
sudo systemctl enable docker

# Add user to docker group
sudo usermod -aG docker ec2-user

# Logout and login again
exit
ssh -i /path/to/key.pem ec2-user@YOUR_EC2_IP

# Verify docker works
docker ps
```

---

## 📥 PHASE 5: DEPLOY (2-5 min)

```bash
# Create .env file on EC2
nano ~/.env

# Paste all environment variables
# Save: Ctrl+X, Y, Enter

# Verify .env
cat ~/.env

# Pull image
docker pull YOUR_USERNAME/phyo-server:latest

# RUN CONTAINER
docker run -d \
  --name phyo-server \
  -p 4000:4000 \
  --env-file ~/.env \
  --restart unless-stopped \
  YOUR_USERNAME/phyo-server:latest

# Wait for startup
sleep 5
```

---

## ✅ PHASE 6: VERIFY (2-3 min)

```bash
# Check container running
docker ps | grep phyo-server

# View logs
docker logs phyo-server

# Follow logs
docker logs -f phyo-server  # Ctrl+C to exit

# From LOCAL machine, test
curl http://YOUR_EC2_IP:4000

# Test endpoint
curl http://YOUR_EC2_IP:4000/api/auth/influencers

# Check health
docker inspect phyo-server | grep -A 5 "Health"

# Check resources
docker stats phyo-server --no-stream
```

---

## 🎯 COMMON TASKS

### View Logs
```bash
docker logs phyo-server              # View logs
docker logs -f phyo-server           # Follow logs (real-time)
docker logs --tail 100 phyo-server   # Last 100 lines
```

### Container Management
```bash
docker ps                    # List running
docker ps -a                 # List all
docker stop phyo-server      # Stop
docker start phyo-server     # Start
docker restart phyo-server   # Restart
docker rm phyo-server        # Remove
```

### Update & Redeploy
```bash
# Local machine:
docker build -t phyo-server .
docker push YOUR_USERNAME/phyo-server:latest

# EC2:
docker pull YOUR_USERNAME/phyo-server:latest
docker stop phyo-server && docker rm phyo-server
docker run -d \
  --name phyo-server \
  -p 4000:4000 \
  --env-file ~/.env \
  --restart unless-stopped \
  YOUR_USERNAME/phyo-server:latest
```

### Docker Compose
```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Rebuild
docker-compose build --no-cache
docker-compose up -d
```

### Makefile Shortcuts
```bash
make build           # Build
make run             # Run
make logs            # Logs
make stop            # Stop
make restart         # Restart
make push            # Push to Hub
make clean           # Remove all
```

---

## 🌐 POST DEPLOYMENT

### Setup Domain
```bash
# AWS Route 53:
# Create A records:
# api.phyo.ai → YOUR_EC2_IP
# TTL: 300
```

### Setup HTTPS
```bash
# Install Certbot
sudo yum install certbot -y

# Get certificate
sudo certbot certonly --standalone -d api.phyo.ai

# Install Nginx
sudo yum install nginx -y

# Configure Nginx with SSL
sudo nano /etc/nginx/conf.d/phyo-api.conf

# Start Nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

### Update CORS
```bash
# In .env on EC2:
ALLOWED_ORIGINS=https://phyo.ai,https://api.phyo.ai

# Restart container
docker restart phyo-server
```

---

## 📊 MONITORING

### Check Health
```bash
# Container status
docker ps

# Health check
docker inspect phyo-server | grep -A 5 "Health"

# Resources
docker stats phyo-server

# Logs for errors
docker logs phyo-server | grep -i error
```

### SSH Shortcuts
```bash
# Add to ~/.ssh/config
Host phyo-ec2
    HostName YOUR_EC2_IP
    User ec2-user
    IdentityFile ~/.ssh/key.pem

# Use:
ssh phyo-ec2
```

---

## ⚠️ TROUBLESHOOTING

### Container won't start
```bash
docker logs phyo-server
docker inspect phyo-server
```

### Port not accessible
```bash
# Check security group allows port 4000
# Check container is running
docker ps

# Check server listening
docker exec phyo-server netstat -tlnp | grep 4000
```

### MongoDB connection fails
```bash
# Verify MONGO_URI in .env
grep MONGO_URI ~/.env

# Check MongoDB whitelist EC2 IP
# MongoDB Atlas → Network Access
```

### Permission issues
```bash
# Add user to docker group
sudo usermod -aG docker ec2-user
exit  # logout and login
```

---

## 📋 ENVIRONMENT VARIABLES

```bash
# Essential variables:
PORT=4000
MONGO_URI=mongodb+srv://user:pass@cluster.net/db
JWT_SECRET=your_secret

# AWS:
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=ap-south-1
S3_BUCKET_NAME=bucket-name

# APIs:
OPENAI_API_KEY=sk-proj-...
ANTHROPIC_API_KEY=sk-ant-...
RAZORPAY_KEY_ID=rzp_...

# See .env.example for complete list
```

---

## 🔄 CI/CD (GitHub Actions)

```bash
# Add GitHub Secrets:
# DOCKER_USERNAME
# DOCKER_PASSWORD
# EC2_HOST
# EC2_KEY

# Create: .github/workflows/deploy.yml
# See POST_DEPLOYMENT_GUIDE.md
```

---

## 📚 HELP FILES

| File | Purpose |
|------|---------|
| STEP_BY_STEP_DEPLOYMENT.md | Detailed walkthrough |
| DOCKER_EC2_COMPLETE_GUIDE.md | Comprehensive guide |
| POST_DEPLOYMENT_GUIDE.md | Next steps & optimization |
| EC2_QUICK_START.md | Quick reference |
| Dockerfile | Docker configuration |
| docker-compose.yml | Local development |
| Makefile | Command shortcuts |
| .env.example | Environment template |

---

## ⏱️ QUICK TIMING

```
Build      (local):  2-5 min
Test       (local):  3-5 min
Push       (hub):    3-10 min
Setup      (EC2):    5-10 min
Deploy     (EC2):    2-5 min
Verify     (test):   2-3 min
─────────────────────────────
TOTAL:                20-40 min
```

---

## 🎯 SUCCESS =

✅ Backend running on EC2 at port 4000
✅ Accessible from local machine via IP
✅ API endpoints responding
✅ Logs showing no errors
✅ Health status "healthy"
✅ Container auto-restarts on failure

---

**Need help? Check the detailed guides or run:**
```bash
make help
docker logs -f phyo-server
```

🚀 **You're ready for production!**
