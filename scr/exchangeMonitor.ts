import { Connection, PublicKey, ParsedInstruction, PartiallyDecodedInstruction } from '@solana/web3.js';
import { config } from './config.js';
import { isFreshWallet } from './utils/isFreshWallet.js';
import { autoBuyIfEnabled } from './autoBuySell.js';

const MAX_WALLETS = 10;
const MIN_SOL_AMOUNT = 1;
const MONITOR_DURATION_MS = 60 * 60 * 1000; // 1 hour

interface MonitoredWallet {
  address: string;
  addedAt: number; // timestamp in ms
}

const monitoredWallets: MonitoredWallet[] = [];

function cleanOldWallets() {
  const now = Date.now();
  // Remove wallets older than 1 hour
  for (let i = monitoredWallets.length - 1; i >= 0; i--) {
    if (now - monitoredWallets[i].addedAt > MONITOR_DURATION_MS) {
      console.log(`[Monitor] Removing wallet ${monitoredWallets[i].address} after 1 hour.`);
      monitoredWallets.splice(i, 1);
    }
  }
}

function isWalletMonitored(address: string) {
  return monitoredWallets.some(w => w.address === address);
}

function addMonitoredWallet(address: string) {
  if (!isWalletMonitored(address) && monitoredWallets.length < MAX_WALLETS) {
    monitoredWallets.push({ address, addedAt: Date.now() });
    console.log(`[Monitor] Added wallet ${address} to monitored list.`);
  }
}

function isParsedInstruction(ix: ParsedInstruction | PartiallyDecodedInstruction): ix is ParsedInstruction {
  return (ix as ParsedInstruction).parsed !== undefined;
}

export async function trackWalletChain(address: string, connection: Connection) {
  connection.onLogs(new PublicKey(address), async (logs, ctx) => {
    cleanOldWallets();

    const sig = logs.signature;
    if (!sig) return;

    const tx = await connection.getParsedTransaction(sig, { maxSupportedTransactionVersion: 0 });
    if (!tx) return;

    // Outgoing SOL to a fresh wallet AND amount > 1 SOL
    for (const ix of tx.transaction.message.instructions) {
      if (
        isParsedInstruction(ix) &&
        ix.programId.equals(PublicKey.default) &&
        ix.program === "system" &&
        ix.parsed?.type === "transfer" &&
        ix.parsed?.info?.source === address
      ) {
        const recipient = ix.parsed.info.destination;
        const amountSol = Number(ix.parsed.info.lamports) / 1e9;

        if (amountSol > MIN_SOL_AMOUNT && await isFreshWallet(recipient, connection)) {
          addMonitoredWallet(recipient);
        }
      }
    }

    // SPL token buy (only for monitored wallets)
    for (const ix of tx.transaction.message.instructions) {
      if (
        isParsedInstruction(ix) &&
        (ix.program === 'spl-token' ||
          ix.programId.toBase58() === "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA") &&
        ['mintTo', 'transfer'].includes(ix.parsed?.type)
      ) {
        const owner = ix.parsed?.info?.owner || ix.parsed?.info?.source;
        if (owner && isWalletMonitored(owner)) {
          const tokenMint = ix.parsed?.info?.mint;
          if (tokenMint) {
            console.log(`[Auto-Buy] Detected monitored wallet ${owner} buying ${tokenMint}`);
            autoBuyIfEnabled(tokenMint);
          }
        }
      }
    }
  }, "confirmed");
}

// <-- This is the missing export! -->
export function startExchangeMonitoring(connection: Connection) {
  for (const ex of config.exchanges) {
    trackWalletChain(ex.address, connection);
  }
  console.log(`[Monitor] Started monitoring exchanges from config.`);
      }
