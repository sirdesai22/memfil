import { NextRequest, NextResponse } from "next/server";
import {
  validateAgentCard,
  checkAgentHealth,
} from "@/lib/agent-validator";

// POST /api/agents/validate
// Body: { agentCardUrl: string, healthUrl: string }
// Returns: { valid, agentCard, parsedServices, health, errors }
export async function POST(request: NextRequest) {
  let body: { agentCardUrl?: string; healthUrl?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { valid: false, errors: ["Invalid JSON body"] },
      { status: 400 }
    );
  }

  const { agentCardUrl, healthUrl } = body;

  if (!agentCardUrl) {
    return NextResponse.json(
      { valid: false, errors: ["agentCardUrl is required"] },
      { status: 400 }
    );
  }

  // Validate agent card (fetches + parses)
  const cardResult = await validateAgentCard(agentCardUrl);

  // Check health in parallel with card validation result
  const effectiveHealthUrl =
    healthUrl || cardResult.agentCard?.healthUrl || "";
  const health = effectiveHealthUrl
    ? await checkAgentHealth(effectiveHealthUrl)
    : false;

  const allErrors = [...cardResult.errors];
  if (effectiveHealthUrl && !health) {
    allErrors.push("Health check failed — agent may be unreachable");
  }

  return NextResponse.json({
    valid: cardResult.valid && health,
    agentCard: cardResult.agentCard,
    parsedServices: cardResult.parsedServices,
    health,
    errors: allErrors,
  });
}
