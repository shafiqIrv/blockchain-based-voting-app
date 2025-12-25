# Voting Blockchain

Aplikasi voting berbasis blockchain untuk pemilihan mahasiswa ITB menggunakan Hyperledger Fabric.

## Tech Stack

-   **Frontend**: Next.js (TypeScript)
-   **Backend API**: Hono.js (TypeScript)
-   **Blockchain**: Hyperledger Fabric
-   **Smart Contract**: TypeScript Chaincode

## Project Structure

```
voting-blockchain/
├── frontend/          # Next.js application
├── backend/           # Hono.js API server
├── chaincode/         # Hyperledger Fabric smart contract
├── oracle/            # SSO ITB integration service
├── shared/            # Shared TypeScript types
└── network/           # Fabric network configuration
```

## Getting Started

### Prerequisites

-   Node.js >= 18.0.0
-   pnpm >= 9.0.0
-   Docker & Docker Compose (for Fabric network)

### Installation

```bash
# Install dependencies
pnpm install

# Run frontend development server
pnpm dev:frontend

# Run backend development server
pnpm dev:backend
```

## Documentation

See [plan.md](./plan.md) for detailed implementation plan and architecture documentation.
