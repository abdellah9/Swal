# Solana Exchange Fresh Wallet Tracker Bot

## Features

- Configurable list of exchange Solana addresses (Binance, OKX, etc).
- Monitors outgoing SOL transfers from those exchanges.
- If a recipient is a fresh wallet, bot tracks it.
- If a fresh wallet buys a new SPL token, bot auto-buys/sells using Sniperoo API.
- Chain tracking: If the fresh wallet sends to another fresh wallet, the process repeats.

## Setup

1. **Set your exchange addresses** in `src/config.ts` under `exchanges`.
2. **Set your Sniperoo API key and pubkey** in `.env`:
   ```
   SNIPEROO_API_KEY=your_key_here
   SNIPEROO_PUBKEY=your_pubkey_here
   ```
3. **Set up your RPC endpoint** (`HELIUS_HTTPS_URI`) in `.env` or use default.

4. **Install dependencies**:
   ```
   npm install @solana/web3.js axios
   ```

5. **Run the bot:**
   ```
   npm start
   ```

## How it works

- Tracks outgoing SOL from exchanges.
- Tracks every fresh wallet in the chain.
- Buys new coins when a fresh wallet buys, and sets TP/SL via Sniperoo.

## Security

- Your Sniperoo API key is used only for trading.
- Never share your private key.