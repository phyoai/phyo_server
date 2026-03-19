# Complete Docker Guide: Local to EC2 Deployment

## What is Docker?

**Docker** is like a shipping container for your code. It packages:
- Your Node.js code
- Dependencies (npm packages)
- Configuration
- Everything needed to run your app

Once packaged, you can:
- Run it anywhere (your laptop, EC2, cloud, etc.)
- Always works the same way
- No "works on my machine but not on server" problems

---

## PART 1: LOCAL SETUP - Build Docker Image Locally

### Step 1.1: Create Docker Hub Account

1. Go to https://hub.docker.com
2. Click **Sign Up**
3. Enter:
   - Email
   - Username (e.g., `anilkumar123`)
   - Password
4. Click **Sign Up**
5. **REMEMBER YOUR USERNAME** - you'll need it!

---

### Step 1.2: Open Terminal/Command Prompt

**Windows (PowerShell or CMD):**
```
Press Windows Key + R
Type: powershell
Press Enter
```

**Mac/Linux:**
```
Open Terminal
```

---

### Step 1.3: Navigate to Your Server Folder

```bash
cd c:\full\ stack\ phyo\phyo_server
```

**Verify you're in the right folder:**
```bash
ls
```

You should see files like: `index.js`, `package.json`, `Dockerfile`, etc.

---

### Step 1.4: Install Docker Desktop (if not already)

**Download Docker Desktop:**
- Go to https://www.docker.com/products/docker-desktop
- Download for Windows
- Install it
- Restart your computer
- Open Docker Desktop app

**Verify Docker is installed:**
```bash
docker --version
```

You should see: `Docker version 24.x.x` (or similar)

---

### Step 1.5: Build Docker Image Locally

**This creates a Docker image (like a snapshot) of your code:**

```bash
docker build -t phyo-server:latest .
```

**What this does:**
- `-t phyo-server:latest` = name your image `phyo-server` with tag `latest`
- `.` = use the Dockerfile in current folder

**You'll see output like:**
```
[1/6] FROM node:18-alpine
[2/6] WORKDIR /app
[3/6] COPY package files...
[4/6] RUN npm ci...
...
Successfully built abc123def456
Successfully tagged phyo-server:latest
```

**This takes 2-5 minutes** (first time only).

---

### Step 1.6: Verify Image Was Built

```bash
docker images
```

You should see:
```
REPOSITORY      TAG       IMAGE ID       SIZE
phyo-server     latest    abc123def456   250MB
```

---

### Step 1.7: Test Image Locally (Optional)

**Run your Docker container locally to test it works:**

```bash
docker run -p 4000:4000 --env-file .env phyo-server:latest
```

**What this does:**
- `-p 4000:4000` = expose port 4000
- `--env-file .env` = load your environment variables
- `phyo-server:latest` = run this image

**You should see:**
```
Server is running on port 4000
Mongo Connected
```

**Test it:**
- Open browser: `http://localhost:4000`
- You should see: `Home page of phyo`

**Stop the container:**
- Press `Ctrl + C` in the terminal

---

## PART 2: PUSH TO DOCKER HUB - Upload Your Image

### Step 2.1: Login to Docker Hub

**In your terminal:**

```bash
docker login
```

**Enter:**
- Username: `your_docker_username`
- Password: `your_docker_password`

**Success message:**
```
Login Succeeded
```

---

### Step 2.2: Tag Your Image with Your Username

**This is important - Docker Hub needs to know who owns the image:**

```bash
docker tag phyo-server:latest YOUR_DOCKER_USERNAME/phyo-server:latest
```

**Replace `YOUR_DOCKER_USERNAME` with your actual username!**

**Example:**
```bash
docker tag phyo-server:latest anilkumar123/phyo-server:latest
```

---

### Step 2.3: Push to Docker Hub

**Upload your image to Docker Hub:**

```bash
docker push YOUR_DOCKER_USERNAME/phyo-server:latest
```

**You'll see:**
```
The push refers to repository [docker.io/YOUR_DOCKER_USERNAME/phyo-server]
abc123def456: Pushed
def789ghi012: Pushed
...
latest: digest: sha256:abcdef123456... size: 5678
```

**This takes 2-5 minutes** depending on internet speed.

---

### Step 2.4: Verify on Docker Hub

1. Go to https://hub.docker.com
2. Click on your username (top right)
3. Click **Repositories**
4. You should see `phyo-server`
5. Click it to see details

**It's now publicly available!** Anyone can download it.

---

## PART 3: EC2 DEPLOYMENT - Pull & Run on Server

