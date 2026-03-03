import {
  createWalletClient,
  createPublicClient,
  http,
  type WalletClient,
  type Account,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { getNetwork } from "./networks";
import type { NetworkId } from "./networks";

export const IDENTITY_REGISTER_ABI = [
  {
    name: "register",
    inputs: [{ name: "agentURI", type: "string" }],
    outputs: [{ name: "agentId", type: "uint256" }],
    stateMutability: "nonpayable" as const,
    type: "function" as const,
  },
] as const;

const REGISTRATION_NETWORK: NetworkId = "filecoinCalibration";

function getPrivateKey(): `0x${string}` {
  const key = process.env.SERVER_PRIVATE_KEY;
  if (!key || !key.startsWith("0x")) {
    throw new Error(
      "SERVER_PRIVATE_KEY env var is required and must be a hex string (0x...)"
    );
  }
  return key as `0x${string}`;
}

export function getServerAccount(): Account {
  return privateKeyToAccount(getPrivateKey());
}

export function getServerWalletClient(
  networkId: NetworkId = REGISTRATION_NETWORK
): WalletClient {
  const config = getNetwork(networkId);
  const rpcUrl =
    process.env[`${networkId.replace(/([A-Z])/g, "_$1").toUpperCase()}_RPC`] ||
    config.chain.rpcUrls.default.http[0];
  return createWalletClient({
    account: getServerAccount(),
    chain: config.chain,
    transport: http(rpcUrl),
  }) as WalletClient;
}

export function getPublicClientForNetwork(networkId: NetworkId) {
  const config = getNetwork(networkId);
  const rpcUrl =
    process.env[`${networkId.replace(/([A-Z])/g, "_$1").toUpperCase()}_RPC`] ||
    config.chain.rpcUrls.default.http[0];
  return createPublicClient({
    chain: config.chain,
    transport: http(rpcUrl),
  });
}

export { REGISTRATION_NETWORK };
