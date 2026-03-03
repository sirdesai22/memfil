import { wrapFetchWithPayment } from "@x402/fetch";
import { x402Client } from "@x402/core/client";
import { ExactEvmScheme, toClientEvmSigner } from "@x402/evm";
import { createPublicClient, http } from "viem";
import { baseSepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";

const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(),
});

/**
 * Creates a fetch function that automatically handles x402 Payment Required
 * responses by signing and retrying with payment.
 */
export function createPaymentFetch(privateKey: `0x${string}`) {
  const account = privateKeyToAccount(privateKey);
  const signer = toClientEvmSigner(account, publicClient);
  const client = new x402Client();
  client.register("eip155:*", new ExactEvmScheme(signer));
  return wrapFetchWithPayment(fetch, client);
}

export function getMarketplaceUrl(): string {
  return process.env.EPISODES_API_URL ?? "http://localhost:3000";
}
