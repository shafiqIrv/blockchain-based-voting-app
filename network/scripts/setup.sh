#!/bin/bash
# network/scripts/setup.sh
# Complete automated setup for Hyperledger Fabric voting network

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
echo "║     Pemira KM ITB Blockchain - Automated Network Setup     ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Check prerequisites
echo -e "${YELLOW}Checking prerequisites...${NC}"
command -v docker >/dev/null 2>&1 || { echo -e "${RED}Docker is required but not installed.${NC}" >&2; exit 1; }
# Check for compose plugin instead of legacy binary
docker compose version >/dev/null 2>&1 || { echo -e "${RED}Docker Compose (v2) is required but not installed.${NC}" >&2; exit 1; }

# Ensure Fabric binaries are in PATH
export PATH=$PATH:$PROJECT_DIR/bin
command -v cryptogen >/dev/null 2>&1 || { echo -e "${RED}Fabric binaries not found in PATH.${NC}" >&2; exit 1; }

echo -e "${GREEN}✓ Prerequisites OK${NC}"

# Step 1: Deep Clean
echo -e "\n${YELLOW}Step 1: Cleaning previous network state...${NC}"
cd "$NETWORK_DIR"
./scripts/network.sh down >/dev/null 2>&1 || true
docker volume prune -f >/dev/null 2>&1 || true
sudo rm -rf organizations/ordererOrganizations organizations/peerOrganizations
sudo rm -rf channel-artifacts/*.block channel-artifacts/*.tx
echo -e "${GREEN}✓ Network cleaned${NC}"

# Step 2: Generate Crypto Materials
echo -e "\n${YELLOW}Step 2: Generating crypto materials...${NC}"
cryptogen generate --config=./crypto-config.yaml --output=./organizations
echo -e "${GREEN}✓ Crypto materials generated${NC}"

# Step 3: Generate Channel Artifacts (Participation API style)
echo -e "\n${YELLOW}Step 3: Generating channel genesis block...${NC}"
export FABRIC_CFG_PATH="$NETWORK_DIR/configtx"
configtxgen -profile VotingChannel -outputBlock ./channel-artifacts/votingchannel.block -channelID votingchannel
echo -e "${GREEN}✓ votingchannel.block generated${NC}"

# Step 4: Start Network
echo -e "\n${YELLOW}Step 4: Starting Docker containers...${NC}"
cd "$NETWORK_DIR/docker"
docker compose up -d
echo -e "${GREEN}✓ Containers started${NC}"

# Step 4.1: Generate Connection Profile
echo -e "\n${YELLOW}Step 4.1: Generating connection profile...${NC}"
chmod +x "$SCRIPT_DIR/ccp-generate.sh"
# Use Node.js script for Windows compatibility (awk/sed replacement)
node "$SCRIPT_DIR/ccp-generate.js"
echo -e "${GREEN}✓ connection.json generated${NC}"

echo "Waiting for containers to be ready..."
sleep 5

# Step 5: Create Channel
echo -e "\n${YELLOW}Step 5: Automating channel creation and join...${NC}"
chmod +x "$SCRIPT_DIR/createChannel.sh"
"$SCRIPT_DIR/createChannel.sh"

# Step 6: Deploy Chaincode
echo -e "\n${YELLOW}Step 6: Automating chaincode deployment...${NC}"
chmod +x "$SCRIPT_DIR/deployCC.sh"
"$SCRIPT_DIR/deployCC.sh"

# Step 7: Initialize Ledger
echo -e "\n${YELLOW}Step 7: Initializing ledger data...${NC}"
chmod +x "$SCRIPT_DIR/initLedger.sh"
"$SCRIPT_DIR/initLedger.sh"

echo -e "\n${GREEN}"
echo "╔════════════════════════════════════════════════════════════╗"
echo "╚════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Step 8: Setup Application Credentials
echo -e "\n${YELLOW}Step 8: Setup Application Credentials...${NC}"
cd "$PROJECT_DIR"
pnpm --filter backend setup
echo -e "${GREEN}✓ Application credentials setup complete${NC}"

echo -e "\n${GREEN}"
echo "╔════════════════════════════════════════════════════════════╗"
echo "║           Setup Complete! All systems are ready            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo -e "${NC}"