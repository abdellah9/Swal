import axios from "axios";
import { config } from "../../config";

function validateSniperooEnv() {
  if (!config.sniperoo.apiKey) throw new Error("Missing SNIPEROO_API_KEY in config/env");
  if (!config.sniperoo.pubkey) throw new Error("Missing SNIPEROO_PUBKEY in config/env");
}

/**
 * Auto-buy & auto-sell using Sniperoo API
 * @param tokenAddress The token's mint address
 * @param inputAmount Amount of SOL to spend
 * @param sell Enable auto-sell
 * @param tp Take profit percent
 * @param sl Stop loss percent
 */
export async function buyTokenWithSniperoo(
  tokenAddress: string,
  inputAmount: number,
  sell: boolean,
  tp: number,
  sl: number
): Promise<boolean> {
  try {
    validateSniperooEnv();

    if (!tokenAddress || typeof tokenAddress !== "string" || tokenAddress.trim() === "") return false;
    if (inputAmount <= 0) return false;
    if (!tp || !sl) sell = false;

    const requestBody = {
      walletAddresses: [config.sniperoo.pubkey],
      tokenAddress,
      inputAmount,
      autoSell: {
        enabled: sell,
        strategy: {
          strategyName: "simple",
          profitPercentage: tp,
          stopLossPercentage: sl
        }
      }
    };

    await axios.post(
      "https://api.sniperoo.app/trading/buy-token?toastFrontendId=0",
      requestBody,
      {
        headers: {
          Authorization: `Bearer ${config.sniperoo.apiKey}`,
          "Content-Type": "application/json"
        }
      }
    );

    return true;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error(`Sniperoo API error (${error.response?.status || "unknown"}):`, error.response?.data || error.message);
    } else {
      console.error("Error buying token:", error instanceof Error ? error.message : "Unknown error");
    }
    return false;
  }
}