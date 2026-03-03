import { NextRequest, NextResponse } from "next/server";
import { parseEventLogs } from "viem";
import {
  getServerWalletClient,
  getServerAccount,
  getPublicClientForNetwork,
  IDENTITY_REGISTER_ABI,
  REGISTRATION_NETWORK,
} from "@/lib/server-wallet";
import { uploadMetadataToFilecoin } from "@/lib/filecoin-storage";
import { getNetwork } from "@/lib/networks";
import type { NetworkId } from "@/lib/networks";
import { NETWORK_IDS } from "@/lib/networks";

/** Chain ID for agentWallet endpoint; x402 payments settle on Base Sepolia. */
const PAYMENT_CHAIN_ID = 84532;

const ERC721_TRANSFER_ABI = [
  {
    type: "event",
    name: "Transfer",
    inputs: [
      { name: "from", type: "address", indexed: true },
      { name: "to", type: "address", indexed: true },
      { name: "tokenId", type: "uint256", indexed: true },
    ],
  },
] as const;

interface RegisterRequestBody {
  name: string;
  description: string;
  image?: string;
  mcpEndpoint?: string;
  mcpTools?: Array<{ name: string; description?: string }>;
  a2aEndpoint?: string;
  sellerWallet?: string;
  network?: NetworkId;
}

function buildEndpoints(body: RegisterRequestBody): Array<{
  name: string;
  endpoint: string;
  version?: string;
  capabilities?: { tools?: Array<{ name: string; description?: string }> };
}> {
  const endpoints: Array<{
    name: string;
    endpoint: string;
    version?: string;
    capabilities?: { tools?: Array<{ name: string; description?: string }> };
  }> = [];

  if (body.mcpEndpoint) {
    endpoints.push({
      name: "MCP",
      endpoint: body.mcpEndpoint,
      version: "1.0.0",
      ...(body.mcpTools?.length && {
        capabilities: { tools: body.mcpTools },
      }),
    });
  }
  if (body.a2aEndpoint) {
    endpoints.push({
      name: "A2A",
      endpoint: body.a2aEndpoint,
    });
  }
  if (body.sellerWallet) {
    endpoints.push({
      name: "agentWallet",
      endpoint: `eip155:${PAYMENT_CHAIN_ID}:${body.sellerWallet}`,
    });
  }

  return endpoints;
}

export async function POST(request: NextRequest) {
  let body: RegisterRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  if (!body.name || typeof body.name !== "string") {
    return NextResponse.json(
      { success: false, error: "name is required" },
      { status: 400 }
    );
  }
  if (!body.description || typeof body.description !== "string") {
    return NextResponse.json(
      { success: false, error: "description is required" },
      { status: 400 }
    );
  }
  if (!body.mcpEndpoint && !body.a2aEndpoint) {
    return NextResponse.json(
      {
        success: false,
        error: "At least one of mcpEndpoint or a2aEndpoint is required",
      },
      { status: 400 }
    );
  }

  const networkId: NetworkId =
    body.network && NETWORK_IDS.includes(body.network as NetworkId)
      ? (body.network as NetworkId)
      : REGISTRATION_NETWORK;

  const config = getNetwork(networkId);
  const endpoints = buildEndpoints(body);

  const registration = {
    type: "https://eips.ethereum.org/EIPS/eip-8004#registration-v1",
    name: body.name,
    description: body.description,
    image: body.image ?? "",
    active: true,
    x402Support: true,
    supportedTrust: ["reputation"],
    endpoints,
    registrations: [],
  };

  let cid: string;
  try {
    cid = await uploadMetadataToFilecoin(registration);
  } catch (e) {
    console.error("[Register API] Filecoin upload failed", e);
    return NextResponse.json(
      {
        success: false,
        error:
          e instanceof Error ? e.message : "Metadata upload to Filecoin failed",
      },
      { status: 500 }
    );
  }

  const agentURI = `ipfs://${cid}`;

  try {
    const walletClient = getServerWalletClient(networkId);
    const publicClient = getPublicClientForNetwork(networkId);

    const hash = await walletClient.writeContract({
      account: getServerAccount(),
      address: config.identityRegistry,
      abi: IDENTITY_REGISTER_ABI,
      functionName: "register",
      args: [agentURI],
      chain: config.chain,
    });

    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    const transferLogs = parseEventLogs({
      abi: ERC721_TRANSFER_ABI,
      eventName: "Transfer",
      logs: receipt.logs,
    });

    const mintLog = transferLogs.find(
      (l) =>
        l.address.toLowerCase() === config.identityRegistry.toLowerCase()
    );
    const agentId = mintLog?.args?.tokenId?.toString() ?? "?";

    return NextResponse.json({
      success: true,
      agentId,
      cid,
      txHash: hash,
      network: networkId,
    });
  } catch (e) {
    console.error("[Register API]", e);
    return NextResponse.json(
      {
        success: false,
        error: e instanceof Error ? e.message : "Registration failed",
      },
      { status: 500 }
    );
  }
}
