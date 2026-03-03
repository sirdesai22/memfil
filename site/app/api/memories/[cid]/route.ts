import { NextRequest, NextResponse } from "next/server";
import { getServerAccount } from "@/lib/server-wallet";
import {
  ensureInitialized,
  resourceServer,
  buildResourceConfig,
  buildResourceInfo,
  encodePaymentRequiredHeader,
  encodePaymentResponseHeader,
  decodePaymentSignatureHeader,
} from "@/lib/x402";

const IPFS_GATEWAYS = [
  "https://ipfs.io/ipfs/",
  "https://dweb.link/ipfs/",
  "https://cloudflare-ipfs.com/ipfs/",
];

async function fetchFromIPFS(cid: string): Promise<string> {
  const errors: Error[] = [];
  for (const base of IPFS_GATEWAYS) {
    const url = `${base}${cid}`;
    try {
      const res = await fetch(url);
      if (res.ok) {
        return await res.text();
      }
      throw new Error(`HTTP ${res.status}`);
    } catch (err) {
      errors.push(err instanceof Error ? err : new Error(String(err)));
    }
  }
  throw new Error(
    `Failed to fetch from IPFS: ${errors.map((e) => e.message).join("; ")}`
  );
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ cid: string }> }
) {
  const { cid } = await params;

  if (!cid || cid.trim() === "") {
    return NextResponse.json(
      { success: false, error: "CID is required" },
      { status: 400 }
    );
  }

  await ensureInitialized();

  const payTo = getServerAccount().address;
  const resourceConfig = buildResourceConfig({ payTo });
  const requirements = await resourceServer.buildPaymentRequirements(
    resourceConfig
  );
  const requestUrl = request.url;
  const resourceInfo = buildResourceInfo(
    requestUrl,
    `Memory ${cid.slice(0, 12)}...`
  );
  const paymentRequired =
    await resourceServer.createPaymentRequiredResponse(
      requirements,
      resourceInfo
    );
  const headerValue = encodePaymentRequiredHeader(paymentRequired);

  const paymentSignature =
    request.headers.get("PAYMENT-SIGNATURE") ??
    request.headers.get("X-PAYMENT");

  if (!paymentSignature) {
    return new NextResponse(
      JSON.stringify({
        error: "Payment required",
        message:
          "Include PAYMENT-SIGNATURE header with a signed payment payload to download this memory.",
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

  const requirementsFromPayload = paymentPayload.accepted;

  const verifyResult = await resourceServer.verifyPayment(
    paymentPayload,
    requirementsFromPayload
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
      requirementsFromPayload
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

  let content: string;
  try {
    content = await fetchFromIPFS(cid);
  } catch (e) {
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch memory from IPFS",
        details: e instanceof Error ? e.message : "Fetch failed",
      },
      { status: 502 }
    );
  }

  const paymentResponseHeader = encodePaymentResponseHeader(settleResult);

  return new NextResponse(content, {
    status: 200,
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "PAYMENT-RESPONSE": paymentResponseHeader,
    },
  });
}
