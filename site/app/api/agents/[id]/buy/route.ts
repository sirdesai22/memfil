import { NextRequest, NextResponse } from "next/server";
import { fetchAgentById, fetchAgentOwnerAndEndpoint } from "@/lib/registry";
import {
  ensureInitialized,
  resourceServer,
  buildResourceConfig,
  buildResourceInfo,
  encodePaymentRequiredHeader,
  encodePaymentResponseHeader,
  decodePaymentSignatureHeader,
} from "@/lib/x402";
import type { NetworkId } from "@/lib/networks";
import { NETWORK_IDS } from "@/lib/networks";
import { REGISTRATION_NETWORK } from "@/lib/server-wallet";

/** Default network for agent lookup; matches where agents are registered (Filecoin Calibration). */
const AGENT_LOOKUP_NETWORK: NetworkId = REGISTRATION_NETWORK;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: agentId } = await params;
  const networkParam =
    request.nextUrl.searchParams.get("network") || AGENT_LOOKUP_NETWORK;
  const network: NetworkId = NETWORK_IDS.includes(networkParam as NetworkId)
    ? (networkParam as NetworkId)
    : AGENT_LOOKUP_NETWORK;

  const agentInfo = await fetchAgentOwnerAndEndpoint(agentId, network);
  if (!agentInfo) {
    return NextResponse.json(
      { success: false, error: "Agent not found" },
      { status: 404 }
    );
  }

  const endpoint = agentInfo.mcpEndpoint || agentInfo.a2aEndpoint;
  if (!endpoint) {
    return NextResponse.json(
      { success: false, error: "Agent has no callable endpoint (MCP or A2A)" },
      { status: 400 }
    );
  }

  await ensureInitialized();

  const paymentSignature =
    request.headers.get("PAYMENT-SIGNATURE") ??
    request.headers.get("X-PAYMENT");

  if (!paymentSignature) {
    const payTo = agentInfo.sellerWallet || agentInfo.owner;
    const resourceConfig = buildResourceConfig({ payTo });
    const requirements = await resourceServer.buildPaymentRequirements(
      resourceConfig
    );
    const requestUrl = request.url;
    const resourceInfo = buildResourceInfo(
      requestUrl,
      agentInfo.name ?? `Agent #${agentId}`
    );
    const paymentRequired =
      await resourceServer.createPaymentRequiredResponse(
        requirements,
        resourceInfo
      );
    const headerValue = encodePaymentRequiredHeader(paymentRequired);

    return new NextResponse(
      JSON.stringify({
        error: "Payment required",
        message:
          "Include PAYMENT-SIGNATURE header with a signed payment payload to reveal agent endpoints.",
      }),
      {
        status: 402,
        headers: {
          "Content-Type": "application/json",
          "PAYMENT-REQUIRED": headerValue,
        },
      }
    );
  }

  let paymentPayload;
  try {
    paymentPayload = decodePaymentSignatureHeader(paymentSignature);
  } catch (e) {
    return NextResponse.json(
      {
        success: false,
        error: "Invalid PAYMENT-SIGNATURE header",
        details: e instanceof Error ? e.message : "Decode failed",
      },
      { status: 400 }
    );
  }

  const requirements = paymentPayload.accepted;

  const verifyResult = await resourceServer.verifyPayment(
    paymentPayload,
    requirements
  );
  if (!verifyResult.isValid) {
    return NextResponse.json(
      {
        success: false,
        error: "Payment verification failed",
        reason: verifyResult.invalidReason,
        message: verifyResult.invalidMessage,
      },
      { status: 402 }
    );
  }

  let settleResult;
  try {
    settleResult = await resourceServer.settlePayment(
      paymentPayload,
      requirements
    );
  } catch (e) {
    return NextResponse.json(
      {
        success: false,
        error: "Payment settlement failed",
        details: e instanceof Error ? e.message : "Settle failed",
      },
      { status: 402 }
    );
  }

  if (!settleResult.success) {
    return NextResponse.json(
      {
        success: false,
        error: "Payment settlement failed",
        reason: settleResult.errorReason,
        message: settleResult.errorMessage,
      },
      { status: 402 }
    );
  }

  const agent = await fetchAgentById(agentId, network);
  if (!agent) {
    return NextResponse.json(
      { success: false, error: "Agent not found" },
      { status: 404 }
    );
  }

  const paymentResponseHeader = encodePaymentResponseHeader(settleResult);

  return NextResponse.json(
    {
      success: true,
      agent: {
        name: agent.metadata?.name,
        description: agent.metadata?.description,
        image: agent.metadata?.image,
        mcpEndpoint: agent.metadata?.mcpEndpoint ?? null,
        a2aEndpoint: agent.metadata?.a2aEndpoint ?? null,
        mcpTools: agent.metadata?.mcpTools ?? [],
        endpoints: agent.metadata?.endpoints ?? [],
      },
    },
    {
      status: 200,
      headers: {
        "PAYMENT-RESPONSE": paymentResponseHeader,
      },
    }
  );
}
