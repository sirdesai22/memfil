import { NextRequest, NextResponse } from "next/server";
import { fetchAgentById } from "@/lib/registry";
import type { NetworkId } from "@/lib/networks";
import { DEFAULT_NETWORK, NETWORK_IDS } from "@/lib/networks";

// GET /api/agents/health-batch?ids=5,6,7,8&network=filecoinCalibration
// Returns health status for multiple agents in one request.
// Response: { "5": "ok", "6": "unreachable", "7": "unknown", ... }
export async function GET(request: NextRequest) {
  const idsParam = request.nextUrl.searchParams.get("ids");
  const networkParam =
    request.nextUrl.searchParams.get("network") || DEFAULT_NETWORK;
  const network: NetworkId = NETWORK_IDS.includes(networkParam as NetworkId)
    ? (networkParam as NetworkId)
    : DEFAULT_NETWORK;

  if (!idsParam?.trim()) {
    return NextResponse.json({ error: "Missing ids query param" }, { status: 400 });
  }

  const ids = idsParam
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (ids.length === 0) {
    return NextResponse.json({});
  }

  // Limit batch size to avoid timeouts
  const MAX_IDS = 20;
  const toFetch = ids.slice(0, MAX_IDS);

  const results: Record<string, "ok" | "unreachable" | "unknown"> = {};

  await Promise.all(
    toFetch.map(async (id) => {
      let healthUrl: string | undefined;
      try {
        const agent = await fetchAgentById(id, network);
        healthUrl = agent?.metadata?.healthUrl;
      } catch {
        results[id] = "unknown";
        return;
      }

      if (!healthUrl) {
        results[id] = "unknown";
        return;
      }

      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        const res = await fetch(healthUrl, { signal: controller.signal });
        clearTimeout(timeout);
        const body = await res.json().catch(() => ({}));
        const ok = res.ok && (body?.status === "ok" || body?.ok === true);
        results[id] = ok ? "ok" : "unreachable";
      } catch {
        results[id] = "unreachable";
      }
    })
  );

  const res = NextResponse.json(results);
  res.headers.set("Cache-Control", "private, max-age=30, stale-while-revalidate=60");
  return res;
}
