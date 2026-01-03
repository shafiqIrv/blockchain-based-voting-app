#!/bin/bash
# Complete setup script for Hyperledger Fabric voting network
# This script sets up the entire network from scratch

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NETWORK_DIR="$(dirname "$SCRIPT_DIR")"
PROJECT_DIR="$(dirname "$NETWORK_DIR")"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}"
echo "╔════════════════════════════════════════════════════════════╗"
echo "║     Pemira KM ITB Blockchain - Network Setup                  ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Check prerequisites
echo -e "${YELLOW}Checking prerequisites...${NC}"

command -v docker >/dev/null 2>&1 || { echo -e "${RED}Docker is required but not installed.${NC}" >&2; exit 1; }
command -v docker-compose >/dev/null 2>&1 || { echo -e "${RED}Docker Compose is required but not installed.${NC}" >&2; exit 1; }

echo -e "${GREEN}✓ Prerequisites OK${NC}"

# Function to generate crypto materials
generate_crypto() {
    echo -e "\n${YELLOW}Step 1: Generating crypto materials...${NC}"
    
    if command -v cryptogen >/dev/null 2>&1; then
        cd "$NETWORK_DIR"
        cryptogen generate --config=./crypto-config.yaml --output=./organizations
        echo -e "${GREEN}✓ Crypto materials generated${NC}"
    else
        echo -e "${YELLOW}⚠ cryptogen not found. Using placeholder certificates.${NC}"
        echo "  To generate real certificates, install Fabric binaries:"
        echo "  curl -sSLO https://raw.githubusercontent.com/hyperledger/fabric/main/scripts/install-fabric.sh"
        echo "  chmod +x install-fabric.sh && ./install-fabric.sh binary"
    fi
}

# Function to generate channel artifacts
generate_channel_artifacts() {
    echo -e "\n${YELLOW}Step 2: Generating channel artifacts...${NC}"
    
    if command -v configtxgen >/dev/null 2>&1; then
        cd "$NETWORK_DIR"
        export FABRIC_CFG_PATH="$NETWORK_DIR/configtx"
        
        # Generate genesis block
        configtxgen -profile VotingOrdererGenesis -channelID system-channel -outputBlock ./channel-artifacts/genesis.block
        
        # Generate channel transaction
        configtxgen -profile VotingChannel -outputCreateChannelTx ./channel-artifacts/votingchannel.tx -channelID votingchannel
        
        echo -e "${GREEN}✓ Channel artifacts generated${NC}"
    else
        echo -e "${YELLOW}⚠ configtxgen not found. Skipping channel artifact generation.${NC}"
    fi
}

# Function to start the network
start_network() {
    echo -e "\n${YELLOW}Step 3: Starting Docker containers...${NC}"
    
    cd "$NETWORK_DIR/docker"
    docker-compose up -d
    
    echo -e "${GREEN}✓ Network containers started${NC}"
    
    # Wait for containers to be ready
    echo "Waiting for containers to be ready..."
    sleep 5
    
    docker-compose ps
}

# Function to create channel
create_channel() {
    echo -e "\n${YELLOW}Step 4: Creating voting channel...${NC}"
    
    # This would be done via CLI container in a real setup
    echo -e "${YELLOW}⚠ Channel creation requires Fabric binaries.${NC}"
    echo "  Run the following commands in the CLI container:"
    echo "  peer channel create -o orderer.voting.com:7050 -c votingchannel -f /channel-artifacts/votingchannel.tx"
    echo "  peer channel join -b votingchannel.block"
}

# Function to deploy chaincode
deploy_chaincode() {
    echo -e "\n${YELLOW}Step 5: Deploying chaincode...${NC}"
    
    echo -e "${YELLOW}⚠ Chaincode deployment requires Fabric binaries.${NC}"
    echo "  Steps to deploy:"
    echo "  1. Package: peer lifecycle chaincode package voting.tar.gz --path ../chaincode --lang node --label voting_1.0"
    echo "  2. Install: peer lifecycle chaincode install voting.tar.gz"
    echo "  3. Approve: peer lifecycle chaincode approveformyorg ..."
    echo "  4. Commit: peer lifecycle chaincode commit ..."
}

# Main execution
echo -e "\n${BLUE}Starting setup...${NC}\n"

generate_crypto
generate_channel_artifacts
start_network
create_channel
deploy_chaincode

echo -e "\n${GREEN}"
echo "╔════════════════════════════════════════════════════════════╗"
echo "║     Setup Complete!                                        ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

echo "Next steps:"
echo "  1. Install Fabric binaries if not already installed"
echo "  2. Generate real crypto materials with cryptogen"
echo "  3. Create and join the voting channel"
echo "  4. Deploy the chaincode"
echo ""
echo "For development without Fabric, the backend runs in mock mode."
echo "Start the backend: cd ../backend && pnpm dev"
echo "Start the frontend: cd ../frontend && pnpm dev"
