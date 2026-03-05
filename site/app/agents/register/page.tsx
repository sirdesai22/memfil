"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, CheckCircle2 } from "lucide-react";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { AgentVerificationPanel } from "@/components/agent-verification-panel";
import { IDENTITY_REGISTRY_ABI } from "@/lib/identity-registry-abi";
import { NETWORKS, DEFAULT_NETWORK } from "@/lib/networks";
import type { AgentCard, ParsedServices } from "@/lib/agent-validator";

interface ValidationState {
  valid: boolean;
  agentCard: AgentCard | null;
  parsedServices: ParsedServices | null;
  health: boolean;
  errors: string[];
}

export default function RegisterAgentPage() {
  const [agentCardUrl, setAgentCardUrl] = useState("");
  const [healthUrl, setHealthUrl] = useState("");
  const [validating, setValidating] = useState(false);
  const [validation, setValidation] = useState<ValidationState | null>(null);
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();

  const { writeContract, isPending: isWriting, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({ hash: txHash });

  const networkConfig = NETWORKS[DEFAULT_NETWORK];

  async function handleVerify() {
    if (!agentCardUrl.trim()) return;
    setValidating(true);
    setValidation(null);
    try {
      const res = await fetch("/api/agents/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentCardUrl: agentCardUrl.trim(),
          healthUrl: healthUrl.trim() || undefined,
        }),
      });
      const data = await res.json();
      setValidation({
        valid: data.valid ?? false,
        agentCard: data.agentCard ?? null,
        parsedServices: data.parsedServices ?? null,
        health: data.health ?? false,
        errors: data.errors ?? [],
      });
    } catch {
      setValidation({
        valid: false,
        agentCard: null,
        parsedServices: null,
        health: false,
        errors: ["Network error — could not reach validation API"],
      });
    } finally {
      setValidating(false);
    }
  }

  function handleRegister() {
    if (!agentCardUrl.trim()) return;
    writeContract(
      {
        address: networkConfig.identityRegistry,
        abi: IDENTITY_REGISTRY_ABI,
        functionName: "register",
        args: [agentCardUrl.trim()],
      },
      {
        onSuccess(hash) {
          setTxHash(hash);
        },
      }
    );
  }

  const canRegister = validation?.valid === true && !isWriting && !isConfirming;

  return (
    <div className="container px-4 py-8 md:px-6 max-w-2xl">
      <Link
        href="/agents"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-8"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Agents
      </Link>

      <div className="mb-8">
        <h1
          className="font-display text-3xl font-bold tracking-tight"
          style={{ fontFamily: "var(--font-playfair-display), serif" }}
        >
          Register Agent
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Register your ERC-8004 agent on{" "}
          <span className="font-medium text-foreground">{networkConfig.name}</span>. The
          agent card URL is stored on-chain; metadata is fetched from it.
        </p>
      </div>

      {isConfirmed && txHash ? (
        <Card className="border-emerald-500/30 bg-emerald-500/5">
          <CardContent className="pt-6 space-y-3 text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500" />
            <h2 className="font-semibold text-lg">Registration submitted!</h2>
            <p className="text-sm text-muted-foreground">
              Your agent will appear in the directory once indexed.
            </p>
            <div className="flex justify-center gap-3">
              <Button asChild variant="outline" size="sm">
                <a
                  href={`https://sepolia.basescan.org/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View on {networkConfig.explorerName}
                </a>
              </Button>
              <Button asChild size="sm">
                <Link href="/agents">Browse Agents</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Step 1 — Enter URLs */}
          <Card className="border-border">
            <CardHeader className="pb-3">
              <h2 className="font-semibold text-sm">Step 1 — Enter agent URLs</h2>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="agentCardUrl">Agent Card URL</Label>
                <Input
                  id="agentCardUrl"
                  placeholder="https://your-agent.vercel.app/api/agent-card"
                  value={agentCardUrl}
                  onChange={(e) => {
                    setAgentCardUrl(e.target.value);
                    setValidation(null);
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  URL of your ERC-8004 agent card JSON (registered on-chain)
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="healthUrl">
                  Health URL{" "}
                  <span className="text-muted-foreground font-normal">(optional)</span>
                </Label>
                <Input
                  id="healthUrl"
                  placeholder="https://your-agent.vercel.app/api/health"
                  value={healthUrl}
                  onChange={(e) => {
                    setHealthUrl(e.target.value);
                    setValidation(null);
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  Leave blank to use the healthUrl from your agent card
                </p>
              </div>
              <Button
                onClick={handleVerify}
                disabled={!agentCardUrl.trim() || validating}
                variant="outline"
                className="w-full"
              >
                {validating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {validating ? "Verifying…" : "Verify Agent"}
              </Button>
            </CardContent>
          </Card>

          {/* Verification result */}
          {validation && (
            <AgentVerificationPanel
              agentCard={validation.agentCard}
              parsedServices={validation.parsedServices}
              health={validation.health}
              errors={validation.errors}
            />
          )}

          {/* Step 2 — Register on-chain */}
          {validation && (
            <Card className="border-border">
              <CardHeader className="pb-3">
                <h2 className="font-semibold text-sm">Step 2 — Register on-chain</h2>
                <p className="text-xs text-muted-foreground">
                  Calls <code className="font-mono">register(agentCardUrl)</code> on the{" "}
                  {networkConfig.name} Identity Registry.{" "}
                  {!validation.valid && (
                    <span className="text-amber-600">
                      Fix validation errors above before registering.
                    </span>
                  )}
                </p>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={handleRegister}
                  disabled={!canRegister}
                  className="w-full"
                >
                  {isWriting || isConfirming ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {isConfirming ? "Confirming…" : "Waiting for wallet…"}
                    </>
                  ) : (
                    "Register On-Chain"
                  )}
                </Button>
                {writeError && (
                  <p className="mt-2 text-xs text-red-600">
                    {writeError.message?.split("\n")[0]}
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
