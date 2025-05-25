import { Connection, PublicKey, ParsedInstruction, PartiallyDecodedInstruction } from '@solana/web3.js';
import { config } from './config.js';
import { isFreshWallet } from './utils/isFreshWallet.js';
import { autoBuyIfEnabled } from './autoBuySell.js';

const tracked = new Set<string>();

function isParsedInstruction(ix: ParsedInstruction | PartiallyDecodedInstruction): ix is ParsedInstruction {
  return (ix as ParsedInstruction).parsed !== undefined;
}

/**
 * Recursive function to track a wallet chain for buys and further fresh wallet transfers
 */
export async function trackWalletChain(address: string, connection: Connection) {
  if (tracked.has(address)) return;
  tracked.add(address);

  // Listen for logs for the address
  connection.onLogs(new PublicKey(address), async (logs, ctx) => {
    // logs.signature is a single string
    const sig = logs.signature;
    if (!sig) return;

    const tx = await connection.getParsedTransaction(sig, { maxSupportedTransactionVersion: 0 });
    if (!tx) return;

    // 1. Outgoing SOL to a fresh wallet? Track it recursively
    for (const ix of tx.transaction.message.instructions) {
      if (
        isParsedInstruction(ix) &&
        ix.programId.equals(PublicKey.default) && // system program (0)
        ix.program === "system" &&
        ix.parsed?.type === "transfer" &&
        ix.parsed?.info?.source === address
      ) {
        const recipient = ix.parsed.info.destination;
        if (await isFreshWallet(recipient, connection)) {
          trackWalletChain(recipient, connection);
        }
      }
    }

    // 2. SPL token buy? (mintTo or transfer of a token not previously in wallet)
    for (const ix of tx.transaction.message.instructions) {
      if (
        isParsedInstruction(ix) &&
        (ix.program === 'spl-token' ||
          ix.programId.toBase58() === "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA") &&
        ['mintTo', 'transfer'].includes(ix.parsed?.type)
      ) {
        const tokenMint = ix.parsed?.info?.mint;
        if (tokenMint) autoBuyIfEnabled(tokenMint);
      }
    }
  }, "confirmed");
}

/**
 * Start monitoring all exchanges from config
 */
export function startExchangeMonitoring(connection: Connection) {
  for (const ex of config.exchanges) {
    trackWalletChain(ex.address, connection);
  }
}
