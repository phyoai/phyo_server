.PHONY: help build push run stop restart logs clean deploy-ec2

# Configuration
DOCKER_USERNAME ?= phyo
IMAGE_NAME = phyo-server
IMAGE_TAG = latest
CONTAINER_NAME = phyo-server
PORT = 4000
DOCKER_IMAGE = $(DOCKER_USERNAME)/$(IMAGE_NAME):$(IMAGE_TAG)

help:
	@echo "🚀 Phyo Server - Makefile Commands"
	@echo ""
	@echo "Local Development:"
	@echo "  make build           - Build Docker image locally"
	@echo "  make run             - Run Docker container locally"
	@echo "  make logs            - View container logs"
	@echo "  make logs-follow     - Follow container logs (real-time)"
	@echo "  make stop            - Stop running container"
	@echo "  make restart         - Restart container"
	@echo "  make clean           - Remove container and image"
	@echo "  make shell           - Open shell in running container"
	@echo ""
	@echo "Docker Hub & Deployment:"
	@echo "  make login           - Login to Docker Hub"
	@echo "  make push            - Push image to Docker Hub"
	@echo "  make pull            - Pull image from Docker Hub"
	@echo "  make deploy-ec2      - Deploy to EC2 (must SSH first)"
	@echo ""
	@echo "Docker Compose:"
	@echo "  make compose-up      - Start with docker-compose"
	@echo "  make compose-down    - Stop docker-compose"
	@echo ""
	@echo "Utilities:"
	@echo "  make test-endpoint   - Test if server is responding"
	@echo "  make health          - Check container health"
	@echo "  make stats           - Show container resource usage"
	@echo ""
	@echo "Example: make build DOCKER_USERNAME=yourusername"

# ============================================================================
# LOCAL DEVELOPMENT
# ============================================================================

build:
	@echo "🔨 Building Docker image: $(DOCKER_IMAGE)"
	docker build -t $(IMAGE_NAME):$(IMAGE_TAG) .
	@echo "✓ Image built successfully"

run:
	@echo "▶️  Running container: $(CONTAINER_NAME)"
	docker run -d \
		--name $(CONTAINER_NAME) \
		-p $(PORT):$(PORT) \
		--env-file .env \
		--restart unless-stopped \
		$(IMAGE_NAME):$(IMAGE_TAG)
	@echo "✓ Container started on port $(PORT)"
	@sleep 2
	@make test-endpoint

stop:
	@echo "⏹️  Stopping container: $(CONTAINER_NAME)"
	docker stop $(CONTAINER_NAME) || echo "Container not running"
	@echo "✓ Container stopped"

restart:
	@echo "🔄 Restarting container: $(CONTAINER_NAME)"
	docker restart $(CONTAINER_NAME) || make run
	@echo "✓ Container restarted"

clean:
	@echo "🧹 Cleaning up..."
	docker stop $(CONTAINER_NAME) 2>/dev/null || true
	docker rm $(CONTAINER_NAME) 2>/dev/null || true
	docker rmi $(IMAGE_NAME):$(IMAGE_TAG) 2>/dev/null || true
	@echo "✓ Cleanup complete"

logs:
	@docker logs $(CONTAINER_NAME)

logs-follow:
	@docker logs -f $(CONTAINER_NAME)

shell:
	@echo "Opening shell in $(CONTAINER_NAME)..."
	docker exec -it $(CONTAINER_NAME) /bin/sh

# ============================================================================
# DOCKER HUB & DEPLOYMENT
# ============================================================================

login:
	@echo "🔐 Logging into Docker Hub..."
	docker login

push: build
	@echo "📤 Tagging image: $(DOCKER_IMAGE)"
	docker tag $(IMAGE_NAME):$(IMAGE_TAG) $(DOCKER_IMAGE)
	@echo "📤 Pushing to Docker Hub..."
	docker push $(DOCKER_IMAGE)
	@echo "✓ Image pushed successfully"

pull:
	@echo "📥 Pulling image: $(DOCKER_IMAGE)"
	docker pull $(DOCKER_IMAGE)
	@echo "✓ Image pulled successfully"

deploy-ec2:
	@echo "🚀 EC2 Deployment"
	@echo "Make sure you:"
	@echo "  1. SSH into EC2: ssh -i key.pem ec2-user@IP"
	@echo "  2. Have created ~/.env file"
	@echo "  3. Have pushed image to Docker Hub"
	@echo ""
	@echo "Then run on EC2:"
	@echo "  docker pull $(DOCKER_IMAGE)"
	@echo "  docker run -d --name $(CONTAINER_NAME) -p $(PORT):$(PORT) --env-file ~/.env --restart unless-stopped $(DOCKER_IMAGE)"

# ============================================================================
# DOCKER COMPOSE
# ============================================================================

compose-up:
	@echo "▶️  Starting with docker-compose..."
	docker-compose up -d
	@echo "✓ Docker Compose services started"
	@sleep 2
	@make test-endpoint

compose-down:
	@echo "⏹️  Stopping docker-compose services..."
	docker-compose down
	@echo "✓ Docker Compose services stopped"

# ============================================================================
# UTILITIES
# ============================================================================

test-endpoint:
	@echo "🧪 Testing endpoint..."
	@curl -s http://localhost:$(PORT) && echo "✓ Server is responding" || echo "✗ Server not responding"

health:
	@echo "❤️  Checking container health..."
	@docker inspect --format='{{json .State.Health}}' $(CONTAINER_NAME) 2>/dev/null || echo "Health check not available"

stats:
	@echo "📊 Container resource usage:"
	@docker stats $(CONTAINER_NAME) --no-stream

ps:
	@docker ps --filter "name=$(CONTAINER_NAME)"

# ============================================================================
# COMBINED WORKFLOWS
# ============================================================================

setup-local: build run logs
	@echo "✓ Local setup complete"

update-ec2: build push
	@echo "✓ Code updated and pushed to Docker Hub"
	@echo "Now SSH to EC2 and run: docker pull $(DOCKER_IMAGE) && docker restart $(CONTAINER_NAME)"

# Default target
.DEFAULT_GOAL := help
