"use client";

import type { AgentCard, ParsedServices } from "@/lib/agent-validator";

interface AgentVerificationPanelProps {
  agentCard: AgentCard | null;
  parsedServices: ParsedServices | null;
  health: boolean;
  errors: string[];
}

export function AgentVerificationPanel({
  agentCard,
  parsedServices,
  health,
  errors,
}: AgentVerificationPanelProps) {
  if (!agentCard && errors.length === 0) return null;

  return (
    <div className="rounded-lg border border-border bg-muted/30 p-5 space-y-4">
      {/* Health badge */}
      <div className="flex items-center gap-2">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
            health
              ? "bg-emerald-500/15 text-emerald-600 border border-emerald-500/30"
              : "bg-red-500/15 text-red-600 border border-red-500/30"
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${health ? "bg-emerald-500" : "bg-red-500"}`}
          />
          {health ? "Health check passed" : "Health check failed"}
        </span>
      </div>

      {/* Agent card preview */}
      {agentCard && (
        <div className="space-y-2">
          <div className="flex items-start gap-3">
            {agentCard.image && (
              <img
                src={agentCard.image}
                alt={agentCard.name ?? "Agent"}
                className="h-12 w-12 rounded-lg border border-border object-cover bg-muted shrink-0"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />
            )}
            <div className="min-w-0">
              <h3 className="font-semibold text-sm truncate">
                {agentCard.name ?? "Unnamed Agent"}
              </h3>
              {agentCard.description && (
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                  {agentCard.description}
                </p>
              )}
            </div>
          </div>

          {parsedServices && (
            <div className="rounded-md border border-border bg-background p-3 space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                x402 Service
              </p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                <span className="text-muted-foreground">Endpoint</span>
                <span className="font-mono truncate" title={parsedServices.x402Endpoint}>
                  {parsedServices.x402Endpoint || "—"}
                </span>
                <span className="text-muted-foreground">Cost</span>
                <span>
                  {parsedServices.cost
                    ? `${parsedServices.cost} ${parsedServices.currency}`
                    : "—"}
                </span>
                <span className="text-muted-foreground">Network</span>
                <span className="font-mono">{parsedServices.network || "—"}</span>
                {parsedServices.healthUrl && (
                  <>
                    <span className="text-muted-foreground">Health URL</span>
                    <span className="font-mono truncate" title={parsedServices.healthUrl}>
                      {parsedServices.healthUrl}
                    </span>
                  </>
                )}
              </div>
              {parsedServices.inputSchema && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
                    Input Schema
                  </summary>
                  <pre className="mt-1.5 overflow-x-auto rounded bg-muted p-2 text-[10px] leading-relaxed">
                    {JSON.stringify(parsedServices.inputSchema, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          )}
        </div>
      )}

      {/* Errors */}
      {errors.length > 0 && (
        <ul className="space-y-1">
          {errors.map((e, i) => (
            <li key={i} className="flex items-start gap-1.5 text-xs text-red-600">
              <span className="mt-0.5 shrink-0">✕</span>
              {e}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
