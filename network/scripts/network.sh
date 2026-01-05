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
    docker compose up -d
    
    echo -e "${GREEN}Network started successfully!${NC}"
    echo ""
    echo "Services running:"
    docker compose ps
}

function stopDevServers() {
    echo -e "${YELLOW}Stopping dev servers (Oracle, Backend, Frontend)...${NC}"
    
    # 1. Windows: Force kill all Node.exe processes
    # This stops the servers holding file locks on database.sqlite
    MSYS_NO_PATHCONV=1 taskkill //F //IM node.exe //T 2>/dev/null || true

    # 2. Linux/Mac Fallback (if running in WSL/Unix)
    if command -v pkill >/dev/null 2>&1; then
        pkill -f "next-server" 2>/dev/null || true
        pkill -f "ts-node" 2>/dev/null || true
        pkill -f "node" 2>/dev/null || true
    fi

    echo -e "${GREEN}Dev servers stopped.${NC}"
}

function networkDown() {
    echo -e "${YELLOW}Stopping Hyperledger Fabric network...${NC}"
    
    stopDevServers

    cd "$NETWORK_DIR/docker"
    docker compose down -v
    
    # Clean up chaincode containers
    docker rm -f $(docker ps -aq --filter "name=dev-peer") 2>/dev/null || true
    docker rmi -f $(docker images -q --filter "reference=dev-peer*") 2>/dev/null || true
    
    echo -e "${GREEN}Network stopped and cleaned up.${NC}"
}

function networkStatus() {
    echo -e "${GREEN}Network Status:${NC}"
    cd "$NETWORK_DIR/docker"
    docker compose ps
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
