import { wrapFetchWithPayment } from "@x402/fetch";
import { x402Client } from "@x402/core/client";
import { ExactEvmScheme, toClientEvmSigner } from "@x402/evm";
import { privateKeyToAccount } from "viem/accounts";
/**
 * Creates a fetch function that automatically handles x402 Payment Required
 * responses by signing and retrying with payment.
 */
export function createPaymentFetch(privateKey) {
    const account = privateKeyToAccount(privateKey);
    const signer = toClientEvmSigner(account);
    const client = new x402Client();
    client.register("eip155:*", new ExactEvmScheme(signer));
    return wrapFetchWithPayment(fetch, client);
}
export function getMarketplaceUrl() {
    return process.env.EPISODES_API_URL ?? "http://localhost:3000";
}
//# sourceMappingURL=x402.js.map