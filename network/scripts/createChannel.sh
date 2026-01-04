#!/bin/bash
# network/scripts/createChannel.sh
# Automates channel joining for Orderer and all Peers

set -e

# Configuration
ORDERER_CA=/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/ordererOrganizations/voting.com/orderers/orderer.voting.com/tls/ca.crt
ADMIN_CERT=/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/ordererOrganizations/voting.com/users/Admin@voting.com/tls/client.crt
ADMIN_KEY=/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/ordererOrganizations/voting.com/users/Admin@voting.com/tls/client.key

# Colors
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m'

echo -e "${YELLOW}Step 4.1: Joining Orderer to votingchannel...${NC}"
docker exec cli osnadmin channel join --channelID votingchannel \
  --config-block ./channel-artifacts/votingchannel.block \
  -o orderer.voting.com:7053 --ca-file $ORDERER_CA \
  --client-cert $ADMIN_CERT --client-key $ADMIN_KEY

echo -e "${YELLOW}Step 4.2: Joining ITB peers to the channel...${NC}"
# Join Peer0 ITB (Default CLI environment)
docker exec cli peer channel join -b ./channel-artifacts/votingchannel.block

# Join Peer1 ITB
docker exec \
  -e CORE_PEER_ADDRESS=peer1.itb.ac.id:8051 \
  -e CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/itb.ac.id/peers/peer1.itb.ac.id/tls/ca.crt \
  cli peer channel join -b ./channel-artifacts/votingchannel.block

echo -e "${YELLOW}Step 4.3: Joining KPU peers to the channel...${NC}"
# Join Peer0 KPU
docker exec \
  -e CORE_PEER_ADDRESS=peer0.kpu.itb.ac.id:9051 \
  -e CORE_PEER_LOCALMSPID=KPUMSP \
  -e CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/kpu.itb.ac.id/users/Admin@kpu.itb.ac.id/msp \
  -e CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/kpu.itb.ac.id/peers/peer0.kpu.itb.ac.id/tls/ca.crt \
  cli peer channel join -b ./channel-artifacts/votingchannel.block

# Join Peer1 KPU
docker exec \
  -e CORE_PEER_ADDRESS=peer1.kpu.itb.ac.id:10051 \
  -e CORE_PEER_LOCALMSPID=KPUMSP \
  -e CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/kpu.itb.ac.id/users/Admin@kpu.itb.ac.id/msp \
  -e CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/kpu.itb.ac.id/peers/peer1.kpu.itb.ac.id/tls/ca.crt \
  cli peer channel join -b ./channel-artifacts/votingchannel.block

echo -e "${GREEN}✓ All 4 peers and orderer joined successfully${NC}"