export const config = {
  exchanges: [
    { name: 'Binance', address: 'BINANCE_SOL_ADDRESS' },
    { name: 'OKX', address: 'OKX_SOL_ADDRESS' },
    // Add as many exchanges as you want
  ],
  sniperoo: {
    enabled: true,
    apiKey: process.env.SNIPEROO_API_KEY,
    pubkey: process.env.SNIPEROO_PUBKEY,
    autoSell: {
      enabled: true,
      takeProfit: 50,
      stopLoss: 15,
    },
    buyAmount: 0.1,
  },
};