### Step 3.1: SSH into EC2 Instance

**In your local terminal:**

```bash
ssh -i phyo-server-key.pem ec2-user@13.235.144.217
```

**Replace `13.235.144.217` with your actual EC2 public IP**

**You should see:**
```
[ec2-user@ip-10-0-1-123 ~]$
```

This means you're now **logged into your EC2 server!**

---

### Step 3.2: Install Docker on EC2

**Update system packages:**

```bash
sudo yum update -y
```

**Install Docker:**

```bash
sudo yum install docker -y
```

**Start Docker service:**

```bash
sudo systemctl start docker
```

**Allow ec2-user to use Docker (no sudo needed):**

```bash
sudo usermod -aG docker ec2-user
```

**Exit and log back in:**

```bash
exit
```

Then SSH back in:

```bash
ssh -i phyo-server-key.pem ec2-user@13.235.144.217
```

**Verify Docker works:**

```bash
docker --version
```

Should show: `Docker version 24.x.x`

---

### Step 3.3: Create .env File on EC2

**Create the file:**

```bash
nano ~/.env
```

**Paste your environment variables** (copy from your local `.env`):

```
PORT=4000
MONGO_URI=mongodb+srv://YOUR_USERNAME:YOUR_PASSWORD@YOUR_CLUSTER.mongodb.net/phyo?retryWrites=true&w=majority
OPENAI_API_KEY=sk-proj-YOUR_OPENAI_API_KEY_HERE
JWT_SECRET=YOUR_JWT_SECRET_HERE
AWS_ACCESS_KEY_ID=YOUR_AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY=YOUR_AWS_SECRET_ACCESS_KEY
AWS_REGION=ap-south-1
S3_BUCKET_NAME=phyo-buck
... (add all other variables)
```

**Save the file:**
- Press `Ctrl + X`
- Press `Y` (yes)
- Press `Enter`

**Verify it was saved:**

```bash
cat ~/.env
```

---

### Step 3.4: Pull Your Docker Image from Docker Hub

**Download your image from Docker Hub:**

```bash
docker pull YOUR_DOCKER_USERNAME/phyo-server:latest
```

**Example:**

```bash
docker pull anilkumar123/phyo-server:latest
```

**You'll see:**
```
latest: Pulling from anilkumar123/phyo-server
abc123def456: Pull complete
def789ghi012: Pull complete
...
Digest: sha256:abcdef123456...
Status: Downloaded newer image for anilkumar123/phyo-server:latest
```

**This takes 1-2 minutes.**

---

### Step 3.5: Run Docker Container on EC2

**Start your server as a Docker container:**

```bash
docker run -d \
  --name phyo-server \
  -p 4000:4000 \
  --env-file ~/.env \
  --restart unless-stopped \
  YOUR_DOCKER_USERNAME/phyo-server:latest
```

**What each part means:**
- `-d` = run in background (detached)
- `--name phyo-server` = name the container
- `-p 4000:4000` = expose port 4000 to the internet
- `--env-file ~/.env` = load environment variables
- `--restart unless-stopped` = auto-restart if it crashes
- `YOUR_DOCKER_USERNAME/phyo-server:latest` = which image to use

**Example:**

```bash
docker run -d \
  --name phyo-server \
  -p 4000:4000 \
  --env-file ~/.env \
  --restart unless-stopped \
  anilkumar123/phyo-server:latest
```

**You should see:**
```
a1b2c3d4e5f6g7h8i9j0
```

(This is your container ID)

---

### Step 3.6: Verify Container is Running

**Check if container started successfully:**

```bash
docker ps
```

You should see:
```
CONTAINER ID   IMAGE                               STATUS         PORTS
a1b2c3d4e5f6   anilkumar123/phyo-server:latest    Up 10 seconds  0.0.0.0:4000->4000/tcp
```

---

### Step 3.7: Check Logs (If Container Doesn't Start)

**View what's happening inside:**

```bash
docker logs phyo-server
```

**Follow logs in real-time:**

```bash
docker logs -f phyo-server
```

**Press `Ctrl + C` to stop following**

---

### Step 3.8: Test Your Server

**From your local machine, open browser:**

```
http://13.235.144.217:4000
```

(Replace with your EC2 IP)

**You should see:**
```
Home page of phyo
```

🎉 **Your server is running!**

---

## PART 4: HOW DOCKER WORKS - The Flow

### Visual Flow:

