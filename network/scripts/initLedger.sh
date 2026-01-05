#!/bin/bash
# network/scripts/initLedger.sh
# Initializes the ledger with default election data

set -e

# Configuration
ORDERER_CA=/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/ordererOrganizations/voting.com/orderers/orderer.voting.com/tls/ca.crt
CC_NAME="voting"

# Colors
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m'

echo -e "${YELLOW}Initializing Ledger with default election...${NC}"

# Election ID
ELECTION_ID="election-2024"
NAME="Pemira KM ITB 2024"

# Dates (UTC ISO format)
# Default: Active election
START_TIME="2024-01-01T00:00:00.000Z"
END_TIME="2026-12-31T23:59:59.000Z"

# Pre-escaped JSON for candidates to avoid 'sed' dependency issues on Windows
# Original: [{"id":"1","name":"Budi Santoso","vision":"Maju Bersama ITB","imageUrl":""},{"id":"2","name":"Siti Aminah","vision":"ITB Inovatif","imageUrl":""}]
CANDIDATES_ESCAPED="[{\\\"id\\\":\\\"1\\\",\\\"name\\\":\\\"Budi Santoso\\\",\\\"vision\\\":\\\"Maju Bersama ITB\\\",\\\"imageUrl\\\":\\\"\\\"},{\\\"id\\\":\\\"2\\\",\\\"name\\\":\\\"Siti Aminah\\\",\\\"vision\\\":\\\"ITB Inovatif\\\",\\\"imageUrl\\\":\\\"\\\"}]"

echo "Initializing $ELECTION_ID..."

docker exec cli peer chaincode invoke \
  -o orderer.voting.com:7050 \
  --tls --cafile $ORDERER_CA \
  --channelID votingchannel \
  --name $CC_NAME \
  --peerAddresses peer0.itb.ac.id:7051 --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/itb.ac.id/peers/peer0.itb.ac.id/tls/ca.crt \
  --peerAddresses peer0.kpu.itb.ac.id:9051 --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/kpu.itb.ac.id/peers/peer0.kpu.itb.ac.id/tls/ca.crt \
  -c "{\"function\":\"initElection\",\"Args\":[\"$ELECTION_ID\",\"$NAME\",\"$START_TIME\",\"$END_TIME\",\"$CANDIDATES_ESCAPED\"]}"

echo -e "${GREEN}✓ Ledger initialized for $ELECTION_ID${NC}"
