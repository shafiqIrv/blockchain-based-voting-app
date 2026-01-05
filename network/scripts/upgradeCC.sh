#!/bin/bash
# network/scripts/upgradeCC.sh
# Automates chaincode upgrade lifecycle for specific version and sequence

set -e

# Configuration
CC_NAME="voting"
CC_SRC_PATH="/opt/gopath/src/github.com/hyperledger/fabric/peer/chaincode"
ORDERER_CA=/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/ordererOrganizations/voting.com/orderers/orderer.voting.com/tls/ca.crt

# Colors
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

if [ "$#" -ne 2 ]; then
    echo -e "${RED}Error: Version and Sequence arguments required${NC}"
    echo "Usage: ./upgradeCC.sh <version> <sequence>"
    echo "Example: ./upgradeCC.sh 1.1 2"
    exit 1
fi

CC_VERSION=$1
CC_SEQUENCE=$2

echo -e "${GREEN}Starting Upgrade Process for Chaincode '${CC_NAME}'${NC}"
echo "Target Version: ${CC_VERSION}"
echo "Target Sequence: ${CC_SEQUENCE}"

echo -e "\n${YELLOW}Step 1: Packaging chaincode 'voting_${CC_VERSION}.tar.gz'...${NC}"
# Note: Using distinct label ${CC_NAME}_${CC_VERSION}
docker exec cli peer lifecycle chaincode package ${CC_NAME}_${CC_VERSION}.tar.gz --path ${CC_SRC_PATH} --lang node --label ${CC_NAME}_${CC_VERSION}

echo -e "\n${YELLOW}Step 2: Installing on ITB peers...${NC}"
# Install on Peer0 ITB
docker exec cli peer lifecycle chaincode install ${CC_NAME}_${CC_VERSION}.tar.gz

# Install on Peer1 ITB
docker exec \
  -e CORE_PEER_ADDRESS=peer1.itb.ac.id:8051 \
  -e CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/itb.ac.id/peers/peer1.itb.ac.id/tls/ca.crt \
  cli peer lifecycle chaincode install ${CC_NAME}_${CC_VERSION}.tar.gz


echo -e "\n${YELLOW}Step 3: Installing on KPU peers...${NC}"
# Define environments explicitly
KPU_PEER0_ENV="-e CORE_PEER_ADDRESS=peer0.kpu.itb.ac.id:9051 -e CORE_PEER_LOCALMSPID=KPUMSP -e CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/kpu.itb.ac.id/users/Admin@kpu.itb.ac.id/msp -e CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/kpu.itb.ac.id/peers/peer0.kpu.itb.ac.id/tls/ca.crt"
KPU_PEER1_ENV="-e CORE_PEER_ADDRESS=peer1.kpu.itb.ac.id:10051 -e CORE_PEER_LOCALMSPID=KPUMSP -e CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/kpu.itb.ac.id/users/Admin@kpu.itb.ac.id/msp -e CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/kpu.itb.ac.id/peers/peer1.kpu.itb.ac.id/tls/ca.crt"

docker exec $KPU_PEER0_ENV cli peer lifecycle chaincode install ${CC_NAME}_${CC_VERSION}.tar.gz
docker exec $KPU_PEER1_ENV cli peer lifecycle chaincode install ${CC_NAME}_${CC_VERSION}.tar.gz


echo -e "\n${YELLOW}Step 4: Getting Package ID...${NC}"
# Grep specifically for the new version label
PACKAGE_ID=$(docker exec cli peer lifecycle chaincode queryinstalled | grep "${CC_NAME}_${CC_VERSION}" | sed -n 's/.*Package ID: \(.*\), Label.*/\1/p')

if [ -z "$PACKAGE_ID" ]; then
    echo -e "${RED}Failed to get Package ID. Installation might have failed.${NC}"
    exit 1
fi
echo "Package ID: $PACKAGE_ID"


echo -e "\n${YELLOW}Step 5: Approving definition for both organizations (Seq: ${CC_SEQUENCE})...${NC}"

# Approve ITB
docker exec cli peer lifecycle chaincode approveformyorg -o orderer.voting.com:7050 --channelID votingchannel --name ${CC_NAME} --version ${CC_VERSION} --package-id ${PACKAGE_ID} --sequence ${CC_SEQUENCE} --tls --cafile ${ORDERER_CA}

# Approve KPU
docker exec $KPU_PEER0_ENV cli peer lifecycle chaincode approveformyorg -o orderer.voting.com:7050 --channelID votingchannel --name ${CC_NAME} --version ${CC_VERSION} --package-id ${PACKAGE_ID} --sequence ${CC_SEQUENCE} --tls --cafile ${ORDERER_CA}


echo -e "\n${YELLOW}Step 6: Committing upgrade definition...${NC}"
docker exec cli peer lifecycle chaincode commit -o orderer.voting.com:7050 --channelID votingchannel --name ${CC_NAME} --version ${CC_VERSION} --sequence ${CC_SEQUENCE} --tls --cafile ${ORDERER_CA} \
  --peerAddresses peer0.itb.ac.id:7051 --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/itb.ac.id/peers/peer0.itb.ac.id/tls/ca.crt \
  --peerAddresses peer0.kpu.itb.ac.id:9051 --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/kpu.itb.ac.id/peers/peer0.kpu.itb.ac.id/tls/ca.crt

echo -e "\n${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  UPGRADE COMPLETE                                          ║${NC}"
echo -e "${GREEN}║  Version: ${CC_VERSION}                                            ║${NC}"
echo -e "${GREEN}║  Sequence: ${CC_SEQUENCE}                                           ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
