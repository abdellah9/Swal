import { Connection } from "@solana/web3.js";
import { startExchangeMonitoring } from "./exchangeMonitor";

const connection = new Connection(process.env.HELIUS_HTTPS_URI || "https://api.mainnet-beta.solana.com", "confirmed");

// Start monitoring
startExchangeMonitoring(connection);

// Optionally: keep the script alive (for Node.js)
setInterval(() => {}, 1 << 30);