#!/bin/bash
# network/scripts/deployCC.sh
# Automates full chaincode lifecycle for 2 nodes per organization

set -e

# Configuration
CC_NAME="voting"
CC_VERSION="1.0"
CC_SRC_PATH="/opt/gopath/src/github.com/hyperledger/fabric/peer/chaincode"
ORDERER_CA=/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/ordererOrganizations/voting.com/orderers/orderer.voting.com/tls/ca.crt

# Colors
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m'

echo -e "${YELLOW}Step 5.1: Packaging chaincode...${NC}"
docker exec cli peer lifecycle chaincode package ${CC_NAME}.tar.gz --path ${CC_SRC_PATH} --lang node --label ${CC_NAME}_${CC_VERSION}

echo -e "${YELLOW}Step 5.2: Installing on ITB peers...${NC}"
# Install on Peer0 ITB
docker exec cli peer lifecycle chaincode install ${CC_NAME}.tar.gz
# Install on Peer1 ITB
docker exec \
  -e CORE_PEER_ADDRESS=peer1.itb.ac.id:8051 \
  -e CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/itb.ac.id/peers/peer1.itb.ac.id/tls/ca.crt \
  cli peer lifecycle chaincode install ${CC_NAME}.tar.gz

echo -e "${YELLOW}Step 5.3: Installing on KPU peers...${NC}"
# Environment for KPU Peer0
KPU_PEER0_ENV="-e CORE_PEER_ADDRESS=peer0.kpu.itb.ac.id:9051 -e CORE_PEER_LOCALMSPID=KPUMSP -e CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/kpu.itb.ac.id/users/Admin@kpu.itb.ac.id/msp -e CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/kpu.itb.ac.id/peers/peer0.kpu.itb.ac.id/tls/ca.crt"
# Environment for KPU Peer1
KPU_PEER1_ENV="-e CORE_PEER_ADDRESS=peer1.kpu.itb.ac.id:10051 -e CORE_PEER_LOCALMSPID=KPUMSP -e CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/kpu.itb.ac.id/users/Admin@kpu.itb.ac.id/msp -e CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/kpu.itb.ac.id/peers/peer1.kpu.itb.ac.id/tls/ca.crt"

docker exec $KPU_PEER0_ENV cli peer lifecycle chaincode install ${CC_NAME}.tar.gz
docker exec $KPU_PEER1_ENV cli peer lifecycle chaincode install ${CC_NAME}.tar.gz

echo -e "${YELLOW}Step 5.4: Getting Package ID...${NC}"
PACKAGE_ID=$(docker exec cli peer lifecycle chaincode queryinstalled | grep "${CC_NAME}_${CC_VERSION}" | sed -n 's/.*Package ID: \(.*\), Label.*/\1/p')
echo "Package ID: $PACKAGE_ID"

echo -e "${YELLOW}Step 5.5: Approving for both organizations...${NC}"
# Approve for ITB (Default CLI points to ITB Peer0)
docker exec cli peer lifecycle chaincode approveformyorg -o orderer.voting.com:7050 --channelID votingchannel --name ${CC_NAME} --version ${CC_VERSION} --package-id ${PACKAGE_ID} --sequence 1 --tls --cafile ${ORDERER_CA}

# Approve for KPU (Using Peer0 KPU environment)
docker exec $KPU_PEER0_ENV cli peer lifecycle chaincode approveformyorg -o orderer.voting.com:7050 --channelID votingchannel --name ${CC_NAME} --version ${CC_VERSION} --package-id ${PACKAGE_ID} --sequence 1 --tls --cafile ${ORDERER_CA}

echo -e "${YELLOW}Step 5.6: Committing chaincode definition...${NC}"
# Commit requires endorsement from both organizations
docker exec cli peer lifecycle chaincode commit -o orderer.voting.com:7050 --channelID votingchannel --name ${CC_NAME} --version ${CC_VERSION} --sequence 1 --tls --cafile ${ORDERER_CA} \
  --peerAddresses peer0.itb.ac.id:7051 --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/itb.ac.id/peers/peer0.itb.ac.id/tls/ca.crt \
  --peerAddresses peer0.kpu.itb.ac.id:9051 --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/kpu.itb.ac.id/peers/peer0.kpu.itb.ac.id/tls/ca.crt

echo -e "${GREEN}✓ Chaincode '${CC_NAME}' deployed successfully on all 4 nodes${NC}"