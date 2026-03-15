"use client";

import { useState } from "react";
import {
  useAccount,
  useConnect,
  useSwitchChain,
  useSignTypedData,
} from "wagmi";
import { Loader2, Play, CheckCircle2, AlertCircle, Copy, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { ParsedServices } from "@/lib/agent-validator";

const BASE_SEPOLIA_CHAIN_ID = 84532;
const BASE_SEPOLIA_USDC = "0x036CbD53842c5426634e7929541eC2318f3dCF7e" as const;

type Status = "idle" | "calling" | "signing" | "paying" | "done" | "error";

interface FieldDef {
  name: string;
  required: boolean;
  description: string;
  type: string;
}

function parseFields(schema: object | undefined): FieldDef[] {
  if (!schema || !("properties" in schema)) return [];
  const props = (schema as { properties: Record<string, { description?: string; type?: string }> }).properties;
  const required: string[] = ("required" in schema ? (schema as { required: string[] }).required : []) ?? [];
  return Object.entries(props)
    .filter(([name]) => name !== "userId") // injected automatically from wallet
    .map(([name, def]) => ({
      name,
      required: required.includes(name),
      description: def.description ?? "",
      type: def.type ?? "string",
    }));
}

function randomBytes32(): `0x${string}` {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return `0x${Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("")}`;
}

function copyText(text: string) {
  navigator.clipboard.writeText(text).catch(() => {});
}

interface X402Accept {
  scheme: string;
  network: string;
  asset: string;
  amount: string;
  payTo: string;
  maxTimeoutSeconds?: number;
  extra?: { name?: string; version?: string };
}

interface AgentInvokerProps {
  guide: ParsedServices;
}

export function AgentInvoker({ guide }: AgentInvokerProps) {
  const { x402Endpoint, cost, currency, inputSchema } = guide;
  const fields = parseFields(inputSchema);

  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [resultExpanded, setResultExpanded] = useState(false);
  const [txInfo, setTxInfo] = useState<{ amount: string; payTo: string } | null>(null);

  const { address, isConnected, chain } = useAccount();
  const { connect, connectors, isPending: isConnecting } = useConnect();
  const { switchChainAsync, isPending: isSwitching } = useSwitchChain();
  const { signTypedDataAsync } = useSignTypedData();

  const isWrongChain = isConnected && chain?.id !== BASE_SEPOLIA_CHAIN_ID;
  const busy = status === "calling" || status === "signing" || status === "paying";

  const handleRun = async () => {
    setStatus("calling");
    setResult(null);
    setErrorMsg(null);
    setTxInfo(null);

    try {
      // Build body; inject wallet address as userId
      const body: Record<string, string> = {};
      for (const f of fields) {
        const v = inputs[f.name]?.trim();
        if (v) body[f.name] = v;
      }
      if (address) body.userId = address;

      // ── Step 1: initial call ──────────────────────────────────────────────
      const first = await fetch(x402Endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (first.ok) {
        setResult(await first.text());
        setStatus("done");
        return;
      }

      if (first.status !== 402) {
        const txt = await first.text().catch(() => "");
        throw new Error(`HTTP ${first.status}: ${txt.slice(0, 300)}`);
      }

      // ── Step 2: parse 402 ─────────────────────────────────────────────────
      const req402 = await first.json();
      const accept: X402Accept = req402.accepts?.[0];
      if (!accept) throw new Error("No payment method offered in 402 response.");

      const { amount, payTo, extra, maxTimeoutSeconds = 300 } = accept;
      setTxInfo({ amount, payTo });

      // ── Step 3: ensure wallet + chain ─────────────────────────────────────
      if (!isConnected || !address) {
        connect({ connector: connectors[0] });
        setStatus("idle");
        return;
      }
      if (chain?.id !== BASE_SEPOLIA_CHAIN_ID) {
        await switchChainAsync({ chainId: BASE_SEPOLIA_CHAIN_ID });
      }

      // ── Step 4: sign EIP-3009 TransferWithAuthorization ───────────────────
      setStatus("signing");
      const nonce = randomBytes32();
      const validAfter = BigInt(0);
      const validBefore = BigInt(Math.floor(Date.now() / 1000) + maxTimeoutSeconds);

      const signature = await signTypedDataAsync({
        domain: {
          name: extra?.name ?? "USD Coin",
          version: extra?.version ?? "2",
          chainId: BASE_SEPOLIA_CHAIN_ID,
          verifyingContract: BASE_SEPOLIA_USDC,
        },
        types: {
          TransferWithAuthorization: [
            { name: "from", type: "address" },
            { name: "to", type: "address" },
            { name: "value", type: "uint256" },
            { name: "validAfter", type: "uint256" },
            { name: "validBefore", type: "uint256" },
            { name: "nonce", type: "bytes32" },
          ],
        },
        primaryType: "TransferWithAuthorization",
        message: {
          from: address,
          to: payTo as `0x${string}`,
          value: BigInt(amount),
          validAfter,
          validBefore,
          nonce,
        },
      });

      // ── Step 5: build X-Payment header ────────────────────────────────────
      setStatus("paying");
      const payment = {
        x402Version: 2,
        scheme: "exact",
        network: accept.network,
        payload: {
          signature,
          authorization: {
            from: address,
            to: payTo,
            value: amount,
            validAfter: validAfter.toString(),
            validBefore: validBefore.toString(),
            nonce,
          },
        },
      };
      const xPayment = btoa(JSON.stringify(payment));

      // ── Step 6: paid retry ────────────────────────────────────────────────
      const paid = await fetch(x402Endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Payment": xPayment,
        },
        body: JSON.stringify(body),
      });

      if (!paid.ok) {
        const txt = await paid.text().catch(() => "");
        throw new Error(`Agent returned HTTP ${paid.status}: ${txt.slice(0, 300)}`);
      }

      setResult(await paid.text());
      setStatus("done");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      // user rejected wallet prompt
      if (msg.toLowerCase().includes("user rejected") || msg.toLowerCase().includes("user denied")) {
        setErrorMsg("You rejected the signature request in your wallet.");
      } else {
        setErrorMsg(msg);
      }
      setStatus("error");
    }
  };

  // Pretty-print result if JSON
  const prettyResult = (() => {
    if (!result) return null;
    try {
      return JSON.stringify(JSON.parse(result), null, 2);
    } catch {
      return result;
    }
  })();

  const resultLines = prettyResult?.split("\n") ?? [];
  const previewLines = 12;
  const isLong = resultLines.length > previewLines;
  const displayResult = resultExpanded || !isLong
    ? prettyResult
    : resultLines.slice(0, previewLines).join("\n") + "\n…";

  return (
    <div className="space-y-4">
      {/* Wallet / chain banner */}
      {!isConnected ? (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm space-y-2">
          <p className="font-medium text-amber-600 dark:text-amber-400">Wallet required</p>
          <p className="text-muted-foreground text-xs">
            Connect a wallet with USDC on Base Sepolia to pay {cost} {currency}.
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => connect({ connector: connectors[0] })}
            disabled={isConnecting}
          >
            {isConnecting ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />Connecting…</> : "Connect wallet"}
          </Button>
        </div>
      ) : isWrongChain ? (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm space-y-2">
          <p className="font-medium text-amber-600 dark:text-amber-400">Switch to Base Sepolia</p>
          <p className="text-muted-foreground text-xs">Payment is on Base Sepolia (chain 84532).</p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => switchChainAsync({ chainId: BASE_SEPOLIA_CHAIN_ID })}
            disabled={isSwitching}
          >
            {isSwitching ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />Switching…</> : "Switch network"}
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
          <span className="font-mono truncate">{address}</span>
          <span className="ml-auto shrink-0 font-medium text-foreground">{cost} {currency}</span>
        </div>
      )}

      {/* Input fields */}
      {fields.length > 0 && (
        <Card className="border-border">
          <CardHeader className="pb-2 pt-4 px-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Inputs</p>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-3">
            {fields.map((f) => (
              <div key={f.name} className="space-y-1.5">
                <Label htmlFor={`input-${f.name}`} className="text-xs">
                  {f.name}
                  {f.required && <span className="ml-1 text-destructive">*</span>}
                </Label>
                <Input
                  id={`input-${f.name}`}
                  placeholder={f.description || f.name}
                  value={inputs[f.name] ?? ""}
                  onChange={(e) =>
                    setInputs((prev) => ({ ...prev, [f.name]: e.target.value }))
                  }
                  disabled={busy}
                  className="text-sm"
                />
                {f.description && (
                  <p className="text-[11px] text-muted-foreground">{f.description}</p>
                )}
              </div>
            ))}
            <p className="text-[11px] text-muted-foreground">
              <span className="font-medium">userId</span> — injected automatically from your connected wallet.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Status indicator */}
      {busy && (
        <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/20 px-4 py-3 text-sm">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />
          <span className="text-muted-foreground">
            {status === "calling" && "Contacting agent…"}
            {status === "signing" && "Sign the USDC payment in your wallet…"}
            {status === "paying" && "Sending payment & invoking agent…"}
          </span>
          {txInfo && status !== "calling" && (
            <span className="ml-auto text-xs font-mono text-muted-foreground truncate">
              {(Number(txInfo.amount) / 1e6).toFixed(4)} USDC → {txInfo.payTo.slice(0, 8)}…
            </span>
          )}
        </div>
      )}

      {/* Run button */}
      {!busy && status !== "done" && (
        <Button
          onClick={handleRun}
          disabled={busy || !isConnected || isWrongChain || fields.some((f) => f.required && !inputs[f.name]?.trim())}
          className="w-full gap-2"
        >
          <Play className="h-3.5 w-3.5" />
          Run · Pay {cost} {currency}
        </Button>
      )}

      {/* Re-run button after completion */}
      {status === "done" && (
        <Button
          variant="outline"
          onClick={() => { setStatus("idle"); setResult(null); }}
          className="w-full gap-2"
        >
          <Play className="h-3.5 w-3.5" />
          Run again
        </Button>
      )}

      {/* Error */}
      {status === "error" && errorMsg && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 space-y-1.5">
          <div className="flex items-center gap-1.5 text-sm font-medium text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            Invocation failed
          </div>
          <p className="text-xs text-destructive/80 break-words">{errorMsg}</p>
          <Button size="sm" variant="outline" onClick={() => setStatus("idle")} className="mt-1">
            Try again
          </Button>
        </div>
      )}

      {/* Result */}
      {status === "done" && prettyResult && (
        <Card className="border-border">
          <CardHeader className="pb-2 pt-4 px-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-emerald-500">
                <CheckCircle2 className="h-4 w-4" />
                Result
              </div>
              <button
                onClick={() => copyText(prettyResult)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <Copy className="h-3 w-3" />
                Copy
              </button>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <pre className="overflow-x-auto rounded-lg border border-border bg-muted/40 p-3 text-[11px] leading-relaxed whitespace-pre-wrap break-words max-h-[400px] overflow-y-auto">
              {displayResult}
            </pre>
            {isLong && (
              <button
                onClick={() => setResultExpanded((v) => !v)}
                className="mt-1.5 flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                {resultExpanded ? (
                  <><ChevronUp className="h-3 w-3" />Show less</>
                ) : (
                  <><ChevronDown className="h-3 w-3" />Show all ({resultLines.length} lines)</>
                )}
              </button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
