# FlipRush 🪙🚀

A lightweight Web3 PvP coin flip game built on **Arc Network**.

## Features
- **Instant PvP**: Match against other players in real-time.
- **Fixed Wagers**: 0.1 USDC entry for simplicity.
- **Neon Aesthetic**: Modern, premium "crypto casino" design.
- **Fully On-chain**: Games settled on Arc Testnet.
- **Mobile-first**: Responsive design for gaming on the go.

## Tech Stack
- **Smart Contracts**: Solidity, Hardhat, OpenZeppelin.
- **Backend**: Node.js, TypeScript, Socket.io, Prisma, PostgreSQL.
- **Frontend**: Next.js 14, TailwindCSS, Framer Motion, RainbowKit, Wagmi.

## Getting Started

### 1. Smart Contracts
```bash
cd contracts
npm install
# Add your PRIVATE_KEY to .env
npx hardhat compile
npx hardhat run scripts/deploy.ts --network arcTestnet
```

### 2. Backend
```bash
cd backend
npm install
# Add your DATABASE_URL to .env
npx prisma generate
npx prisma db push
npm run dev
```

### 3. Frontend
```bash
cd frontend
npm install
npm run dev
```

## Game Rules
- **Entry Fee**: 0.1 USDC
- **Winning Payout**: 0.19 USDC
- **Protocol Fee**: 0.01 USDC
- **Arc Testnet USDC**: `0x3600000000000000000000000000000000000000`

## Architecture
- **Matchmaking**: Handled via WebSockets for zero-latency lobby experience.
- **Escrow**: Smart contract holds funds until both players join.
- **Settlement**: Winner determined on-chain using pseudo-randomness (block-hash based).

---
Built with ❤️ for Arc Network.
