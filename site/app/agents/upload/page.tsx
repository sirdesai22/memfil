"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Plus, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface McpTool {
  name: string;
  description: string;
}

const defaultTool: McpTool = { name: "", description: "" };

export default function AgentUploadPage() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState("");
  const [mcpEndpoint, setMcpEndpoint] = useState("");
  const [a2aEndpoint, setA2aEndpoint] = useState("");
  const [sellerWallet, setSellerWallet] = useState("");
  const [tools, setTools] = useState<McpTool[]>([{ ...defaultTool }]);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    agentId?: string;
    cid?: string;
    txHash?: string;
    network?: string;
    error?: string;
  } | null>(null);

  const addTool = () => setTools((t) => [...t, { ...defaultTool }]);
  const removeTool = (i: number) =>
    setTools((t) => (t.length > 1 ? t.filter((_, j) => j !== i) : t));
  const updateTool = (i: number, field: keyof McpTool, value: string) =>
    setTools((t) =>
      t.map((tool, j) => (j === i ? { ...tool, [field]: value } : tool))
    );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !description.trim()) {
      setResult({ success: false, error: "Name and description are required." });
      return;
    }
    if (!mcpEndpoint.trim() && !a2aEndpoint.trim()) {
      setResult({
        success: false,
        error: "At least one of MCP endpoint or A2A endpoint is required.",
      });
      return;
    }

    setSubmitting(true);
    setResult(null);
    try {
      const mcpTools = tools
        .filter((t) => t.name.trim())
        .map((t) => ({
          name: t.name.trim(),
          description: t.description.trim() || undefined,
        }));

      const res = await fetch("/api/agents/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          image: image.trim() || undefined,
          mcpEndpoint: mcpEndpoint.trim() || undefined,
          a2aEndpoint: a2aEndpoint.trim() || undefined,
          sellerWallet: sellerWallet.trim() || undefined,
          mcpTools: mcpTools.length ? mcpTools : undefined,
        }),
      });
      const data = await res.json();

      if (data.success) {
        setResult({
          success: true,
          agentId: data.agentId,
          cid: data.cid,
          txHash: data.txHash,
          network: data.network,
        });
      } else {
        setResult({ success: false, error: data.error ?? "Registration failed" });
      }
    } catch (err) {
      setResult({
        success: false,
        error: err instanceof Error ? err.message : "Request failed",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/agents" aria-label="Back to agents">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1
            className="font-display text-2xl font-bold tracking-tight text-foreground"
            style={{ fontFamily: "var(--font-playfair-display), serif" }}
          >
            Register agent
          </h1>
          <p className="text-sm text-muted-foreground">
            Upload agent metadata to Filecoin and register on-chain (ERC-8004).
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Agent details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Name <span className="text-destructive">*</span>
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. SEO Analyzer"
                required
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Description <span className="text-destructive">*</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Short description of what the agent does."
                required
                rows={3}
                className="border-input placeholder:text-muted-foreground focus-visible:ring-ring/50 w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-[3px]"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Image URL
              </label>
              <Input
                type="url"
                value={image}
                onChange={(e) => setImage(e.target.value)}
                placeholder="https://..."
              />
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Endpoints</CardTitle>
            <p className="text-sm text-muted-foreground">
              At least one of MCP or A2A is required.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                MCP endpoint
              </label>
              <Input
                type="url"
                value={mcpEndpoint}
                onChange={(e) => setMcpEndpoint(e.target.value)}
                placeholder="https://example.com/mcp"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                A2A endpoint
              </label>
              <Input
                type="url"
                value={a2aEndpoint}
                onChange={(e) => setA2aEndpoint(e.target.value)}
                placeholder="https://example.com/.well-known/agent.json"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                MCP tools (optional)
              </label>
              <div className="space-y-2">
                {tools.map((tool, i) => (
                  <div key={i} className="flex gap-2">
                    <Input
                      value={tool.name}
                      onChange={(e) => updateTool(i, "name", e.target.value)}
                      placeholder="Tool name"
                      className="flex-1"
                    />
                    <Input
                      value={tool.description}
                      onChange={(e) =>
                        updateTool(i, "description", e.target.value)
                      }
                      placeholder="Description"
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeTool(i)}
                      aria-label="Remove tool"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={addTool}>
                  <Plus className="mr-1 h-4 w-4" />
                  Add tool
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Payment (optional)</CardTitle>
            <p className="text-sm text-muted-foreground">
              Wallet to receive x402 payments. If empty, payments go to the
              server wallet.
            </p>
          </CardHeader>
          <CardContent>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Seller wallet (EVM address)
              </label>
              <Input
                value={sellerWallet}
                onChange={(e) => setSellerWallet(e.target.value)}
                placeholder="0x..."
              />
            </div>
          </CardContent>
        </Card>

        {result && (
          <Card
            className={`mt-6 border-dashed ${
              result.success
                ? "border-emerald-500/40 bg-emerald-500/5"
                : "border-destructive/40 bg-destructive/5"
            }`}
          >
            <CardContent className="pt-6">
              {result.success ? (
                <div className="space-y-2 text-sm">
                  <p className="font-medium text-emerald-600 dark:text-emerald-400">
                    Agent registered successfully.
                  </p>
                  <p>
                    <span className="text-muted-foreground">Agent ID:</span>{" "}
                    {result.agentId}
                  </p>
                  {result.cid && (
                    <p>
                      <span className="text-muted-foreground">CID:</span>{" "}
                      <code className="rounded bg-muted px-1">{result.cid}</code>
                    </p>
                  )}
                  {result.txHash && (
                    <p>
                      <span className="text-muted-foreground">Tx:</span>{" "}
                      <code className="rounded bg-muted px-1">
                        {result.txHash.slice(0, 18)}…
                      </code>
                    </p>
                  )}
                  <Button variant="outline" size="sm" asChild className="mt-2">
                    <Link
                      href={`/agents/${result.network ?? "filecoinCalibration"}/${result.agentId}`}
                    >
                      View agent
                    </Link>
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-destructive">{result.error}</p>
              )}
            </CardContent>
          </Card>
        )}

        <div className="mt-6 flex gap-3">
          <Button type="submit" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Registering…
              </>
            ) : (
              "Register agent"
            )}
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href="/agents">Cancel</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}
