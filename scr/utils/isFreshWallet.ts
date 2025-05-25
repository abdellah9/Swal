import { Connection, PublicKey } from '@solana/web3.js';

export async function isFreshWallet(address: string, connection: Connection): Promise<boolean> {
  const txs = await connection.getSignaturesForAddress(new PublicKey(address), { limit: 2 });
  return txs.length === 0;
}