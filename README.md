# GaneshaVote: ITB Blockchain Voting System

A blockchain-based voting application for ITB student elections (Pemira) using Hyperledger Fabric and SSO Integration.

## Tech Stack

-   **Frontend**: Next.js 14 (TypeScript)
-   **Backend API**: Hono.js (TypeScript)
-   **Blockchain**: Hyperledger Fabric v2.5
-   **Smart Contract**: TypeScript Chaincode
-   **Identity**: SSO ITB Integration (Oracle Service)

## Project Structure

```
voting-blockchain/
├── frontend/          # Next.js application (Port: 3000)
├── backend/           # Hono.js API server (Port: 8000)
├── chaincode/         # Hyperledger Fabric smart contract
├── oracle/            # SSO ITB integration service
├── shared/            # Shared TypeScript types
├── network/           # Fabric network configuration & scripts
└── bin/               # Hyperledger Fabric binaries
```

## Getting Started

### 1. Prerequisites

Ensure you have the following installed:

-   **Node.js** >= 18.0.0
-   **pnpm** >= 9.0.0
-   **Docker** & **Docker Compose** (V2)
-   **Go** >= 1.21 (required for chaincode lifecycle)
-   **Git**

### 2. Installation

1.  **Install Application Dependencies**

    ```bash
    pnpm install
    ```

2.  **Install Hyperledger Fabric Binaries**
    This script downloads Fabric binaries (peer, orderer, configtxgen, etc.) to the `bin/` directory.

    ```bash
    # Downloads Fabric v2.5.14 and CA v1.5.15 binaries & docker images
    ./install-fabric.sh binary docker
    ```

### 3. Environment Setup

Configure environment variables for each service.

**Backend**
```bash
cp backend/.env.example backend/.env
# Edit backend/.env to match your configuration
```

**Frontend**
```bash
cp frontend/env.example frontend/.env
# Edit frontend/.env to match your configuration
```

**Oracle Service**
Ensure you have a `.env` file in `oracle/` with necessary SSO configuration.

### 4. Blockchain Network Setup

We provide an automated setup script to clean, generate crypto, create channel, and deploy chaincode.

```bash
cd network
./scripts/setup.sh
cd ..
```

**Note**: This process may take a few minutes. If it fails, ensure Docker is running and try again.

### 5. Running the Application

Open separate terminals for each service:

**Terminal 1: Backend API**
```bash
pnpm dev:backend
```

**Terminal 2: Frontend**
```bash
pnpm dev:frontend
```

**Terminal 3: Oracle Service**
```bash
pnpm --filter oracle dev
```

The application should now be accessible at `http://localhost:3000`.

## Troubleshooting

### Restart Network (Preserve Data)
To restart the blockchain network (peer/orderer containers) *without* losing the ledger data or resetting the setup:

1.  Navigate to the docker directory:
    ```bash
    cd network/docker
    ```
2.  Start the containers:
    ```bash
    docker compose up -d
    ```

**Warning**: Do NOT run `./network/scripts/setup.sh` or `./network/scripts/network.sh down` if you wish to preserve the data, as these commands will wipe the volumes.

### Reset Network
If you encounter blockchain errors or want to start fresh:

```bash
cd network
./scripts/network.sh down
./scripts/network.sh down
./scripts/setup.sh
```

The setup script now automatically handles application credentials (admin enrollment), so you don't need to run manual enrollment steps after a reset.

### Manual Setup Steps (if not using setup.sh)
If you configure the network manually, you **must** enroll the backend admin identity before the API will work:

```bash
cd backend
pnpm run setup
```

### Common Issues
-   **"Binaries not found"**: Ensure you ran `./install-fabric.sh` and that `bin/` exists in the root.
-   **Docker permission errors**: Ensure your user is in the `docker` group (Linux) or Docker Desktop is running (Windows/Mac).
-   **Chaincode install failed**: Check if you have Go installed, as it's required to package the chaincode.

## Database Management

### Backup Oracle Database
The Oracle service uses a local SQLite database. To create a backup:

```bash
cd oracle
pnpm run backup
```

This will create a timestamped copy in `oracle/data/backups/`.

### Migrate to New Host
To move the database to a fresh installation:
1.  Run `pnpm run backup` on the old host.
2.  Copy the backup file to the new host.
3.  Place it at `oracle/data/database.sqlite`.

## Documentation

See [plan.md](./plan.md) for detailed implementation plan and architecture documentation.
