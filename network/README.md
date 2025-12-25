# Hyperledger Fabric Network Configuration

This directory contains the configuration and scripts for running the Hyperledger Fabric network.

## Prerequisites

-   Docker and Docker Compose
-   Hyperledger Fabric binaries (fabric-samples)
-   Go 1.21+ (for chaincode)

## Directory Structure

```
network/
├── docker/
│   ├── docker-compose.yml          # Main Fabric network
│   └── docker-compose.explorer.yml # Hyperledger Explorer
├── organizations/
│   ├── ordererOrganizations/       # Orderer certificates
│   └── peerOrganizations/          # Peer certificates
│       ├── itb.ac.id/              # ITB organization
│       └── kpu.itb.ac.id/          # KPU organization
├── channel-artifacts/              # Channel configuration
├── configtx/
│   └── configtx.yaml               # Network configuration
└── scripts/
    ├── network.sh                  # Network management
    ├── createChannel.sh            # Channel creation
    └── deployCC.sh                 # Chaincode deployment
```

## Quick Start

```bash
# Start the network
./scripts/network.sh up

# Create the voting channel
./scripts/createChannel.sh

# Deploy the chaincode
./scripts/deployCC.sh

# Stop the network
./scripts/network.sh down
```

## Organizations

1. **ITB (itb.ac.id)**: Main organization representing ITB
2. **KPU (kpu.itb.ac.id)**: Election committee organization

Both organizations must endorse voting transactions for them to be valid.
