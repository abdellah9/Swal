import { config } from "./config.js";
import { buyTokenWithSniperoo } from "./utils/handlers/sniperooHandler.js";

/**
 * Triggers a buy (and optionally auto-sell) action for a given token mint address.
 */
export async function autoBuyIfEnabled(tokenMint: string) {
  if (!config.sniperoo.enabled) return;
  console.log(`[Auto-Buy] Attempting to buy ${tokenMint} with ${config.sniperoo.buyAmount} SOL...`);

  const ok = await buyTokenWithSniperoo(
    tokenMint,
    config.sniperoo.buyAmount,
    config.sniperoo.autoSell.enabled,
    config.sniperoo.autoSell.takeProfit,
    config.sniperoo.autoSell.stopLoss
  );

  if (ok) {
    console.log(`[Auto-Buy] Token ${tokenMint} bought successfully!`);
  } else {
    console.log(`[Auto-Buy] Failed to buy token ${tokenMint}.`);
  }
}
