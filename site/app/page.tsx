"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { EPISODES } from "@/lib/data";
import type { Episode, EpisodeTag } from "@/lib/data";
import { WorkspaceLayout } from "@/components/workspace-layout";
import { EpisodeFilterSidebar, type SortOption } from "@/components/filter-sidebar";
import { EpisodeCard } from "@/components/episode-card";
import { PaymentModal } from "@/components/payment-modal";

export default function EpisodesPage() {
  const [selectedTags, setSelectedTags] = useState<EpisodeTag[]>([]);
  const [sort, setSort] = useState<SortOption>("newest");
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1]);
  const [paymentItem, setPaymentItem] = useState<{ type: "episode"; data: Episode } | null>(null);
  const [paymentOpen, setPaymentOpen] = useState(false);

  const filteredEpisodes = useMemo(() => {
    let result = [...EPISODES];

    if (selectedTags.length > 0) {
      result = result.filter((e) =>
        selectedTags.some((t) => e.tags.includes(t))
      );
    }

    result = result.filter(
      (e) => e.price >= priceRange[0] && e.price <= priceRange[1]
    );

    switch (sort) {
      case "newest":
        result.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        break;
      case "most-installed":
        result.sort((a, b) => b.installs - a.installs);
        break;
      case "price-low":
        result.sort((a, b) => a.price - b.price);
        break;
      case "price-high":
        result.sort((a, b) => b.price - a.price);
        break;
    }

    return result;
  }, [selectedTags, sort, priceRange]);

  const handleBuyClick = (episode: Episode) => {
    setPaymentItem({ type: "episode", data: episode });
    setPaymentOpen(true);
  };

  return (
    <>
      <WorkspaceLayout
        sidebar={
          <EpisodeFilterSidebar
            selectedTags={selectedTags}
            onTagsChange={setSelectedTags}
            sort={sort}
            onSortChange={setSort}
            priceRange={priceRange}
            onPriceRangeChange={setPriceRange}
          />
        }
      >
        <div className="space-y-6">
          <div>
            <h1
              className="font-display text-2xl font-bold tracking-tight text-foreground md:text-3xl"
              style={{ fontFamily: "var(--font-playfair-display), serif" }}
            >
              Episodes
            </h1>
            <p className="mt-1 text-muted-foreground">
              Browse and install curated experience files for your agents.
            </p>
          </div>

          <AnimatePresence mode="wait">
            {filteredEpisodes.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="rounded-xl border border-dashed border-border bg-muted/30 py-16 text-center"
              >
                <p className="text-muted-foreground">
                  No episodes match your filters.
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
                  {filteredEpisodes.map((episode, i) => (
                    <motion.div
                      key={episode.id}
                      layout
                      variants={{
                        hidden: { opacity: 0, y: 20 },
                        visible: { opacity: 1, y: 0 },
                      }}
                      transition={{ duration: 0.3 }}
                    >
                      <EpisodeCard
                        episode={episode}
                        onBuyClick={handleBuyClick}
                      />
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
