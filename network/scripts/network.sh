#!/bin/bash
# Network management script for Hyperledger Fabric voting network

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NETWORK_DIR="$(dirname "$SCRIPT_DIR")"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

function printHelp() {
    echo "Usage: ./network.sh <command>"
    echo ""
    echo "Commands:"
    echo "  up        - Start the Fabric network"
    echo "  down      - Stop and clean up the network"
    echo "  restart   - Restart the network"
    echo "  status    - Show network status"
    echo ""
}

function networkUp() {
    echo -e "${GREEN}Starting Hyperledger Fabric network...${NC}"
    
    cd "$NETWORK_DIR/docker"
    docker-compose up -d
    
    echo -e "${GREEN}Network started successfully!${NC}"
    echo ""
    echo "Services running:"
    docker-compose ps
}

function networkDown() {
    echo -e "${YELLOW}Stopping Hyperledger Fabric network...${NC}"
    
    cd "$NETWORK_DIR/docker"
    docker-compose down -v
    
    # Clean up chaincode containers
    docker rm -f $(docker ps -aq --filter "name=dev-peer") 2>/dev/null || true
    docker rmi -f $(docker images -q --filter "reference=dev-peer*") 2>/dev/null || true
    
    echo -e "${GREEN}Network stopped and cleaned up.${NC}"
}

function networkStatus() {
    echo -e "${GREEN}Network Status:${NC}"
    cd "$NETWORK_DIR/docker"
    docker-compose ps
}

# Parse command
case "$1" in
    up)
        networkUp
        ;;
    down)
        networkDown
        ;;
    restart)
        networkDown
        networkUp
        ;;
    status)
        networkStatus
        ;;
    *)
        printHelp
        ;;
esac