```
LOCAL MACHINE:
    ↓
┌─────────────────────────────┐
│ Your Code + Dockerfile      │
│ (c:/full stack phyo/...)    │
└──────────────┬──────────────┘
               │ docker build
               ↓
        ┌──────────────┐
        │ Docker Image │ (phyo-server:latest)
        │ (snapshot)   │
        └──────┬───────┘
               │ docker push
               ↓
    ┌──────────────────────┐
    │  Docker Hub Cloud    │
    │  (anilkumar123/...) │
    └──────────┬───────────┘
               │ docker pull
               ↓
        EC2 INSTANCE:
    ┌──────────────────────┐
    │  Docker Container    │
    │ (Running phyo-server)│
    │  Port 4000 Active    │
    └──────────────────────┘
```

### What Happens at Each Step:

| Step | Command | What It Does | Where |
|------|---------|-------------|-------|
| 1 | `docker build` | Creates a snapshot of your code | Local |
| 2 | `docker tag` | Adds your username to the image | Local |
| 3 | `docker push` | Uploads image to Docker Hub | Local → Cloud |
| 4 | `docker pull` | Downloads image from Docker Hub | Cloud → EC2 |
| 5 | `docker run` | Starts a container from the image | EC2 |

---

## PART 5: COMMON COMMANDS

### View all images on your machine:
```bash
docker images
```

### View all running containers:
```bash
docker ps
```

### View all containers (including stopped):
```bash
docker ps -a
```

### View container logs:
```bash
docker logs phyo-server
```

### Stop a container:
```bash
docker stop phyo-server
```

### Start a stopped container:
```bash
docker start phyo-server
```

### Restart a container:
```bash
docker restart phyo-server
```

### Remove a container:
```bash
docker rm phyo-server
```

### Remove an image:
```bash
docker rmi YOUR_DOCKER_USERNAME/phyo-server:latest
```

---

## PART 6: UPDATE & REDEPLOY (When You Change Code)

**When you make changes to your code locally:**

### On Local Machine:

```bash
# Make your code changes
# ... edit files ...

# Rebuild the image
docker build -t phyo-server:latest .

# Retag with username
docker tag phyo-server:latest YOUR_DOCKER_USERNAME/phyo-server:latest

# Push to Docker Hub
docker push YOUR_DOCKER_USERNAME/phyo-server:latest
```

### On EC2:

```bash
# Pull the new image
docker pull YOUR_DOCKER_USERNAME/phyo-server:latest

# Stop the old container
docker stop phyo-server

# Remove the old container
docker rm phyo-server

# Run the new container
docker run -d \
  --name phyo-server \
  -p 4000:4000 \
  --env-file ~/.env \
  --restart unless-stopped \
  YOUR_DOCKER_USERNAME/phyo-server:latest

# Verify it's running
docker ps
```

---

## PART 7: TROUBLESHOOTING

### Container won't start?

```bash
docker logs phyo-server
```

Look for error messages like:
- `Cannot find module` → Missing dependency
- `MONGO_URI not found` → .env file issue
- `Port already in use` → Port 4000 is taken

### Container keeps restarting?

Check logs:
```bash
docker logs phyo-server
```

If it's a code error, fix locally, rebuild, and redeploy.

### Can't connect to server?

1. Check container is running: `docker ps`
2. Check port 4000 is open in EC2 Security Group
3. Check firewall allows port 4000
4. Try: `curl http://localhost:4000` on EC2

### Want to go inside the container?

```bash
docker exec -it phyo-server /bin/sh
```

This gives you a terminal inside the container (like SSH).

---

## Summary - Quick Checklist

- [ ] Create Docker Hub account
- [ ] Build image locally: `docker build -t phyo-server:latest .`
- [ ] Test locally: `docker run -p 4000:4000 --env-file .env phyo-server:latest`
- [ ] Login to Docker Hub: `docker login`
- [ ] Tag image: `docker tag phyo-server:latest YOUR_USERNAME/phyo-server:latest`
- [ ] Push to Docker Hub: `docker push YOUR_USERNAME/phyo-server:latest`
- [ ] SSH to EC2: `ssh -i phyo-server-key.pem ec2-user@YOUR_IP`
- [ ] Install Docker on EC2: `sudo yum install docker -y`
- [ ] Create .env on EC2: `nano ~/.env`
- [ ] Pull image: `docker pull YOUR_USERNAME/phyo-server:latest`
- [ ] Run container: `docker run -d --name phyo-server -p 4000:4000 --env-file ~/.env --restart unless-stopped YOUR_USERNAME/phyo-server:latest`
- [ ] Test: `http://YOUR_EC2_IP:4000`

**🎉 Done!**

