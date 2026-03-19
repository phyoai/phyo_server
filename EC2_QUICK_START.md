# 🚀 Phyo Server - EC2 Deployment Quick Start

> **TL;DR**: Copy-paste commands to deploy on EC2 in 5 minutes

---

## Prerequisites

- ✅ AWS EC2 instance running (Amazon Linux 2 recommended)
- ✅ Security group allows inbound on port 4000
- ✅ Key pair (.pem file) for SSH access
- ✅ Docker Hub account (for storing Docker image)

---

## 🔧 Quick Setup (5 Steps)

### Step 1: Build and Push Docker Image Locally

On your **local machine**:

```bash
cd c:/full\ stack\ phyo/phyo_server

# Build Docker image
docker build -t phyo-server:latest .

# Tag with your Docker Hub username
docker tag phyo-server:latest YOUR_DOCKER_USERNAME/phyo-server:latest

# Login to Docker Hub
docker login

# Push to Docker Hub
docker push YOUR_DOCKER_USERNAME/phyo-server:latest
```

**Replace `YOUR_DOCKER_USERNAME`** with your actual Docker Hub username.

---

### Step 2: SSH into EC2

```bash
ssh -i /path/to/your/key.pem ec2-user@YOUR_EC2_PUBLIC_IP
```

Example:
```bash
ssh -i ~/Downloads/phyo-key.pem ec2-user@13.235.144.217
```

---

### Step 3: Create .env File on EC2

```bash
# Create .env file
nano ~/.env
```

Paste your environment variables (copy from your local `.env`):

```env
PORT=4000
MONGO_URI=mongodb+srv://...
OPENAI_API_KEY=sk-proj-...
JWT_SECRET=your_secret
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=ap-south-1
S3_BUCKET_NAME=phyo-buck
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=...
RAZORPAY_WEBHOOK_SECRET=...
ANTHROPIC_API_KEY=sk-ant-...
PERPLEXITY_API_KEY=pplx-...
GOOGLE_CLIENT_ID=...
AWS_S3_BUCKET=phyo-brand-asset
```

**Save**: Press `Ctrl+X`, then `Y`, then `Enter`

---

### Step 4: Run Automated Deployment Script

```bash
# Download and run deployment script
curl -O https://raw.githubusercontent.com/yourusername/phyo_server/main/deploy-ec2.sh
chmod +x deploy-ec2.sh
./deploy-ec2.sh YOUR_DOCKER_USERNAME
```

Or **manually run**:

```bash
# Update system and install Docker
sudo yum update -y
sudo yum install docker -y

# Start Docker
sudo systemctl start docker
sudo systemctl enable docker

# Add user to docker group
sudo usermod -aG docker ec2-user

# Pull and run container
docker pull YOUR_DOCKER_USERNAME/phyo-server:latest

docker run -d \
  --name phyo-server \
  -p 4000:4000 \
  --env-file ~/.env \
  --restart unless-stopped \
  YOUR_DOCKER_USERNAME/phyo-server:latest
```

---

### Step 5: Verify Deployment

```bash
# Check if container is running
docker ps

# View logs
docker logs -f phyo-server

# Test endpoint
curl http://localhost:4000

# Get server IP
curl http://checkip.amazonaws.com
```

---

## ✅ Verify Server is Running

```bash
# From your local machine
curl http://YOUR_EC2_PUBLIC_IP:4000

# Should return: Phyo Server is running...
```

---

## 📋 Useful Commands

### View Logs
```bash
docker logs phyo-server              # View logs
docker logs -f phyo-server           # Follow logs (real-time)
docker logs --tail 50 phyo-server    # Last 50 lines
```

### Container Management
```bash
docker ps                    # List running containers
docker ps -a                 # List all containers
docker stop phyo-server      # Stop container
docker start phyo-server     # Start container
docker restart phyo-server   # Restart container
docker rm phyo-server        # Remove container
```

### Update & Redeploy
```bash
# On local machine
docker build -t phyo-server:latest .
docker tag phyo-server:latest YOUR_DOCKER_USERNAME/phyo-server:latest
docker push YOUR_DOCKER_USERNAME/phyo-server:latest

# On EC2
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

### SSH Shortcuts
```bash
# Add to your local ~/.ssh/config
Host phyo-ec2
    HostName 13.235.144.217
    User ec2-user
    IdentityFile ~/.ssh/phyo-key.pem

# Then just use:
ssh phyo-ec2
```

---

## 🐛 Troubleshooting

### Container won't start?
```bash
docker logs phyo-server    # Check error messages
docker inspect phyo-server # View container details
```

### Port 4000 not accessible?
```bash
# 1. Check security group allows port 4000
# 2. Check container is running
docker ps

# 3. Check if server is listening on port 4000
docker exec phyo-server netstat -tlnp | grep 4000
```

### MongoDB connection fails?
- Verify `MONGO_URI` in `.env`
- Check MongoDB is accessible from EC2's IP
- Whitelist EC2's security group in MongoDB Atlas

### Permission denied when running docker?
```bash
# Make sure user is in docker group
groups ec2-user

# If not, add and log back in
sudo usermod -aG docker ec2-user
exit  # logout and login again
```

---

## 🌐 DNS Setup (Optional)

To use domain name instead of IP:

1. **In AWS Route 53** → Create A record:
   - Name: `api.phyo.ai`
   - Type: `A`
   - Value: `13.235.144.217` (your EC2 public IP)

2. **Update CORS** in `index.js`:
   ```javascript
   origin: ["https://phyo.ai", "http://api.phyo.ai:4000"]
   ```

3. **Rebuild and redeploy** Docker image

---

## 📊 Monitoring

### Check server health
```bash
curl -v http://YOUR_EC2_PUBLIC_IP:4000/health
```

### Monitor resource usage
```bash
docker stats phyo-server
```

### Check disk space
```bash
df -h
docker system df
```

---

## 🔒 Security Tips

✅ **Do:**
- Use strong JWT_SECRET
- Keep .env file private (never commit to git)
- Use HTTPS in production (setup Nginx reverse proxy)
- Restrict security group to specific IPs
- Enable EC2 detailed monitoring

❌ **Don't:**
- Don't expose .env file in git
- Don't use weak passwords
- Don't allow port 4000 from 0.0.0.0 (everyone)
- Don't store secrets in code

---

## 🆘 Need Help?

Check these files:
- `DEPLOYMENT.md` - Detailed deployment guide
- `DOCKER_DETAILED_GUIDE.md` - Advanced Docker setup
- `Dockerfile` - Docker configuration
- `.env.example` - Environment variables template

Or check Docker logs:
```bash
docker logs phyo-server
```

---

**Happy Deploying! 🚀**
