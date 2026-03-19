# 🐳 Complete Docker Build & EC2 Deployment - Step by Step

> **This is the complete workflow from code to production**

---

## 📋 Table of Contents

- [Phase 1: Local Docker Build](#phase-1-local-docker-build)
- [Phase 2: Test Locally](#phase-2-test-locally)
- [Phase 3: Push to Docker Hub](#phase-3-push-to-docker-hub)
- [Phase 4: EC2 Setup](#phase-4-ec2-setup)
- [Phase 5: Deploy on EC2](#phase-5-deploy-on-ec2)
- [Phase 6: Verify & Monitor](#phase-6-verify--monitor)

---

# 🔨 PHASE 1: LOCAL DOCKER BUILD

## Step 1.1: Navigate to Server Directory

```bash
# Open terminal/PowerShell
# Navigate to phyo_server directory
cd c:/full\ stack\ phyo/phyo_server

# Verify you're in the right place
ls -la

# You should see:
# - Dockerfile
# - package.json
# - index.js
# - docker-compose.yml
# - .dockerignore
```

**Expected Output:**
```
total 422
-rw-r--r--   1 user  staff    567 Mar 18 Dockerfile
-rw-r--r--   1 user  staff    826 Mar 18 package.json
-rw-r--r--   1 user  staff  37772 Mar 18 index.js
-rw-r--r--   1 user  staff    148 Mar 18 .dockerignore
drwxr-xr-x   5 user  staff    160 Mar 18 node_modules
...
```

---

## Step 1.2: Verify Dockerfile

```bash
# Check the Dockerfile content
cat Dockerfile

# Expected content:
# FROM node:18-alpine
# WORKDIR /app
# COPY package.json package-lock.json ./
# RUN npm ci --only=production
# COPY . .
# EXPOSE 4000
# HEALTHCHECK ...
# CMD ["node", "index.js"]
```

---

## Step 1.3: Build Docker Image

```bash
# Build the image with tag "phyo-server:latest"
docker build -t phyo-server:latest .

# This command:
# - Reads the Dockerfile
# - Downloads Node.js Alpine image (if not cached)
# - Creates a new layer for working directory
# - Installs dependencies from package.json
# - Copies your code into the image
# - Sets up health checks
# - Tags the image as "phyo-server:latest"
```

**What You'll See During Build:**

```
Sending build context to Docker daemon  X.XXX MB
Step 1/8 : FROM node:18-alpine
 ---> abc123def456
Step 2/8 : WORKDIR /app
 ---> Running in xyz789...
 ---> New image abc123
Step 3/8 : COPY package.json package-lock.json ./
 ---> Running in xyz789...
 ---> New image abc124
Step 4/8 : RUN npm ci --only=production
 ---> Running in xyz789...
[npm install output...]
 ---> New image abc125
Step 5/8 : COPY . .
 ---> Running in xyz789...
 ---> New image abc126
Step 6/8 : EXPOSE 4000
 ---> Running in xyz789...
 ---> New image abc127
Step 7/8 : HEALTHCHECK ...
 ---> Running in xyz789...
 ---> New image abc128
Step 8/8 : CMD ["node", "index.js"]
 ---> Running in xyz789...
 ---> New image phyo-server:latest

Successfully built abc128
Successfully tagged phyo-server:latest
```

**⏱️ Build Time:** 2-5 minutes (first time), <30 seconds (cached)

---

## Step 1.4: Verify Image Was Built

```bash
# List all Docker images
docker images | grep phyo-server

# Expected output:
# REPOSITORY     TAG     IMAGE ID       CREATED         SIZE
# phyo-server    latest  abc128def456   1 second ago     250MB
```

✅ **If you see `phyo-server:latest` in the list, the build was successful!**

---

# 🧪 PHASE 2: TEST LOCALLY

## Step 2.1: Run Container Locally

```bash
# Run the container
docker run -d \
  --name phyo-server-test \
  -p 4000:4000 \
  --env-file .env \
  phyo-server:latest

# Flags explained:
# -d                    = run in background (detached mode)
# --name phyo-server-test = give container a name
# -p 4000:4000          = map port 4000 (host) to 4000 (container)
# --env-file .env       = load environment variables from .env
# phyo-server:latest    = image to run
```

**Expected Output:**
```
abc123def456789 (this is the container ID)
```

---

## Step 2.2: Wait for Container to Start

```bash
# Wait 3-5 seconds for the server to start
sleep 5

# Or just wait manually while watching logs
```

---

## Step 2.3: Check Container Status

```bash
# Check if container is running
docker ps | grep phyo-server-test

# Expected output:
# CONTAINER ID    IMAGE                  COMMAND             STATUS
# abc123def456    phyo-server:latest    "node index.js"    Up 10 seconds
```

✅ **Status should be "Up X seconds"**

---

## Step 2.4: View Container Logs

```bash
# View the logs
docker logs phyo-server-test

# Expected output:
# Server running on port 4000
# Database connected
# Socket.io listening...
```

✅ **Look for any error messages. If all is good, no errors should appear.**

---

## Step 2.5: Test the Server

```bash
# Test if server is responding
curl http://localhost:4000

# Expected response:
# Phyo Server is running...
# or JSON response from your API
```

✅ **If you get a response, the server is working!**

---

## Step 2.6: Test API Endpoint

```bash
# Test a specific endpoint (example: get influencers)
curl http://localhost:4000/api/auth/influencers

# You should get a JSON response
```

---

## Step 2.7: Check Container Health

```bash
# Check if health check passed
docker inspect phyo-server-test | grep -A 5 "Health"

# Expected output:
# "Health": {
#   "Status": "healthy",
#   "FailingStreak": 0,
#   "Runs": [...]
# }
```

✅ **Status should be "healthy"**

---

## Step 2.8: Monitor Resource Usage

```bash
# Check CPU and memory usage
docker stats phyo-server-test --no-stream

# Expected output:
# CONTAINER ID    CPU %    MEM USAGE / LIMIT    MEM %
# abc123def456    0.15%    45.2MiB / 8GiB       0.56%
```

✅ **Memory usage should be under 100MB**

---

## Step 2.9: Stop Test Container

```bash
# Stop the container
docker stop phyo-server-test

# Remove the container
docker rm phyo-server-test

# Verify it's gone
docker ps -a | grep phyo-server-test

# Should return empty
```

✅ **Test container removed successfully**

---

# 📤 PHASE 3: PUSH TO DOCKER HUB

## Step 3.1: Create Docker Hub Account (if not exists)

1. Go to https://hub.docker.com
2. Sign up or login
3. Create a new repository:
   - Name: `phyo-server`
   - Description: "Phyo Backend Server"
   - Visibility: Private or Public
4. Click "Create"

---

## Step 3.2: Login to Docker Hub

```bash
# Login to Docker Hub
docker login

# Prompts:
# Username: YOUR_DOCKER_USERNAME
# Password: YOUR_DOCKER_PASSWORD

# Expected output:
# Login Succeeded
```

✅ **Login successful**

---

## Step 3.3: Tag Image with Your Username

```bash
# Tag the image with your Docker Hub username
docker tag phyo-server:latest YOUR_DOCKER_USERNAME/phyo-server:latest

# Example:
# docker tag phyo-server:latest john123/phyo-server:latest

# Verify the tag
docker images | grep phyo-server

# Expected output:
# REPOSITORY                      TAG     IMAGE ID        SIZE
# phyo-server                     latest  abc128def456    250MB
# john123/phyo-server            latest  abc128def456    250MB
```

✅ **Both tags should have the same IMAGE ID**

---

## Step 3.4: Push Image to Docker Hub

```bash
# Push to Docker Hub
docker push YOUR_DOCKER_USERNAME/phyo-server:latest

# You'll see:
# Using default tag: latest
# The push refers to repository [docker.io/YOUR_USERNAME/phyo-server]
#
# Layer 1/8: Pushing... [=====>                                    ] 5MB/50MB
# Layer 2/8: Pushing... [=========>                          ] 10MB/50MB
# ...
# latest: digest: sha256:abc123... size: 5432
```

⏱️ **Push time:** 2-10 minutes (depending on image size and internet speed)

✅ **"Digest: sha256:..." means push was successful**

---

## Step 3.5: Verify Image on Docker Hub

```bash
# Visit Docker Hub to verify
# https://hub.docker.com/repository/docker/YOUR_USERNAME/phyo-server

# You should see:
# - Repository name: phyo-server
# - Tags: latest
# - Image size: ~250MB
# - Layers: 8
```

✅ **Image is now on Docker Hub and accessible to EC2!**

---

# 🌐 PHASE 4: EC2 SETUP

## Step 4.1: Create EC2 Instance

1. Go to **AWS Console** → **EC2 Dashboard**
2. Click **"Launch Instances"**
3. Select **"Amazon Linux 2"** (AMI)
4. Choose instance type: **t3.micro** (or larger if needed)
5. Configure details:
   - VPC: Default
   - Public IP: Enable
   - Storage: 20GB
6. Add security group:
   - Allow SSH (port 22) from your IP
   - Allow HTTP (port 80) from 0.0.0.0
   - Allow Custom TCP (port 4000) from 0.0.0.0
7. Review and launch
8. Select key pair (create new or use existing)
9. **Launch instance**

✅ **EC2 instance is now running**

---

## Step 4.2: Get EC2 Public IP

```bash
# In AWS Console:
# EC2 Dashboard → Instances → Your Instance
# Look for "Public IPv4 address"
# Example: 13.235.144.217

# Save this IP for later:
# YOUR_EC2_IP=13.235.144.217
```

✅ **Note your EC2 public IP**

---

## Step 4.3: Test SSH Connection

```bash
# Test SSH access to EC2
ssh -i /path/to/your-key.pem ec2-user@YOUR_EC2_IP

# Example:
# ssh -i ~/Downloads/phyo-key.pem ec2-user@13.235.144.217

# Expected output (first time):
# The authenticity of host 'xxx' can't be established.
# Are you sure you want to continue connecting (yes/no)?
# Type: yes

# You should now be connected to EC2:
# [ec2-user@ip-xxx-xxx-xxx-xxx ~]$
```

✅ **SSH connection successful!**

---

## Step 4.4: Update System

```bash
# On EC2, update all packages
sudo yum update -y

# This takes 1-2 minutes
# You'll see:
# Running transaction
# Installing... [=========>  ]
# Complete!
```

✅ **System updated**

---

## Step 4.5: Install Docker

```bash
# Install Docker
sudo yum install docker -y

# You'll see:
# Installing docker
# Dependencies resolved
# Installing: docker-...
# Complete!

# Verify installation
docker --version

# Expected output:
# Docker version 20.10.x, build xxxxxxx
```

✅ **Docker installed**

---

## Step 4.6: Start Docker Service

```bash
# Start Docker daemon
sudo systemctl start docker

# Enable Docker to start on boot
sudo systemctl enable docker

# Verify Docker is running
sudo systemctl status docker

# Expected output:
# Active: active (running) since ...
```

✅ **Docker service is running**

---

## Step 4.7: Add User to Docker Group

```bash
# Add ec2-user to docker group (so you don't need sudo)
sudo usermod -aG docker ec2-user

# Verify
groups ec2-user

# Expected output:
# ec2-user : ec2-user docker
```

⚠️ **NOTE:** You need to logout and login again for group changes to take effect

```bash
# Logout
exit

# SSH back in
ssh -i /path/to/your-key.pem ec2-user@YOUR_EC2_IP

# Verify docker works without sudo
docker ps

# Expected output:
# CONTAINER ID   IMAGE   COMMAND   CREATED   STATUS   PORTS   NAMES
```

✅ **Docker user group configured**

---

# 📥 PHASE 5: DEPLOY ON EC2

## Step 5.1: Create .env File

```bash
# On EC2, create .env file
nano ~/.env

# A text editor opens. Now paste your environment variables:
# (Copy these from your local .env file)

PORT=4000
MONGO_URI=mongodb+srv://phyoaiofficial:pyro%401234@phyo.fls0is0.mongodb.net/phyo...
OPENAI_API_KEY=sk-proj-QhjgkUIk8AcyKiyHypLExE7...
JWT_SECRET=SECRET
AWS_ACCESS_KEY_ID=AKIAZI4MNNHG4BNU6PTZ
AWS_SECRET_ACCESS_KEY=LbGt16R8X6iXI1B/OU1y7Cu6...
AWS_REGION=ap-south-1
S3_BUCKET_NAME=phyo-buck
RAZORPAY_KEY_ID=rzp_test_RbXvyl4Znqufal
RAZORPAY_KEY_SECRET=hsTZJbshniUgz81eOBU3lAIS
... (all other variables)

# Save the file:
# Press Ctrl+X
# Type: y
# Press Enter
```

✅ **.env file created on EC2**

---

## Step 5.2: Verify .env File

```bash
# Verify the file was created
cat ~/.env

# Should show all your environment variables
```

✅ **.env file verified**

---

## Step 5.3: Pull Docker Image

```bash
# Pull your image from Docker Hub
docker pull YOUR_DOCKER_USERNAME/phyo-server:latest

# Example:
# docker pull john123/phyo-server:latest

# You'll see:
# Pulling from john123/phyo-server
# 2408cc74d12b: Pull complete
# 45b83a23b5d8: Pull complete
# ...
# Digest: sha256:abc123...
# Status: Downloaded newer image for john123/phyo-server:latest
```

⏱️ **Pull time:** 1-3 minutes

✅ **Image pulled successfully**

---

## Step 5.4: Run Docker Container

```bash
# Run the container
docker run -d \
  --name phyo-server \
  -p 4000:4000 \
  --env-file ~/.env \
  --restart unless-stopped \
  --log-driver json-file \
  --log-opt max-size=10m \
  --log-opt max-file=3 \
  YOUR_DOCKER_USERNAME/phyo-server:latest

# Example:
# docker run -d \
#   --name phyo-server \
#   -p 4000:4000 \
#   --env-file ~/.env \
#   --restart unless-stopped \
#   john123/phyo-server:latest

# Expected output:
# abc123def456789 (container ID)
```

✅ **Container started**

---

## Step 5.5: Wait for Container to Start

```bash
# Wait 3-5 seconds for server to start
sleep 5
```

---

# ✅ PHASE 6: VERIFY & MONITOR

## Step 6.1: Check Container Status

```bash
# Check if container is running
docker ps | grep phyo-server

# Expected output:
# CONTAINER ID    IMAGE                              COMMAND        STATUS
# abc123def456    john123/phyo-server:latest        "node index..."  Up 15 seconds
```

✅ **Container is running**

---

## Step 6.2: View Container Logs

```bash
# View the logs
docker logs phyo-server

# Expected output:
# Server running on port 4000
# Database connected
# Socket.io listening...
# No errors!
```

✅ **Server started successfully with no errors**

---

## Step 6.3: Monitor Logs in Real-Time

```bash
# Follow logs (Ctrl+C to exit)
docker logs -f phyo-server

# You'll see logs as they happen:
# New requests, database queries, etc.
```

---

## Step 6.4: Test from Local Machine

```bash
# On your LOCAL machine, test the server
curl http://YOUR_EC2_IP:4000

# Example:
# curl http://13.235.144.217:4000

# Expected response:
# Phyo Server is running...
```

✅ **Server is accessible from the internet!**

---

## Step 6.5: Test an API Endpoint

```bash
# Test a specific API endpoint
curl http://YOUR_EC2_IP:4000/api/auth/influencers

# Expected: JSON response with influencers data
```

✅ **API endpoints are working!**

---

## Step 6.6: Check Server Health

```bash
# On EC2, check container health
docker inspect phyo-server | grep -A 5 "Health"

# Expected output:
# "Health": {
#   "Status": "healthy",
#   "FailingStreak": 0
# }
```

✅ **Server health is good**

---

## Step 6.7: Check Resource Usage

```bash
# Check CPU and memory
docker stats phyo-server --no-stream

# Expected output:
# CONTAINER ID    CPU %    MEM USAGE / LIMIT    MEM %
# abc123def456    0.25%    48.3MiB / 1.024GiB   4.72%
```

✅ **Resource usage is healthy**

---

## Step 6.8: View Container Details

```bash
# Detailed information about the container
docker inspect phyo-server

# Shows:
# - Port mappings
# - Environment variables
# - Network settings
# - Health status
# - Restart policy
# - Logs location
```

---

# 🎯 COMPLETE WORKFLOW SUMMARY

## Local (Your Machine)

```
1. Build image       → docker build -t phyo-server:latest .
2. Test locally      → docker run -p 4000:4000 --env-file .env phyo-server:latest
3. Verify works      → curl http://localhost:4000
4. Tag image         → docker tag phyo-server:latest USERNAME/phyo-server:latest
5. Push to Hub       → docker push USERNAME/phyo-server:latest
```

## On EC2

```
1. Install Docker    → sudo yum install docker -y && sudo systemctl start docker
2. Create .env       → nano ~/.env (paste your environment variables)
3. Pull image        → docker pull USERNAME/phyo-server:latest
4. Run container     → docker run -d --name phyo-server -p 4000:4000 --env-file ~/.env USERNAME/phyo-server:latest
5. Monitor          → docker logs -f phyo-server
```

## Verification

```
1. Check container   → docker ps | grep phyo-server
2. View logs         → docker logs phyo-server
3. Test from local   → curl http://EC2_IP:4000
4. Health check      → docker inspect phyo-server | grep -A 5 "Health"
```

---

# 📊 TIME ESTIMATE

| Phase | Task | Time |
|-------|------|------|
| 1 | Build image | 2-5 min |
| 2 | Test locally | 3-5 min |
| 3 | Push to Hub | 3-10 min |
| 4 | EC2 Setup | 5-10 min |
| 5 | Deploy on EC2 | 2-5 min |
| 6 | Verify | 2-3 min |
| **TOTAL** | **Complete Deployment** | **20-40 min** |

---

# ✨ SUCCESS CHECKLIST

- [ ] Docker image built successfully
- [ ] Local test passed (container running, responsive)
- [ ] Image pushed to Docker Hub
- [ ] EC2 instance created with correct security groups
- [ ] SSH connection working
- [ ] Docker installed on EC2
- [ ] .env file created on EC2
- [ ] Image pulled from Docker Hub on EC2
- [ ] Container running on EC2
- [ ] Server accessible from local machine (curl test)
- [ ] API endpoints responding correctly
- [ ] Container health status is "healthy"
- [ ] Logs show no errors

---

**🎉 You're done! Your backend is now deployed on EC2!**

Next: Update your frontend to point to: `http://YOUR_EC2_IP:4000`
