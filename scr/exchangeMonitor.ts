import { Connection, PublicKey, ParsedInstruction, PartiallyDecodedInstruction } from '@solana/web3.js';
import { config } from './config.js';
import { isFreshWallet } from './utils/isFreshWallet.js';
import { autoBuyIfEnabled } from './autoBuySell.js';
import { throttled } from './rpcThrottled.js';

const MAX_WALLETS = 10;
const MIN_SOL_AMOUNT = 1;
const MONITOR_DURATION_MS = 60 * 60 * 1000; // 1 hour

interface MonitoredWallet {
  address: string;
  addedAt: number;
}

const monitoredWallets: MonitoredWallet[] = [];

function cleanOldWallets() {
  const now = Date.now();
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

    // Use the throttled helper for all RPC calls!
    let tx;
    try {
      tx = await throttled(() =>
        connection.getParsedTransaction(sig, { maxSupportedTransactionVersion: 0 })
      );
    } catch (err) {
      console.error(`[RPC] Failed to fetch transaction for signature ${sig}:`, err);
      return;
    }
    if (!tx) return;

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

        let fresh = false;
        try {
          const freshResult = await throttled(() =>
            isFreshWallet(recipient, connection)
          );
          fresh = freshResult === true;
        } catch (err) {
          console.error(`[RPC] Failed to check if wallet is fresh ${recipient}:`, err);
        }

        if (amountSol > MIN_SOL_AMOUNT && fresh) {
          addMonitoredWallet(recipient);
        }
      }
    }

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

export function startExchangeMonitoring(connection: Connection) {
  for (const ex of config.exchanges) {
    trackWalletChain(ex.address, connection);
  }
  console.log(`[Monitor] Started monitoring exchanges from config.`);
                                              }
