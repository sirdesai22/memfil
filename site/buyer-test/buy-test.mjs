import { wrapFetchWithPayment } from "@x402/fetch";
import { x402Client, x402HTTPClient } from "@x402/core/client";
import { ExactEvmScheme } from "@x402/evm/exact/client";
import { privateKeyToAccount } from "viem/accounts";

const BUYER_PRIVATE_KEY = process.env.BUYER_PRIVATE_KEY; // 0x... Base Sepolia wallet with USDC
if (!BUYER_PRIVATE_KEY) {
  console.error("Set BUYER_PRIVATE_KEY (Base Sepolia wallet with test USDC)");
  process.exit(1);
}

const signer = privateKeyToAccount(BUYER_PRIVATE_KEY);
const client = new x402Client();
client.register("eip155:*", new ExactEvmScheme(signer));

const fetchWithPayment = wrapFetchWithPayment(fetch, client);

const agentId = process.env.AGENT_ID || "1341";
const baseUrl = process.env.API_BASE || "http://localhost:3000";
// When agent is on Base Sepolia, set NETWORK=baseSepolia (default lookup is filecoinCalibration)
const network = process.env.NETWORK || "";
const url = new URL(`${baseUrl}/api/use/${agentId}`);
if (network) url.searchParams.set("network", network);

console.log("Requesting (will pay 402 if required):", url.toString());

const response = await fetchWithPayment(url.toString(), {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({}),
});

const data = await response.json();
console.log("Status:", response.status);
console.log("Body:", data);

if (response.ok) {
  const httpClient = new x402HTTPClient(client);
  const paymentResponse = httpClient.getPaymentSettleResponse(
    (name) => response.headers.get(name)
  );
  console.log("Payment settled:", paymentResponse);
} else {
  console.log("Response not ok - check agent exists and has MCP/A2A endpoint");
}