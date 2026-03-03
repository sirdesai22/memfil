/**
 * Creates a fetch function that automatically handles x402 Payment Required
 * responses by signing and retrying with payment.
 */
export declare function createPaymentFetch(privateKey: `0x${string}`): (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
export declare function getMarketplaceUrl(): string;
//# sourceMappingURL=x402.d.ts.map