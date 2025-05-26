import { RpcRateLimiter } from './rateLimiter.js';

// You may want to tweak these numbers if you still get 429s!
const rpcLimiter = new RpcRateLimiter(200, 10000, 1); // 2s min, 10s max, 1 at a time

export async function throttled<T>(fn: () => Promise<T>): Promise<T | undefined> {
  while (true) {
    try {
      const result = await rpcLimiter.schedule(fn);
      rpcLimiter.resetIfStable();
      return result;
    } catch (err: any) {
      if (
        typeof err.message === "string" &&
        err.message.includes("429")
      ) {
        console.warn("Server responded with 429 Too Many Requests. Backing off...");
        rpcLimiter.backoff();
        await new Promise(res => setTimeout(res, rpcLimiter['currentInterval']));
      } else {
        throw err;
      }
    }
  }
}
