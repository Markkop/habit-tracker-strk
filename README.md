# HabitChain (Starknet)

HabitChain is a Starknet‑based dApp that turns self‑discipline into a financial commitment.

Users lock funds on their own habit, complete daily check‑ins, and—if successful—reclaim their stake plus yield.  
If they fail, the locked fund is slashed to the protocol treasury (or, in groups, redistributed to successful peers).

The prototype proves one essential on‑chain action: **commit → check‑in → settle**

By adding real consequences and immediate feedback, HabitChain closes the “motivation gap”, aligning personal progress with tangible rewards.

## Details

- Network: Starknet Sepolia Testnet
- Address: [0x217aea3df1315f6969b75aaf13e08a465abf047cf4ae7f1fa44d636c950d9c5](https://sepolia.starkscan.co/contract/0x217aea3df1315f6969b75aaf13e08a465abf047cf4ae7f1fa44d636c950d9c5)
- ABI: [https://github.com/Markkop/habit-tracker-strk/blob/main/packages/nextjs/contracts/deployedContracts.ts#L1047](https://github.com/Markkop/habit-tracker-strk/blob/main/packages/nextjs/contracts/deployedContracts.ts#L1047)

## Testing Instructions

1. Go to https://markkop.github.io/habit-tracker-strk/habits/
2. Setup/connect wallet (see [Connecting to Starknet](https://www.starknet.io/blog/getting-started-using-starknet-setting-up-a-starknet-wallet/))
3. Deposit funds
4. Create two habits
5. Fund habits (It costs 10 STRK each)
6. Check-in one habit, but don't do the other
7. Force settle to avoid needing to wait until 00:00 UTC
8. Notice you know have 10 STRK as rewards from the checked-in habit and see some extra yield

Note: you might need to refresh the page in between some steps if the UI don't update

## Technology Stack

This project was bootstraped with [scaffold-stark-2](https://github.com/Scaffold-Stark/scaffold-stark-2) and includes the following:

- [Next.js](https://nextjs.org/) (v15.2.4) - React framework for the frontend
- [React](https://react.dev/) (v19.0.0) - UI library
- [TypeScript](https://www.typescriptlang.org/) (v5) - Type-safe JavaScript
- [Starknet.js](https://www.starknetjs.com/) (v8.5.3) - JavaScript library for Starknet interaction
- [Starknet-React](https://github.com/apibara/starknet-react) (v5.0.1) - React hooks for Starknet
- [Cairo](https://www.cairo-lang.org/) - Smart contract language for Starknet
- [Starknet Foundry](https://foundry-rs.github.io/starknet-foundry/) - Testing and deployment framework
- [OpenZeppelin Contracts](https://github.com/OpenZeppelin/cairo-contracts) (v2.0.0) - Secure smart contract library
- [TailwindCSS](https://tailwindcss.com/) (v4) - Utility-first CSS framework
- [daisyUI](https://daisyui.com/) (v4) - Tailwind CSS component library
- [Scaffold-Stark Burner Wallet](https://www.npmjs.com/package/@scaffold-stark/stark-burner) - Built-in development wallet

## Team

- [Markkop](https://github.com/Markkop)
- [dutragustavo](https://github.com/dutragustavo)
- [hpereira1](https://github.com/hpereira1)
- [artur-simon](https://github.com/artur-simon)

## References

- [CryptoLar × Starknet: O Hackathon — Ato I](https://luma.com/cryptolar-starknet-hackathon?tk=e1RsoL&utm_source=chatgpt.com)
- [Cair Coder MCP](https://www.cairo-coder.com/)
- [Starknet Tutorials](https://www.starknet.io/tutorials/?utm_source=chatgpt.com)

## Development Setup Instructions

- Clone the repository
- Run `yarn install` to install the dependencies
- Run `yarn start` to run the frontend
- Visit `http://localhost:3000` to see the app
- Run `yarn chain` to run the local Starknet network
- Run `yarn deploy` to deploy the contracts
- When running locally, use `targetNetworks: [chains.devnet]` in `packages/nextjs/scaffold.config.ts`
- But when deploying to the testnet, use `targetNetworks: [chains.sepolia]`
