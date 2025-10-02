# Chain ID Configuration Fix

## Problem
The Devnet and Sepolia networks were using the same chain ID, causing a conflict when both networks were configured in `targetNetworks`.

## Solution Implemented
Configured Devnet to use a custom chain ID (`SN_DEVNET`) to avoid conflicts with Sepolia.

## Changes Made

### 1. Updated Devnet Startup Command
**File:** `packages/snfoundry/package.json`

Changed the `chain` script to include a custom chain ID:
```json
"chain": "starknet-devnet --seed 0 --chain-id SN_DEVNET"
```

### 2. Updated Frontend Chain Configuration
**File:** `packages/nextjs/supportedChains.ts`

Updated the `devnet` configuration to use the custom chain ID:
```typescript
const devnet = {
  ...chains.devnet,
  id: BigInt("0x534e5f4445564e4554"), // SN_DEVNET in hex
  rpcUrls: {
    default: {
      http: [],
    },
    public: {
      http: [`${rpcUrlDevnet}/rpc`],
    },
  },
} as const satisfies chains.Chain;
```

## How to Use

### Starting Devnet with Custom Chain ID
From your project root, run:
```bash
yarn chain
```

This will start Devnet with the custom chain ID `SN_DEVNET`.

### Network Configuration
Your `scaffold.config.ts` already has both networks configured:
```typescript
targetNetworks: [chains.sepolia, chains.devnet]
```

Now each network has a unique chain ID:
- **Sepolia**: `0x534e5f5345504f4c4941` (SN_SEPOLIA)
- **Devnet**: `0x534e5f4445564e4554` (SN_DEVNET)

### Deploying Contracts
Deploy to devnet:
```bash
yarn deploy
```

Deploy to sepolia:
```bash
yarn deploy --network sepolia
```

### Important Notes
1. **Always start Devnet with the custom chain ID** using `yarn chain`
2. If you start Devnet manually, use: `starknet-devnet --seed 0 --chain-id SN_DEVNET`
3. The frontend will automatically recognize the custom Devnet chain ID
4. Make sure any existing Devnet instances are stopped before starting with the new chain ID

## Chain IDs Reference
- **Mainnet**: `0x534e5f4d41494e` (SN_MAIN)
- **Sepolia**: `0x534e5f5345504f4c4941` (SN_SEPOLIA)  
- **Devnet (Custom)**: `0x534e5f4445564e4554` (SN_DEVNET)

## Verification
You can verify the configuration has no errors by running:
```bash
yarn next:lint --file supportedChains.ts --file scaffold.config.ts
```

## Next Steps
1. Stop any running Devnet instances
2. Start Devnet with the new configuration: `yarn chain`
3. Deploy your contracts: `yarn deploy`
4. Start your frontend: `yarn start`

The chain ID conflict is now resolved, and you can use both Sepolia and Devnet simultaneously without issues.

