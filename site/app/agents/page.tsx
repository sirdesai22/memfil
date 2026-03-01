"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AGENTS } from "@/lib/data";
import type { Agent, EpisodeTag } from "@/lib/data";
import { WorkspaceLayout } from "@/components/workspace-layout";
import { AgentFilterSidebar } from "@/components/filter-sidebar";
import { AgentCard } from "@/components/agent-card";
import { PaymentModal } from "@/components/payment-modal";

export default function AgentsPage() {
  const [selectedTags, setSelectedTags] = useState<EpisodeTag[]>([]);
  const [showFreeOnly, setShowFreeOnly] = useState(false);
  const [paymentItem, setPaymentItem] = useState<{ type: "agent"; data: Agent } | null>(null);
  const [paymentOpen, setPaymentOpen] = useState(false);

  const filteredAgents = useMemo(() => {
    let result = [...AGENTS];

    if (selectedTags.length > 0) {
      result = result.filter((a) =>
        selectedTags.some((t) => a.compatibleTags.includes(t))
      );
    }

    if (showFreeOnly) {
      result = result.filter((a) => a.price === "free");
    }

    return result;
  }, [selectedTags, showFreeOnly]);

  const handleAddClick = (agent: Agent) => {
    setPaymentItem({ type: "agent", data: agent });
    setPaymentOpen(true);
  };

  return (
    <>
      <WorkspaceLayout
        sidebar={
          <AgentFilterSidebar
            selectedTags={selectedTags}
            onTagsChange={setSelectedTags}
            showFreeOnly={showFreeOnly}
            onShowFreeOnlyChange={setShowFreeOnly}
          />
        }
      >
        <div className="space-y-6">
          <div>
            <h1
              className="font-display text-2xl font-bold tracking-tight text-foreground md:text-3xl"
              style={{ fontFamily: "var(--font-playfair-display), serif" }}
            >
              Agents
            </h1>
            <p className="mt-1 text-muted-foreground">
              Discover agents that work with your episodes.
            </p>
          </div>

          <AnimatePresence mode="wait">
            {filteredAgents.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="rounded-xl border border-dashed border-border bg-muted/30 py-16 text-center"
              >
                <p className="text-muted-foreground">
                  No agents match your filters.
                </p>
              </motion.div>
            ) : (
              <motion.div
                layout
                className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
                initial="hidden"
                animate="visible"
                variants={{
                  visible: {
                    transition: { staggerChildren: 0.05 },
                  },
                  hidden: {},
                }}
              >
                <AnimatePresence mode="popLayout">
                  {filteredAgents.map((agent) => (
                    <motion.div
                      key={agent.id}
                      layout
                      variants={{
                        hidden: { opacity: 0, y: 20 },
                        visible: { opacity: 1, y: 0 },
                      }}
                      transition={{ duration: 0.3 }}
                    >
                      <AgentCard agent={agent} onAddClick={handleAddClick} />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </WorkspaceLayout>

      <PaymentModal
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
        item={paymentItem}
      />
    </>
  );
}
