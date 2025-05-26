import { Connection } from "@solana/web3.js";
import { startExchangeMonitoring } from "./exchangeMonitor.js";

const rpcUrl = process.env.HELIUS_HTTPS_URI || "https://api.mainnet-beta.solana.com";

console.log(`[${new Date().toISOString()}] Starting Solana Exchange Fresh Wallet Sniper`);
console.log(`[${new Date().toISOString()}] Using RPC endpoint: ${rpcUrl}`);

const connection = new Connection(rpcUrl, "confirmed");

try {
  startExchangeMonitoring(connection);
  console.log(`[${new Date().toISOString()}] Exchange monitoring started.`);
} catch (err) {
  console.error(`[${new Date().toISOString()}] Error starting exchange monitoring:`, err);
}

// Optionally, keep the script alive
setInterval(() => {}, 1 << 30);
