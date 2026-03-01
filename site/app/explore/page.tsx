"use client";

import { motion } from "framer-motion";
import { EPISODES, AGENTS } from "@/lib/data";
import { EpisodeCard } from "@/components/episode-card";
import { AgentCard } from "@/components/agent-card";
import { HowItWorks } from "@/components/how-it-works";
import { PaymentModal } from "@/components/payment-modal";
import { useState } from "react";
import type { Episode, Agent } from "@/lib/data";

const featuredEpisode = EPISODES.find((e) => e.featured) ?? EPISODES[0];
const recentlyAdded = [...EPISODES]
  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  .slice(0, 6);
const mostInstalled = [...EPISODES]
  .sort((a, b) => b.installs - a.installs)
  .slice(0, 6);
const staffPicks = EPISODES.filter((e) => e.staffPick);

export default function ExplorePage() {
  const [paymentItem, setPaymentItem] = useState<
    { type: "episode"; data: Episode } | { type: "agent"; data: Agent } | null
  >(null);
  const [paymentOpen, setPaymentOpen] = useState(false);

  const handleEpisodeBuy = (episode: Episode) => {
    setPaymentItem({ type: "episode", data: episode });
    setPaymentOpen(true);
  };

  const handleAgentAdd = (agent: Agent) => {
    setPaymentItem({ type: "agent", data: agent });
    setPaymentOpen(true);
  };

  return (
    <>
      <div className="container space-y-16 px-4 py-8 md:px-6">
        <div>
          <h1
            className="font-display text-3xl font-bold tracking-tight text-foreground md:text-4xl"
            style={{ fontFamily: "var(--font-playfair-display), serif" }}
          >
            Explore
          </h1>
          <p className="mt-2 text-muted-foreground">
            Discover trending episodes and agents.
          </p>
        </div>

        {/* Featured episode - large hero */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="space-y-4"
        >
          <h2
            className="font-display text-xl font-semibold"
            style={{ fontFamily: "var(--font-playfair-display), serif" }}
          >
            Featured
          </h2>
          <EpisodeCard
            episode={featuredEpisode}
            onBuyClick={handleEpisodeBuy}
            compact={false}
          />
        </motion.section>

        {/* Recently Added - horizontal scroll */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="space-y-4"
        >
          <h2
            className="font-display text-xl font-semibold"
            style={{ fontFamily: "var(--font-playfair-display), serif" }}
          >
            Recently Added
          </h2>
          <div className="-mx-4 overflow-x-auto px-4 md:-mx-6 md:px-6">
            <div className="flex gap-4 pb-4 md:gap-6">
              {recentlyAdded.map((episode) => (
                <div
                  key={episode.id}
                  className="w-72 shrink-0 md:w-80"
                >
                  <EpisodeCard
                    episode={episode}
                    onBuyClick={handleEpisodeBuy}
                  />
                </div>
              ))}
            </div>
          </div>
        </motion.section>

        {/* Most Installed - horizontal scroll */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="space-y-4"
        >
          <h2
            className="font-display text-xl font-semibold"
            style={{ fontFamily: "var(--font-playfair-display), serif" }}
          >
            Most Installed
          </h2>
          <div className="-mx-4 overflow-x-auto px-4 md:-mx-6 md:px-6">
            <div className="flex gap-4 pb-4 md:gap-6">
              {mostInstalled.map((episode) => (
                <div
                  key={episode.id}
                  className="w-72 shrink-0 md:w-80"
                >
                  <EpisodeCard
                    episode={episode}
                    onBuyClick={handleEpisodeBuy}
                  />
                </div>
              ))}
            </div>
          </div>
        </motion.section>

        {/* Staff Picks - horizontal scroll */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="space-y-4"
        >
          <h2
            className="font-display text-xl font-semibold"
            style={{ fontFamily: "var(--font-playfair-display), serif" }}
          >
            Staff Picks
          </h2>
          <div className="-mx-4 overflow-x-auto px-4 md:-mx-6 md:px-6">
            <div className="flex gap-4 pb-4 md:gap-6">
              {staffPicks.map((episode) => (
                <div
                  key={episode.id}
                  className="w-72 shrink-0 md:w-80"
                >
                  <EpisodeCard
                    episode={episode}
                    onBuyClick={handleEpisodeBuy}
                  />
                </div>
              ))}
            </div>
          </div>
        </motion.section>

        {/* Agents row */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.35 }}
          className="space-y-4"
        >
          <h2
            className="font-display text-xl font-semibold"
            style={{ fontFamily: "var(--font-playfair-display), serif" }}
          >
            Popular Agents
          </h2>
          <div className="-mx-4 overflow-x-auto px-4 md:-mx-6 md:px-6">
            <div className="flex gap-4 pb-4 md:gap-6">
              {AGENTS.slice(0, 5).map((agent) => (
                <div
                  key={agent.id}
                  className="w-72 shrink-0 md:w-80"
                >
                  <AgentCard agent={agent} onAddClick={handleAgentAdd} />
                </div>
              ))}
            </div>
          </div>
        </motion.section>

        {/* How It Works */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
        >
          <HowItWorks className="pt-8 border-t border-border" />
        </motion.div>
      </div>

      <PaymentModal
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
        item={paymentItem}
      />
    </>
  );
}
