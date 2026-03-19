# Phyo Server Docker Deployment Guide

## Overview
This guide explains how to deploy the Phyo Node.js server to AWS EC2 using Docker.

---

## Step 1: Build Docker Image Locally

### Prerequisites
- Docker installed on your machine
- Node.js dependencies installed (`npm install`)

### Build Command
```bash
cd c:/full\ stack\ phyo/phyo_server
docker build -t phyo-server:latest .
```

This creates a Docker image named `phyo-server` with tag `latest`.

---

## Step 2: Test Image Locally (Optional)

```bash
docker run -p 4000:4000 \
  -e MONGO_URI="your_mongodb_uri" \
  -e OPENAI_API_KEY="your_openai_key" \
  -e JWT_SECRET="your_secret" \
  phyo-server:latest
```

Visit: `http://localhost:4000` to verify it works.

---

## Step 3: Push to Docker Hub

### Setup Docker Hub Account
1. Go to https://hub.docker.com
2. Create account or login
3. Create a new repository named `phyo-server`

### Login & Push
```bash
# Login to Docker Hub
docker login

# Tag your image with your Docker Hub username
docker tag phyo-server:latest YOUR_DOCKER_USERNAME/phyo-server:latest

# Push to Docker Hub
docker push YOUR_DOCKER_USERNAME/phyo-server:latest
```

Replace `YOUR_DOCKER_USERNAME` with your actual Docker Hub username.

---

## Step 4: SSH into EC2 Instance

```bash
ssh -i phyo-server-key.pem ec2-user@YOUR_EC2_PUBLIC_IP
```

Replace:
- `phyo-server-key.pem` with your key file path
- `YOUR_EC2_PUBLIC_IP` with your EC2 public IP (e.g., `13.235.144.217`)

---

## Step 5: Install Docker on EC2

Once SSH'd into EC2:

```bash
# Update system
sudo yum update -y

# Install Docker
sudo yum install docker -y

# Start Docker service
sudo systemctl start docker

# Add ec2-user to docker group
sudo usermod -aG docker ec2-user

# Log out and back in to apply group changes
exit
```

Then SSH back in.

---

## Step 6: Create .env File on EC2

```bash
# Create .env file on EC2
nano ~/.env
```

Paste your environment variables (from your local `.env`):
```
PORT=4000
MONGO_URI=mongodb+srv://...
OPENAI_API_KEY=sk-proj-...
JWT_SECRET=your_secret
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=ap-south-1
S3_BUCKET_NAME=phyo-buck
... (all other keys)
```

Press `Ctrl+X`, then `Y`, then `Enter` to save.

---

## Step 7: Pull & Run Docker Container on EC2

```bash
# Pull your image from Docker Hub
docker pull YOUR_DOCKER_USERNAME/phyo-server:latest

# Run the container
docker run -d \
  --name phyo-server \
  -p 4000:4000 \
  --env-file ~/.env \
  --restart unless-stopped \
  YOUR_DOCKER_USERNAME/phyo-server:latest
```

**Flags explained:**
- `-d` = run in background (detached)
- `--name phyo-server` = container name
- `-p 4000:4000` = map port 4000
- `--env-file ~/.env` = load environment variables
- `--restart unless-stopped` = auto-restart on failure

---

## Step 8: Verify Container is Running

```bash
# Check running containers
docker ps

# View logs
docker logs phyo-server

# Follow logs in real-time
docker logs -f phyo-server
```

---

## Step 9: Update Your CORS Origins

Update `index.js` CORS configuration to include your EC2 IP or domain:

```javascript
const io = socketIo(server, {
    cors: {
        origin: ["https://phyo.ai", "http://localhost:3000", "http://13.235.144.217:4000"],
        credentials: true
    }
})

app.use(cors({
    origin: ["https://phyo.ai", "http://localhost:3000", "http://13.235.144.217:4000"],
    credentials: true
}))
```

Then rebuild and redeploy Docker image.

---

## Step 10: Access Your Server

### Using Direct IP
```
http://13.235.144.217:4000
```

### Using Domain (phyo.ai)
```
http://phyo.ai:4000
```
(Once Route 53 DNS is propagated)

---

## Useful Commands

### View container logs
```bash
docker logs phyo-server
```

### Stop container
```bash
docker stop phyo-server
```

### Restart container
```bash
docker restart phyo-server
```

### Remove container
```bash
docker rm phyo-server
```

### Update & Redeploy
```bash
# On your local machine:
docker build -t phyo-server:latest .
docker push YOUR_DOCKER_USERNAME/phyo-server:latest

# On EC2:
docker pull YOUR_DOCKER_USERNAME/phyo-server:latest
docker stop phyo-server
docker rm phyo-server
docker run -d \
  --name phyo-server \
  -p 4000:4000 \
  --env-file ~/.env \
  --restart unless-stopped \
  YOUR_DOCKER_USERNAME/phyo-server:latest
```

---

## Troubleshooting

**Container keeps restarting?**
```bash
docker logs phyo-server
# Check error messages
```

**MongoDB connection fails?**
- Verify `MONGO_URI` in `.env`
- Check MongoDB is accessible from EC2

**Port 4000 not accessible?**
- Check Security Group allows inbound on port 4000
- Verify container is running: `docker ps`

---

## Next Steps
1. ✅ Build Docker image
2. ✅ Push to Docker Hub
3. ✅ Deploy to EC2
4. ✅ Test endpoints
5. Setup HTTPS/SSL with Nginx reverse proxy (optional)
6. Setup auto-scaling (optional)
