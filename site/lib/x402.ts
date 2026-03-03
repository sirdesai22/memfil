import {
  x402ResourceServer,
  HTTPFacilitatorClient,
} from "@x402/core/server";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import {
  encodePaymentRequiredHeader,
  encodePaymentResponseHeader,
  decodePaymentSignatureHeader,
} from "@x402/core/http";

const FACILITATOR_URL =
  process.env.X402_FACILITATOR_URL || "https://www.x402.org/facilitator";
const DEFAULT_PRICE = process.env.X402_DEFAULT_PRICE || "$0.01";
const NETWORK = (process.env.X402_NETWORK || "eip155:84532") as `${string}:${string}`;

const facilitatorClient = new HTTPFacilitatorClient({ url: FACILITATOR_URL });
const resourceServer = new x402ResourceServer(facilitatorClient).register(
  NETWORK,
  new ExactEvmScheme()
);

let initialized = false;

export async function ensureInitialized(): Promise<void> {
  if (!initialized) {
    await resourceServer.initialize();
    initialized = true;
  }
}

export {
  resourceServer,
  DEFAULT_PRICE,
  NETWORK,
  encodePaymentRequiredHeader,
  encodePaymentResponseHeader,
  decodePaymentSignatureHeader,
};

export interface PaymentRequirementsInput {
  payTo: string;
  price?: string;
}

export function buildResourceConfig(input: PaymentRequirementsInput) {
  return {
    scheme: "exact" as const,
    network: NETWORK,
    payTo: input.payTo,
    price: input.price ?? DEFAULT_PRICE,
  };
}

export function buildResourceInfo(requestUrl: string, agentName?: string) {
  return {
    url: requestUrl,
    description:
      agentName ?? "Use an agent or skill from the Episodes marketplace",
    mimeType: "application/json",
  };
}
