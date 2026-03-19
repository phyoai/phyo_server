#!/bin/bash

################################################################################
# Phyo Server - Automated EC2 Deployment Script
# This script automates the entire deployment process on AWS EC2
################################################################################

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DOCKER_USERNAME="${1:-phyo}"
CONTAINER_NAME="phyo-server"
DOCKER_IMAGE="${DOCKER_USERNAME}/phyo-server:latest"
PORT=4000

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Phyo Server - EC2 Deployment Script${NC}"
echo -e "${BLUE}========================================${NC}"

################################################################################
# Step 1: Update System
################################################################################
echo -e "\n${YELLOW}[1/8] Updating system packages...${NC}"
sudo yum update -y > /dev/null 2>&1
echo -e "${GREEN}✓ System updated${NC}"

################################################################################
# Step 2: Install Docker
################################################################################
echo -e "\n${YELLOW}[2/8] Installing Docker...${NC}"
if ! command -v docker &> /dev/null; then
    sudo yum install docker -y > /dev/null 2>&1
    echo -e "${GREEN}✓ Docker installed${NC}"
else
    echo -e "${GREEN}✓ Docker already installed${NC}"
fi

################################################################################
# Step 3: Start Docker Service
################################################################################
echo -e "\n${YELLOW}[3/8] Starting Docker service...${NC}"
sudo systemctl start docker > /dev/null 2>&1
sudo systemctl enable docker > /dev/null 2>&1
echo -e "${GREEN}✓ Docker service started and enabled${NC}"

################################################################################
# Step 4: Add User to Docker Group
################################################################################
echo -e "\n${YELLOW}[4/8] Adding ec2-user to docker group...${NC}"
sudo usermod -aG docker ec2-user > /dev/null 2>&1
echo -e "${GREEN}✓ ec2-user added to docker group${NC}"
echo -e "${YELLOW}Note: Please log out and back in for group changes to take effect${NC}"

################################################################################
# Step 5: Create .env File
################################################################################
echo -e "\n${YELLOW}[5/8] Creating .env file...${NC}"
if [ ! -f ~/.env ]; then
    echo -e "${RED}ERROR: ~/.env file not found${NC}"
    echo "Please create ~/.env file with required environment variables"
    echo "You can use .env.example as a template"
    exit 1
else
    echo -e "${GREEN}✓ .env file exists${NC}"
fi

################################################################################
# Step 6: Install Docker Compose (Optional but recommended)
################################################################################
echo -e "\n${YELLOW}[6/8] Installing Docker Compose...${NC}"
if ! command -v docker-compose &> /dev/null; then
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose > /dev/null 2>&1
    sudo chmod +x /usr/local/bin/docker-compose > /dev/null 2>&1
    echo -e "${GREEN}✓ Docker Compose installed${NC}"
else
    echo -e "${GREEN}✓ Docker Compose already installed${NC}"
fi

################################################################################
# Step 7: Pull Docker Image
################################################################################
echo -e "\n${YELLOW}[7/8] Pulling Docker image from registry...${NC}"
docker pull ${DOCKER_IMAGE} 2>&1 | grep -v "Waiting\|Downloading\|Pull complete" || true
echo -e "${GREEN}✓ Docker image pulled${NC}"

################################################################################
# Step 8: Run Docker Container
################################################################################
echo -e "\n${YELLOW}[8/8] Starting Docker container...${NC}"

# Stop and remove existing container if it exists
if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo -e "${YELLOW}Stopping existing container...${NC}"
    docker stop ${CONTAINER_NAME} > /dev/null 2>&1 || true
    docker rm ${CONTAINER_NAME} > /dev/null 2>&1 || true
fi

# Run the container
docker run -d \
    --name ${CONTAINER_NAME} \
    -p ${PORT}:${PORT} \
    --env-file ~/.env \
    --restart unless-stopped \
    ${DOCKER_IMAGE}

echo -e "${GREEN}✓ Docker container started${NC}"

################################################################################
# Verification
################################################################################
echo -e "\n${YELLOW}Verifying deployment...${NC}"
sleep 3

if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo -e "${GREEN}✓ Container is running${NC}"
else
    echo -e "${RED}✗ Container failed to start${NC}"
    echo -e "${YELLOW}Checking logs:${NC}"
    docker logs ${CONTAINER_NAME}
    exit 1
fi

################################################################################
# Summary
################################################################################
echo -e "\n${BLUE}========================================${NC}"
echo -e "${GREEN}✓ Deployment Completed Successfully!${NC}"
echo -e "${BLUE}========================================${NC}"

echo -e "\n${YELLOW}Server Information:${NC}"
echo -e "Container Name: ${CONTAINER_NAME}"
echo -e "Docker Image: ${DOCKER_IMAGE}"
echo -e "Port: ${PORT}"
echo -e "Server URL: http://$(curl -s http://checkip.amazonaws.com):${PORT}"

echo -e "\n${YELLOW}Useful Commands:${NC}"
echo "View logs:        docker logs -f ${CONTAINER_NAME}"
echo "Stop container:   docker stop ${CONTAINER_NAME}"
echo "Start container:  docker start ${CONTAINER_NAME}"
echo "Restart container: docker restart ${CONTAINER_NAME}"
echo "Remove container: docker rm ${CONTAINER_NAME}"

echo -e "\n${YELLOW}Next Steps:${NC}"
echo "1. Verify server is running: curl http://localhost:${PORT}"
echo "2. Check logs: docker logs -f ${CONTAINER_NAME}"
echo "3. Update security group to allow port ${PORT} from your IP"
echo "4. Update frontend API URL to point to this server"

echo -e "\n"
