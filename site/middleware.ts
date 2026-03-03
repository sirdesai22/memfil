import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, PAYMENT-SIGNATURE, X-PAYMENT",
};

function needsCors(pathname: string): boolean {
  if (pathname.startsWith("/api/use/") || pathname === "/api/agents/register")
    return true;
  if (/^\/api\/agents\/[^/]+\/buy$/.test(pathname)) return true;
  if (pathname.startsWith("/api/memories/")) return true;
  return false;
}

export function middleware(request: NextRequest) {
  if (needsCors(request.nextUrl.pathname)) {
    if (request.method === "OPTIONS") {
      return new NextResponse(null, { status: 204, headers: corsHeaders });
    }
    const response = NextResponse.next();
    Object.entries(corsHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/api/use/:path*",
    "/api/agents/register",
    "/api/agents/:id/buy",
    "/api/memories/:cid",
  ],
};
